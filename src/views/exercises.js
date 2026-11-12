// Per-exercise history (the 分析 screen): list of sessions, weight chart, personal best, and a two-day comparison.
import { app } from '../app.js';
import { WEEKDAYS, fromKey, shortDate } from '../lib/dates.js';
import { setsOf, formatSet, setsText, sessionsOf, bestSet, compareSessions, personalBest } from '../lib/records.js';
import { esc } from '../lib/html.js';
import { niceScale } from '../lib/chart.js';
import { icon, iconPaths } from '../lib/icons.js';

const arrow = { up: ' ↑', down: ' ↓', same: '' };

/** The exercise to show by default: the first one written on the latest day. */
function defaultExercise(state) {
  const lastKey = Object.keys(state.logs).sort().pop();
  return (lastKey && state.logs[lastKey][0] && state.logs[lastKey][0].n) || state.exercises[0];
}

export function exercisesView() {
  const { state, ui } = app;
  if (!state.exercises.length) return '<section class="exsec" id="exsec"><p class="noent">まだ種目の記録がありません。ホームで日付を選んで「＋ 種目を書く」から記録すると、ここに重さの推移が出ます。</p></section>';
  if (!ui.exSel || !state.exercises.includes(ui.exSel)) ui.exSel = defaultExercise(state);
  const sessions = sessionsOf(state.logs, ui.exSel);
  ui.compare = ui.compare.filter((k) => sessions.some((s) => s.key === k));

  let h = '<section class="exsec" id="exsec"><div class="chips">' +
    state.exercises.map((n) => `<button class="chip${n === ui.exSel ? ' on' : ''}" data-exsel="${esc(n)}" aria-pressed="${n === ui.exSel}">${esc(n)}</button>`).join('') + '</div>';

  if (!sessions.length) {
    h += `<p class="noent">「${esc(ui.exSel)}」の記録はまだありません。</p>`;
  } else {
    const pb = personalBest(sessions);
    h += `<div class="exsum"><span>${sessions.length}回記録</span>${pb ? `<span>自己ベスト <b>${esc(formatSet(pb.set))}</b>（${shortDate(pb.key)}）</span>` : ''}</div>`;
    h += chartView(sessions, pb);
    h += ui.compare.length === 2 ? compareView(sessions) : '<p class="hint2">「比べる」を2つ選ぶと、その2日を並べて比べられます。</p>';
    h += '<ul class="exlist">';
    sessions.slice().reverse().forEach((s) => {
      const i = sessions.indexOf(s);
      const diff = i > 0 ? compareSessions(s.entry, sessions[i - 1].entry) : null;
      const on = ui.compare.includes(s.key), d = fromKey(s.key);
      // A gain on the personal-best day is shown in the accent colour.
      const cls = diff ? (diff.trend === 'up' && pb && pb.key === s.key ? 'pb' : diff.trend) : i === 0 ? 'first' : 'none';
      const label = diff ? esc(diff.text) + arrow[diff.trend] : i === 0 ? 'はじめて' : '';
      h += `<li class="${on ? 'picked' : ''}"><button class="link goto" data-goto="${s.key}">${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）</button>
        <div class="exd">${esc(setsText(s.entry) || '—').split('、').join('<br>')}${s.entry.memo ? `<span class="exm">${esc(s.entry.memo)}</span>` : ''}</div>
        <span class="cmpchip ${cls}">${label}</span>
        <button class="cmpbtn${on ? ' on' : ''}" data-cmp="${s.key}" aria-pressed="${on}">${on ? icon('check', 'ck') : ''}比べる</button></li>`;
    });
    h += '</ul>';
  }

  if (ui.renaming) {
    h += `<form class="addpart" id="renForm"><input id="renName" maxlength="30" value="${esc(ui.exSel)}" aria-label="新しい名前"><button type="submit">名前を変える</button><button type="button" class="ghost" id="renCancel">やめる</button></form>`;
  } else {
    h += `<div class="exmanage"><button class="link" id="renOpen">「${esc(ui.exSel)}」の名前を変える</button><button class="link danger" id="exRemove">${ui.confirmExRemove ? '本当にリストから外す' : 'リストから外す'}</button></div>`;
    if (ui.confirmExRemove && sessions.length) h += '<p class="warn">リストから外しても、これまでの記録は消えません。</p>';
  }
  return h + '</section>';
}

/** Line chart of the heaviest set per session. Needs at least two sessions with a weight. */
function chartView(sessions, pb) {
  const points = sessions.map((s) => { const b = bestSet(s.entry); return b && b.kg != null ? { key: s.key, v: b.kg } : null; }).filter(Boolean);
  if (points.length < 2) return '';
  const W = 600, H = 210, left = 48, right = 30, top = 24, bottom = 36;
  const { min, max, ticks } = niceScale(Math.min(...points.map((p) => p.v)), Math.max(...points.map((p) => p.v)));
  const X = (i) => left + (i * (W - left - right)) / (points.length - 1);
  const Y = (v) => top + (1 - (v - min) / (max - min)) * (H - top - bottom);
  const line = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const grid = ticks.map((v) =>
    `<line x1="${left}" x2="${W - right}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="cg"/><text x="${left - 6}" y="${(Y(v) + 7).toFixed(1)}" text-anchor="end" class="ct">${Math.round(v * 10) / 10}</text>`).join('');
  // Personal best gets a bigger dot and a small Lucide "sparkles" mark.
  const sparkle = (x, y) => `<svg class="spk" x="${(x + 2).toFixed(1)}" y="${(y - 26).toFixed(1)}" width="20" height="20" viewBox="0 0 24 24">${iconPaths('sparkles')}</svg>`;
  const dots = points.map((p, i) => { const isPb = pb && p.key === pb.key, x = X(i), y = Y(p.v);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isPb ? 7 : 4.5}" class="${isPb ? 'cpb' : 'cd'}"><title>${shortDate(p.key)} ${p.v}kg</title></circle>${isPb ? sparkle(x, y) : ''}`; }).join('');
  const area = `<polygon points="${X(0).toFixed(1)},${H - bottom} ${line} ${X(points.length - 1).toFixed(1)},${H - bottom}" class="ca"/>`;
  // Date labels: up to about five, always including the latest.
  const lastI = points.length - 1, step = Math.ceil(points.length / 5);
  const labels = points.map((p, i) => (i === lastI || (i % step === 0 && lastI - i >= step))
    ? `<text x="${X(i).toFixed(1)}" y="${H - 6}" class="ct" text-anchor="middle">${shortDate(p.key)}</text>` : '').join('');
  const defs = '<defs><linearGradient id="exfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--purple);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--purple);stop-opacity:0"/></linearGradient></defs>';
  return `<div class="chartwrap"><p class="plabel2">その日いちばん重かったセット（kg）</p><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(app.ui.exSel)}の重さの推移">${defs}${grid}${area}<polyline points="${line}" class="cl"/>${dots}${labels}</svg></div>`;
}

function compareView(sessions) {
  const [k1, k2] = app.ui.compare.slice().sort();
  const A = sessions.find((s) => s.key === k1), B = sessions.find((s) => s.key === k2);
  const a = bestSet(A.entry), b = bestSet(B.entry);
  const num = (v, unit) => (v == null ? '—' : Math.round(v * 10) / 10 + unit);
  const diff = (x, y, unit) => {
    if (x == null || y == null) return '';
    const d = Math.round((y - x) * 10) / 10;
    return `<span class="cmpchip ${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}">${d > 0 ? '+' : d < 0 ? '' : '±'}${d}${unit}</span>`;
  };
  const setsA = setsOf(A.entry), setsB = setsOf(B.entry);
  const list = (key, sets) => `<div><b>${shortDate(key)}</b><ol>${sets.map((x) => `<li>${esc(formatSet(x) || '—')}</li>`).join('')}</ol></div>`;
  return `<div class="cmpbox"><div class="cmphead"><b>${shortDate(A.key)} と ${shortDate(B.key)} を比べる</b><button class="link" id="cmpClear">比べるのをやめる</button></div>
    <div class="tablewrap"><table class="cmptable"><thead><tr><th></th><th>${shortDate(A.key)}</th><th>${shortDate(B.key)}</th><th>差</th></tr></thead><tbody>
    <tr><th>いちばん重いセット</th><td>${num(a && a.kg, 'kg')}</td><td>${num(b && b.kg, 'kg')}</td><td>${diff(a && a.kg, b && b.kg, 'kg')}</td></tr>
    <tr><th>そのときの回数</th><td>${num(a && a.r, '回')}</td><td>${num(b && b.r, '回')}</td><td>${diff(a && a.r, b && b.r, '回')}</td></tr>
    <tr><th>セット数</th><td>${setsA.length}</td><td>${setsB.length}</td><td>${diff(setsA.length, setsB.length, '')}</td></tr>
    </tbody></table></div><div class="cmpsets">${list(A.key, setsA)}${list(B.key, setsB)}</div></div>`;
}
