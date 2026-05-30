import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runParseDeps, runMake } from '../src/runner.js';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const testDir = '/tmp/makewatch-test';

function cleanup() {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

function setup() {
  cleanup();
  mkdirSync(testDir, { recursive: true });
}

test('runner - runParseDeps basic', () => {
  setup();

  const makefile = `
app: main.o
main.o: main.c
main.c:
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const result = runParseDeps('app', { cwd: testDir });
  assert.equal(result.exitCode, 0);
  assert.ok(result.stdout.includes('Makefile'));

  cleanup();
});

test('runner - runParseDeps with nonexistent target', () => {
  setup();

  const makefile = `app: main.c
main.c:
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const result = runParseDeps('nonexistent', { cwd: testDir });
  // make returns exit code 2 for "no rule"
  assert.notEqual(result.exitCode, 0);

  cleanup();
});

test('runner - runParseDeps with custom makefile', () => {
  setup();

  const makefile = `target: dep
dep:
`;
  writeFileSync(resolve(testDir, 'custom.mk'), makefile);

  const result = runParseDeps('target', {
    cwd: testDir,
    makefilePath: resolve(testDir, 'custom.mk')
  });
  assert.equal(result.exitCode, 0);

  cleanup();
});

test('runner - runMake succeeds', async () => {
  setup();

  const makefile = `target:
	echo "built"
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const exitCode = await runMake('target', { cwd: testDir });
  assert.equal(exitCode, 0);

  cleanup();
});

test('runner - runMake fails on missing target', async () => {
  setup();

  const makefile = `target:
	echo "built"
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const exitCode = await runMake('nonexistent', { cwd: testDir });
  assert.notEqual(exitCode, 0);

  cleanup();
});
