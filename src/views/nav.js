// Fixed bottom navigation and the top bar of the sub-screens.
import { app } from '../app.js';
import { icon } from '../lib/icons.js';

export const SCREENS = [
  { id: 'home', icon: 'house', label: 'ホーム' },
  { id: 'rec', icon: 'dumbbell', label: '記録', title: '記録' },
  { id: 'ana', icon: 'chart-no-axes-column', label: '分析', title: '種目ごとの記録' },
  { id: 'set', icon: 'settings', label: '設定', title: '設定' },
];

export function navView() {
  return '<ul>' + SCREENS.map((s) => {
    const on = app.ui.screen === s.id;
    return `<li><button type="button" data-nav="${s.id}" aria-current="${on}"><span class="tile">${icon(s.icon)}${s.label}</span></button></li>`;
  }).join('') + '</ul>';
}

export function topbarView() {
  const s = SCREENS.find((x) => x.id === app.ui.screen);
  return `<div class="topbar"><button class="back" id="goHome" aria-label="ホームに戻る">${icon('chevron-left')}</button><h1>${s.title}</h1><span></span></div>`;
}
