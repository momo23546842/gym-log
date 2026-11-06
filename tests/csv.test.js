import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, parseCsv, csvCell, toText } from '../src/lib/csv.js';
import { detailText } from '../src/lib/records.js';

const state = {
  days: { '2026-11-02': [], '2026-11-05': ['脚', 'お尻'] },
  logs: {
    '2026-11-05': [
      { n: 'スクワット', sets: [{ kg: 50, r: 10 }, { kg: 45, r: 12 }], memo: '最後きつい, でも満足' },
      { n: 'ランニング', memo: '20分' },
    ],
  },
};

test('CSV export and import round-trip', () => {
  const csv = toCsv(state);
  assert.ok(csv.startsWith('﻿日付,曜日'));
  const back = parseCsv(csv);
  assert.deepEqual(back.days, state.days);
  assert.deepEqual(back.logs, state.logs);
});

test('csvCell quotes commas and quotes, and defuses spreadsheet formulas', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('-2.5'), '-2.5');
  assert.equal(csvCell(50), '50');
});

test('a memo that looks like a formula survives the round-trip unchanged', () => {
  const s = { days: { '2026-11-05': [] }, logs: { '2026-11-05': [{ n: 'メモ', memo: '=1+1' }] } };
  assert.equal(parseCsv(toCsv(s)).logs['2026-11-05'][0].memo, '=1+1');
});

test('parseCsv skips rows without a date and handles CRLF', () => {
  const text = '日付,曜日,部位,種目,セット,重さ(kg),回数,メモ\r\nnot a row\r\n2026-11-01,日,,,,,,\r\n';
  assert.deepEqual(parseCsv(text), { days: { '2026-11-01': [] }, logs: {} });
});

test('toText makes a readable summary', () => {
  const t = toText(state, detailText);
  assert.match(t, /2026\/11\/5（木）ジム　脚・お尻/);
  assert.match(t, /・スクワット　50kg × 10回、45kg × 12回/);
});
