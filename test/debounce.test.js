import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { makeDebounce } from '../src/debounce.js';

test('debounce - fires once after delay', async () => {
  let callCount = 0;
  const debounced = makeDebounce(() => {
    callCount++;
  }, 50);

  debounced();
  debounced();
  debounced();

  assert.equal(callCount, 0, 'should not call immediately');

  await new Promise((r) => setTimeout(r, 100));
  assert.equal(callCount, 1, 'should call once after delay');
});

test('debounce - resets timer on new call', async () => {
  let callCount = 0;
  const debounced = makeDebounce(() => {
    callCount++;
  }, 50);

  debounced();
  await new Promise((r) => setTimeout(r, 30));
  debounced();
  await new Promise((r) => setTimeout(r, 30));

  assert.equal(callCount, 0, 'should not have called yet');

  await new Promise((r) => setTimeout(r, 50));
  assert.equal(callCount, 1, 'should have called once');
});

test('debounce - passes arguments', async () => {
  let captured = null;
  const debounced = makeDebounce((arg) => {
    captured = arg;
  }, 30);

  debounced('test value');

  await new Promise((r) => setTimeout(r, 50));
  assert.equal(captured, 'test value');
});

test('debounce - multiple independent instances', async () => {
  let count1 = 0;
  let count2 = 0;

  const debounced1 = makeDebounce(() => {
    count1++;
  }, 30);

  const debounced2 = makeDebounce(() => {
    count2++;
  }, 30);

  debounced1();
  debounced1();
  debounced2();
  debounced2();

  await new Promise((r) => setTimeout(r, 50));
  assert.equal(count1, 1);
  assert.equal(count2, 1);
});
