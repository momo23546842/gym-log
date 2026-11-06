import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceScale } from '../src/lib/chart.js';

test('niceScale gives round ticks that cover the data', () => {
  assert.deepEqual(niceScale(40, 57.5), { min: 40, max: 60, ticks: [40, 50, 60] });
  assert.deepEqual(niceScale(48, 55).ticks, [47.5, 50, 52.5, 55]);
  assert.deepEqual(niceScale(20, 20).ticks, [15, 20, 25]);
  assert.deepEqual(niceScale(2.5, 9).ticks, [2.5, 5, 7.5, 10]);
  for (const [lo, hi] of [[40, 57.5], [3, 4], [100, 180]]) {
    const s = niceScale(lo, hi);
    assert.ok(s.min <= lo && s.max >= hi, `${lo}-${hi} is covered`);
    assert.ok(s.ticks.length >= 2 && s.ticks.length <= 5, `${lo}-${hi} has 2–5 ticks`);
  }
});
