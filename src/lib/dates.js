// Date helpers. Days are stored as local-date keys "YYYY-MM-DD".

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** @param {Date} d */
export function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** @param {string} key "YYYY-MM-DD" */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** "11/5" */
export function shortDate(key) {
  return `${Number(key.slice(5, 7))}/${Number(key.slice(8))}`;
}

/** "11月5日" */
export function monthDay(d) {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** Number of gym days between two dates, both included. */
export function countVisits(days, from, to) {
  let n = 0;
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) if (days[toKey(d)]) n++;
  return n;
}

/**
 * Visits and visits-per-week for one calendar month.
 * For the current month only the days up to today count, so the average
 * isn't dragged down by days that haven't happened yet.
 * @returns {{count:number, perWeek:number|null, daysCounted:number, partial:boolean}}
 */
export function monthStats(days, year, month, today) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  if (first > today) return { count: 0, perWeek: null, daysCounted: 0, partial: false };
  const end = last < today ? last : today;
  const daysCounted = Math.round((end - first) / 864e5) + 1;
  const count = countVisits(days, first, end);
  return { count, perWeek: count / (daysCounted / 7), daysCounted, partial: end < last };
}

/** Average visits per week over the 4 full weeks before this week (weeks start on Sunday). */
export function recentWeeklyAverage(days, today) {
  const weekStart = addDays(today, -today.getDay());
  return countVisits(days, addDays(weekStart, -28), addDays(weekStart, -1)) / 4;
}
