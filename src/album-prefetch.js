import {coverPhoto} from './album-paint.js';
import {buildAlbumPages} from './album-layout.js';

// Count photographs rather than paper pages: a chapter page has no image,
// and a panoramic photograph occupies two pages but downloads only once.
export function albumImageWindow(album,spread=-1,aheadCount=3){
 const pages=album.pages||buildAlbumPages(album.photos,album.editor),current=[],ahead=[],seen=new Set();
 const add=(photo,list)=>{if(photo?.url&&!seen.has(photo.url)){seen.add(photo.url);list.push(photo.url);}};
 if(spread<0)add(coverPhoto(album),current);
 else for(const entry of pages.slice(spread*2,spread*2+2))add(album.photos[entry.photoIndex],current);
 for(const entry of pages.slice(spread<0?0:(spread+1)*2)){
  add(album.photos[entry.photoIndex],ahead);if(ahead.length>=aheadCount)break;
 }
 return {current,ahead};
}
