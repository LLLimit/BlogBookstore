import {paintAlbumPage,coverPhoto,PAGE_W,PAGE_H} from './album-paint.js';
import {paperFaces} from './album-paper-mesh.js';

// Continuous curved paper projected into Canvas 2D. It needs no extra WebGL
// context and keeps the same two-sided turn on phones and fallback browsers.
export function createAlbumRenderer(host,loader,options={}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw Error('Canvas 2D unavailable');canvas.className='album-canvas';canvas.setAttribute('aria-hidden','true');host.replaceChildren(canvas);
 const shaded=[document.createElement('canvas'),document.createElement('canvas')];for(const c of shaded){c.width=PAGE_W;c.height=PAGE_H;}
 const mobile=matchMedia('(pointer:coarse)').matches,W=2.9,H=4.15,columns=mobile?28:44,rows=mobile?2:4;
 let width=1,height=1,scale=1,rootX=-W/2,album=null,spread=-1,active=null,raf=0,resolver=null,disposed=false;const textures=new Map();
 function get(index,cover=false){const key=cover?'cover':String(index);if(textures.has(key))return textures.get(key);const paint=options.paint||paintAlbumPage,page=paint(album,index,loader,cover),scope=album;textures.set(key,page);const photo=cover?coverPhoto(album):album.photos[album.pages[index]?.photoIndex],urls=options.images?options.images(album,index,cover):photo?[photo.url]:[];for(const url of urls)if(!loader.peek(url))loader.get(url).then(()=>{if(!disposed&&album===scope&&textures.has(key)){textures.set(key,paint(album,index,loader,cover));render();}}).catch(()=>{});return page;}
 const project=(x,y,z=0)=>({x:width/2+(x+rootX)*scale+(active?.shake||0),y:height/2-y*scale-z*scale*.19,depth:z-y*.19});
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
  // Offset each edge along its normal: radial vertex growth barely expands
  // the long edges of thin triangles and leaves antialiased sampling cracks.
  const area=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);if(Math.abs(area)<.0001)return;
  const sign=Math.sign(area),normals=points.map((v,i)=>{const next=points[(i+1)%3],dx=next.x-v.x,dy=next.y-v.y,len=Math.max(.0001,Math.hypot(dx,dy));return {x:sign*dy/len,y:-sign*dx/len};});
  const expanded=points.map((v,i)=>{const a=normals[(i+2)%3],b=normals[i],nx=a.x+b.x,ny=a.y+b.y,factor=Math.min(.8/Math.max(.000001,1+a.x*b.x+a.y*b.y),2.4/Math.max(.000001,Math.hypot(nx,ny)));return {x:v.x+nx*factor,y:v.y+ny*factor};}),det=A*F-B*C;if(Math.abs(det)<.0000001)return;
  const source=expanded.map(p=>({x:(F*(p.x-E)-C*(p.y-G))/det,y:(A*(p.y-G)-B*(p.x-E))/det}));
  const sx=Math.max(0,Math.floor(Math.min(...source.map(p=>p.x)))-1),sy=Math.max(0,Math.floor(Math.min(...source.map(p=>p.y)))-1),ex=Math.min(image.width,Math.ceil(Math.max(...source.map(p=>p.x)))+1),ey=Math.min(image.height,Math.ceil(Math.max(...source.map(p=>p.y)))+1);
  if(ex<=sx||ey<=sy)return;
  ctx.save();ctx.beginPath();expanded.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();ctx.transform(A,B,C,F,E,G);
  // Crop to this triangle's source bounds rather than resampling a full large
  // photograph for every cell on every animation frame.
  ctx.drawImage(image,sx,sy,ex-sx,ey-sy,sx,sy,ex-sx,ey-sy);ctx.restore();
 }
 function shadow(points){ctx.save();ctx.filter='blur(12px)';ctx.fillStyle='#26343c25';ctx.beginPath();for(let col=0;col<=columns;col++){const p=points[col];if(!col)ctx.moveTo(p.x+10,p.y+14);else ctx.lineTo(p.x+10,p.y+14);}for(let col=columns;col>=0;col--){const p=points[rows*(columns+1)+col];ctx.lineTo(p.x+10,p.y+14);}ctx.closePath();ctx.fill();ctx.restore();}
 function paper(points){
  const front=get(active.frontIndex,active.frontCover),back=get(active.backIndex);
  const faces=paperFaces(points,columns,rows,PAGE_W,PAGE_H);
  // Bake lighting into two opaque page textures. A folded outline can cancel
  // its own winding; no outer clip or translucent per-cell shade is needed.
  for(const [side,image]of [front,back].entries()){
   const c=shaded[side].getContext('2d'),shade=.13*Math.sin(active.p*Math.PI);c.fillStyle='white';c.fillRect(0,0,PAGE_W,PAGE_H);c.drawImage(image,0,0,PAGE_W,PAGE_H);
   const gradient=c.createLinearGradient(0,0,PAGE_W,0);gradient.addColorStop(side?1:0,`rgba(15,29,40,${shade.toFixed(4)})`);gradient.addColorStop(side?0:1,`rgba(15,29,40,${(shade*.25).toFixed(4)})`);c.fillStyle=gradient;c.fillRect(0,0,PAGE_W,PAGE_H);
  }
  // Far paper first, near paper last, including folds crossing the spine.
  for(const face of faces)triangle(shaded[face.reverse?1:0],face.points,face.uv);
 }
 function render(){
  if(disposed||!album)return;ctx.clearRect(0,0,width,height);
  const open=spread>=0||!!active,p=project(open?-W:0,H/2),bookWidth=(open?2:1)*W*scale;
  ctx.save();ctx.shadowColor='#233a4c35';ctx.shadowBlur=20;ctx.shadowOffsetY=10;ctx.fillStyle='#f4f7f8';ctx.fillRect(p.x-1,p.y+4,bookWidth+2,H*scale+4);ctx.restore();
  if(active){
   if(active.old>=0)flat(active.direction>0?active.old*2:active.next*2,-1);
   else if(active.p>.04){const left=project(-W,H/2);ctx.fillStyle='white';ctx.fillRect(left.x,left.y,W*scale,H*scale);}
   flat(active.direction>0?active.next*2+1:active.old*2+1,1);
   if(active.p<.0001)flat(active.frontIndex,1,active.frontCover);
   else if(active.p>.9999)flat(active.backIndex,-1);
   else{const points=mesh(active.p,active.corner||0);shadow(points);paper(points);}
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
  return new Promise(resolve=>{resolver=resolve;function tick(now){if(active!==state)return;const t=Math.min(1,(now-begin)/duration),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;state.shake=blocked&&!reduced&&t>.45?Math.sin((t-.45)*Math.PI*16)*Math.sin(Math.min(1,(t-.45)/.12)*Math.PI/2)*Math.pow(1-t,2)*13:0;update(automatic ? .48*Math.sin(t*Math.PI) : start+(target-start)*ease);if(t<1)raf=requestAnimationFrame(tick);else{const success=commit&&!blocked;if(success)spread=state.next;active=null;resolver=null;settle();resolve(success);}}raf=requestAnimationFrame(tick);});
 }
 function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';scale=Math.min(width/(W*2+.65),height/(H+.55));render();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {choose,prepare,update,finish,render,setSpread(value){halt();spread=Math.max(-1,Math.min(album.pages.length/2-1,value));settle();},stop(){halt();if(album)settle();},dispose(){disposed=true;halt();observer.disconnect();textures.clear();}};
}
