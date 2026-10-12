const galleryRoot=document.getElementById('gallery-settings');
if(galleryRoot){
 const form=galleryRoot.closest('form'),message=document.getElementById('gallery-sync-message'),selection=document.getElementById('gallery-albums');let running=false;
 async function post(endpoint,data){
  let response;try{response=await fetch(endpoint,{method:'POST',body:data,signal:AbortSignal.timeout(60000)});}catch(error){throw Error(error.name==='TimeoutError'?'书店接口响应超时。请查看同步状态，或检查服务器 PHP / 反向代理超时设置。':'浏览器未能连接书店后台接口。请确认网站网络正常并刷新后台后重试；相册源下载失败会显示在同步状态里。');}
  const text=await response.text();let json;try{json=JSON.parse(text);}catch{throw Error(`书店接口返回 HTTP ${response.status}，响应不是 JSON。请检查 PHP 错误日志及网站重定向设置。`);}
  if(!response.ok||json.error)throw Error(json.error||`书店接口返回 HTTP ${response.status}`);return json;
 }
 async function request(operation){const data=new FormData();data.set('csrf',form.elements.csrf.value);data.set('operation',operation);data.set('galleryUrl',form.elements.galleryUrl.value);data.set('galleryType',form.elements.galleryType.value);return post('./gallery-sync.php',data);}
 function status(s){const date=s.checkedAt?new Date(s.checkedAt*1000).toLocaleString():'尚未同步';message.textContent=`最近检查：${date}。已处理 ${s.done} / ${s.total} 张，待处理 ${s.pendingPhotos??s.pending} 张、${s.pendingAlbums??0} 本相册，失败 ${s.failures} 项。${s.error||''}${s.optimized?'':' PHP GD 未启用，目前使用本地原图。'}${s.errors?.length?' '+s.errors[0].message:''}`;}
 document.getElementById('gallery-discover').addEventListener('click',async e=>{e.target.disabled=true;message.textContent='正在读取公开相册…';try{const data=await request('catalog'),choices=document.getElementById('gallery-choices');choices.replaceChildren();const selected=new Set(selection.value.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean));for(const a of data.albums){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.value=a.id;box.checked=selected.has(a.id)||selected.has(a.title);label.append(box,document.createTextNode(` ${a.title}（${a.id}）`));choices.append(label);}choices.onchange=()=>{selection.value=[...choices.querySelectorAll('input:checked')].map(i=>i.value).join(',');};message.textContent=data.albums.length?'勾选要展示的相册，然后保存设置。':'未发现公开相册。';}catch(error){message.textContent=error.message;}finally{e.target.disabled=false;}});
 document.getElementById('gallery-sync-start').addEventListener('click',async e=>{if(running)return;running=true;e.target.disabled=true;try{let data=await request('start');status(data);while(data.pending&&!data.busy){data=await request('step');status(data);}if(data.busy)message.textContent+=' 另一个任务正在同步，稍后查看状态。';else if(!data.failures&&!data.error)message.textContent+=' 已完成，刷新书店即可翻阅。';}catch(error){message.textContent=error.message;}finally{running=false;e.target.disabled=false;}});
 document.getElementById('gallery-sync-status').addEventListener('click',()=>request('status').then(status).catch(e=>message.textContent=e.message));
 request('status').then(status).catch(()=>{});
 const notesMessage=document.getElementById('gallery-notes-message'),notesRoot=document.getElementById('gallery-photo-notes');
 async function noteRequest(operation,values={}){const data=new FormData();data.set('csrf',form.elements.csrf.value);data.set('operation',operation);for(const [key,value]of Object.entries(values))data.set(key,value);return post('./gallery-notes.php',data);}
 document.getElementById('gallery-notes-load').addEventListener('click',async e=>{
  e.target.disabled=true;notesMessage.textContent='正在读取已同步的照片…';
  try{const data=await noteRequest('photos');notesRoot.replaceChildren();let count=0;
   for(const album of data.albums){const heading=document.createElement('h4');heading.textContent=album.title;notesRoot.append(heading);
    for(const photo of album.photos){count++;const card=document.createElement('div');card.className='gallery-photo-note';const img=document.createElement('img');img.src=new URL(photo.url,new URL('../',location.href));img.alt=photo.caption||album.title;img.loading='lazy';
     const fields=document.createElement('div'),title=document.createElement('strong');title.textContent=photo.caption||`照片 ${count}`;
     const dateLabel=document.createElement('label');dateLabel.textContent='日期与时间';const date=document.createElement('input');date.type='datetime-local';date.value=photo.takenAt||'';dateLabel.append(date);
     const storyLabel=document.createElement('label');storyLabel.textContent='照片故事';const story=document.createElement('textarea');story.rows=4;story.maxLength=2000;story.value=photo.story||'';storyLabel.append(story);
     const save=document.createElement('button');save.type='button';save.className='button secondary';save.textContent='保存这张照片';const feedback=document.createElement('p');feedback.className='hint';feedback.setAttribute('role','status');
     save.addEventListener('click',async()=>{save.disabled=true;try{await noteRequest('save',{photoKey:photo.photoKey,takenAt:date.value,story:story.value});feedback.textContent='已保存，刷新画册即可看到。';}catch(error){feedback.textContent=error.message;}finally{save.disabled=false;}});
     fields.append(title,dateLabel,storyLabel,save,feedback);card.append(img,fields);notesRoot.append(card);
    }
   }notesMessage.textContent=count?`共 ${count} 张照片。每张照片单独保存；留空后保存可清除日期或故事。`:'暂无已同步的照片，请先检查并下载更新。';
  }catch(error){notesMessage.textContent=error.message;}finally{e.target.disabled=false;}
 });
}
