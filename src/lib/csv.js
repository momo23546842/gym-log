// CSV backup: one row per set, so the file opens cleanly in Google Sheets or Excel.
import { WEEKDAYS, fromKey } from './dates.js';
import { setsOf } from './records.js';

export const HEADER = ['日付', '曜日', '部位', '種目', 'セット', '重さ(kg)', '回数', 'メモ'];

/** Quote when needed; prefix text that a spreadsheet would run as a formula. */
export function csvCell(value) {
  let v = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(state) {
  const rows = [HEADER];
  for (const k of Object.keys(state.days).sort()) {
    const wd = WEEKDAYS[fromKey(k).getDay()];
    const parts = state.days[k].join('・');
    const entries = state.logs[k] || [];
    if (!entries.length) rows.push([k, wd, parts, '', '', '', '', '']);
    for (const e of entries) {
      const sets = setsOf(e);
      if (!sets.length) rows.push([k, wd, parts, e.n, '', '', '', e.memo || '']);
      sets.forEach((x, j) => rows.push([k, wd, parts, e.n, j + 1, x.kg ?? '', x.r || '', j === 0 ? e.memo || '' : '']));
    }
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function splitRows(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const unguard = (v) => (/^'[=+\-@]/.test(v) ? v.slice(1) : v);

/** Read a CSV made by toCsv() back into { days, logs }. Rows that don't start with a date are skipped. */
export function parseCsv(text) {
  const rows = splitRows(text.replace(/^﻿/, ''));
  const days = {}, logs = {}, current = {};
  for (const r of rows.slice(1)) {
    const k = (r[0] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    days[k] = unguard(r[2] || '').split('・').filter(Boolean);
    const name = unguard((r[3] || '').trim());
    if (!name) continue;
    const list = (logs[k] = logs[k] || []);
    const setNo = Number(r[4]) || 0;
    if (setNo <= 1 || !current[k] || current[k].n !== name) { current[k] = { n: name }; list.push(current[k]); }
    const e = current[k];
    const set = {};
    if ((r[5] || '').trim() !== '') set.kg = Number(r[5]);
    if ((r[6] || '').trim() !== '') set.r = Number(r[6]);
    if (setNo && (set.kg != null || set.r != null)) (e.sets = e.sets || []).push(set);
    const memo = unguard((r[7] || '').trim());
    if (memo) e.memo = (e.memo ? e.memo + ' ' : '') + memo;
  }
  return { days, logs };
}

/** Plain-text summary for pasting into a notes app. */
export function toText(state, detailText) {
  const out = [];
  for (const k of Object.keys(state.days).sort()) {
    const d = fromKey(k);
    const parts = state.days[k];
    out.push(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）ジム${parts.length ? '　' + parts.join('・') : ''}`);
    for (const e of state.logs[k] || []) out.push(`・${e.n}${detailText(e) ? '　' + detailText(e) : ''}`);
  }
  return out.join('\n');
}
