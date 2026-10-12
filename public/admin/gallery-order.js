window.BookstoreGalleryOrder={
 names(photos,order){return [...new Set([...order,...photos.map(p=>p.chapter||'')])].filter(Boolean);},
 photos(photos,chapter){return chapter==='*'?photos:photos.filter(p=>(p.chapter||'')===chapter);},
 move(photos,key,target,chapter='*'){
  const slots=photos.map((p,i)=>chapter==='*'||(p.chapter||'')===chapter?i:-1).filter(i=>i>=0),group=slots.map(i=>photos[i]),index=group.findIndex(p=>p.photoKey===key);
  if(index<0||!group.length)return -1;target=Math.max(0,Math.min(group.length-1,target));const [photo]=group.splice(index,1);group.splice(target,0,photo);slots.forEach((slot,i)=>photos[slot]=group[i]);return target;
 },
 moveChapter(names,name,delta){const next=[...names],i=next.indexOf(name),j=Math.max(0,Math.min(next.length-1,i+delta));if(i<0)return next;const [value]=next.splice(i,1);next.splice(j,0,value);return next;}
};
