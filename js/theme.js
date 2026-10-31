// Applied before CSS paints to avoid a theme flash. Light is the default.
try { document.documentElement.dataset.theme = localStorage.getItem('fn.theme') || 'light'; } catch (e) { document.documentElement.dataset.theme = 'light'; }
