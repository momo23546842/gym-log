import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setsOf, formatSet, setsText, sessionsOf, previousSession, lastEntry,
  bestSet, compareSessions, personalBest, normalizeState, renameExercise,
} from '../src/lib/records.js';

test('setsOf reads both the current and the older entry format', () => {
  assert.deepEqual(setsOf({ n: 'x', sets: [{ kg: 50, r: 10 }] }), [{ kg: 50, r: 10 }]);
  assert.deepEqual(setsOf({ n: 'x', kg: 40, r: 8, s: 3 }), [{ kg: 40, r: 8 }, { kg: 40, r: 8 }, { kg: 40, r: 8 }]);
  assert.deepEqual(setsOf({ n: 'ランニング', memo: '20分' }), []);
});

test('formatSet and setsText group identical consecutive sets', () => {
  assert.equal(formatSet({ kg: 52.5, r: 8 }), '52.5kg × 8回');
  assert.equal(formatSet({ r: 15 }), '15回');
  const e = { sets: [{ kg: 50, r: 10 }, { kg: 50, r: 10 }, { kg: 45, r: 12 }] };
  assert.equal(setsText(e), '50kg × 10回 × 2セット、45kg × 12回');
});

const logs = {
  '2026-10-20': [{ n: 'スクワット', sets: [{ kg: 40, r: 10 }, { kg: 40, r: 10 }] }],
  '2026-11-02': [{ n: 'スクワット', kg: 45, r: 8, s: 3 }, { n: 'ベンチプレス', sets: [{ kg: 20, r: 10 }] }],
  '2026-11-05': [
    { n: 'スクワット', sets: [{ kg: 45, r: 10 }] },
    { n: 'スクワット', sets: [{ kg: 40, r: 12 }], memo: '追加' },
  ],
};

test('sessionsOf gives one item per day, oldest first, joining same-day entries', () => {
  const s = sessionsOf(logs, 'スクワット');
  assert.deepEqual(s.map((x) => x.key), ['2026-10-20', '2026-11-02', '2026-11-05']);
  assert.equal(s[2].entry.sets.length, 2);
  assert.equal(s[2].entry.memo, '追加');
  assert.deepEqual(sessionsOf(logs, 'デッドリフト'), []);
});

test('previousSession and lastEntry only look at earlier days', () => {
  assert.equal(previousSession(logs, 'スクワット', '2026-11-05').key, '2026-11-02');
  assert.equal(previousSession(logs, 'スクワット', '2026-10-20'), null);
  assert.equal(lastEntry(logs, 'ベンチプレス', '2026-11-06').key, '2026-11-02');
});

test('bestSet picks the heaviest set, then the most reps', () => {
  assert.deepEqual(bestSet({ sets: [{ kg: 40, r: 12 }, { kg: 45, r: 8 }, { kg: 45, r: 10 }] }), { kg: 45, r: 10 });
  assert.deepEqual(bestSet({ sets: [{ r: 10 }, { r: 15 }] }), { r: 15 });
  assert.equal(bestSet({ memo: 'only a note' }), null);
});

test('compareSessions: weight first, reps when the weight is the same', () => {
  const at = (kg, r) => ({ sets: [{ kg, r }] });
  assert.deepEqual(compareSessions(at(50, 8), at(45, 10)), { text: '+5kg', trend: 'up' });
  assert.deepEqual(compareSessions(at(42.5, 8), at(45, 8)), { text: '-2.5kg', trend: 'down' });
  assert.deepEqual(compareSessions(at(45, 10), at(45, 8)), { text: '45kgで+2回', trend: 'up' });
  assert.deepEqual(compareSessions(at(45, 8), at(45, 8)), { text: '前回と同じ', trend: 'same' });
  assert.deepEqual(compareSessions({ sets: [{ r: 20 }] }, { sets: [{ r: 15 }] }), { text: '+5回', trend: 'up' });
  assert.equal(compareSessions({ memo: 'x' }, at(45, 8)), null);
  // one has a weight and the other doesn't: not comparable
  assert.equal(compareSessions({ sets: [{ r: 20 }] }, at(45, 8)), null);
});

test('personalBest finds the heaviest session and ignores sets without weight', () => {
  const pb = personalBest(sessionsOf(logs, 'スクワット'));
  assert.equal(pb.key, '2026-11-05');
  assert.deepEqual(pb.set, { kg: 45, r: 10 });
  assert.equal(personalBest([{ key: 'k', entry: { sets: [{ r: 10 }] } }]), null);
});

test('normalizeState fills defaults and collects exercise names from the logs', () => {
  const s = normalizeState({ days: { '2026-11-01': 1 }, logs });
  assert.deepEqual(s.days['2026-11-01'], []);
  assert.deepEqual(s.exercises, ['スクワット', 'ベンチプレス']);
  assert.ok(s.parts.includes('脚'));
  // names already in the list keep their order
  const t = normalizeState({ exercises: ['ベンチプレス'], logs });
  assert.deepEqual(t.exercises, ['ベンチプレス', 'スクワット']);
});

test('renameExercise renames everywhere and merges into an existing name', () => {
  const s = normalizeState({ logs: structuredClone(logs) });
  renameExercise(s, 'スクワット', 'バーベルスクワット');
  assert.deepEqual(s.exercises, ['バーベルスクワット', 'ベンチプレス']);
  assert.equal(s.logs['2026-10-20'][0].n, 'バーベルスクワット');
  renameExercise(s, 'ベンチプレス', 'バーベルスクワット');
  assert.deepEqual(s.exercises, ['バーベルスクワット']);
  assert.equal(sessionsOf(s.logs, 'バーベルスクワット').length, 3);
});
