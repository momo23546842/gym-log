// Entry point: draws the page and handles taps, typing and form submits.
import { app, render, setRenderer, changed, closeForm, emptyDraft } from './app.js';
import { fromKey, toKey } from './lib/dates.js';
import { setsOf, detailText, lastEntry, renameExercise, normalizeState } from './lib/records.js';
import { toCsv, parseCsv, toText } from './lib/csv.js';
import { headerView, calendarView, sampleNotice } from './views/calendar.js';
import { dayView, previousHint } from './views/day.js';
import { exercisesView } from './views/exercises.js';
import { backupView, statusView, backupMessage } from './views/backup.js';
import { navView, topbarView } from './views/nav.js';
import { playCheckFx } from './checkFx.js';

const root = document.getElementById('app');

const nav = document.getElementById('bnav');

/** What each screen shows. Sub-screens get a top bar with a back button. */
const SCREEN_VIEWS = {
  home: () => headerView() + calendarView() + dayView(),
  rec: () => dayView(),
  ana: () => exercisesView() + backupView(),
  set: () => (app.state.sample ? sampleNotice() : '') + backupView(),
};

setRenderer(() => {
  const { screen } = app.ui;
  root.innerHTML = (screen === 'home' ? '' : topbarView()) + SCREEN_VIEWS[screen]() + statusView();
  nav.innerHTML = navView();
  if (app.ui.addingPart) document.getElementById('newPart')?.focus();
});

const ui = app.ui;
const S = () => app.state;
const motion = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/** Ticking a day; unticking a day that has exercise notes needs a second tap. */
function toggleDay(k) {
  const state = S();
  if (state.days[k]) {
    if ((state.logs[k] || []).length && ui.confirmUncheck !== k) { ui.confirmUncheck = k; render(); return; }
    delete state.days[k];
    delete state.logs[k];
    if (k === ui.sel) closeForm();
  } else state.days[k] = [];
  ui.addingPart = false;
  ui.confirmUncheck = null;
  changed();
}

function showDayCard() {
  const card = document.getElementById('card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  if (r.top > window.innerHeight - 120 || r.top < 0) card.scrollIntoView({ behavior: motion(), block: 'start' });
}

/** Switch screens from the bottom nav (or the header / back buttons). */
function go(screen) {
  if (ui.screen !== screen) {
    ui.screen = screen;
    ui.addingPart = false; ui.renaming = false; ui.confirmExRemove = false; ui.confirmUncheck = null;
    render();
  }
  window.scrollTo(0, 0);
}

function selectDay(k) {
  if (ui.sel !== k) closeForm();
  ui.sel = k;
  const d = fromKey(k);
  ui.view = new Date(d.getFullYear(), d.getMonth(), 1);
  ui.addingPart = false;
  ui.confirmUncheck = null;
  render();
  showDayCard();
}

const toDraftSets = (entry) => setsOf(entry).map((x) => ({ kg: x.kg == null ? '' : String(x.kg), r: x.r ? String(x.r) : '' }));
const focusSet = (i) => document.getElementById(`s-kg-${i}`)?.focus();

function downloadCsv() {
  try {
    const url = URL.createObjectURL(new Blob([toCsv(S())], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `ジム記録_${app.todayKey}.csv` });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    backupMessage('CSVファイルを保存しました。GoogleスプレッドシートやExcelで開けます。');
  } catch {
    backupMessage('保存できませんでした。');
  }
}

/** id → handler for buttons identified by id */
const byId = {
  checkToday: (e) => {
    const was = !!S().days[app.todayKey];
    toggleDay(app.todayKey);
    playCheckFx(e, was, !!S().days[app.todayKey]);
  },
  goHome: () => go('home'),
  goAna: () => go('ana'),
  check: () => toggleDay(ui.sel),
  prev: () => { ui.view = new Date(ui.view.getFullYear(), ui.view.getMonth() - 1, 1); render(); },
  next: () => { ui.view = new Date(ui.view.getFullYear(), ui.view.getMonth() + 1, 1); render(); },
  addOpen: () => { ui.addingPart = true; render(); },
  openForm: () => { closeForm(); ui.formOpen = true; render(); document.getElementById('e-n')?.focus(); },
  cancelForm: () => { closeForm(); render(); },
  addSet: () => {
    const last = ui.draft.sets[ui.draft.sets.length - 1];
    ui.draft.sets.push({ kg: last.kg, r: last.r });
    render();
    focusSet(ui.draft.sets.length - 1);
  },
  copyPrev: () => {
    const r = lastEntry(S().logs, ui.draft.n, ui.sel);
    if (r) { ui.draft.sets = toDraftSets(r.entry); render(); focusSet(0); }
  },
  cmpClear: () => { ui.compare = []; render(); },
  renOpen: () => { ui.renaming = true; ui.confirmExRemove = false; render(); const el = document.getElementById('renName'); el?.focus(); el?.select(); },
  renCancel: () => { ui.renaming = false; render(); },
  exRemove: () => {
    if (!ui.confirmExRemove) { ui.confirmExRemove = true; render(); return; }
    S().exercises = S().exercises.filter((n) => n !== ui.exSel);
    ui.exSel = null; ui.compare = []; ui.confirmExRemove = false;
    changed();
  },
  clearSample: () => { const s = S(); s.sample = false; s.days = {}; s.logs = {}; closeForm(); changed(); },
  dlCsv: downloadCsv,
  copyText: () => {
    const text = toText(S(), detailText);
    if (!navigator.clipboard?.writeText) { backupMessage('この画面ではコピーできませんでした。'); return; }
    navigator.clipboard.writeText(text).then(
      () => backupMessage('コピーしました。メモアプリなどに貼り付けて保管できます。'),
      () => backupMessage('コピーできませんでした。'),
    );
  },
  doImport: () => {
    const p = ui.pendingImport;
    if (!p) return;
    ui.pendingImport = null;
    const s = S();
    s.days = p.days; s.logs = p.logs; s.sample = false;
    normalizeState(s);
    for (const k of Object.keys(p.days)) for (const part of p.days[k]) if (!s.parts.includes(part)) s.parts.push(part);
    closeForm();
    changed();
    backupMessage('読み込みました。');
  },
  cancelImport: () => { ui.pendingImport = null; render(); },
};

/** data-attribute → handler for buttons that carry a value */
const byData = [
  ['day', (v) => selectDay(v)],
  ['goto', (v) => { ui.screen = 'home'; selectDay(v); }],
  ['nav', (v) => go(v)],
  ['delent', (v, el) => {
    if (el.dataset.c === '0') { el.dataset.c = '1'; el.textContent = '本当に消す'; return; }
    const list = S().logs[ui.sel];
    list.splice(Number(v), 1);
    if (!list.length) delete S().logs[ui.sel];
    closeForm();
    changed();
  }],
  ['edit', (v) => {
    const i = Number(v), entry = S().logs[ui.sel][i];
    ui.editIdx = i; ui.formOpen = true;
    ui.draft = { n: entry.n, memo: entry.memo || '', sets: toDraftSets(entry) };
    if (!ui.draft.sets.length) ui.draft.sets = emptyDraft().sets;
    render();
    document.getElementById('entForm')?.scrollIntoView({ block: 'nearest' });
  }],
  ['ex', (v) => { ui.draft.n = v; render(); document.getElementById('e-prev')?.scrollIntoView({ block: 'nearest' }); }],
  ['exsel', (v) => { ui.exSel = v; ui.compare = []; ui.renaming = false; ui.confirmExRemove = false; render(); }],
  ['cmp', (v) => {
    const i = ui.compare.indexOf(v);
    if (i >= 0) ui.compare.splice(i, 1);
    else { ui.compare.push(v); if (ui.compare.length > 2) ui.compare.shift(); }
    render();
    if (ui.compare.length === 2) document.querySelector('.cmpbox')?.scrollIntoView({ block: 'nearest' });
  }],
  ['part', (v) => {
    const parts = S().days[ui.sel], i = parts.indexOf(v);
    if (i >= 0) parts.splice(i, 1); else parts.push(v);
    parts.sort((a, b) => S().parts.indexOf(a) - S().parts.indexOf(b));
    changed();
  }],
  ['rmset', (v) => { ui.draft.sets.splice(Number(v), 1); render(); }],
];

document.addEventListener('click', (e) => {
  for (const [name, fn] of byData) {
    const el = e.target.closest(`[data-${name}]`);
    if (el) { fn(el.dataset[name], el); return; }
  }
  const el = e.target.closest('[id]');
  if (el && byId[el.id]) byId[el.id](e);
});

// Typing goes into the draft so a redraw never loses it.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'e-n') {
    ui.draft.n = t.value.trim();
    for (const chip of document.querySelectorAll('#exChips .chip')) {
      const on = chip.dataset.ex === ui.draft.n;
      chip.classList.toggle('on', on);
      chip.setAttribute('aria-pressed', on);
    }
    if (ui.editIdx < 0) document.getElementById('e-prev').innerHTML = previousHint();
  } else if (t.id === 'e-memo') ui.draft.memo = t.value;
  else if (t.dataset?.si != null) ui.draft.sets[Number(t.dataset.si)][t.dataset.sf] = t.value;
});

document.addEventListener('change', (e) => {
  if (e.target.id !== 'csvIn') return;
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseCsv(String(reader.result));
      if (!Object.keys(parsed.days).length) { backupMessage('記録が見つかりませんでした。このページで保存したCSVを選んでください。'); return; }
      ui.pendingImport = parsed;
      render();
    } catch {
      backupMessage('読み込めませんでした。');
    }
  };
  reader.readAsText(file);
});

const onSubmit = {
  entForm: () => {
    const name = ui.draft.n || document.getElementById('e-n').value.trim();
    if (!name) {
      const input = document.getElementById('e-n');
      if (input) { input.focus(); input.placeholder = '種目を選ぶか、名前を入れてください'; }
      return;
    }
    const state = S();
    if (!state.exercises.includes(name)) state.exercises.push(name);
    const entry = { n: name };
    const sets = ui.draft.sets
      .filter((x) => String(x.kg).trim() !== '' || String(x.r).trim() !== '')
      .map((x) => {
        const o = {};
        if (String(x.kg).trim() !== '') o.kg = Number(x.kg);
        if (String(x.r).trim() !== '') o.r = Number(x.r);
        return o;
      });
    if (sets.length) entry.sets = sets;
    if (ui.draft.memo.trim()) entry.memo = ui.draft.memo.trim();
    const list = (state.logs[ui.sel] = state.logs[ui.sel] || []);
    if (ui.editIdx >= 0) list[ui.editIdx] = entry; else list.push(entry);
    closeForm();
    changed();
  },
  renForm: () => {
    const to = document.getElementById('renName').value.trim(), from = ui.exSel;
    ui.renaming = false;
    if (!to || to === from) { render(); return; }
    renameExercise(S(), from, to);
    if (ui.draft.n === from) ui.draft.n = to;
    ui.exSel = to;
    changed();
  },
  addForm: () => {
    const v = document.getElementById('newPart').value.trim();
    ui.addingPart = false;
    if (!v) { render(); return; }
    const state = S();
    if (!state.parts.includes(v)) state.parts.push(v);
    const parts = state.days[ui.sel];
    if (parts && !parts.includes(v)) parts.push(v);
    changed();
  },
};

document.addEventListener('submit', (e) => {
  const fn = onSubmit[e.target.id];
  if (fn) { e.preventDefault(); fn(); }
});

render();

// Keep "today" correct if the app stays open past midnight.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && toKey(new Date()) !== app.todayKey) location.reload();
});
