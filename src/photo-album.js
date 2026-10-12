import './photo-album.css';
import {safeUrl} from './articles.js';
import {buildAlbumPages} from './album-layout.js';

export function initPhotoAlbum(config,openDialog,toast){
  const $=id=>document.getElementById(id),dialog=$('photo-album'),book=$('album-book'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let albums=[],album=null,spread=-1,busy=false,loadPromise=null,paper=null,rendererAttempted=false,drag=null,swipeUntil=0,maintenance=null;
  const imageRecords=new Map(),queue=[];let activeImages=0,chooseGeneration=0;
  const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;return el;};
  const loader={peek:url=>imageRecords.get(url)?.image,get(url){
    if(imageRecords.has(url))return imageRecords.get(url).promise;
    let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});imageRecords.set(url,{promise,image:null});queue.push({url,resolve,reject});pump();return promise;
  }};
  function pump(){while(activeImages<3&&queue.length){const task=queue.shift();activeImages++;const img=new Image();if(new URL(task.url,location.href).origin!==location.origin)img.crossOrigin='anonymous';img.decoding='async';const timer=setTimeout(()=>{img.src='';img.onerror?.();},15000);let ended=false;img.onload=async()=>{if(ended)return;ended=true;clearTimeout(timer);try{await img.decode();}catch{}imageRecords.get(task.url).image=img;task.resolve(img);const loaded=[...imageRecords].filter(([,r])=>r.image);for(const [key]of loaded.slice(0,Math.max(0,loaded.length-16)))imageRecords.delete(key);activeImages--;pump();};img.onerror=()=>{if(ended)return;ended=true;clearTimeout(timer);task.reject(Error('照片未能加载'));activeImages--;pump();};img.src=task.url;}}
  function warm(photos,count=8){for(const photo of photos.slice(0,count))loader.get(photo.url).catch(()=>{});}
  const cachedBytes=new Set();
  function preloadAll(){const images=albums.flatMap(a=>a.photos);warm(images,8);const work=async()=>{const pending=images.filter(p=>!cachedBytes.has(p.url));async function worker(){while(pending.length){const photo=pending.shift();cachedBytes.add(photo.url);try{const response=await fetch(photo.url,{cache:'force-cache'});if(response.ok){const reader=response.body?.getReader();if(reader)while(!(await reader.read()).done){/* Stream into the browser's HTTP cache without keeping decoded bitmaps. */}}}catch{cachedBytes.delete(photo.url);}}}await Promise.all([worker(),worker()]);};if('requestIdleCallback'in window)requestIdleCallback(work,{timeout:1800});else setTimeout(work,1500);}
  function controls(){if(!album)return;$('album-prev').disabled=busy||spread<0;$('album-next').disabled=busy||spread>=album.pages.length/2-1;$('album-next').textContent=spread<0?'打开画册 →':'下一页 →';$('album-position').textContent=spread<0?`${album.photos.length} 张照片 · 点击打开`:`${spread*2+1}–${spread*2+2} / ${album.pages.length} 页`;showStories();}
  function logo(){return dialog.querySelector('.album-logo svg').cloneNode(true);}
  function showStories(){const host=$('album-stories');host.replaceChildren();if(spread<0){host.hidden=true;return;}const indices=new Set(album.pages.slice(spread*2,spread*2+2).map(p=>p.photoIndex));for(const index of indices){const photo=album.photos[index];if(!photo||!photo.takenAt&&!photo.story)continue;const entry=make('article','album-story');entry.append(make('h3','',photo.caption||album.title));if(photo.takenAt){const date=make('time','',photo.takenAt.replace('T',' '));date.dateTime=photo.takenAt;entry.append(date);}if(photo.story)entry.append(make('p','',photo.story));host.append(entry);}host.hidden=!host.children.length;}
  function fallback(){
    book.replaceChildren();book.classList.toggle('is-closed',spread<0);
    if(spread<0){const cover=make('div','album-fallback-cover');cover.append(logo(),make('strong','','Travel Time'));book.append(cover);return;}
    const pair=album.pages.slice(spread*2,spread*2+2);
    if(pair[0]?.half==='left'){const photo=album.photos[pair[0].photoIndex],page=make('div','album-fallback-wide'),img=make('img','');img.src=photo.url;img.alt=photo.caption||album.title;page.append(img,make('p','',photo.caption||album.title));book.append(page);return;}
    for(const entry of pair){const page=make('div','album-fallback-page'),photo=album.photos[entry.photoIndex];if(photo){const img=make('img','');img.src=photo.url;img.alt=photo.caption||album.title;page.append(img,make('p','',photo.caption||album.title));}book.append(page);}
  }
  async function initRenderer(){if(rendererAttempted)return;rendererAttempted=true;try{const {createAlbumRenderer}=await import('./album-renderer.js');paper=createAlbumRenderer(book,loader);}catch{paper=null;book.classList.add('album-fallback');}}
  async function choose(index){
    if(busy)return;const selected=albums[index];if(!selected)return;
    const generation=++chooseGeneration;busy=true;spread=-1;album=null;
    $('album-library').hidden=true;$('album-stage').hidden=false;$('album-controls').hidden=false;$('album-back').hidden=albums.length<2;$('album-name').textContent=selected.title;
    $('album-prev').disabled=$('album-next').disabled=true;warm(selected.photos,8);
    await Promise.allSettled(selected.photos.slice(0,2).map(p=>loader.get(p.url)));
    if(!dialog.open||generation!==chooseGeneration){busy=false;return;}
    const photos=selected.photos.map(p=>{const img=loader.peek(p.url);return {...p,width:p.width||img?.naturalWidth,height:p.height||img?.naturalHeight};});
    album={...selected,photos,pages:buildAlbumPages(photos)};controls();
    await initRenderer();if(generation!==chooseGeneration||!dialog.open)return;
    if(paper)paper.choose(album);else fallback();busy=false;controls();$('album-status').textContent='拖动纸页或点击翻页 · 方向键也可翻阅';
  }
  function showLibrary(){chooseGeneration++;paper?.stop();drag=null;busy=false;album=null;$('album-name').textContent='已上架的画册';$('album-stage').hidden=$('album-controls').hidden=$('album-stories').hidden=true;$('album-library').hidden=!albums.length;$('album-back').hidden=true;$('album-status').textContent=albums.length?'点击封面，翻阅一段时光。':'暂时没有可翻阅的画册。';}
  function showConfigured(){if(albums.length===1)choose(0);else showLibrary();}
  async function readyTurn(direction){
    if(!album||busy||direction>0&&spread>=album.pages.length/2-1||direction<0&&spread<0)return false;
    busy=true;controls();const next=spread+direction;const photos=album.pages.slice(Math.max(0,next*2),Math.max(0,next*2)+4).map(p=>album.photos[p.photoIndex]).filter(Boolean);await Promise.allSettled(photos.map(p=>loader.get(p.url)));
    if(!dialog.open){busy=false;return false;}if(paper){const ready=paper.prepare(direction);if(!ready){busy=false;controls();}return ready;}return true;
  }
  async function turn(direction){const generation=chooseGeneration;if(!await readyTurn(direction))return;const committed=paper?await paper.finish(true,reduced):true;if(!committed||generation!==chooseGeneration||!dialog.open)return;spread+=direction;busy=false;if(!paper)fallback();controls();warm(album.photos.slice(Math.max(0,spread*2+2)),8);}
  function apply(data){
    const previous=album?.id;
    const selected=new Set((config.galleryAlbums||[]).map(String));
    albums=(Array.isArray(data.albums)?data.albums:[]).filter(a=>a&&!a.private&&!a.password&&Array.isArray(a.photos)&&(!selected.size||selected.has(String(a.id))||selected.has(a.title))).map(a=>({...a,title:String(a.title||'照片画册'),photos:a.photos.map(p=>({...p,url:safeUrl(p.url,location.href)})).filter(p=>p.url)})).filter(a=>a.photos.length);
    $('album-library').replaceChildren(...albums.map((a,i)=>{const card=make('button','album-card');card.type='button';card.append(logo(),make('span','album-card-brand','Travel Time'),make('strong','',a.title),make('small','',`${a.photos.length} 张照片 · 翻阅 →`));card.addEventListener('click',()=>choose(i));return card;}));
    if(albums.length)preloadAll();
    if(dialog.open&&!busy){const index=albums.findIndex(a=>String(a.id)===String(previous));if(index>=0)choose(index);else showConfigured();}
    if(!albums.length){$('album-stage').hidden=$('album-controls').hidden=true;$('album-status').textContent=data.syncPending?'画册正在整理，请稍候…':'暂时没有可翻阅的画册。';}
  }
  async function request(){const source=config.galleryEndpoint||config.galleryUrl;if(!source)return {albums:[]};const response=await fetch(new URL(source,location.href),{signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw Error(data.error||'画册读取失败');return data;}
  async function maintain(data){
    if(!config.galleryEndpoint||!data.syncPending||maintenance)return;
    maintenance=(async()=>{let snapshot=data;for(let i=0;i<12&&snapshot.syncPending;i++){const url=new URL('gallery-maintain.php',new URL(config.galleryEndpoint,location.href));const response=await fetch(url,{method:'POST',signal:AbortSignal.timeout(45000)});if(!response.ok)break;snapshot=await response.json();if(!dialog.open||!album)apply(snapshot);if(snapshot.syncStatus?.error)break;}return snapshot;})().catch(()=>null).finally(()=>maintenance=null);
    const result=await maintenance;if(result&&dialog.open&&!album)apply(result);
  }
  async function load(){const data=await request();apply(data);maintain(data);return data;}
  function ensure(){if(!loadPromise)loadPromise=load().catch(()=>{if(dialog.open){$('album-status').textContent='画册暂时未能载入，请稍后再试。';toast('画册暂时未能载入，请稍后再试。');}}).finally(()=>loadPromise=null);return loadPromise;}
  async function open(){openDialog(dialog);if(albums.length){showConfigured();return;}await ensure();}
  $('album-back').addEventListener('click',showLibrary);$('album-prev').addEventListener('click',()=>turn(-1));$('album-next').addEventListener('click',()=>turn(1));
  book.addEventListener('pointerdown',async e=>{if(e.button!==0||busy||!album)return;const rect=book.getBoundingClientRect(),direction=spread<0||e.clientX>rect.left+rect.width/2?1:-1;drag={id:e.pointerId,start:e.clientX,last:e.clientX,y:e.clientY,direction,rect,ready:false,moved:false,ended:false};book.setPointerCapture(e.pointerId);const state=drag;if(await readyTurn(direction)){if(drag===state){state.ready=true;if(state.ended){await completeDrag(state);}else if(state.moved)moveDrag(state);}}else if(drag===state){drag=null;busy=false;controls();}});
  function moveDrag(state){const fraction=Math.min(.98,Math.max(0,(state.start-state.last)*state.direction/(state.rect.width/2)));paper?.update(state.direction>0?fraction:1-fraction,(state.y-state.rect.top)/state.rect.height-.5);}
  async function completeDrag(state){const distance=(state.start-state.last)*state.direction,commit=!state.moved||distance>state.rect.width*.12;const committed=paper?await paper.finish(commit,reduced):commit;if(drag!==state||!dialog.open)return;if(committed)spread+=state.direction;busy=false;drag=null;swipeUntil=performance.now()+500;if(!paper)fallback();controls();}
  book.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;drag.last=e.clientX;drag.y=e.clientY;drag.moved=drag.moved||Math.abs(drag.last-drag.start)>5;if(drag.ready&&drag.moved)moveDrag(drag);});
  book.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;drag.last=e.clientX;drag.ended=true;if(drag.ready)completeDrag(drag);});
  book.addEventListener('pointercancel',()=>{paper?.stop();drag=null;busy=false;controls();});
  book.addEventListener('click',e=>{e.preventDefault();if(performance.now()<swipeUntil)return;});
  dialog.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}});
  dialog.addEventListener('close',()=>{chooseGeneration++;paper?.stop();drag=null;busy=false;});$('album-btn').addEventListener('click',open);
  // Fetch the local manifest as soon as the site opens; warm images in a bounded queue.
  if(config.galleryUrl)ensure();
  return {open};
}
