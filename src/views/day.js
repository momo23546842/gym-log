// The selected day, shown below the calendar like a memo: parts, exercises, and the writing form.
import { app } from '../app.js';
import { WEEKDAYS, fromKey, monthDay, shortDate } from '../lib/dates.js';
import { setsOf, formatSet, setsText, detailText, previousSession, lastEntry, compareSessions } from '../lib/records.js';
import { esc } from '../lib/html.js';

const arrow = { up: ' ↑', down: ' ↓', same: '' };

export function dayView() {
  const { state, todayKey, ui } = app;
  const d = fromKey(ui.sel), parts = state.days[ui.sel], done = !!parts, entries = state.logs[ui.sel] || [];
  let h = `<div class="card" id="card"><div class="dayttl"><h2>${monthDay(d)}（${WEEKDAYS[d.getDay()]}）${ui.sel === todayKey ? '<span class="tg">今日</span>' : ''}</h2>${done ? '<button class="link" id="check">チェックを外す</button>' : ''}</div>`;
  if (ui.confirmUncheck === ui.sel) h += '<p class="warn">チェックを外すと、この日の種目メモも消えます。よければもう一度押してください。</p>';
  if (!done) return h + '<p class="noent">この日はジムの記録がありません。</p><button class="primary" id="check">この日ジムに行った</button></div>';

  h += '<div><p class="plabel">鍛えた部位（いくつでも選べます）</p><div class="chips">';
  h += state.parts.map((p) => { const on = parts.includes(p); return `<button class="chip${on ? ' on' : ''}" data-part="${esc(p)}" aria-pressed="${on}">${esc(p)}</button>`; }).join('');
  if (!ui.addingPart) h += '<button class="chip add" id="addOpen">＋ 部位を追加</button>';
  h += '</div>';
  if (ui.addingPart) h += '<form class="addpart" id="addForm"><input id="newPart" maxlength="10" placeholder="例：ふくらはぎ" aria-label="追加する部位の名前"><button type="submit">追加</button></form>';
  h += '</div><div class="memo"><p class="plabel">やったこと</p>';

  if (entries.length) {
    h += '<ul class="memolist">';
    entries.forEach((e, i) => {
      const sets = setsOf(e);
      const same = sets.length < 2 || sets.every((x) => x.kg === sets[0].kg && x.r === sets[0].r);
      h += `<li${ui.editIdx === i ? ' class="editing"' : ''}><div class="mhead"><span class="mn">${esc(e.n)}</span><button class="link" data-edit="${i}">${ui.editIdx === i ? '編集中' : '編集'}</button></div>`;
      if (sets.length) h += same ? `<div class="ml">${esc(setsText(e))}</div>` : sets.map((x, j) => `<div class="ml">${j + 1}セット目　${esc(formatSet(x) || '—')}</div>`).join('');
      if (e.memo) h += `<div class="ml note">${esc(e.memo)}</div>`;
      const prev = previousSession(state.logs, e.n, ui.sel);
      const diff = prev ? compareSessions(e, prev.entry) : null;
      if (diff) h += `<div class="cmpline ${diff.trend}">前回（${shortDate(prev.key)}）より ${esc(diff.text)}${arrow[diff.trend]}</div>`;
      else if (!prev && sets.length) h += '<div class="cmpline same">はじめての記録</div>';
      h += '</li>';
    });
    h += '</ul>';
  } else if (!ui.formOpen) h += '<p class="noent">まだ何も書いていません。</p>';

  h += ui.formOpen ? formView() : '<button class="addset" id="openForm">＋ 種目を書く</button>';
  return h + '</div></div>';
}

export function previousHint() {
  const { state, ui } = app;
  const r = ui.draft.n ? lastEntry(state.logs, ui.draft.n, ui.sel) : null;
  if (!r) return '';
  const text = esc(`前回（${shortDate(r.key)}）：${detailText(r.entry)}`);
  return setsOf(r.entry).length ? `${text} <button type="button" class="copyprev" id="copyPrev">前回と同じセットを入れる</button>` : text;
}

function formView() {
  const { state, ui } = app;
  const { draft } = ui, ex = state.exercises, editing = ui.editIdx >= 0;
  let h = `<form class="entform" id="entForm"><p class="plabel">${editing ? `「${esc(state.logs[ui.sel][ui.editIdx].n)}」を直す` : '種目を書く'}</p>`;
  if (ex.length) {
    h += '<div><p class="plabel2">種目を選ぶ</p><div class="chips" id="exChips">' +
      ex.map((n) => `<button type="button" class="chip${draft.n === n ? ' on' : ''}" data-ex="${esc(n)}" aria-pressed="${draft.n === n}">${esc(n)}</button>`).join('') + '</div></div>';
  }
  h += `<div class="frow"><label class="grow" for="e-n">${ex.length ? '新しい種目を追加' : '種目'}<input id="e-n" maxlength="30" placeholder="例：スクワット" autocomplete="off" value="${ex.includes(draft.n) ? '' : esc(draft.n)}"></label></div>`;
  h += `<div class="prev" id="e-prev">${editing ? '' : previousHint()}</div><div class="sets">`;
  draft.sets.forEach((x, i) => {
    h += `<div class="setrow"><span class="sn">${i + 1}セット目</span>
      <label for="s-kg-${i}">重さ (kg)<input class="num" id="s-kg-${i}" data-si="${i}" data-sf="kg" type="number" inputmode="decimal" step="0.5" min="0" value="${esc(x.kg)}"></label>
      <label for="s-r-${i}">回数<input class="num" id="s-r-${i}" data-si="${i}" data-sf="r" type="number" inputmode="numeric" min="0" value="${esc(x.r)}"></label>
      ${draft.sets.length > 1 ? `<button type="button" class="rm" data-rmset="${i}" aria-label="${i + 1}セット目を消す">×</button>` : ''}</div>`;
  });
  h += `</div><button type="button" class="addset" id="addSet">＋ セットを追加</button>
    <div class="frow"><label class="grow" for="e-memo">メモ（任意）<input id="e-memo" maxlength="80" placeholder="例：ランニング20分、最後きつかった" value="${esc(draft.memo)}"></label></div>
    <div class="frow"><button type="submit" class="primary">${editing ? '保存する' : '書く'}</button><button type="button" class="ghost" id="cancelForm">やめる</button>
    ${editing ? `<button type="button" class="link danger" data-delent="${ui.editIdx}" data-c="0">この種目を消す</button>` : ''}</div></form>`;
  return h;
}
