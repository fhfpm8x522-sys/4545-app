import fs from 'node:fs';
const base=process.env.PAGES_BASE_PATH || '/4545-app/';
if (!/^\/[a-zA-Z0-9_/-]*\/$/.test(base)) throw new Error('Invalid Pages base path');
fs.writeFileSync('dist-pages/.nojekyll','');
fs.writeFileSync('dist-pages/404.html', `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>45:45</title><script>sessionStorage.setItem('4545-pages-route',location.pathname+location.search+location.hash);location.replace(${JSON.stringify(base)});</script><a href="${base}">חזרה לאפליקציה</a></html>`);
