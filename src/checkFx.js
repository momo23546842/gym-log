// Feedback when today's check is tapped: a short press, and on recording a pop, glow, ripple and a few sparkles.
// Runs on the freshly drawn button after the record is saved, never blocks taps, and is skipped with reduced motion.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPARKS = [[-22, -14], [20, -16], [26, 5], [-26, 6], [-5, -20], [7, 19]];
let lastFx = 0, timer = null;

export function playCheckFx(ev, wasDone, isDone) {
  if (reduced()) return;
  const b = document.getElementById('checkToday');
  if (!b) return;
  b.classList.add('press');
  // The bigger effect only when a visit is recorded, and not again within 1.5 s.
  if (isDone && !wasDone && Date.now() - lastFx > 1500) {
    lastFx = Date.now();
    b.classList.add('pop', 'glow');
    const r = b.getBoundingClientRect(), keyboard = !ev.detail;
    const rip = document.createElement('span');
    rip.className = 'rip';
    rip.style.left = `${keyboard ? r.width / 2 : ev.clientX - r.left}px`;
    rip.style.top = `${keyboard ? r.height / 2 : ev.clientY - r.top}px`;
    b.appendChild(rip);
    const box = b.querySelector('.box').getBoundingClientRect();
    const cx = box.left - r.left + box.width / 2, cy = box.top - r.top + box.height / 2;
    SPARKS.forEach(([dx, dy], i) => {
      const s = document.createElement('span');
      s.className = 'spark';
      Object.assign(s.style, { left: `${cx}px`, top: `${cy}px`, animationDelay: `${(i % 3) * 40}ms` });
      s.style.setProperty('--dx', `${dx}px`);
      s.style.setProperty('--dy', `${dy}px`);
      b.appendChild(s);
    });
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    const c = document.getElementById('checkToday');
    if (!c) return;
    c.classList.remove('press', 'pop', 'glow');
    c.querySelectorAll('.rip,.spark').forEach((el) => el.remove());
  }, 800);
}
