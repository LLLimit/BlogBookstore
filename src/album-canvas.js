import {paintAlbumPage,coverPhoto,PAGE_W,PAGE_H} from './album-paint.js';

// Continuous curved paper projected into Canvas 2D. It needs no extra WebGL
// context and keeps the same two-sided turn on phones and fallback browsers.
export function createAlbumRenderer(host,loader,options={}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw Error('Canvas 2D unavailable');canvas.className='album-canvas';canvas.setAttribute('aria-hidden','true');host.replaceChildren(canvas);
 const mobile=matchMedia('(pointer:coarse)').matches,W=2.9,H=4.15,columns=mobile?28:44,rows=mobile?2:4;
 let width=1,height=1,scale=1,rootX=-W/2,album=null,spread=-1,active=null,raf=0,resolver=null,disposed=false;const textures=new Map();
 function get(index,cover=false){const key=cover?'cover':String(index);if(textures.has(key))return textures.get(key);const paint=options.paint||paintAlbumPage,page=paint(album,index,loader,cover),scope=album;textures.set(key,page);const photo=cover?coverPhoto(album):album.photos[album.pages[index]?.photoIndex],urls=options.images?options.images(album,index,cover):photo?[photo.url]:[];for(const url of urls)if(!loader.peek(url))loader.get(url).then(()=>{if(!disposed&&album===scope&&textures.has(key)){textures.set(key,paint(album,index,loader,cover));render();}}).catch(()=>{});return page;}
 const project=(x,y,z=0)=>({x:width/2+(x+rootX)*scale,y:height/2-y*scale-z*scale*.19});
 function halt(){cancelAnimationFrame(raf);if(resolver){resolver(false);resolver=null;}active=null;}
 function flat(index,side,cover=false){const p=project(side<0?-W:0,H/2);ctx.drawImage(get(index,cover),p.x,p.y,W*scale,H*scale);}
 function mesh(p,corner){const points=[];const curl=Math.sin(p*Math.PI)*.83;
  for(let row=0;row<=rows;row++){let x=0,z=.022;const v=row/rows;for(let col=0;col<=columns;col++){points.push(project(x,H/2-v*H,z));const u=(col+.5)/columns,angle=Math.PI*p-curl*Math.pow(u,1.6)+Math.sin(p*Math.PI)*(v-.5)*u*u*(.16+corner*.22);x+=Math.cos(angle)*W/columns;z+=Math.sin(angle)*W/columns;}}
  return points;
 }
 function triangle(image,points,uv){
  const [p,q,r]=points,[a,b,c]=uv,D=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);if(Math.abs(D)<.001)return;
  const coefficients=value=>[(value[0]*(b.y-c.y)+value[1]*(c.y-a.y)+value[2]*(a.y-b.y))/D,(value[0]*(c.x-b.x)+value[1]*(a.x-c.x)+value[2]*(b.x-a.x))/D,(value[0]*(b.x*c.y-c.x*b.y)+value[1]*(c.x*a.y-a.x*c.y)+value[2]*(a.x*b.y-b.x*a.y))/D];
  const [A,C,E]=coefficients([p.x,q.x,r.x]),[B,F,G]=coefficients([p.y,q.y,r.y]);
  ctx.save();ctx.beginPath();const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;for(const [i,v]of points.entries()){const dx=v.x-cx,dy=v.y-cy,length=Math.max(1,Math.hypot(dx,dy)),x=v.x+dx/length*.42,y=v.y+dy/length*.42;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.clip();ctx.transform(A,B,C,F,E,G);ctx.drawImage(image,0,0);ctx.restore();
 }
 function shadow(points){ctx.save();ctx.filter='blur(12px)';ctx.fillStyle='#26343c25';ctx.beginPath();for(let col=0;col<=columns;col++){const p=points[col];if(!col)ctx.moveTo(p.x+10,p.y+14);else ctx.lineTo(p.x+10,p.y+14);}for(let col=columns;col>=0;col--){const p=points[rows*(columns+1)+col];ctx.lineTo(p.x+10,p.y+14);}ctx.closePath();ctx.fill();ctx.restore();}
 function paper(points){
  const front=get(active.frontIndex,active.frontCover),back=get(active.backIndex);
  for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
   const i=row*(columns+1)+col,a=points[i],b=points[i+1],c=points[i+columns+1],d=points[i+columns+2],reverse=b.x<a.x,texture=reverse?back:front;
   const u1=(reverse?1-col/columns:col/columns)*PAGE_W,u2=(reverse?1-(col+1)/columns:(col+1)/columns)*PAGE_W,v1=row/rows*PAGE_H,v2=(row+1)/rows*PAGE_H;
   triangle(texture,[a,b,c],[{x:u1,y:v1},{x:u2,y:v1},{x:u1,y:v2}]);triangle(texture,[b,d,c],[{x:u2,y:v1},{x:u2,y:v2},{x:u1,y:v2}]);
   const shade=Math.min(.20,.16*(1-Math.min(1,Math.abs(b.x-a.x)/(W*scale/columns))));ctx.fillStyle=`rgba(15,29,40,${shade})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(d.x,d.y);ctx.lineTo(c.x,c.y);ctx.fill();
  }
 }
 function render(){
  if(disposed||!album)return;ctx.clearRect(0,0,width,height);
  const open=spread>=0||!!active,p=project(open?-W:0,H/2),bookWidth=(open?2:1)*W*scale;
  ctx.save();ctx.shadowColor='#233a4c35';ctx.shadowBlur=20;ctx.shadowOffsetY=10;ctx.fillStyle='#f4f7f8';ctx.fillRect(p.x-1,p.y+4,bookWidth+2,H*scale+4);ctx.restore();
  if(active){
   if(active.old>=0)flat(active.direction>0?active.old*2:active.next*2,-1);
   else if(active.p>.04){const left=project(-W,H/2);ctx.fillStyle='white';ctx.fillRect(left.x,left.y,W*scale,H*scale);}
   flat(active.direction>0?active.next*2+1:active.old*2+1,1);
   const points=mesh(active.p,active.corner||0);shadow(points);paper(points);
  }else if(spread<0)flat(0,1,true);else{flat(spread*2,-1);flat(spread*2+1,1);}
  if(open){const spine=project(0,H/2);const g=ctx.createLinearGradient(spine.x-8,0,spine.x+8,0);g.addColorStop(0,'#00000000');g.addColorStop(.5,'#152b441d');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(spine.x-8,spine.y,16,H*scale);}
 }
 function settle(){rootX=spread<0?-W/2:0;for(const key of textures.keys())if(key!=='cover'&&(Number(key)<spread*2-4||Number(key)>spread*2+5))textures.delete(key);render();}
 function choose(value){halt();textures.clear();album=value;spread=-1;resize();settle();}
 function prepare(direction){
  if(!album||active||direction<0&&spread<0)return false;const blocked=direction>0&&spread>=album.pages.length/2-1,next=blocked?spread:spread+direction;
  active={direction,old:spread,next,blocked,p:direction>0?0:1,frontIndex:direction>0?spread*2+1:next*2+1,backIndex:direction>0?(blocked?album.pages.length:next*2):spread*2,frontCover:direction>0?spread<0:next<0};update(active.p);return true;
 }
 function update(p,corner=0){if(!active)return;active.p=active.blocked?Math.min(.48,p):Math.max(0,Math.min(1,p));active.corner=corner;rootX=active.old<0||active.next<0?-W/2*(1-active.p):0;render();}
 function finish(commit=true,reduced=false){
  if(!active)return Promise.resolve(false);const state=active,start=state.p,blocked=state.blocked,automatic=blocked&&start<.01,target=blocked?0:commit?(state.direction>0?1:0):(state.direction>0?0:1),begin=performance.now(),duration=reduced?280:blocked?700:Math.max(260,Math.abs(target-start)*960);
  return new Promise(resolve=>{resolver=resolve;function tick(now){if(active!==state)return;const t=Math.min(1,(now-begin)/duration),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;update(automatic ? .48*Math.sin(t*Math.PI) : start+(target-start)*ease);if(t<1)raf=requestAnimationFrame(tick);else{const success=commit&&!blocked;if(success)spread=state.next;active=null;resolver=null;settle();resolve(success);}}raf=requestAnimationFrame(tick);});
 }
 function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);scale=Math.min(width/(W*2+.65),height/(H+.55));render();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {choose,prepare,update,finish,render,setSpread(value){halt();spread=Math.max(-1,Math.min(album.pages.length/2-1,value));settle();},stop(){halt();if(album)settle();},dispose(){disposed=true;halt();observer.disconnect();textures.clear();}};
}
