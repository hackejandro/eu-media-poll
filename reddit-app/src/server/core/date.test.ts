import assert from 'node:assert/strict';
import test from 'node:test';
import { brusselsDay, isBrusselsPublishHour, shiftDay } from './date.ts';

test('uses the Brussels calendar around midnight', () => {
  assert.equal(brusselsDay(new Date('2026-09-06T22:30:00Z')), '2026-09-07');
});

test('moves safely across month boundaries', () => {
  assert.equal(shiftDay('2026-09-01', -1), '2026-08-31');
});

test('recognises 06:00 Brussels in summer and winter', () => {
  assert.equal(isBrusselsPublishHour(new Date('2026-07-01T04:00:00Z')), true);
  assert.equal(isBrusselsPublishHour(new Date('2026-07-01T05:00:00Z')), false);
  assert.equal(isBrusselsPublishHour(new Date('2026-12-01T05:00:00Z')), true);
  assert.equal(isBrusselsPublishHour(new Date('2026-12-01T04:00:00Z')), false);
});
