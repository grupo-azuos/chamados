#!/usr/bin/env python3
"""Valida os dados versionados e a atribuição dos commits, sem dependências externas."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import sys

REGISTRY = 'docs/project.json'
ROLES = {'business', 'technical', 'automation'}
TRAILERS = {'Participant-Id': 'id', 'Participant-Name': 'name',
            'Participant-Email': 'email', 'Department': 'department', 'Participant-Role': 'role'}


def git(*args, cwd=None):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True, stderr=subprocess.PIPE).strip()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value):
    return (isinstance(value, str) and bool(value.strip()) and '\n' not in value
            and '\r' not in value and value.strip().lower() not in {'unknown', 'n/a', 'todo', 'pending', 'desconhecido'})


def load_registry(raw):
    data = json.loads(raw)
    require(isinstance(data, dict), 'O cadastro deve ser um objeto JSON.')
    required = {'schema_version', 'repository', 'project_type', 'status', 'participants',
                'shared_accounts', 'tools', 'milestones', 'requirements_meetings',
                'technical_blockers', 'traditional_estimate_days', 'pending_fields', 'evidence'}
    require(all(re.fullmatch(r'[a-z][a-z0-9_]*', key) for key in data), 'As chaves devem estar em inglês, snake_case.')
    require(required <= data.keys(), 'Campos ausentes: ' + ', '.join(sorted(required - data.keys())))
    require(data['schema_version'] == 1, 'schema_version deve ser 1.')
    require(text(data['repository']), 'Informe repository.')
    require(data['project_type'] in {'application', 'template', 'shared_resource'}, 'project_type inválido.')
    require(data['status'] in {None, 'prototype', 'integration', 'production', 'abandoned'}, 'status inválido.')
    for key in ['participants', 'shared_accounts', 'tools', 'technical_blockers', 'pending_fields', 'evidence']:
        require(isinstance(data[key], list), key + ' deve ser uma lista.')
    for key in ['requirements_meetings', 'traditional_estimate_days']:
        value = data[key]
        require(value is None or (type(value) is int and value >= 0), key + ' deve ser null ou inteiro não negativo.')
    require(isinstance(data['milestones'], dict), 'milestones deve ser um objeto.')
    for key in ['started_at', 'mvp_at', 'production_at', 'abandoned_at']:
        require(key in data['milestones'], 'Marco ausente: ' + key)
        value = data['milestones'][key]
        if value is not None:
            require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', value), 'Data inválida: ' + key)
            datetime.date.fromisoformat(value)
    ids = set()
    for person in data['participants']:
        require(isinstance(person, dict), 'Cada participante deve ser um objeto.')
        require({'id', 'name', 'email', 'department', 'role', 'github_logins', 'git_emails', 'prior_it_experience'} <= person.keys(), 'Participante incompleto.')
        require(text(person['id']) and person['id'] not in ids, 'Participant id vazio ou duplicado.')
        ids.add(person['id'])
        require(person['role'] in ROLES, 'Papel inválido: ' + person['id'])
        for key in ['name', 'email', 'department']:
            require(person[key] is None or text(person[key]), key + ' inválido em ' + person['id'])
        for key in ['github_logins', 'git_emails']:
            require(isinstance(person[key], list) and all(text(x) for x in person[key]), key + ' inválido.')
    for account in data['shared_accounts']:
        require(isinstance(account, dict) and text(account.get('login')), 'Conta compartilhada inválida.')
        require(isinstance(account.get('participant_ids'), list) and set(account['participant_ids']) <= ids, 'Participante de conta compartilhada inexistente.')
    require(all(text(tool) for tool in data['tools']), 'tools deve conter nomes de ferramentas.')
    return data


def validate_message(data, message):
    # interpret-trailers lê apenas o bloco final e preserva chaves repetidas para recusá-las.
    result = subprocess.run(['git', 'interpret-trailers', '--parse'], input=message,
                            capture_output=True, text=True, check=True)
    trailers = {}
    for line in result.stdout.splitlines():
        key, value = line.split(':', 1)
        key = key.lower()
        trailers.setdefault(key, []).append(value.strip())
    for key in [*TRAILERS, 'AI-Tool']:
        require(len(trailers.get(key.lower(), [])) == 1 and text(trailers[key.lower()][0]),
                'Informe exatamente um trailer ' + key + '. Siga a skill participant-identity.')
    identifier = trailers['participant-id'][0]
    person = next((p for p in data['participants'] if p['id'] == identifier), None)
    require(person is not None, 'Participant-Id não cadastrado no JSON deste commit.')
    for key, field in TRAILERS.items():
        require(text(person[field]), 'Falta ' + field + ' no cadastro de ' + identifier + '. Pergunte à pessoa e adicione docs/project.json ao commit.')
        require(trailers[key.lower()][0] == person[field], key + ' diverge do cadastro versionado.')
    require(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', person['email']), 'E-mail do participante inválido.')
    require(person['email'] in person['git_emails'], 'Cadastre o e-mail do participante em git_emails.')
    require(trailers['ai-tool'][0] in data['tools'], 'AI-Tool não consta em tools. Registre a ferramenta realmente usada.')
    require(data['repository'].startswith('grupo-azuos/') or data['repository'] == 'example/project', 'Organização inválida.')
    # O título continua sob responsabilidade do commitlint/hook original do projeto.


def read_at(ref):
    return load_registry(git('show', ref + ':' + REGISTRY))


def check_range(base, head):
    selection = head if not base or set(base) == {'0'} else base + '..' + head
    commits = git('rev-list', '--reverse', selection).splitlines()
    for sha in commits:
        # Histórico anterior à adoção permanece intacto; uma remoção posterior não é isenta.
        parents = git('rev-list', '--parents', '-n', '1', sha).split()[1:]
        present = subprocess.run(['git', 'cat-file', '-e', sha + ':' + REGISTRY], capture_output=True).returncode == 0
        previous = any(subprocess.run(['git', 'cat-file', '-e', p + ':' + REGISTRY], capture_output=True).returncode == 0 for p in parents)
        if not present and not previous:
            continue
        require(present, sha[:12] + ': docs/project.json foi removido.')
        try:
            validate_message(read_at(sha), git('show', '-s', '--format=%B', sha))
        except ValueError as error:
            raise ValueError(sha[:12] + ': ' + str(error)) from error


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--message')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--range', nargs=2, metavar=('BASE', 'HEAD'))
    parser.add_argument('--session-hook', action='store_true')
    args = parser.parse_args()
    if args.session_hook:
        print('Antes de alterar o projeto, siga .claude/skills/participant-identity/SKILL.md. Leia docs/project.json; peça somente dados ausentes. Em conta compartilhada confirme quem está nesta sessão. Nunca atribua automaticamente à última pessoa cadastrada. Todo commit, inclusive merge e admin, precisa dos trailers de identidade; mantenha commits atômicos.')
        return
    os.chdir(git('rev-parse', '--show-toplevel'))
    if args.range:
        check_range(*args.range)
        return
    if args.message:
        data = read_at('')  # :caminho lê o índice, nunca a cópia de trabalho.
        validate_message(data, Path(args.message).read_text())
        return
    load_registry(Path(REGISTRY).read_text())


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError, subprocess.CalledProcessError) as error:
        print('Métricas: ' + str(error) + '\nCorrija o cadastro/atribuição; não desative o hook.', file=sys.stderr)
        sys.exit(1)
