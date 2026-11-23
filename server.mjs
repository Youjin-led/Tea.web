import {catalog} from './catalog.mjs';
import {css,client,art} from './assets.mjs';
const esc=v=>String(v).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rub=n=>n.toLocaleString('ru-RU')+' ₽';
function card(p,i){
 const picture=p.category==='Чай'?'<div class="packet"><span><b>茶</b>'+esc(p.type)+'</span></div>':'<span class="ware">陶</span>';
 return '<article class="card" data-id="'+p.id+'"><a href="/product/'+p.id+'"><div class="picture" style="--paper:'+['#d6dcbe','#e4cbb8','#dbd3ba','#cad7cc'][i%4]+'">'+picture+'</div><div class="info"><small>'+p.country+' / '+p.type+'</small><h3>'+p.name+'</h3><strong>от '+rub(p.variants[0].price)+'</strong></div></a></article>';
}
function page(url,p,env){
 const home=!p, title=p?p.name+' — Лист и глина':'Лист и глина — магазин чая и чайной посуды';
 const description=p?p.detail:'Каталог листового чая, посуды и принадлежностей. Выберите страну, тип чая и вкусовые ноты.';
 const selects=[['country','Все страны'],['type','Все типы'],['notes','Все вкусовые ноты']].map(([key,label])=>'<select aria-label="'+label+'" id="'+key+'"><option value="">'+label+'</option>'+[...new Set(catalog.flatMap(x=>x[key]))].sort().map(x=>'<option>'+x+'</option>').join('')+'</select>').join('');
 const content=home?'<section class="hero"><article><div class="kicker">Чайная лавка</div><h1>Искусство<br><i>пить чай</i></h1><p>Листовой чай, посуда и принадлежности для вашего ежедневного чаепития.</p><a class="button" href="#catalog">Выбрать чай</a></article><div class="art" role="img" aria-label="Гравюра с чайными террасами"></div></section><section id="catalog"><div class="title"><h2>Каталог</h2><span id="count">'+catalog.length+' позиций</span></div><div class="tabs">'+['Все товары','Чай','Посуда','Аксессуары'].map((x,i)=>'<button class="'+(i?'outline':'')+'" data-cat="'+x+'">'+x+'</button>').join('')+'</div><div class="filters"><input id="search" placeholder="Поиск по каталогу" aria-label="Поиск">'+selects+'</div><div class="grid">'+catalog.map(card).join('')+'</div><p id="empty" hidden>По вашему запросу ничего не найдено.</p><button class="more outline" id="more" hidden>Показать ещё</button></section>':'<section class="detail"><a href="/#catalog">Каталог</a><p class="kicker">'+p.country+' / '+p.type+'</p><h1>'+p.name+'</h1><p>'+p.detail+'</p><p>'+p.notes.join(' · ')+'</p><form id="buy"><b>'+(p.category==='Чай'?'Фасовка':'Количество в упаковке')+'</b><div class="sizes">'+p.variants.map((v,i)=>'<label><input type="radio" name="sku" value="'+v.sku+'" '+(i===0?'checked':'')+'> '+v.label+'</label>').join('')+'</div><p id="price">'+rub(p.variants[0].price)+'</p><button>В корзину</button></form></section>';
 const structured=p?{'@context':'https://schema.org','@type':'Product',name:p.name,description:p.detail,sku:p.id,offers:p.variants.map(v=>({'@type':'Offer',sku:v.sku,price:v.price,priceCurrency:'RUB',url:url.origin+url.pathname}))}:{'@context':'https://schema.org','@type':'OnlineStore',name:'Лист и глина',url:url.origin};
 return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+url.origin+url.pathname+'"><style>'+css+'</style><script type="application/ld+json">'+JSON.stringify(structured)+'</script><header><a class="brand" href="/"><span class="mark">茶</span>Лист и глина</a><nav><a href="/#catalog">Каталог</a><a href="#delivery">Доставка</a><a href="#club">Бонусы</a></nav><button id="basket" class="outline">Корзина · 0</button></header><main class="wrap">'+content+'<details class="help" id="delivery"><summary>Доставка и самовывоз</summary><p>Для расчёта курьерского тарифа СДЭК укажите индекс и адрес при оформлении. Самовывоз бесплатный. '+esc(env.PICKUP_ADDRESS||'Место и время согласуются при подтверждении заказа.')+'</p></details><details class="help" id="club"><summary>Бонусы за чай</summary><p>Возвращаем 5% стоимости товаров после списания бонусов. Один бонус равен одному рублю. Баланс доступен в этом браузере.</p></details></main><footer><a href="/">Лист и глина</a><span>Демонстрационная витрина</span></footer><dialog id="cart"><div class="split"><h2>Корзина</h2><button class="outline" id="close" aria-label="Закрыть">×</button></div><div id="lines"></div><div id="checkout"></div><p id="message" role="status"></p></dialog><script>window.shop='+JSON.stringify({catalog,id:p?.id,metric:/^\d+$/.test(env.METRIKA_ID||'')?env.METRIKA_ID:null})+'</script><script src="/shop.js" defer></script></html>';
}
const variants=new Map(catalog.flatMap(p=>p.variants.map(v=>[v.sku,v])));
function totals(lines){
 check(Array.isArray(lines)&&lines.length>0&&lines.length<=150,'Проверьте корзину.');
 let sum=0,weight=0;
 for(const {sku,qty} of lines){const v=variants.get(sku);check(v&&Number.isInteger(qty)&&qty>=1&&qty<=99,'Проверьте количество.');sum+=v.price*qty;weight+=(v.size===1?450:v.size+12)*qty}
 return {sum,weight:weight+150};
}
async function shipping(env,address,weight){
 check(env.CDEK_ID&&env.CDEK_SECRET&&env.CDEK_FROM_POSTAL,'Расчёт СДЭК доступен после подключения договора магазина.');
 const zip=address.match(/\b\d{6}\b/)?.[0];check(zip,'Добавьте шестизначный почтовый индекс.');
 const base='https://api.cdek.ru/v2/';
 const auth=await fetch(base+'oauth/token',{method:'POST',body:new URLSearchParams({grant_type:'client_credentials',client_id:env.CDEK_ID,client_secret:env.CDEK_SECRET})});
 const token=(await auth.json()).access_token;check(token,'СДЭК временно недоступен.');
 const result=await fetch(base+'calculator/tariff',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({type:1,tariff_code:Number(env.CDEK_TARIFF||137),from_location:{postal_code:env.CDEK_FROM_POSTAL},to_location:{postal_code:zip,address},packages:[{weight}]})});
 const fee=(await result.json()).delivery_sum;check(Number.isFinite(fee)&&fee>=0,'СДЭК не вернул тариф для этого адреса.');return fee;
}
export default {async fetch(req,env){
 const u=new URL(req.url),path=u.pathname;
 if(path==='/art')return new Response(Uint8Array.from(atob(art),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/png','Cache-Control':'public,max-age=86400'}});
 if(path==='/shop.js')return new Response(client,{headers:{'Content-Type':'text/javascript;charset=utf-8'}});
 if(path==='/robots.txt')return new Response('User-agent: *\nDisallow: /api/\nSitemap: '+u.origin+'/sitemap.xml');
 if(path==='/sitemap.xml')return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/',...catalog.map(p=>'/product/'+p.id)].map(x=>'<url><loc>'+u.origin+x+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml'}});
 if(path.startsWith('/api/')){
 try{
 const owner=req.headers.get('Cookie')?.match(/(?:^|; )tea_owner=([a-f0-9-]{36})(?:;|$)/)?.[1];
 if(path==='/api/balance'&&req.method==='GET'){
 const row=owner?await env.DB.prepare('SELECT COALESCE(SUM(earned-spent),0) AS balance FROM orders WHERE owner=?').bind(owner).first():null;
 const r=json({balance:row?.balance||0});if(!owner)r.headers.set('Set-Cookie','tea_owner='+crypto.randomUUID()+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000'+(u.protocol==='https:'?'; Secure':''));return r;
 }
 check(req.method==='POST'&&req.headers.get('Origin')===u.origin,'Недоступный запрос.');
 const b=await req.json(),{sum,weight}=totals(b.lines);
 if(path==='/api/quote')return json({fee:await shipping(env,String(b.address),weight)});
 check(path==='/api/orders'&&owner&&/^[a-f0-9-]{36}$/.test(b.key),'Обновите корзину.');
 const previous=await env.DB.prepare('SELECT id,earned,total FROM orders WHERE id=? AND owner=?').bind(b.key,owner).first();if(previous)return json(previous);
 check(typeof b.name==='string'&&b.name.trim()&&b.name.length<=100&&/^\+?[\d ()-]{7,24}$/.test(b.phone),'Укажите имя и телефон.');
 check(['pickup','cdek'].includes(b.mode)&&typeof b.address==='string'&&b.address.length<=400,'Проверьте способ получения.');
 const fee=b.mode==='pickup'?0:await shipping(env,b.address,weight);check(fee===b.fee,'Тариф изменился. Повторите расчёт.');
 const spent=Number(b.spent);check(Number.isInteger(spent)&&spent>=0&&spent<=sum,'Проверьте количество бонусов.');
 const earned=Math.floor((sum-spent)*0.05),total=sum-spent+fee;
 await env.DB.prepare('INSERT INTO orders(id,owner,details,total,spent,earned) SELECT ?,?,?,?,?,? WHERE ? <= (SELECT COALESCE(SUM(earned-spent),0) FROM orders WHERE owner=?)').bind(b.key,owner,JSON.stringify({name:b.name,phone:b.phone,address:b.address,mode:b.mode,lines:b.lines,fee}),total,spent,earned,spent,owner).run();
 const saved=await env.DB.prepare('SELECT id,earned,total FROM orders WHERE owner=? AND id=?').bind(owner,b.key).first();check(saved,'Недостаточно бонусов. Обновите корзину.');return json(saved);
 }catch(e){return json({error:e.message},400)}
 }
 const p=catalog.find(x=>path==='/product/'+x.id);if(path!=='/'&&!p)return new Response('Страница не найдена',{status:404});
 return new Response(page(u,p,env),{headers:{'Content-Type':'text/html;charset=utf-8'}});
}};
