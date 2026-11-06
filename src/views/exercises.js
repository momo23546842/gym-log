// Per-exercise history: list of sessions, weight chart, personal best, and a two-day comparison.
import { app } from '../app.js';
import { WEEKDAYS, fromKey, shortDate } from '../lib/dates.js';
import { setsOf, formatSet, setsText, sessionsOf, bestSet, compareSessions, personalBest } from '../lib/records.js';
import { esc } from '../lib/html.js';
import { niceScale } from '../lib/chart.js';

/** The exercise to show by default: the first one written on the latest day. */
function defaultExercise(state) {
  const lastKey = Object.keys(state.logs).sort().pop();
  return (lastKey && state.logs[lastKey][0] && state.logs[lastKey][0].n) || state.exercises[0];
}

export function exercisesView() {
  const { state, ui } = app;
  if (!state.exercises.length) return '';
  if (!ui.exSel || !state.exercises.includes(ui.exSel)) ui.exSel = defaultExercise(state);
  const sessions = sessionsOf(state.logs, ui.exSel);
  ui.compare = ui.compare.filter((k) => sessions.some((s) => s.key === k));

  let h = '<section class="exsec" id="exsec"><h2>種目ごとの記録</h2><div class="chips">' +
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
      h += `<li class="${on ? 'picked' : ''}"><button class="link goto" data-goto="${s.key}">${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）</button>
        <div class="exd">${esc(setsText(s.entry) || '—')}${s.entry.memo ? `<span class="exm">${esc(s.entry.memo)}</span>` : ''}</div>
        <span class="cmpchip ${diff ? diff.trend : 'none'}">${diff ? esc(diff.text) : i === 0 ? 'はじめて' : ''}</span>
        <button class="cmpbtn${on ? ' on' : ''}" data-cmp="${s.key}" aria-pressed="${on}">${on ? '✓ 比べる' : '比べる'}</button></li>`;
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
  const W = 600, H = 200, left = 52, right = 14, top = 16, bottom = 34;
  const { min, max, ticks } = niceScale(Math.min(...points.map((p) => p.v)), Math.max(...points.map((p) => p.v)));
  const X = (i) => left + (i * (W - left - right)) / (points.length - 1);
  const Y = (v) => top + (1 - (v - min) / (max - min)) * (H - top - bottom);
  const line = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const grid = ticks.map((v) =>
    `<line x1="${left}" x2="${W - right}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="cg"/><text x="${left - 6}" y="${(Y(v) + 7).toFixed(1)}" text-anchor="end" class="ct">${Math.round(v * 10) / 10}</text>`).join('');
  const dots = points.map((p, i) => { const isPb = pb && p.key === pb.key;
    return `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${isPb ? 5 : 3}" class="${isPb ? 'cpb' : 'cd'}"><title>${shortDate(p.key)} ${p.v}kg</title></circle>`; }).join('');
  const area = `<polygon points="${X(0).toFixed(1)},${H - bottom} ${line} ${X(points.length - 1).toFixed(1)},${H - bottom}" class="ca"/>`;
  return `<div class="chartwrap"><p class="plabel2">その日いちばん重かったセット（kg）</p><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(app.ui.exSel)}の重さの推移">${grid}${area}<polyline points="${line}" class="cl"/>${dots}
    <text x="${X(0)}" y="${H - 6}" class="ct" text-anchor="start">${shortDate(points[0].key)}</text><text x="${X(points.length - 1)}" y="${H - 6}" class="ct" text-anchor="end">${shortDate(points[points.length - 1].key)}</text></svg></div>`;
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
