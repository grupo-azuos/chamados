#!/usr/bin/env sh
#
# A TRAVA DA VERSÃO — .claude/rules/infra.md §6 e skill `release-standard`.
#
# Roda no pre-push, para todo mundo e também para quem administra (o padrão de versão não tem
# exceção, como a identidade). Ela só deixa sair da máquina:
#
#   prod/vX.Y.Z   a tag de produção, anotada, com a mensagem no padrão, com a versão igual em
#                 todos os package.json e no Build do Komodo do commit, e com o commit na main
#                 (o `scripts/release.mjs --check` confere tudo isso).
#
# Qualquer outra tag é recusada: a versão é uma só, e mora na tag `prod/v`. Um app que publica
# outro artefato com tag própria (o agente do chamados) escreve o prefixo dele em
# EXTRA_TAG_PATTERNS, uma expressão regular por item, separados por espaço.

EXTRA_TAG_PATTERNS="agent/v[0-9]+\.[0-9]+\.[0-9]+"

refuse() {
  printf '\n' >&2
  printf '  ✋ %s\n' "$1" >&2
  printf '\n' >&2
  printf '  %s\n' "$2" >&2
  printf '\n' >&2
  printf '  Nada foi perdido: a tag continua nesta máquina.\n' >&2
  printf '\n' >&2
  exit 1
}

matches_extra() {
  for pattern in $EXTRA_TAG_PATTERNS; do
    if printf '%s' "$1" | grep -Eq "^${pattern}$"; then
      return 0
    fi
  done
  return 1
}

zeros="0000000000000000000000000000000000000000"
input=$(cat)
main_sha=$(printf '%s\n' "$input" | awk '$3 == "refs/heads/main" { print $2 }')

printf '%s\n' "$input" | while read -r _local_ref local_sha remote_ref _remote_sha; do
  case "$remote_ref" in
    refs/tags/*) ;;
    *) continue ;;
  esac
  # Apagar uma tag remota não cria versão nenhuma.
  [ "$local_sha" = "$zeros" ] && continue

  tag=${remote_ref#refs/tags/}
  case "$tag" in
    prod/v[0-9]*.[0-9]*.[0-9]*)
      # shellcheck disable=SC2086
      if ! node scripts/release.mjs --check "$tag" "$local_sha" $main_sha; then
        refuse \
          "A tag $tag está fora do padrão de versão do grupo." \
          'Use "npm run release -- X.Y.Z --notes ..." (skill release-standard): ele grava a versão nos arquivos, leva a develop para a main e cria a tag certa.'
      fi
      ;;
    *)
      if ! matches_extra "$tag"; then
        refuse \
          "A tag \"$tag\" não é uma versão do padrão do grupo (prod/vX.Y.Z)." \
          'Versão nova se lança com "npm run release -- X.Y.Z --notes ..." (skill release-standard), que cria a tag no padrão.'
      fi
      ;;
  esac
done || exit 1
