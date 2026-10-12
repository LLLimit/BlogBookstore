// Wide images begin on a left page and span a complete spread; no crop is lost at the fold.
export function buildAlbumPages(photos){
  const pages=[];
  photos.forEach((photo,photoIndex)=>{
    const wide=Number(photo.width)>0&&Number(photo.height)>0&&photo.width/photo.height>=1.6;
    if(wide){if(pages.length%2)pages.push({blank:true});pages.push({photoIndex,half:'left'},{photoIndex,half:'right'});}
    else pages.push({photoIndex});
  });
  if(pages.length%2)pages.push({blank:true});
  return pages;
}
