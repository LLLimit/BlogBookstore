export const PAGE_W=1008,PAGE_H=1440;
const create=(w=PAGE_W,h=PAGE_H)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function lines(ctx,text,x,y,width,lineHeight,max=8){let line='',row=0;for(const char of String(text)){if(line&&ctx.measureText(line+char).width>width){ctx.fillText(line,x,y+row++*lineHeight);line='';if(row>=max)return;}line+=char;}if(line)ctx.fillText(line,x,y+row*lineHeight);}
function image(ctx,img,x,y,w,h,fill){const scale=(fill?Math.max:Math.min)(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore();return fill?{x,y,w,h}:{x:x+(w-iw)/2,y:y+(h-ih)/2,w:iw,h:ih};}
export function coverPhoto(album){return album.photos.find(p=>p.photoKey===album.editor?.coverPhotoKey)||album.photos[0];}
export function paintAlbumPage(album,index,loader,cover=false){
 const canvas=create(),ctx=canvas.getContext('2d'),entry=album.pages[index]||{},photo=cover?coverPhoto(album):album.photos[entry.photoIndex];
 ctx.fillStyle='white';ctx.fillRect(0,0,PAGE_W,PAGE_H);
 if(cover){
  const img=photo&&loader.peek(photo.url);if(img)image(ctx,img,0,0,PAGE_W,PAGE_H,true);else{ctx.fillStyle='#346d96';ctx.fillRect(0,0,PAGE_W,PAGE_H);}
  const shade=ctx.createLinearGradient(0,520,0,PAGE_H);shade.addColorStop(0,'#00132300');shade.addColorStop(1,'#001323a6');ctx.fillStyle=shade;ctx.fillRect(0,0,PAGE_W,PAGE_H);
  ctx.fillStyle='white';ctx.font='92px Georgia,serif';ctx.fillText('TRAVEL',72,1050);ctx.fillText('NOTES',72,1158);return canvas;
 }
 if(entry.kind==='chapter'||entry.kind==='ending'){
  const wide=create(PAGE_W*2),w=wide.getContext('2d');w.fillStyle='white';w.fillRect(0,0,wide.width,PAGE_H);w.fillStyle='#202525';
  if(entry.kind==='chapter'){w.textAlign='center';w.font='22px monospace';w.fillText('A NEW CHAPTER',1008,540);w.font='140px Georgia,serif';w.fillText(entry.title,1008,730,1700);}
  else{w.font='30px Georgia,serif';w.fillText('STRAIGHT AWAY......',150,960);w.font='31px Georgia,serif';lines(w,'THERE ARE STILL MANY JOURNEYS AHEAD IN MY LIFE...... WAITING TO BE EXPLORED',1120,935,735,56,6);}
  ctx.drawImage(wide,entry.half==='right'?PAGE_W:0,0,PAGE_W,PAGE_H,0,0,PAGE_W,PAGE_H);return canvas;
 }
 if(entry.kind==='memo'){ctx.fillStyle='#b0b7b9';ctx.font='21px monospace';ctx.fillText(String(entry.count).padStart(2,'0')+' PHOTOGRAPHS',105,440);ctx.fillStyle='#313b40';ctx.font='46px Georgia,serif';lines(ctx,entry.title||'Places worth keeping.',105,590,785,65,5);return canvas;}
 if(!photo)return canvas;
 const wide=!!entry.half,target=wide?create(PAGE_W*2):canvas,c=target.getContext('2d'),img=loader.peek(photo.url),full=entry.layout?.endsWith('-full');
 c.fillStyle='white';c.fillRect(0,0,target.width,PAGE_H);const box=full?{x:0,y:0,w:target.width,h:PAGE_H}:{x:wide?100:105,y:115,w:target.width-(wide?200:210),h:1190};
 const rect=img?image(c,img,box.x,box.y,box.w,box.h,full):box;
 if(!img){c.fillStyle='#edf1f3';c.fillRect(rect.x,rect.y,rect.w,rect.h);}
 const side=photo.textCorner==='left'||photo.textCorner==='right'?photo.textCorner:wide?'right':index%2?'right':'left';
 const text=photo.pageText||'',date=(photo.takenAt||'').replace('T',' '),padding=full?52:26;
 function label(text,date,side,area){
  if(!text&&!date)return;c.save();c.fillStyle='#fff';c.shadowColor='#0009';c.shadowBlur=8;c.textAlign=side==='right'?'right':'left';const x=side==='right'?area.x+area.w-padding:area.x+padding;
  c.font='28px Georgia,"Microsoft YaHei",serif';const wrapped=[];let line='';for(const char of text){if(line&&c.measureText(line+char).width>area.w-padding*2){wrapped.push(line);line='';}line+=char;}if(line)wrapped.push(line);const copy=wrapped.slice(0,4),bottom=area.y+area.h-padding;
  copy.forEach((value,i)=>c.fillText(value,x,bottom-(copy.length-1-i)*36));c.font='23px "Microsoft YaHei",sans-serif';if(date)c.fillText(date,x,bottom-(copy.length?copy.length*36+12:0),area.w-padding*2);c.restore();
 }
 if(wide&&(photo.leftPageText||photo.rightPageText)){
  const left={...rect,w:PAGE_W-rect.x},right={...rect,x:PAGE_W,w:rect.x+rect.w-PAGE_W};
  label(photo.leftPageText||'',side==='left'?date:'','left',left);label(photo.rightPageText||'',side==='right'?date:'','right',right);
 }else label(text,date,side,rect);
 if(wide)ctx.drawImage(target,entry.half==='right'?PAGE_W:0,0,PAGE_W,PAGE_H,0,0,PAGE_W,PAGE_H);
 return canvas;
}
