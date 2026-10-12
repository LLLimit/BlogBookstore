import './style.css';
import {applyUiAccent} from './ui-theme.js';
import {parseFeed,cleanContent,safeUrl,getText,getFeed} from './articles.js';
import {initMusic} from './music-player.js';
import {products} from './products.js';
import {initPhotoAlbum} from './photo-album.js';

const $=id=>document.getElementById(id), coarse=matchMedia('(pointer:coarse)').matches;
const base=import.meta.env.BASE_URL;
let config={title:'博客书店',brandMark:'B',author:'博客作者',blogUrl:'',feedUrl:'',feedEndpoint:'./api/feed.php',cacheMinutes:15,defaultHour:.8,defaultWeather:'clear',defaultClouds:56,defaultBrightness:1}, articles=[], game=null, started=false, current=null, page=0, hasMore=false, shelfPage=0, toastTimer;
const dialogs=['catalog','reader','help','shop-menu','photo-album'].map($);
let photoAlbum;
let coins=50,purchases=0;
let resumeAfterDialog=false;
let escapeDown=false,pendingEscapeResume=false;
const resumedDialogs=new WeakSet();
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function storageRead(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function storageWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private browsers can still read without saving. */}}
const progressKey=a=>'bookstore:progress:'+(a.url||config.feedUrl+':'+a.id);
function dateLabel(date){const value=new Date(date);return isNaN(value)?'博客文章':value.toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});}
function aim(article){$('book-prompt').hidden=!article||dialogs.some(d=>d.open)||!started;$('touch-read').disabled=!article;if(article){$('book-title').textContent=article.title;$('book-prompt').querySelector('small').textContent=article.kind==='album'?'翻开照片画册':article.kind==='shop'?'和掌柜聊聊':'拿起这本书';$('touch-read').textContent=article.kind==='shop'?'逛货架':'阅读';}}
function pause(){game?.pause();$('crosshair').hidden=true;$('book-prompt').hidden=true;$('touch-controls').hidden=true;}
function showPauseMenu(reason){pendingEscapeResume=false;pause();if(started&&!dialogs.some(d=>d.open)){const failed=reason?.kind==='pointer-lock';$('pause-title').textContent=failed?'无法锁定鼠标':'漫游已暂停';$('lock-notice').hidden=!failed;if(failed)$('browser-preview-address').value=location.href;$('resume').hidden=false;$('resume-btn').focus({preventScroll:true});}}
function startWalk(){$('resume').hidden=true;$('lock-notice').hidden=true;$('crosshair').hidden=false;$('touch-controls').hidden=!coarse;}
function showDialog(dialog){resumeAfterDialog=resumeAfterDialog||pendingEscapeResume||(!!game?.enabled&&game.mode==='walk');pendingEscapeResume=false;pause();$('resume').hidden=true;dialog.showModal();}
function closeDialog(dialog,deferResume=false){
  if(!dialog.open)return;
  const lastDialog=!dialogs.some(d=>d!==dialog&&d.open),resume=lastDialog&&resumeAfterDialog&&started;
  if(lastDialog)resumeAfterDialog=false;
  if(resume)resumedDialogs.add(dialog);
  dialog.close();
  // Re-lock within the close button/backdrop gesture, before the queued close event.
  if(resume){if(deferResume)pendingEscapeResume=true;else enter();}
}
function afterClose(e){if(resumedDialogs.delete(e.target)||dialogs.some(d=>d.open))return;resumeAfterDialog=false;if(started)showPauseMenu();}
for(const d of dialogs){d.addEventListener('close',afterClose);d.addEventListener('cancel',e=>{e.preventDefault();closeDialog(d);});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog($(b.dataset.close))));
$('catalog-btn').addEventListener('click',()=>{renderCatalog();showDialog($('catalog'));setTimeout(()=>$('search').focus(),50);});
$('help-btn').addEventListener('click',()=>showDialog($('help')));
function enter(){pendingEscapeResume=false;if(!game){showDialog($('catalog'));return;}started=true;$('welcome').hidden=true;$('resume').hidden=true;$('lock-notice').hidden=true;$('menu-btn').hidden=false;$('crosshair').hidden=true;$('touch-controls').hidden=true;document.body.classList.add('playing');game.lock();}
$('enter').addEventListener('click',enter);$('resume-btn').addEventListener('click',enter);
$('lounge-btn').addEventListener('click',()=>{enter();game?.goToFloor(1);});
$('home').addEventListener('click',e=>{e.preventDefault();returnOverview(true);});
$('menu-btn').addEventListener('click',showPauseMenu);
$('return-menu-btn').addEventListener('click',()=>returnOverview());
$('copy-preview-address').addEventListener('click',async()=>{const address=$('browser-preview-address');try{await navigator.clipboard.writeText(address.value);toast('地址已复制，请在 Chrome 或 Edge 中打开。');}catch{address.focus();address.select();toast('地址已选中，请按 Ctrl+C 复制。');}});
// Consume the entire Escape press before the dialog's native cancel or walking handlers.
// Re-locking while Escape is still held can immediately unlock/pause the restored walk.
document.addEventListener('keydown',e=>{
  if(e.code!=='Escape'&&e.key!=='Escape')return;
  e.preventDefault();e.stopImmediatePropagation();
  if(escapeDown||e.repeat)return;
  escapeDown=true;
  const dialog=dialogs.findLast(d=>d.open);
  if(dialog){closeDialog(dialog,true);return;}
  if(started&&game?.mode==='walk'&&$('resume').hidden)showPauseMenu();
},true);
document.addEventListener('keyup',e=>{
  if(e.code!=='Escape'&&e.key!=='Escape')return;
  escapeDown=false;e.preventDefault();e.stopImmediatePropagation();
  if(!pendingEscapeResume)return;
  // Let the browser finish processing the unlock key before requesting another lock.
  setTimeout(()=>{
    if(!pendingEscapeResume||escapeDown)return;
    pendingEscapeResume=false;
    if(started&&game?.mode==='walk'&&$('resume').hidden&&!dialogs.some(d=>d.open)){
      if(!document.hidden&&document.hasFocus())enter();else showPauseMenu();
    }
  },0);
},true);
function cancelEscapeResume(){escapeDown=false;if(pendingEscapeResume)showPauseMenu();}
window.addEventListener('blur',cancelEscapeResume);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelEscapeResume();});
$('book-prompt').addEventListener('click',()=>game?.read());$('touch-read').addEventListener('click',()=>game?.read());
$('quality-btn').addEventListener('click',()=>{if(game)$('quality-btn').textContent='画质 · '+(game.setQuality()?'精致':'流畅');});
function returnOverview(reset=false){started=false;resumeAfterDialog=false;pendingEscapeResume=false;pause();dialogs.forEach(d=>d.open&&d.close());if(reset===true)game?.reset();else game?.overview();$('welcome').hidden=false;$('resume').hidden=true;$('menu-btn').hidden=true;document.body.classList.remove('playing');}
$('reset-view').addEventListener('click',()=>returnOverview());
function setTime(value){const hour=((Number(value)%24)+24)%24,minutes=Math.round(hour*60)%1440,h=Math.floor(minutes/60),m=minutes%60;$('time-range').value=hour;$('scene-clock').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');$('time-label').textContent=hour<5?'深夜静谧':hour<9?'清晨微光':hour<16?'午后日光':hour<19?'日落时分':'夜幕初降';game?.setTime(hour);}
$('time-range').addEventListener('input',e=>setTime(e.target.value));document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>setTime(b.dataset.time)));
let timeRunning=false,timeClock=null,timeSpeed=.06;
$('time-play').addEventListener('click',()=>{timeRunning=!timeRunning;$('time-play').textContent=timeRunning?'Ⅱ':'▶';$('time-play').setAttribute('aria-pressed',String(timeRunning));clearInterval(timeClock);if(timeRunning)timeClock=setInterval(()=>{if(!document.hidden)setTime((Number($('time-range').value)+timeSpeed)%24);},200);});
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{timeSpeed={slow:.02,medium:.06,fast:.18}[b.dataset.speed];document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('selected',x===b));}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{returnOverview();game?.setView(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('selected',x===b));}));
$('cloud-range').addEventListener('input',e=>{$('cloud-label').textContent=e.target.value+'%';game?.setClouds(e.target.value/100);});
setTime($('time-range').value);
document.querySelectorAll('[data-weather]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-weather]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});$('weather-label').textContent=b.textContent.trim();game?.setWeather(b.dataset.weather);}));
$('light-range').addEventListener('input',e=>{$('light-label').textContent=Math.round(e.target.value*100)+'%';game?.setBrightness(e.target.value);});
$('search').addEventListener('input',renderCatalog);
$('font-size').addEventListener('click',()=>{$('reader').classList.toggle('large-type');storageWrite('bookstore:large-type',$('reader').classList.contains('large-type'));});
if(storageRead('bookstore:large-type'))$('reader').classList.add('large-type');
function renderCatalog(){
  const q=$('search').value.trim().toLocaleLowerCase();const filtered=articles.filter(a=>[a.title,a.category,a.excerpt].join(' ').toLocaleLowerCase().includes(q));
  $('book-list').replaceChildren();$('catalog-info').textContent=`共 ${articles.length} 本书${q?` · 找到 ${filtered.length} 本`:''} · 点击书本开始阅读`;
  if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=articles.length?'暂时没有找到这本书，换个关键词试试。':'书架暂时还没有文章。';$('book-list').append(empty);}
  filtered.forEach(a=>{const i=articles.indexOf(a),button=document.createElement('button');button.className='book-card';button.style.setProperty('--book-color',['#304e49','#a95d42','#8b795c','#515578','#8c403e','#546c46','#bc8750','#456477'][i%8]);
    const cover=document.createElement('span');cover.className='mini-cover';const no=document.createElement('small');no.textContent=String(i+1).padStart(2,'0');const title=document.createElement('strong');title.textContent=a.title;const author=document.createElement('span');author.textContent=a.author||config.author;cover.append(no,title,author);
    const details=document.createElement('span');details.className='book-detail';const cat=document.createElement('small');cat.textContent=a.category;const heading=document.createElement('strong');heading.textContent=a.title;const date=document.createElement('span');date.textContent=dateLabel(a.date)+(storageRead(progressKey(a))?' · 继续阅读':'');details.append(cat,heading,date);button.append(cover,details);button.addEventListener('click',()=>read(a));$('book-list').append(button);
  });$('more').hidden=!hasMore;
}
function renderShop(){
  $('wallet-count').textContent=coins;$('snack-bag').textContent=purchases?`已带走 ${purchases} 件商品`:'挑一份零食，配一本好书。';$('snack-list').replaceChildren();
  products.forEach(p=>{const button=document.createElement('button');button.className='snack-card';button.disabled=coins<p.price;button.style.setProperty('--pack-color',p.color);const image=document.createElement('span');image.className='snack-art '+p.type;image.textContent=p.icon;const label=document.createElement('strong');label.textContent=p.name;const detail=document.createElement('small');detail.textContent=p.detail;const price=document.createElement('span');price.className='snack-price';price.textContent=`${p.price} 漫游币 · 取一份`;button.append(image,label,detail,price);button.addEventListener('click',()=>{if(coins>=p.price){coins-=p.price;purchases++;renderShop();toast(`掌柜递给你一份${p.name}。`);}});$('snack-list').append(button);});
}
function read(article){if(article.kind==='album'){photoAlbum?.open();return;}if(article.kind==='shop'){renderShop();showDialog($('shop-menu'));return;}current=article;if($('catalog').open)$('catalog').close();$('reader-title').textContent=article.title;$('reader-meta').textContent=article.category+' / '+dateLabel(article.date);$('reader-index').textContent=`第 ${articles.indexOf(article)+1} 本 · ${config.title}`;
  const content=$('reader-content');content.replaceChildren(cleanContent(article.content,article.url));if(!content.textContent.trim()){const p=document.createElement('p');p.textContent='RSS 尚未提供正文，请点击下方链接阅读原文。';content.append(p);}
  const href=safeUrl(article.url,config.blogUrl);$('original').href=href||config.blogUrl;$('original').hidden=!href;showDialog($('reader'));
  requestAnimationFrame(()=>{$('reader').querySelector('.reader-scroll').scrollTop=storageRead(progressKey(article))?.top||0;});
}
$('reader').querySelector('.reader-scroll').addEventListener('scroll',e=>{if(current)storageWrite(progressKey(current),{top:e.target.scrollTop,date:Date.now()});},{passive:true});
let joyId=null;const joy=$('joystick');function moveJoystick(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(1,Math.hypot(dx,dy)/34);const x=dx/len,y=dy/len;joy.firstElementChild.style.transform=`translate(${x}px,${y}px)`;game?.setMove(x/34,y/34);}
joy.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoystick(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)moveJoystick(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(type,()=>{joyId=null;joy.firstElementChild.style.transform='';game?.setMove(0,0);});
function updateBooks(){game?.setArticles(articles.slice(shelfPage*24,shelfPage*24+24),shelfPage*24);$('article-count').textContent=`${articles.length} 篇文章已上架`;$('enter-label').textContent=game?'走进书店':'打开馆藏目录';$('enter').disabled=false;renderCatalog();$('shelf-next').hidden=articles.length<=24;}
$('shelf-next').addEventListener('click',()=>{shelfPage=(shelfPage+1)%Math.ceil(articles.length/24);updateBooks();toast(`书架已换为第 ${shelfPage*24+1}–${Math.min(articles.length,(shelfPage+1)*24)} 本书`);});
async function loadApi(){const url=new URL(config.apiUrl,location.href);url.searchParams.set('route','articles');url.searchParams.set('page',String(page+1));url.searchParams.set('limit','60');const json=JSON.parse(await getText(url));if(!Array.isArray(json.articles))throw new Error('文章接口无效');
  const known=new Set(articles.map(a=>String(a.id)));articles.push(...json.articles.filter(a=>a&&typeof a.title==='string'&&typeof a.content==='string'&&!known.has(String(a.id))).map(a=>({...a,url:safeUrl(a.url,config.blogUrl)})));page++;hasMore=!!json.hasMore;updateBooks();}
$('more').addEventListener('click',async()=>{$('more').disabled=true;try{await loadApi();}catch{toast('文章暂时无法加载，请稍后重试。');}finally{$('more').disabled=false;}});
async function init(){
  if(!window.BOOKSTORE_CONFIG){
    try{const response=await fetch(base+'api/config.php',{cache:'no-store'});if(!response.ok)throw new Error('No server settings');config={...config,...await response.json()};}
    catch{try{const response=await fetch(base+'config.json',{cache:'no-store'});if(response.ok)config={...config,...await response.json()};}catch{}}
  }
  config={...config,...window.BOOKSTORE_CONFIG};config.title=String(config.title||'博客书店');config.blogUrl=safeUrl(config.blogUrl,location.href);
  applyUiAccent(config.uiAccent);
  document.title=config.title+' · 在文字里停留';document.querySelector('.brand>span:last-child').firstChild.textContent=config.title;document.querySelector('.brand-icon').textContent=Array.from(String(config.brandMark||'B')).slice(0,4).join('');$('panel-title').textContent=config.title;$('blog-link').href=config.blogUrl||'#';$('blog-link').hidden=!config.blogUrl;
  const favicon=safeUrl(config.faviconUrl,location.href);if(favicon){const icon=document.querySelector('link[rel="icon"]');icon.href=favicon;icon.removeAttribute('type');}
  const music=initMusic(config,toast);if(import.meta.env.DEV)window.__music=music;
  photoAlbum=initPhotoAlbum(config,showDialog,toast);
  try{const {createBookstore}=await import('./scene.js');game=createBookstore($('world'),read,aim,showPauseMenu,startWalk);if(coarse){game.setQuality();$('quality-btn').textContent='画质 · 流畅';}game.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showPauseMenu();toast('3D 画面已暂停，你仍可通过馆藏目录阅读。');});}
  catch(error){console.error('3D 书店初始化失败',error);$('world').replaceChildren();document.body.classList.add('no-webgl');$('quality-btn').hidden=true;$('enter-label').textContent='打开馆藏目录';toast('当前浏览器无法显示 3D，可打开馆藏目录阅读，或用 Edge／Chrome 打开本站。');}
  game?.setTitle(config.title);
  game?.setAuthor(config.author);
  setTime(Number.isFinite(Number(config.defaultHour))?Math.min(23.99,Math.max(0,Number(config.defaultHour))):.8);
  const cloud=Math.min(100,Math.max(0,Number(config.defaultClouds)||0));$('cloud-range').value=cloud;$('cloud-label').textContent=cloud+'%';game?.setClouds(cloud/100);
  const brightness=Math.min(1.8,Math.max(0,Number(config.defaultBrightness)||0));$('light-range').value=brightness;$('light-label').textContent=Math.round(brightness*100)+'%';game?.setBrightness(brightness);
  document.querySelector('[data-weather="'+(['clear','cloudy','rain','storm','snow'].includes(config.defaultWeather)?config.defaultWeather:'clear')+'"]').click();
  $('lounge-btn').hidden=!game;
  if(import.meta.env.DEV)window.__bookstore=game;
  try{
    if(config.apiUrl){await loadApi();$('source-note').textContent='博客实时馆藏';}
    else{
      if(!config.feedUrl){$('article-count').textContent='等待接入博客 RSS';$('source-note').textContent='尚未设置订阅';document.querySelector('.chapter>span:last-child').firstChild.textContent=config.title;updateBooks();$('article-count').textContent='尚未接入订阅';return;}
      let feed,live=false;
      try{if(!config.feedEndpoint)throw new Error('Static mode');feed=await getFeed(new URL(config.feedEndpoint,location.href),config.feedUrl||config.blogUrl);live=true;}catch{
        const meta=JSON.parse(await getText(base+'feed-meta.json'));
        if(meta.feedUrl!==config.feedUrl)throw new Error('快照不属于当前订阅');
        feed=parseFeed(await getText(base+'feed.xml'),meta.resolvedUrl||config.feedUrl);
      }
      articles=feed.articles;const title=feed.title||config.title;document.querySelector('.chapter>span:last-child').firstChild.textContent=title;
      if(!config.blogUrl&&feed.blogUrl){config.blogUrl=feed.blogUrl;$('blog-link').href=feed.blogUrl;$('blog-link').hidden=false;}
      $('source-note').textContent=live?'馆藏每 '+config.cacheMinutes+' 分钟更新':'RSS 馆藏快照';
      if(!live){try{const meta=JSON.parse(await getText(base+'feed-meta.json'));if(meta.syncedAt)$('source-note').textContent='馆藏更新于 '+dateLabel(meta.syncedAt);}catch{}}
      updateBooks();
    }
    if(!articles.length)toast('博客 RSS 目前没有公开文章。');
  }catch{ $('article-count').textContent='文章加载失败';$('enter-label').textContent=game?'进入书店':'打开馆藏目录';$('enter').disabled=false;toast('暂时无法读取文章，请检查 RSS 设置后刷新。'); }
}
init();
