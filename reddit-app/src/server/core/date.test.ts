import assert from 'node:assert/strict';
import test from 'node:test';
import { brusselsDay, shiftDay } from './date.ts';

test('uses the Brussels calendar around midnight', () => {
  assert.equal(brusselsDay(new Date('2026-09-06T22:30:00Z')), '2026-09-07');
});

test('moves safely across month boundaries', () => {
  assert.equal(shiftDay('2026-09-01', -1), '2026-08-31');
});
