import {createHash} from 'node:crypto';
import fs from 'node:fs';
const base=process.env.PAGES_BASE_PATH || '/4545-app/';
if (!/^\/[a-zA-Z0-9_/-]*\/$/.test(base)) throw new Error('Invalid Pages base path');
fs.writeFileSync('dist-pages/.nojekyll','');
fs.writeFileSync('dist-pages/404.html', `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>45:45</title><script>sessionStorage.setItem('4545-pages-route',location.pathname+location.search+location.hash);location.replace(${JSON.stringify(base)}+'?app_reload='+Date.now());</script><a href="${base}">חזרה לאפליקציה</a></html>`);

fs.writeFileSync('dist-pages/offline-assets.json',JSON.stringify(fs.readdirSync('dist-pages/assets').filter(name=>/\.(js|css)$/.test(name)).map(name=>'assets/'+name)));

const offlineVersion=createHash('sha256').update(fs.readFileSync('dist-pages/offline-assets.json')).update(fs.readFileSync('dist-pages/service-worker.js')).digest('hex').slice(0,12);
fs.writeFileSync('dist-pages/service-worker.js',fs.readFileSync('dist-pages/service-worker.js','utf8').replace('4545-public-shell-v1','4545-public-shell-'+offlineVersion));
