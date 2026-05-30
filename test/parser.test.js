import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMakePrintDatabase } from '../src/parser.js';

test('parser - basic dependencies', () => {
  const stdout = `# Variables

# Files
app: main.o util.o
main.o: main.c util.h
util.o: util.c util.h
main.c:
util.h:
util.c:`;

  const result = parseMakePrintDatabase(stdout, 'app', '/test');
  assert.ok(result.targetFound);
  assert.ok(result.fileDeps.has('/test/main.c'));
  assert.ok(result.fileDeps.has('/test/util.c'));
  assert.ok(result.fileDeps.has('/test/util.h'));
});

test('parser - phony targets excluded', () => {
  const stdout = `# Variables

# Files
.PHONY: all clean
all: app
app: main.o
main.o: main.c
main.c:`;

  const result = parseMakePrintDatabase(stdout, 'all', '/test');
  assert.ok(result.targetFound);
  assert.ok(!result.fileDeps.has('/test/all'));
  assert.ok(!result.fileDeps.has('/test/clean'));
  assert.ok(result.fileDeps.has('/test/main.c'));
});

test('parser - order-only prerequisites', () => {
  const stdout = `# Files
app: main.o | bin_dir
main.o: main.c
main.c:
bin_dir:`;

  const result = parseMakePrintDatabase(stdout, 'app', '/test');
  assert.ok(result.fileDeps.has('/test/main.c'));
  assert.ok(!result.fileDeps.has('/test/bin_dir'));
});

test('parser - double-colon rules', () => {
  const stdout = `# Files
target:: dep1 dep2
dep1:
dep2:`;

  const result = parseMakePrintDatabase(stdout, 'target', '/test');
  assert.ok(result.targetFound);
  assert.ok(result.fileDeps.has('/test/dep1'));
  assert.ok(result.fileDeps.has('/test/dep2'));
});

test('parser - target not found', () => {
  const stdout = `# Files
app: main.o
main.o: main.c
main.c:`;

  const result = parseMakePrintDatabase(stdout, 'nonexistent', '/test');
  assert.ok(!result.targetFound);
});

test('parser - makefiles list', () => {
  const stdout = `# Variables
MAKEFILE_LIST := Makefile subdir/rules.mk

# Files
target: dep`;

  const result = parseMakePrintDatabase(stdout, 'target', '/test');
  assert.ok(result.makefiles.has('/test/Makefile'));
  assert.ok(result.makefiles.has('/test/subdir/rules.mk'));
});

test('parser - watch directories', () => {
  const stdout = `# Files
app: src/main.c src/util.c
src/main.c:
src/util.c:`;

  const result = parseMakePrintDatabase(stdout, 'app', '/test');
  assert.ok(result.watchDirs.has('/test/src'));
});

test('parser - pattern rules skipped', () => {
  const stdout = `# Files
%.o: %.c
	gcc -c $<

app: main.o
main.o: main.c
main.c:`;

  const result = parseMakePrintDatabase(stdout, 'app', '/test');
  assert.ok(!result.fileDeps.has('/test/%.o'));
  assert.ok(!result.fileDeps.has('/test/%.c'));
  assert.ok(result.fileDeps.has('/test/main.c'));
});

test('parser - default target', () => {
  const stdout = `# Files
all: app
app: main.c
main.c:`;

  const result = parseMakePrintDatabase(stdout, '', '/test');
  assert.ok(!result.targetFound); // empty string target not in graph
});

test('parser - circular dependencies', () => {
  const stdout = `# Files
a: b
b: a`;

  const result = parseMakePrintDatabase(stdout, 'a', '/test');
  assert.ok(result.targetFound);
  // Should not hang; BFS visited set handles cycles
});

test('parser - multiple phony declarations', () => {
  const stdout = `# Variables

# Files
.PHONY: clean
.PHONY: all rebuild
all: app
app: main.c
main.c:`;

  const result = parseMakePrintDatabase(stdout, 'all', '/test');
  assert.ok(result.fileDeps.has('/test/main.c'));
  assert.ok(!result.fileDeps.has('/test/all'));
});
