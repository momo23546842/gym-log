// App state: the saved records (state) plus what's on screen right now (ui).
import { toKey, startOfDay } from './lib/dates.js';
import * as storage from './storage.js';

const today = startOfDay(new Date());

export const app = {
  state: storage.load(),
  today,
  todayKey: toKey(today),
  ui: {
    /** month shown in the calendar */
    view: new Date(today.getFullYear(), today.getMonth(), 1),
    /** selected day ("YYYY-MM-DD") */
    sel: toKey(today),
    formOpen: false,
    /** index of the entry being edited, -1 when writing a new one */
    editIdx: -1,
    draft: emptyDraft(),
    addingPart: false,
    /** day key waiting for a second tap before its records are deleted */
    confirmUncheck: null,
    /** exercise shown in the per-exercise section */
    exSel: null,
    /** up to two day keys picked for comparison */
    compare: [],
    renaming: false,
    confirmExRemove: false,
    pendingImport: null,
    statusMsg: '',
  },
};

export function emptyDraft() {
  return { n: '', sets: [{ kg: '', r: '' }], memo: '' };
}

export function closeForm() {
  app.ui.formOpen = false;
  app.ui.editIdx = -1;
  app.ui.draft = emptyDraft();
}

let renderFn = () => {};
export function setRenderer(fn) { renderFn = fn; }
export function render() { renderFn(); }

/** Save after every change, then redraw. */
export function changed() {
  app.ui.statusMsg = storage.save(app.state)
    ? ''
    : 'このブラウザでは保存できませんでした。プライベートブラウズを使っていないか確かめてください。';
  render();
}
