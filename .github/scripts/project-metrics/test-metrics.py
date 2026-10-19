#!/usr/bin/env python3
"""Testa o comportamento real no índice e no histórico de um repositório isolado."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys
sys.dont_write_bytecode = True

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('metrics', HERE / 'validate-metrics.py')
metrics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metrics)


def registry():
    return {'schema_version': 1, 'repository': 'example/project', 'project_type': 'application',
            'status': None, 'participants': [{'id': 'ana', 'name': 'Ana Silva',
            'email': 'ana@example.com', 'department': 'Fiscal', 'role': 'business',
            'github_logins': [], 'git_emails': ['ana@example.com'], 'prior_it_experience': None}],
            'shared_accounts': [], 'tools': ['Claude Code'], 'milestones': dict.fromkeys(
            ['started_at', 'mvp_at', 'production_at', 'abandoned_at']),
            'requirements_meetings': None, 'technical_blockers': [],
            'traditional_estimate_days': None, 'pending_fields': [], 'evidence': []}


MESSAGE = '''[feat](web): Cadastro de clientes

Participant-Id: ana
Participant-Name: Ana Silva
Participant-Email: ana@example.com
Department: Fiscal
Participant-Role: business
AI-Tool: Claude Code
'''


class MetricsTest(unittest.TestCase):
    def test_accepts_complete_identity_with_unknown_historical_data(self):
        data = registry()
        data['participants'].append(dict(data['participants'][0], id='historical', name=None, email=None, department=None))
        metrics.validate_message(metrics.load_registry(json.dumps(data)), MESSAGE)

    def test_rejects_missing_duplicate_and_mismatched_trailers(self):
        for message in [MESSAGE.replace('Department: Fiscal\n', ''),
                        MESSAGE + 'Department: Fiscal\n',
                        MESSAGE.replace('Participant-Name: Ana Silva', 'Participant-Name: Outra pessoa'),
                        MESSAGE.replace('Participant-Role: business', 'Participant-Role: technical'),
                        MESSAGE.replace('AI-Tool: Claude Code', 'AI-Tool: Outra ferramenta')]:
            with self.subTest(message=message), self.assertRaises(ValueError):
                metrics.validate_message(registry(), message)

    def test_rejects_identity_in_body_instead_of_final_trailers(self):
        with self.assertRaises(ValueError):
            metrics.validate_message(registry(), MESSAGE + '\nUm parágrafo depois dos trailers.\n')

    def test_rejects_missing_current_identity_and_invalid_schema(self):
        data = registry()
        data['participants'][0]['department'] = None
        with self.assertRaises(ValueError):
            metrics.validate_message(data, MESSAGE)
        for modify in [lambda d: d.update(requirements_meetings=-1),
                       lambda d: d['milestones'].update(started_at='2026-02-30'),
                       lambda d: d['participants'].append(d['participants'][0])]:
            data = registry()
            modify(data)
            with self.assertRaises(ValueError):
                metrics.load_registry(json.dumps(data))

    def test_checks_staged_data_and_new_history_without_rewriting_legacy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', directory, *args], text=True, stderr=subprocess.PIPE).strip()
            def check(*args):
                return subprocess.run(['python3', str(HERE / 'validate-metrics.py'), *args],
                                      cwd=directory, capture_output=True, text=True)
            git('init', '-q')
            git('config', 'user.name', 'Test')
            git('config', 'user.email', 'test@example.com')
            git('commit', '--allow-empty', '-qm', 'Legacy without trailers')
            base = git('rev-parse', 'HEAD')
            (root / 'docs').mkdir()
            path = root / 'docs/project.json'
            data = registry()
            data['participants'][0]['department'] = None
            path.write_text(json.dumps(data))
            git('add', 'docs/project.json')
            path.write_text(json.dumps(registry()))
            message = root / 'message.txt'
            message.write_text(MESSAGE)
            self.assertNotEqual(check('--message', str(message)).returncode, 0)
            git('add', 'docs/project.json')
            self.assertEqual(check('--message', str(message)).returncode, 0)
            git('commit', '-qm', MESSAGE)
            self.assertEqual(check('--range', base, 'HEAD').returncode, 0)
            git('commit', '--allow-empty', '-qm', '[merge](web): Junta a entrega sem identidade')
            self.assertNotEqual(check('--range', base, 'HEAD').returncode, 0)
            git('rm', 'docs/project.json')
            git('commit', '-qm', MESSAGE)
            self.assertNotEqual(check('--range', 'HEAD~1', 'HEAD').returncode, 0)


if __name__ == '__main__':
    unittest.main()
