// Header counts, today's check button, and the month calendar.
import { app } from '../app.js';
import { WEEKDAYS, toKey, addDays, countVisits, monthStats, recentWeeklyAverage, monthDay } from '../lib/dates.js';
import { esc } from '../lib/html.js';

export function headerView() {
  const { state, today, todayKey, ui } = app;
  const weekStart = addDays(today, -today.getDay());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let h = `<header><h1>ジム記録</h1><div class="pills">
    <div class="pill"><b>${countVisits(state.days, weekStart, today)}回</b>今週</div>
    <div class="pill"><b>${countVisits(state.days, monthStart, today)}回</b>今月</div>
    <div class="pill"><b>${recentWeeklyAverage(state.days, today).toFixed(1)}回</b>直近4週の週平均</div></div></header>`;
  if (state.sample) {
    h += '<div class="notice"><span>いま入っている記録はサンプルです。自分の記録を始めるときは消してください。</span><button class="ghost" id="clearSample">サンプルを消す</button></div>';
  }
  const done = !!state.days[todayKey];
  h += `<button class="check${done ? ' done' : ''}" id="checkToday" aria-pressed="${done}"><span class="box"></span>${done ? '今日はジムに行きました' : '今日ジムに行ったらチェック'}</button>`;
  if (ui.confirmUncheck === todayKey && ui.sel !== todayKey) {
    h += '<p class="warn">チェックを外すと、今日の種目メモも消えます。よければもう一度押してください。</p>';
  }
  return h;
}

export function calendarView() {
  const { state, today, todayKey, ui } = app;
  const y = ui.view.getFullYear(), m = ui.view.getMonth();
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const gridStart = addDays(first, -first.getDay());
  const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);

  const st = monthStats(state.days, y, m, today);
  let h = `<section><div class="monthbar"><button class="nav" id="prev" aria-label="前の月">‹</button><h2>${y}年${m + 1}月</h2><button class="nav" id="next" aria-label="次の月">›</button></div>`;
  h += `<div class="mstats">
    <div class="ms"><span class="ml2">${m + 1}月に行った回数</span><b>${st.count}<small>回</small></b></div>
    <div class="ms"><span class="ml2">${m + 1}月の週平均</span><b>${st.perWeek == null ? '—' : st.perWeek.toFixed(1) + '<small>回</small>'}</b></div>
    ${st.partial ? `<p class="msnote">${monthDay(today)}までの${st.daysCounted}日間で計算</p>` : ''}</div>`;

  h += '<div class="cal">' + WEEKDAYS.map((w, i) => `<div class="wd${i === 0 ? ' sun' : ''}">${w}</div>`).join('') + '<div class="wd">週</div>';
  for (let w = 0; w < weeks; w++) {
    let c = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(gridStart, w * 7 + i), k = toKey(d), parts = state.days[k], future = d > today;
      if (parts) c++;
      const cls = ['day', d.getMonth() !== m && 'other', k === todayKey && 'today', future && 'future', k === ui.sel && 'sel'].filter(Boolean).join(' ');
      h += `<button class="${cls}"${future ? ' disabled' : ` data-day="${k}"`} aria-label="${monthDay(d)}${parts ? ' ジム ' + esc(parts.join('、')) : ''}"><span class="n">${d.getDate()}</span>`;
      if (parts) h += `<span class="marks"><span class="band">ジム</span>${parts.length ? `<span class="parts">${esc(parts.join('・'))}</span>` : ''}</span>`;
      h += '</button>';
    }
    h += `<div class="wk${c ? '' : ' zero'}"><span><b>${c}</b><br>回</span></div>`;
  }
  h += '</div>';

  const tally = {};
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) for (const p of state.days[toKey(d)] || []) tally[p] = (tally[p] || 0) + 1;
  const names = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
  h += `<div class="tally"><span class="t">${m + 1}月の部位</span>${names.length ? names.map((p) => `<span>${esc(p)} <b>${tally[p]}回</b></span>`).join('') : '<span class="t">まだありません</span>'}</div></section>`;
  return h;
}
