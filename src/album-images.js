// Full-resolution images, with visible pages ahead of speculative work.
export function createAlbumImageLoader({makeImage=()=>new Image(),timeout=30000,maxPixels=48000000}={}){
 const records=new Map(),queue=[],active=new Set();
 function touch(url){const record=records.get(url);if(record){records.delete(url);records.set(url,record);}return record;}
 function trim(){let pixels=[...records.values()].reduce((n,r)=>n+(r.image?r.image.naturalWidth*r.image.naturalHeight:0),0),count=0;for(const r of records.values())if(r.image)count++;
  for(const [url,r]of records){if(!r.image||count<=4&&pixels<=maxPixels)continue;if(count===1)break;pixels-=r.image.naturalWidth*r.image.naturalHeight;count--;records.delete(url);}
 }
 function pump(){
  while(active.size<2&&queue.length){const urgent=queue.findIndex(t=>t.priority==='high');if(urgent<0&&active.size)break;const task=queue.splice(urgent<0?0:urgent,1)[0],img=makeImage();task.img=img;active.add(task);img.decoding='async';img.fetchPriority=task.priority;
   let ended=false;const finish=()=>{clearTimeout(timer);active.delete(task);pump();};
   task.cancel=()=>{if(ended)return false;ended=true;img.onload=img.onerror=null;img.src='';clearTimeout(timer);active.delete(task);queue.push(task);return true;};
   const timer=setTimeout(()=>{if(ended)return;ended=true;img.onload=img.onerror=null;img.src='';records.delete(task.url);task.reject(Error('照片加载超时'));finish();},timeout);
   img.onload=async()=>{if(ended)return;ended=true;clearTimeout(timer);try{await img.decode();}catch{}const record=touch(task.url);if(record)record.image=img;task.resolve(img);trim();finish();};
   img.onerror=()=>{if(ended)return;ended=true;records.delete(task.url);task.reject(Error('照片加载失败'));finish();};img.src=task.url;
  }
 }
 function get(url,priority='high'){
  let record=touch(url);if(record){if(record.image)return record.promise;if(priority==='high'&&record.task){record.task.priority='high';if(record.task.img)record.task.img.fetchPriority='high';}else return record.promise;}
  else{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;}),task={url,priority,resolve,reject};record={promise,image:null,task};records.set(url,record);queue.push(task);}
  if(priority==='high')for(const task of [...active])if(task.priority==='low')task.cancel();pump();return record.promise;
 }
 return {peek:url=>touch(url)?.image,get,warm(urls){for(const url of [...new Set(urls.filter(Boolean))])get(url,'low').catch(()=>{});}};
}
