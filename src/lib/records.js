// Training records: sets, sessions, comparisons.
//
// state.logs = { "YYYY-MM-DD": [ { n: "スクワット", sets: [{kg: 50, r: 10}, ...], memo?: "..." } ] }
// Older entries were saved as { n, kg, r, s } (one weight/reps for s sets); setsOf() reads both.

export const DEFAULT_PARTS = ['脚', '胸', '背中', 'お尻', '肩', '腕', 'お腹', '有酸素'];

/** @returns {{kg?:number, r?:number}[]} */
export function setsOf(entry) {
  if (entry.sets) return entry.sets;
  if (entry.kg == null && !entry.r) return [];
  return Array.from({ length: entry.s || 1 }, () => ({ kg: entry.kg, r: entry.r }));
}

const round1 = (v) => Math.round(v * 10) / 10;

/** "50kg × 10回" */
export function formatSet(set) {
  return [set.kg != null ? `${round1(set.kg)}kg` : '', set.r ? `${set.r}回` : ''].filter(Boolean).join(' × ');
}

/** Consecutive identical sets are grouped: "50kg × 10回 × 2セット、40kg × 12回" */
export function setsText(entry) {
  const s = setsOf(entry);
  const out = [];
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1].kg === s[i].kg && s[j + 1].r === s[i].r) j++;
    const t = formatSet(s[i]);
    if (t) out.push(t + (j > i ? ` × ${j - i + 1}セット` : ''));
    i = j + 1;
  }
  return out.join('、');
}

export function detailText(entry) {
  const t = setsText(entry);
  return t + (entry.memo ? (t ? '　' : '') + entry.memo : '');
}

/**
 * Everything done for one exercise, one item per day, oldest first.
 * If the same exercise was written twice on a day, the sets are joined.
 */
export function sessionsOf(logs, name) {
  const out = [];
  for (const key of Object.keys(logs).sort()) {
    let sets = [];
    const memos = [];
    for (const e of logs[key]) {
      if (e.n !== name) continue;
      sets = sets.concat(setsOf(e));
      if (e.memo) memos.push(e.memo);
    }
    if (sets.length || memos.length) out.push({ key, entry: { n: name, sets, memo: memos.join(' ') } });
  }
  return out;
}

export function previousSession(logs, name, beforeKey) {
  const s = sessionsOf(logs, name).filter((x) => x.key < beforeKey);
  return s.length ? s[s.length - 1] : null;
}

/** The last single entry for an exercise before a day (used to copy the previous sets). */
export function lastEntry(logs, name, beforeKey) {
  const keys = Object.keys(logs).filter((k) => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const l = logs[k];
    for (let j = l.length - 1; j >= 0; j--) if (l[j].n === name) return { key: k, entry: l[j] };
  }
  return null;
}

/** Heaviest set; between equal weights, the one with more reps. Sets without a weight count as lightest. */
export function bestSet(entry) {
  let best = null;
  for (const x of setsOf(entry)) {
    if (!best) { best = x; continue; }
    const bk = best.kg == null ? -1 : best.kg;
    const xk = x.kg == null ? -1 : x.kg;
    if (xk > bk || (xk === bk && (x.r || 0) > (best.r || 0))) best = x;
  }
  return best;
}

/**
 * Compare the best set of two sessions: weight first, and reps when the weight is the same.
 * @returns {{text:string, trend:'up'|'down'|'same'}|null} null when they can't be compared
 */
export function compareSessions(current, previous) {
  const a = bestSet(current);
  const b = bestSet(previous);
  if (!a || !b) return null;
  const ak = a.kg ?? null;
  const bk = b.kg ?? null;
  if (ak != null && bk != null && ak !== bk) {
    const d = round1(ak - bk);
    return { text: `${d > 0 ? '+' : ''}${d}kg`, trend: d > 0 ? 'up' : 'down' };
  }
  if (ak === bk && (a.r || 0) !== (b.r || 0)) {
    const r = (a.r || 0) - (b.r || 0);
    return { text: `${ak != null ? `${round1(ak)}kgで` : ''}${r > 0 ? '+' : ''}${r}回`, trend: r > 0 ? 'up' : 'down' };
  }
  if (ak === bk) return { text: '前回と同じ', trend: 'same' };
  return null;
}

/** The session with the heaviest best set (more reps wins a tie). */
export function personalBest(sessions) {
  let pb = null;
  for (const s of sessions) {
    const b = bestSet(s.entry);
    if (!b || b.kg == null) continue;
    if (!pb || b.kg > pb.set.kg || (b.kg === pb.set.kg && (b.r || 0) > (pb.set.r || 0))) pb = { key: s.key, set: b };
  }
  return pb;
}

/** Fill in missing fields and collect exercise names that appear in the logs. Mutates and returns state. */
export function normalizeState(state) {
  if (!state.days) state.days = {};
  if (!state.parts) state.parts = DEFAULT_PARTS.slice();
  if (!state.logs) state.logs = {};
  if (!Array.isArray(state.exercises)) state.exercises = [];
  for (const k of Object.keys(state.logs).sort()) {
    for (const e of state.logs[k] || []) if (e.n && !state.exercises.includes(e.n)) state.exercises.push(e.n);
  }
  for (const k of Object.keys(state.days)) if (!Array.isArray(state.days[k])) state.days[k] = [];
  return state;
}

/** Rename an exercise everywhere. Renaming onto an existing name merges the two. */
export function renameExercise(state, from, to) {
  if (!to || to === from) return;
  for (const k of Object.keys(state.logs)) for (const e of state.logs[k]) if (e.n === from) e.n = to;
  const i = state.exercises.indexOf(from);
  if (state.exercises.includes(to)) state.exercises.splice(i, 1);
  else state.exercises[i] = to;
}
