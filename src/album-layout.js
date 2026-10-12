export function photoLayout(photo,editor={}){
  if(photo.layout&&photo.layout!=='auto')return photo.layout;
  return Number(photo.width)>0&&Number(photo.height)>0&&photo.width/photo.height>=1.6?(editor.wideLayout||'spread-full'):'page-contain';
}
export function buildAlbumPages(photos,editor={}){
  const pages=[],titles=[...new Set([...(editor.chapterOrder||[]),...photos.map(p=>p.chapter||'')])].filter(t=>photos.some(p=>(p.chapter||'')===t));
  if(titles.includes('')){titles.splice(titles.indexOf(''),1);titles.push('');}
  for(const chapter of titles){
    const members=photos.map((p,i)=>({photo:p,photoIndex:i})).filter(({photo})=>(photo.chapter||'')===chapter);
    if(chapter)pages.push({kind:'chapter',title:chapter,half:'left',chapter},{kind:'chapter',title:chapter,half:'right',chapter});
    for(const {photo,photoIndex}of members){
      const layout=photoLayout(photo,editor);
      if(layout.startsWith('spread-')){
        if(pages.length%2)pages.push({kind:'memo',title:chapter,chapter,count:members.length});
        pages.push({photoIndex,layout,half:'left',chapter},{photoIndex,layout,half:'right',chapter});
      }else pages.push({photoIndex,layout,chapter});
    }
    if(pages.length%2)pages.push({kind:'memo',title:chapter,chapter,count:members.length});
  }
  pages.push({kind:'ending',half:'left'},{kind:'ending',half:'right'});
  return pages;
}
