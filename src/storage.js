// Records stay on this device, in the browser's localStorage. Nothing is sent anywhere.
import { normalizeState } from './lib/records.js';

const KEY = 'gym-log-v1';

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return normalizeState(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeState({});
  }
}

/** @returns {boolean} false when the browser refused (for example in private browsing) */
export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
