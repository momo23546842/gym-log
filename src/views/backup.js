// Backup to CSV / text, and reading a CSV back in (shown on the 分析 and 設定 screens).
import { app } from '../app.js';
import { icon } from '../lib/icons.js';

export function backupView() {
  const { pendingImport } = app.ui;
  let h = `<section class="backup" id="backup"><h2>${icon('download')}記録の保存</h2><p class="note2">記録はこの端末の中にあります。CSVで保存しておけば、別のスマホやブラウザでも「CSVから読み込む」で元に戻せます。</p>
    <div class="bkrow"><button class="obtn" id="dlCsv">${icon('download')}CSVファイルで保存</button><button class="obtn" id="copyText">${icon('copy')}テキストでコピー</button>
    <label class="obtn filebtn" for="csvIn">${icon('upload')}CSVから読み込む<input type="file" id="csvIn" accept=".csv,text/csv"></label></div>`;
  if (pendingImport) {
    h += `<div class="notice"><span>${Object.keys(pendingImport.days).length}日分の記録を読み込みます。今の記録は置き換わります。</span><button class="primary" id="doImport">読み込む</button><button class="ghost" id="cancelImport">やめる</button></div>`;
  }
  return h + '<p class="note2" id="bkmsg"></p></section>';
}

export function statusView() {
  const { statusMsg } = app.ui;
  return `<div class="status" id="status">${statusMsg || '記録はこの端末のブラウザの中だけに保存されます。機種変更などに備えて、ときどき「CSVファイルで保存」をしておくと安心です。'}</div>`;
}

export function backupMessage(msg) {
  const el = document.getElementById('bkmsg');
  if (el) el.textContent = msg;
}
