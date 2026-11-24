import fs from 'node:fs';
import './build.mjs';
import worker from './dist/server/index.js';
import {catalog} from './catalog.mjs';

const root = 'https://youjin-led.github.io/Tea.web/';
fs.mkdirSync('product', {recursive:true});
fs.writeFileSync('catalog-data.js', 'window.teaCatalog='+JSON.stringify(catalog)+';');
for (const product of [null, ...catalog]) {
  const route = product ? 'product/'+product.id : '';
  const file = route ? route+'.html' : 'index.html';
  const response = await worker.fetch(new Request('https://shop.invalid/'+route), {});
  if (!response.ok) throw new Error('Ошибка рендера '+route);
  const html = (await response.text())
    .replaceAll('https://shop.invalid/'+route, root+(route ? file : ''))
    .replaceAll('"https://shop.invalid"', JSON.stringify(root))
    .replace(/href="\/product\/(p\d+)"/g, 'href="/Tea.web/product/$1.html"')
    .replaceAll('href="/', 'href="/').replace(/href="\/(#catalog)?"/g, 'href="/Tea.web/$1"')
    .replace(/<style>[\s\S]*?<\/style>/,'<link rel="stylesheet" href="/Tea.web/pages.css">')
    .replace(/<script>window.shop=[\s\S]*?<\/script>/, '<script src="/Tea.web/catalog-data.js"></script><script>window.shop={catalog:window.teaCatalog,staticView:true,id:'+JSON.stringify(product?.id||null)+'}</script>')
    .replace('src="/shop.js"', 'src="/Tea.web/client.js"');
  fs.writeFileSync(file,html);
}
fs.writeFileSync('pages.css',fs.readFileSync('style.css','utf8').replace("url('/art')","url('terraces.jpg')"));
