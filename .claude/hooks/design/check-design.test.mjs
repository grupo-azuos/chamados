import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('./check-design.mjs', import.meta.url));

function invoke(input) {
  return spawnSync(process.execPath, [CLI, '--hook'], { input, encoding: 'utf8' });
}

test('reports malformed hook input instead of silently approving the event', () => {
  // triste: o erro do evento precisa voltar ao Claude na mesma tarefa.
  const result = invoke('{invalid');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Design/);
});

test('skips valid edits outside design scope without scanning the application', () => {
  // feliz: edição de configuração sem relação com UI não paga a varredura inteira.
  const result = invoke(
    JSON.stringify({ tool_input: { file_path: '.github/workflows/tests.yml' } }),
  );
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});
