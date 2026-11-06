// Backup to CSV / text, and reading a CSV back in.
import { app } from '../app.js';

export function backupView() {
  const { pendingImport, statusMsg } = app.ui;
  let h = `<section class="backup"><h2>記録の保存</h2><p class="note2">記録はこの端末の中にあります。CSVで保存しておけば、別のスマホやブラウザでも「CSVから読み込む」で元に戻せます。</p>
    <div class="frow"><button class="ghost" id="dlCsv">CSVファイルで保存</button><button class="ghost" id="copyText">テキストでコピー</button>
    <label class="ghost filebtn" for="csvIn">CSVから読み込む<input type="file" id="csvIn" accept=".csv,text/csv"></label></div>`;
  if (pendingImport) {
    h += `<div class="notice"><span>${Object.keys(pendingImport.days).length}日分の記録を読み込みます。今の記録は置き換わります。</span><button class="primary" id="doImport">読み込む</button><button class="ghost" id="cancelImport">やめる</button></div>`;
  }
  h += '<p class="note2" id="bkmsg"></p></section>';
  h += `<div class="status" id="status">${statusMsg || '記録はこの端末のブラウザの中だけに保存されます。機種変更などに備えて、ときどき「CSVファイルで保存」をしておくと安心です。'}</div>`;
  return h;
}

export function backupMessage(msg) {
  const el = document.getElementById('bkmsg');
  if (el) el.textContent = msg;
}
