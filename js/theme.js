// Applied before CSS paints to avoid a theme flash. Light is the default.
try { document.documentElement.dataset.theme = localStorage.getItem('fn.theme') || 'light'; } catch (e) { document.documentElement.dataset.theme = 'light'; }
// Lite mode: switch off heavy visual effects on phones / weak devices / data-saver / reduced motion.
try {
  var n = navigator, c = n.connection || {};
  var weak = (n.deviceMemory && n.deviceMemory <= 4) || (n.hardwareConcurrency && n.hardwareConcurrency <= 4) ||
    c.saveData === true || /2g/.test(c.effectiveType || '') ||
    matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 900px)').matches ||
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  var forced = localStorage.getItem('fn.lite'); // '1' = always lite, '0' = never lite
  if (forced === '1' || (forced !== '0' && weak)) document.documentElement.classList.add('lite');
} catch (e) {}
