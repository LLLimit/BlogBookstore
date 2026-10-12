{
 const trigger=document.getElementById('gallery-editor-load');
 if(trigger){
  const root=document.getElementById('gallery-photo-notes'),message=document.getElementById('gallery-notes-message'),form=trigger.closest('form'),sorting=window.BookstoreGalleryOrder;let editors=[],thumbnailRefreshers=[];
  const activeSaves=new Set();window.BookstoreGalleryEditor={get busy(){return activeSaves.size>0;},async saveAll(){for(const save of editors)await save();}};
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,run)=>{const b=el('button',text,'button secondary');b.type='button';b.addEventListener('click',run);return b;};
  const input=(type,value)=>{const e=el('input');e.type=type;e.value=value||'';return e;};
  const select=(options,value)=>{const e=el('select');for(const [v,label]of options){const o=el('option',label);o.value=v;e.append(o);}e.value=value||options[0][0];return e;};
  const field=(label,control)=>{const l=el('label',label);l.append(control);return l;};
  const layouts=[['auto','自动（横幅双页，其他留白）'],['spread-full','铺满整本双页'],['spread-contain','双页完整留白'],['page-full','铺满单页'],['page-contain','单页完整留白']];
  const corners=[['outer','按左右页自动外侧'],['left','左下角'],['right','右下角']],sides=[['outer','按左右页自动外侧'],['left','书外左侧'],['right','书外右侧']];
  async function request(operation,payload){const data=new FormData();data.set('csrf',form.elements.csrf.value);data.set('operation',operation);if(payload)data.set('payload',JSON.stringify(payload));let response;try{response=await fetch('./gallery-notes.php',{method:'POST',body:data,signal:AbortSignal.timeout(20000)});}catch(error){throw Error(error.name==='TimeoutError'?'旅游册保存超时。编辑内容仍在页面中，请查看服务器日志后重试。':'旅游册连接中断。编辑内容仍在页面中，请重试保存，不要直接刷新页面。');}const text=await response.text();let result;try{result=JSON.parse(text);}catch{throw Error(`旅游册接口返回 HTTP ${response.status}，响应不是 JSON，请检查 PHP / nginx 错误日志。`);}if(!response.ok||result.error)throw Error(result.error||`旅游册接口返回 HTTP ${response.status}`);return result;}
  function renderAlbum(album){
   album.editor=album.editor||{};const selected=new Set(),visible=new Map();let page=0,filter='*';const size=8;
   const box=el('details',null,'travel-editor');box.open=true;box.append(el('summary',`${album.title} · ${album.photos.length} 张照片`));
   const options=el('div',null,'fields two'),chapters=el('textarea');chapters.rows=3;chapters.placeholder='HONG KONG\nTOKYO';chapters.value=(album.editor.chapterOrder||[]).join('\n');
   const cover=select([['','默认：排序后的第一张'],...album.photos.map((p,i)=>[p.photoKey,`${i+1}. ${p.caption||'照片'}`])],album.editor.coverPhotoKey);
   const wide=select([['spread-full','横幅铺满整本双页'],['spread-contain','横幅完整展示，保留白边']],album.editor.wideLayout);
   options.append(field('章节顺序（每行一个名称）',chapters),field('封面照片',cover),field('横幅的默认版式',wide));box.append(options);
   box.append(el('p','选择章节即可只查看和排列这一章的照片；↑ ↓ 和序号均为章内顺序。全部照片视图则调整全局顺序。修改后点击保存旅游册。','hint'));
   const chapterTools=el('div',null,'travel-chapter-tools'),chapterFilter=select([['*','全部照片'],['','未分类']],'*'),chapterUp=button('章节提前 ↑',()=>shiftChapter(-1)),chapterDown=button('章节后移 ↓',()=>shiftChapter(1));
   chapterTools.append(field('选择章节 / 章内排序',chapterFilter),chapterUp,chapterDown);box.append(chapterTools);
   const batch=el('div',null,'travel-batch'),chapterInput=input('text','');chapterInput.placeholder='例如 HONG KONG';const bulkLayout=select(layouts,'auto'),selectedInfo=el('span','已选 0 张','hint');
   const list=el('div',null,'travel-photo-list'),paging=el('div',null,'travel-editor-paging'),pageInfo=el('span'),feedback=el('p','','hint');feedback.setAttribute('role','status');
   function collect(){for(const [key,controls]of visible){const photo=album.photos.find(p=>p.photoKey===key);for(const [name,node]of Object.entries(controls))photo[name]=node.value;photo.chapter=photo.chapter.trim();}}
   function selection(){selectedInfo.textContent=`已选 ${selected.size} 张`;}
   function addChapter(name){const values=chapters.value.split('\n').map(v=>v.trim()).filter(Boolean);if(name&&!values.includes(name))chapters.value=[...values,name].join('\n');}
   function chapterNames(){return sorting.names(album.photos,chapters.value.split('\n').map(v=>v.trim()).filter(Boolean));}
   function shiftChapter(delta){collect();chapters.value=sorting.moveChapter(chapterNames(),filter,delta).join('\n');render();feedback.textContent='已调整章节位置，保存旅游册后生效。';}
   chapterFilter.addEventListener('change',()=>{collect();filter=chapterFilter.value;page=0;selected.clear();render();});chapters.addEventListener('change',()=>{collect();render();});
   const selectAll=button('全选当前范围',()=>{collect();sorting.photos(album.photos,filter).forEach(p=>selected.add(p.photoKey));render();});
   batch.append(chapterInput,button('选中照片归入章节',()=>{collect();const name=chapterInput.value.trim();for(const photo of album.photos)if(selected.has(photo.photoKey))photo.chapter=name;addChapter(name);render();}),bulkLayout,button('应用版式',()=>{collect();for(const photo of album.photos)if(selected.has(photo.photoKey))photo.layout=bulkLayout.value;render();}),selectAll,button('取消选择',()=>{collect();selected.clear();render();}),selectedInfo);
   batch.append(button('按章节整理单页配对',()=>{collect();const titles=[...new Set([...chapters.value.split('\n').map(v=>v.trim()).filter(Boolean),...album.photos.map(p=>p.chapter||'')])];const result=[];for(const title of titles){const group=album.photos.filter(p=>(p.chapter||'')===title),isWide=p=>p.layout&&p.layout!=='auto'?p.layout.startsWith('spread-'):p.width/p.height>=1.6;result.push(...group.filter(p=>!isWide(p)),...group.filter(isWide));}album.photos=result;page=0;render();feedback.textContent='已把每个章节的单页照片排在一起，再接跨页照片。点击保存旅游册后生效。';}));
   box.append(batch,list,paging);
   function move(key,target){collect();const position=sorting.move(album.photos,key,target,filter);page=Math.floor(Math.max(0,position)/size);render();}
   function render(){
    const names=chapterNames();chapterFilter.replaceChildren(...[['*',`全部照片（${album.photos.length}）`],...names.map(name=>[name,`${name}（${sorting.photos(album.photos,name).length}）`]),['',`未分类（${sorting.photos(album.photos,'').length}）`]].map(([value,label])=>{const option=el('option',label);option.value=value;return option;}));chapterFilter.value=filter;
    const ci=names.indexOf(filter);chapterUp.disabled=ci<=0;chapterDown.disabled=ci<0||ci>=names.length-1;
    const photos=sorting.photos(album.photos,filter);page=Math.max(0,Math.min(page,Math.ceil(photos.length/size)-1));list.replaceChildren();visible.clear();selection();
    photos.slice(page*size,page*size+size).forEach((photo,local)=>{
     const index=page*size+local,card=el('article',null,'travel-editor-photo'),thumb=photo.thumbnailUrl?el('img'):el('div','缩略图待生成','travel-thumb-placeholder');card.dataset.photoKey=photo.photoKey;if(photo.thumbnailUrl){thumb.src=new URL(photo.thumbnailUrl,new URL('../',location.href));thumb.alt=photo.caption||'照片';thumb.loading='lazy';thumb.decoding='async';thumb.width=100;thumb.height=135;}
     const check=input('checkbox','');check.checked=selected.has(photo.photoKey);check.addEventListener('change',()=>{check.checked?selected.add(photo.photoKey):selected.delete(photo.photoKey);selection();});
     const heading=el('div',null,'travel-editor-photo-head');heading.append(check,el('strong',`${index+1}. ${photo.caption||'照片'}`));
     const order=input('number',String(index+1));order.min='1';order.max=String(photos.length);order.setAttribute('aria-label',filter==='*'?'照片顺序':'章内照片顺序');order.addEventListener('change',()=>move(photo.photoKey,(Number(order.value)||1)-1));
     const up=button('↑',()=>move(photo.photoKey,index-1)),down=button('↓',()=>move(photo.photoKey,index+1));up.disabled=index===0;down.disabled=index===photos.length-1;
     heading.append(up,order,down,button('设为封面',()=>{cover.value=photo.photoKey;feedback.textContent='已选为封面，点击保存旅游册后生效。';}));
     const fields=el('div',null,'fields two'),controls={chapter:input('text',photo.chapter),layout:select(layouts,photo.layout),takenAt:input('datetime-local',photo.takenAt),pageText:input('text',photo.pageText),leftPageText:input('text',photo.leftPageText),rightPageText:input('text',photo.rightPageText),textCorner:select(corners,photo.textCorner),storySide:select(sides,photo.storySide),story:el('textarea')};
     controls.chapter.placeholder='未分类 / HONG KONG';controls.chapter.maxLength=80;for(const key of ['pageText','leftPageText','rightPageText'])controls[key].maxLength=240;controls.story.value=photo.story||'';controls.story.rows=3;controls.story.maxLength=2000;
     controls.leftPageText.placeholder=controls.rightPageText.placeholder='仅跨页照片使用，可留空';
     for(const [name,label]of [['chapter','所属章节'],['layout','照片版式'],['takenAt','日期与时间'],['pageText','页角文案'],['textCorner','日期 / 文案位置'],['storySide','故事浮动位置'],['leftPageText','跨页：左页左下文案'],['rightPageText','跨页：右页右下文案'],['story','照片故事']])fields.append(field(label,controls[name]));
     const content=el('div');content.append(heading,fields);card.append(thumb,content);list.append(card);visible.set(photo.photoKey,controls);
    });
    if(!photos.length)list.append(el('p','这个章节暂无照片。可切换到全部照片，勾选后批量归入章节。','hint'));
    const previous=button('← 上一组',()=>{collect();page=Math.max(0,page-1);render();}),next=button('下一组 →',()=>{collect();page++;render();});previous.disabled=page===0;next.disabled=(page+1)*size>=photos.length;
    paging.replaceChildren(previous,pageInfo,next);pageInfo.textContent=photos.length?`${page*size+1}–${Math.min(photos.length,(page+1)*size)} / ${photos.length}`:'0 张照片';
   }
   let saving=null;async function saveAlbum(){if(saving)return saving;collect();const previous=save.disabled;save.disabled=true;activeSaves.add(saveAlbum);feedback.textContent='正在保存章节与排版…';saving=(async()=>{try{await request('album-save',{albumId:String(album.id),coverPhotoKey:cover.value,chapterOrder:chapters.value.split('\n').map(v=>v.trim()).filter(Boolean),wideLayout:wide.value,order:album.photos.map(p=>p.photoKey),photos:album.photos.map(p=>({photoKey:p.photoKey,chapter:p.chapter||'',layout:p.layout||'auto',takenAt:p.takenAt||'',pageText:p.pageText||'',leftPageText:p.leftPageText||'',rightPageText:p.rightPageText||'',textCorner:p.textCorner||'outer',storySide:p.storySide||'outer',story:p.story||''}))});feedback.textContent='已保存封面、章节、排序、版式和故事，刷新旅游册即可看到。';}catch(error){feedback.textContent=error.message;throw error;}finally{save.disabled=previous;saving=null;activeSaves.delete(saveAlbum);}})();return saving;}
   const save=button('保存这本旅游册',()=>saveAlbum().catch(()=>{}));editors.push(saveAlbum);thumbnailRefreshers.push(data=>{const updated=data.albums.find(a=>String(a.id)===String(album.id));if(updated){const urls=new Map(updated.photos.map(p=>[p.photoKey,p.thumbnailUrl]));for(const photo of album.photos)photo.thumbnailUrl=urls.get(photo.photoKey)||photo.thumbnailUrl;for(const card of list.children){const url=urls.get(card.dataset.photoKey);if(url&&card.firstElementChild.tagName!=='IMG'){const img=el('img');img.src=new URL(url,new URL('../',location.href));img.alt='照片缩略图';img.loading='lazy';img.decoding='async';img.width=100;img.height=135;card.firstElementChild.replaceWith(img);}}}});box.append(save,feedback);render();return box;
  }
  window.addEventListener('bookstore-gallery-optimized',()=>request('photos').then(data=>thumbnailRefreshers.forEach(refresh=>refresh(data))).catch(()=>{}));
  trigger.addEventListener('click',async()=>{trigger.disabled=true;message.textContent='正在读取已同步的旅游册…';try{const data=await request('photos');editors=[];thumbnailRefreshers=[];root.replaceChildren(...data.albums.map(renderAlbum));message.textContent=data.albums.length?'后台仅加载缩略图，选择章节后排列章内照片。底部「保存设置」也会一并保存已打开的旅游册。':'暂无已同步照片，请先检查并下载更新。';if(data.albums.some(a=>a.photos.some(p=>!p.thumbnailUrl)))window.BookstoreGalleryAssets?.ensure();}catch(error){message.textContent=error.message;}finally{trigger.disabled=false;}});
 }
}
