import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runParseDeps, runMake, getDefaultTarget } from '../src/runner.js';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

let testCounter = 0;

function getTestDir() {
  return resolve('build', `test`);
}

function cleanup(testDir) {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

function setup() {
  const testDir = getTestDir();
  cleanup(testDir);
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

test('runner - runParseDeps basic', () => {
  const testDir = setup();

  const makefile = `
app: main.o
main.o: main.c
main.c:
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const result = runParseDeps('app', { cwd: testDir });
  assert.equal(result.exitCode, 0);
  assert.ok(result.stdout.includes('Makefile'));

  cleanup(testDir);
});

test('runner - runParseDeps with nonexistent target', () => {
  const testDir = setup();

  const makefile = `app: main.c
main.c:
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const result = runParseDeps('nonexistent', { cwd: testDir });
  // make returns exit code 2 for "no rule"
  assert.notEqual(result.exitCode, 0);

  cleanup(testDir);
});

test('runner - runParseDeps with custom makefile', () => {
  const testDir = setup();

  const makefile = `target: dep
dep:
`;
  writeFileSync(resolve(testDir, 'custom.mk'), makefile);

  const result = runParseDeps('target', {
    cwd: testDir,
    makefilePath: resolve(testDir, 'custom.mk')
  });
  assert.equal(result.exitCode, 0);

  cleanup(testDir);
});

test('runner - runMake succeeds', async () => {
  const testDir = setup();

  const makefile = `target:
	echo "built"
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const exitCode = await runMake('target', { cwd: testDir });
  assert.equal(exitCode, 0);

  cleanup(testDir);
});

test('runner - runMake fails on missing target', async () => {
  const testDir = setup();

  const makefile = `target:
	echo "built"
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const exitCode = await runMake('nonexistent', { cwd: testDir });
  assert.notEqual(exitCode, 0);

  cleanup(testDir);
});

test('runner - getDefaultTarget with first target as default', () => {
  const testDir = setup();

  const makefile = `build:
	echo "Building"

test:
	echo "Testing"
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const target = getDefaultTarget({ cwd: testDir });
  assert.equal(target, 'build');

  cleanup(testDir);
});

test('runner - getDefaultTarget with explicit .DEFAULT_GOAL', () => {
  const testDir = setup();

  const makefile = `test:
	echo "Testing"

.DEFAULT_GOAL := build

build:
	echo "Building"
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const target = getDefaultTarget({ cwd: testDir });
  assert.equal(target, 'build');

  cleanup(testDir);
});

test('runner - getDefaultTarget with .PHONY target as first', () => {
  const testDir = setup();

  const makefile = `.PHONY: test
test:
	echo "Testing"

build:
	echo "Building"
`;
  writeFileSync(resolve(testDir, 'Makefile'), makefile);

  const target = getDefaultTarget({ cwd: testDir });
  assert.equal(target, 'test');

  cleanup(testDir);
});
