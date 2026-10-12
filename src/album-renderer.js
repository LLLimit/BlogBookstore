import * as THREE from 'three';

// A continuous two-sided sheet bends from its bound edge. The outer edge lags
// behind the spine; a small corner twist and moving shadow keep it feeling like paper.
export function createAlbumRenderer(host,imageLoader){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=false;
  renderer.domElement.className='album-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.replaceChildren(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),root=new THREE.Group();scene.add(root);
  camera.position.set(0,.7,14);camera.lookAt(0,0,0);
  scene.add(new THREE.AmbientLight('#fffaf0',1.8));
  const light=new THREE.SpotLight('#ffffff',12,35,Math.PI/4,1,1);light.position.set(-1.4,5,8);light.target.position.set(0,0,0);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.bias=-.0002;light.shadow.normalBias=.015;light.shadow.radius=6;light.shadow.blurSamples=16;scene.add(light,light.target);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=512;shadowCanvas.height=384;const shadowContext=shadowCanvas.getContext('2d'),shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,6),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));floor.position.z=-.14;scene.add(floor);
  const W=2.9,H=4.15,segments=64,rows=12;
  const stock=new THREE.MeshBasicMaterial({color:'white'});
  const left=new THREE.Mesh(new THREE.PlaneGeometry(W,H),stock.clone()),right=new THREE.Mesh(new THREE.PlaneGeometry(W,H),stock.clone());left.position.set(-W/2,0,.002);right.position.set(W/2,0,0);left.receiveShadow=right.receiveShadow=true;root.add(left,right);
  const blocks=[];
  for(const side of [-1,1]){const block=new THREE.Mesh(new THREE.BoxGeometry(W+.018,H+.02,.065),new THREE.MeshStandardMaterial({color:'#e2dac9',roughness:1}));block.position.set(side*W/2,0,-.041);block.castShadow=true;block.receiveShadow=true;root.add(block);blocks.push(block);
    for(let i=0;i<4;i++){const line=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({color:i%2?'#d5ccb9':'#f1eadb'}));line.position.set(side*(W/2+.002*i),-.003*i,-.008-i*.009);root.add(line);blocks.push(line);}}
  const spine=new THREE.Mesh(new THREE.BoxGeometry(.045,H,.075),new THREE.MeshStandardMaterial({color:'#cfc3ae',roughness:1}));spine.position.z=-.037;root.add(spine);
  const geometry=new THREE.PlaneGeometry(W,H,segments,rows);geometry.translate(W/2,0,0);
  function paperMaterial(side){const m=new THREE.MeshBasicMaterial({color:'white',side});m.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vPaperNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaperNormal = normalize(normalMatrix * normal);');shader.fragmentShader='varying vec3 vPaperNormal;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb *= mix(0.80, 1.0, abs(normalize(vPaperNormal).z));');};m.customProgramCacheKey=()=> 'album-paper-soft-normal';return m;}
  const frontMaterial=paperMaterial(THREE.FrontSide),backMaterial=paperMaterial(THREE.BackSide);
  const front=new THREE.Mesh(geometry,frontMaterial),back=new THREE.Mesh(geometry,backMaterial);front.frustumCulled=back.frustumCulled=false;front.castShadow=back.castShadow=true;front.receiveShadow=back.receiveShadow=true;root.add(front,back);
  let album=null,spread=-1,textures=new Map(),raf=0,active=null,disposed=false,animationResolve=null;
  function halt(){cancelAnimationFrame(raf);if(animationResolve){animationResolve(false);animationResolve=null;}active=null;}
  function texture(index,cover=false){
    const key=cover?'cover':String(index);if(textures.has(key))return textures.get(key);
    const canvas=document.createElement('canvas');canvas.width=1008;canvas.height=1440;const ctx=canvas.getContext('2d');
    const entry=album.pages[index],photo=!cover&&entry&&!entry.blank?album.photos[entry.photoIndex]:null;
    function wrap(text,x,y,width,lineHeight,max){let line='',count=0;for(const char of Array.from(String(text))){if(ctx.measureText(line+char).width>width&&line){ctx.fillText(line,x,y+count*lineHeight);line='';if(++count>=max)return;}line+=char;}if(line)ctx.fillText(line,x,y+count*lineHeight);}
    const draw=()=>{
      const img=photo&&imageLoader.peek(photo.url);
      ctx.fillStyle=cover?'#1d292c':'#faf7ef';ctx.fillRect(0,0,1008,1440);
      if(cover){
        ctx.fillStyle='#f3eee3';
        const plane=new Path2D('M32 5c-2 0-3 3-3 6v13L8 36v6l21-7v13l-7 6v4l10-3 10 3v-4l-7-6V35l21 7v-6L35 24V11c0-3-1-6-3-6Z');
        ctx.save();ctx.translate(785,355);ctx.rotate(-.4);ctx.scale(1.6,1.6);ctx.translate(-32,-32);ctx.fill(plane);ctx.restore();
        ctx.font='italic 190px Georgia';ctx.fillText('Travel',110,715);
        ctx.font='205px Georgia';ctx.fillText('Time',420,925);
      }else if(photo){
        if(entry.half){
          // Render the full composition once in spread coordinates, then copy its exact half.
          const wide=document.createElement('canvas');wide.width=2016;wide.height=1440;const w=wide.getContext('2d');w.fillStyle='#faf7ef';w.fillRect(0,0,2016,1440);
          if(img){const scale=Math.min(1876/img.naturalWidth,1100/img.naturalHeight),width=img.naturalWidth*scale,height=img.naturalHeight*scale;w.drawImage(img,(2016-width)/2,145+(1100-height)/2,width,height);}
          else{w.fillStyle='#e8e2d7';w.fillRect(70,220,1876,980);}
          ctx.drawImage(wide,entry.half==='right'?1008:0,0,1008,1440,0,0,1008,1440);
          if(entry.half==='left'){ctx.fillStyle='#786d5d';ctx.font='27px Georgia,"Microsoft YaHei",serif';wrap(photo.caption||album.title,70,1300,815,36,2);}
        }else{
          if(img){const scale=Math.min(868/img.naturalWidth,1125/img.naturalHeight);ctx.drawImage(img,70+(868-img.naturalWidth*scale)/2,110+(1125-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);}
          else{ctx.fillStyle='#e8e2d7';ctx.fillRect(70,110,868,1125);}
          ctx.fillStyle='#786d5d';ctx.font='27px Georgia,"Microsoft YaHei",serif';wrap(photo.caption||album.title,70,1300,815,36,2);
        }
        ctx.fillStyle='#a49780';ctx.font='22px Georgia';ctx.fillText(String(index+1).padStart(2,'0'),890,1390);
      }
      if(!cover){const fold=ctx.createLinearGradient(0,0,40,0);fold.addColorStop(0,'#7666441a');fold.addColorStop(1,'#76664400');ctx.fillStyle=fold;ctx.fillRect(0,0,40,1440);}
    };
    draw();const result=new THREE.CanvasTexture(canvas);result.colorSpace=THREE.SRGBColorSpace;result.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(key,result);
    if(photo&&!imageLoader.peek(photo.url))imageLoader.get(photo.url).then(()=>{if(!disposed&&textures.get(key)===result){draw();result.needsUpdate=true;render();}}).catch(()=>{});
    return result;
  }
  function map(mesh,index,cover=false,mirror=false){const source=texture(index,cover);if(mesh.material.map&&mesh.material.map.userData.mirrored)mesh.material.map.dispose();let value=source;if(mirror){value=source.clone();value.repeat.x=-1;value.offset.x=1;value.userData.mirrored=true;value.needsUpdate=true;}mesh.material.map=value;mesh.material.needsUpdate=true;}
  function drawShadow(){
    const ctx=shadowContext;ctx.clearRect(0,0,512,384);ctx.save();ctx.shadowColor='rgba(32,27,20,.25)';ctx.shadowBlur=12;ctx.shadowOffsetY=5;ctx.fillStyle='rgba(32,27,20,.07)';
    const point=(x,y,z=0)=>[256+(x+root.position.x+z*.17)*64,192-(y-z*.6)*64];
    for(const page of [left,right])if(page.visible){const [x,y]=point(page.position.x-W/2,H/2);ctx.fillRect(x,y,W*64,H*64);}
    if(front.visible){ctx.shadowBlur=0;ctx.filter='blur(9px)';ctx.fillStyle='rgba(32,27,20,.09)';ctx.beginPath();const pos=geometry.attributes.position;for(let col=0;col<=segments;col++){const i=col,[x,y]=point(pos.getX(i),pos.getY(i),pos.getZ(i));if(!col)ctx.moveTo(x,y);else ctx.lineTo(x,y);}for(let col=segments;col>=0;col--){const i=rows*(segments+1)+col,[x,y]=point(pos.getX(i),pos.getY(i),pos.getZ(i));ctx.lineTo(x,y);}ctx.closePath();ctx.fill();}
    ctx.restore();shadowTexture.needsUpdate=true;
  }
  function render(){if(!disposed){drawShadow();renderer.render(scene,camera);}}
  function bend(p,corner=0){
    const positions=geometry.attributes.position,base=Math.PI*p,curl=Math.sin(p*Math.PI)*.78;
    for(let row=0;row<=rows;row++){
      const v=row/rows;let x=0,z=.02;
      for(let col=0;col<=segments;col++){
        const i=row*(segments+1)+col;positions.setXYZ(i,x,H/2-v*H,z);
        const u=(col+.5)/segments,theta=base-curl*Math.pow(u,1.55)+Math.sin(p*Math.PI)*(v-.5)*u*u*(.15+corner*.16);
        x+=Math.cos(theta)*W/segments;z+=Math.sin(theta)*W/segments;
      }
    }
    positions.needsUpdate=true;geometry.computeVertexNormals();
  }
  function settle(){
    front.visible=back.visible=false;
    if(spread<0){left.visible=false;right.visible=true;map(right,0,true);root.position.x=-W/2;blocks.forEach(o=>o.visible=o.position.x>0);spine.visible=false;}
    else{root.position.x=0;left.visible=right.visible=true;map(left,spread*2);map(right,spread*2+1);blocks.forEach(o=>o.visible=true);spine.visible=true;}
    for(const [key,t] of textures)if(key!=='cover'&&(Number(key)<spread*2-4||Number(key)>spread*2+5)){t.dispose();textures.delete(key);}
    render();
  }
  function choose(value){halt();for(const t of textures.values())t.dispose();textures.clear();album=value;spread=-1;settle();}
  function prepare(direction){
    if(!album||active||direction>0&&spread>=album.pages.length/2-1||direction<0&&spread<0)return false;
    const next=spread+direction;
    if(direction>0){map(left,spread*2);map(right,next*2+1);map(front,spread*2+1,spread<0);map(back,next*2,false,true);}
    else{map(left,next*2);map(right,spread*2+1);map(front,next*2+1,next<0);map(back,spread*2,false,true);}
    left.visible=next>=0&&spread>=0;right.visible=spread>=0||next>=0;front.visible=back.visible=true;blocks.forEach(o=>o.visible=true);spine.visible=true;
    active={direction,next,old:spread,p:direction>0?0:1};update(active.p);return true;
  }
  function update(p,corner=0){if(!active)return;active.p=p;bend(p,corner);root.position.x=active.old<0||active.next<0?-W/2*(1-p):0;render();}
  function finish(commit=true,reduced=false){
    if(!active)return Promise.resolve(false);const start=active.p,target=commit?(active.direction>0?1:0):(active.direction>0?0:1),begin=performance.now(),duration=reduced?0:Math.max(240,Math.abs(target-start)*1050);
    return new Promise(resolve=>{animationResolve=resolve;function step(now){const t=duration?Math.min(1,(now-begin)/duration):1;const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;update(start+(target-start)*eased);if(t<1)raf=requestAnimationFrame(step);else{if(commit)spread=active.next;active=null;animationResolve=null;settle();resolve(commit);}}raf=requestAnimationFrame(step);});
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const height=4.85;camera.left=-height*w/h/2;camera.right=-camera.left;camera.top=height/2;camera.bottom=-height/2;camera.near=.1;camera.far=40;camera.updateProjectionMatrix();render();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return {choose,prepare,update,finish,render,stop(){halt();if(album)settle();},dispose(){disposed=true;halt();observer.disconnect();for(const t of textures.values())t.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();}};
}
