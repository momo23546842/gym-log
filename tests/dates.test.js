import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toKey, fromKey, addDays, shortDate, countVisits, monthStats, recentWeeklyAverage } from '../src/lib/dates.js';

test('date keys round-trip and handle month ends', () => {
  assert.equal(toKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(toKey(fromKey('2026-11-05')), '2026-11-05');
  assert.equal(toKey(addDays(new Date(2026, 9, 31), 1)), '2026-11-01');
  assert.equal(shortDate('2026-03-09'), '3/9');
});

const days = { '2026-10-01': [], '2026-10-06': [], '2026-10-31': [], '2026-11-03': [], '2026-11-04': [], '2026-11-05': [] };

test('countVisits includes both ends', () => {
  assert.equal(countVisits(days, new Date(2026, 9, 1), new Date(2026, 9, 31)), 3);
  assert.equal(countVisits(days, new Date(2026, 10, 3), new Date(2026, 10, 3)), 1);
});

test('monthStats for a finished month uses every day of it', () => {
  const s = monthStats(days, 2026, 9, new Date(2026, 10, 6));
  assert.equal(s.count, 3);
  assert.equal(s.daysCounted, 31);
  assert.equal(s.partial, false);
  assert.equal(s.perWeek.toFixed(2), (3 / (31 / 7)).toFixed(2));
});

test('monthStats for the current month only counts days up to today', () => {
  const s = monthStats(days, 2026, 10, new Date(2026, 10, 6));
  assert.equal(s.count, 3);
  assert.equal(s.daysCounted, 6);
  assert.equal(s.partial, true);
  assert.equal(s.perWeek.toFixed(1), '3.5');
});

test('monthStats for a future month has no average', () => {
  assert.deepEqual(monthStats(days, 2026, 11, new Date(2026, 10, 6)), { count: 0, perWeek: null, daysCounted: 0, partial: false });
});

test('recentWeeklyAverage covers the four weeks before this week', () => {
  // this week starts Sun 11/1; the four weeks before are 10/4 – 10/31
  assert.equal(recentWeeklyAverage(days, new Date(2026, 10, 6)), 2 / 4);
});
