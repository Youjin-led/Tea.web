const $=s=>document.querySelector(s), products=shop.catalog, variants=new Map(products.flatMap(p=>p.variants.map(v=>[v.sku,{...v,name:p.name}])));
let cart=JSON.parse(localStorage.getItem('tea-cart')||'[]').filter(x=>variants.has(x.sku)&&x.qty>0);
let balance=0,key,fee=0;
const money=n=>n.toLocaleString('ru-RU')+' ₽';
function save(){localStorage.setItem('tea-cart',JSON.stringify(cart));$('#basket').textContent='Корзина · '+cart.reduce((n,x)=>n+x.qty,0)}
save();
function eventGoal(name){if(shop.metric&&window.ym)ym(shop.metric,'reachGoal',name)}
if(shop.metric){window.ym=function(){(ym.a=ym.a||[]).push(arguments)};ym.l=Date.now();const s=document.createElement('script');s.src='https://mc.yandex.ru/metrika/tag.js';s.async=true;document.head.append(s);ym(shop.metric,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true})}
if($('#catalog')){
 let cat='Все товары',limit=12;
 const cards=[...document.querySelectorAll('.card')];
 function filter(){
 const q=$('#search').value.toLocaleLowerCase().trim();let n=0;
 products.forEach((p,i)=>{const match=(cat==='Все товары'||cat===p.category)&&(!$('#country').value||p.country===$('#country').value)&&(!$('#type').value||p.type===$('#type').value)&&(!$('#notes').value||p.notes.includes($('#notes').value))&&(p.name+' '+p.detail).toLocaleLowerCase().includes(q);cards[i].hidden=!match||++n>limit});
 $('#count').textContent='Найдено: '+n;$('#empty').hidden=!!n;$('#more').hidden=n<=limit;
 }
 document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{cat=b.dataset.cat;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('outline',x!==b));limit=12;filter()});
 document.querySelectorAll('.filters>*').forEach(x=>x.oninput=()=>{limit=12;filter()});$('#more').onclick=()=>{limit+=12;filter()};filter();
}
async function api(path,data){const r=await fetch('/api/'+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const out=await r.json();if(!r.ok)throw Error(out.error||'Ошибка соединения');return out}
async function openCart(){if(!$('#cart').open)$('#cart').showModal();$('#message').textContent='';render();if(shop.staticView)return;try{balance=(await api('balance')).balance;render()}catch{$('#message').textContent='Не удалось загрузить баланс. Откройте корзину повторно.'}}
$('#basket').onclick=openCart;$('#close').onclick=()=>$('#cart').close();
if($('#buy')){const form=$('#buy');form.onchange=()=>$('#price').textContent=money(variants.get(form.sku.value).price);form.onsubmit=e=>{e.preventDefault();const sku=form.sku.value,line=cart.find(x=>x.sku===sku);if(line)line.qty=Math.min(99,line.qty+1);else cart.push({sku,qty:1});save();eventGoal('add_to_cart');openCart()}}
function render(){
 key=crypto.randomUUID();fee=0;
 $('#lines').innerHTML=cart.length?cart.map(({sku,qty},i)=>{const v=variants.get(sku);return '<div class="row"><strong>'+v.name+'</strong><div class="split"><span>'+v.label+' · '+money(v.price*qty)+'</span><span><button data-i="'+i+'" data-d="-1" aria-label="Уменьшить">−</button> '+qty+' <button data-i="'+i+'" data-d="1" aria-label="Увеличить">+</button></span></div></div>'}).join(''):'<p>Корзина пока пуста.</p>';
 $('#lines').querySelectorAll('button').forEach(b=>b.onclick=()=>{cart[b.dataset.i].qty=Math.min(99,cart[b.dataset.i].qty+Number(b.dataset.d));cart=cart.filter(x=>x.qty);save();render()});
 const box=$('#checkout');box.innerHTML='';if(!cart.length)return;
 const sum=cart.reduce((s,x)=>s+variants.get(x.sku).price*x.qty,0);
 if(shop.staticView){box.textContent='Итого '+money(sum)+'. Приём заказов откроется после подключения магазина.';return}
 box.innerHTML='<form id="order"><label>Имя<input name="customer" required maxlength="100" autocomplete="name"></label><label>Телефон<input name="phone" type="tel" required autocomplete="tel"></label><label>Получение<select name="mode"><option value="pickup">Самовывоз · бесплатно</option><option value="cdek">Курьер СДЭК</option></select></label><div id="destination" hidden><label>Индекс и полный адрес<input name="address" maxlength="400"></label><button type="button" id="quote" class="outline">Рассчитать доставку</button></div><label>Списать бонусы · доступно '+balance+'<input type="number" name="spent" value="0" min="0" max="'+Math.min(sum,balance)+'" required></label><strong id="total"></strong><button id="submit">Оформить заказ</button></form>';
 const f=$('#order'),msg=$('#message');function update(){const spent=Number(f.spent.value)||0;$('#total').textContent='Итого '+money(sum-spent+(fee||0))+(fee===null?' + доставка':'')+' · бонусов за заказ '+Math.floor((sum-spent)*.05);$('#submit').disabled=fee===null}
 f.mode.onchange=()=>{const delivery=f.mode.value==='cdek';$('#destination').hidden=!delivery;f.address.required=delivery;fee=delivery?null:0;msg.textContent='';update()};f.spent.oninput=update;f.address.oninput=()=>{fee=null;msg.textContent='';update()};
 $('#quote').onclick=async()=>{try{const address=f.address.value;const result=await api('quote',{address,lines:cart});if(f.address.value===address&&f.mode.value==='cdek'){fee=result.fee;msg.textContent='Доставка '+money(fee);update()}}catch(e){msg.textContent=e.message}};
 f.onsubmit=async e=>{e.preventDefault();$('#submit').disabled=true;try{const out=await api('orders',{key,name:f.customer.value,phone:f.phone.value,mode:f.mode.value,address:f.address.value,spent:Number(f.spent.value),lines:cart,fee});cart=[];save();render();$('#lines').textContent='Заказ № '+out.id.slice(0,8)+' оформлен.';msg.textContent='К оплате '+money(out.total)+'. Начислено бонусов: '+out.earned;eventGoal('order_complete')}catch(e){msg.textContent=e.message;update()}};update();
}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{const target=document.getElementById(a.hash.slice(1));if(target?.tagName==='DETAILS')target.open=true}));

