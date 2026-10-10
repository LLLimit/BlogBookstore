import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createDistrict} from './district.js';
import {createAtmosphere} from './atmosphere.js';
import {createWalkLook} from './walk-look.js';

const palette=['#395957','#a16347','#b79c6e','#535d7b','#985355','#67785b','#ad8a50','#527586'];
export function createBookstore(container,onRead,onAim,onPause,onStart){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#172034');scene.fog=new THREE.FogExp2('#172034',.012);
  const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.08,300);camera.rotation.order='YXZ';camera.up.set(0,1,0);
  const walkLook=createWalkLook(camera);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  container.appendChild(renderer.domElement);renderer.domElement.tabIndex=-1;
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
  const hemisphere=new THREE.HemisphereLight('#bdd7f0','#515961',.6);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight('#ffe5bc',1);sun.position.set(-8,18,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:65});sun.shadow.bias=-.00015;sun.shadow.normalBias=.045;scene.add(sun);
  const district=createDistrict(scene);
  const atmosphere=createAtmosphere(scene);
  const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType});target.samples=Math.min(4,renderer.capabilities.maxSamples);
  const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.55;ao.minDistance=.001;ao.maxDistance=.018;
  const aoRender=ao.render.bind(ao);
  // Contact depth uses the building surfaces; weather overlays have custom masks and heights.
  ao.render=(...args)=>{ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);const hidden=[];scene.traverse(o=>{if(o.visible&&(o.userData.sky||o.userData.snowCover||(o.isMesh&&(o.isReflector||o.material.transparent)))){hidden.push(o);o.visible=false;}});try{aoRender(...args);}finally{hidden.forEach(o=>o.visible=true);}};
  // Contact shadows use the full drawing resolution so thin book spines keep clean edges.
  composer.addPass(ao);
  // Close-up lamps can exceed a half-float buffer. Bound highlights before they enter bloom.
  const highlights=new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;float safe(float v){if(!(v>=0.||v<=0.))return 0.;return clamp(v,0.,24.);}void main(){vec4 c=texture2D(tDiffuse,vUv);gl_FragColor=vec4(safe(c.r),safe(c.g),safe(c.b),1.);}'});composer.addPass(highlights);
  const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.24,.52,1.65);composer.addPass(bloom);
  // SMAA also smooths edges introduced by AO and bloom after geometry MSAA has resolved.
  const smaa=new SMAAPass();composer.addPass(smaa);composer.addPass(new OutputPass());composer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.enablePan=false;orbit.minDistance=13;orbit.maxDistance=58;orbit.minPolarAngle=.3;orbit.maxPolarAngle=1.53;orbit.target.set(-.6,2.1,-.6);
  let mode='orbit',view='front',enabled=false,playing=false,quality=1,weather='clear',hour=.8,currentHour=.8,cloudAmount=.56,brightness=1,dirty=true,touchMove={x:0,y:0},hovered=null,walking=0;
  const keys=new Set(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),targets=[],books=[];let last=performance.now(),elapsed=0,lastRender=0,baseSun=0,baseHemi=0;
  const savedPosition=new THREE.Vector3(0,1.82,5.5);let savedYaw=0,savedPitch=0;
  const coarse=matchMedia('(pointer:coarse)').matches;let dragged=false,drag=null,hadPointerLock=false,pendingLock=false,lockRequest=0,lockUsesPromise=false;
  function frameCamera(){
    const shift=0;
    const views={wide:{position:[27,22,34],target:[-.35,4,0],fov:43},corner:{position:[19,10.7,25],target:[-.35,4.05,0],fov:43},front:{position:[1.5,6.3,28],target:[-.35,4.0,-.15],fov:43}};
    const chosen=views[view],phone=innerWidth<760,panelSpan=innerWidth>1100?284:256;camera.fov=chosen.fov;camera.setViewOffset(innerWidth,innerHeight,phone?0:-panelSpan/2,phone?innerHeight*.2:0,innerWidth,innerHeight);camera.updateProjectionMatrix();orbit.target.set(chosen.target[0]-shift,chosen.target[1],chosen.target[2]);camera.position.set(chosen.position[0]-shift,chosen.position[1],chosen.position[2]);const usableAspect=(innerWidth-(phone?0:panelSpan))/innerHeight;camera.position.sub(orbit.target).multiplyScalar(Math.max(1,(phone?1.12:.82)/usableAspect)).add(orbit.target);orbit.maxDistance=phone?110:78;camera.lookAt(orbit.target);camera.rotation.z=0;orbit.update();dirty=true;
  }
  frameCamera();orbit.addEventListener('change',()=>dirty=true);
  function lighting(){
    const {day,overcast,horizon,sunPosition,night,warmth}=atmosphere.conditions(currentHour,weather,cloudAmount);
    scene.fog.color.copy(horizon);scene.fog.density=weather==='fog'?.055:weather==='storm'?.022:weather==='rain'?.011:.0035;
    hemisphere.intensity=.22+day*.75;hemisphere.color.set(day>.2?'#c1ddeb':'#7e9bdb').lerp(new THREE.Color('#f7b781'),warmth*.5);sun.intensity=day*2.2*(1-overcast*.8)+night*.11;sun.color.set(day>.03?'#fff0d3':'#a0b5f5').lerp(new THREE.Color('#ff9148'),warmth);sun.position.copy(day>.03?sunPosition:new THREE.Vector3(-12,20,-5));
    scene.environmentIntensity=.11+day*.39;renderer.toneMappingExposure=THREE.MathUtils.lerp(1.1,.95,day);district.setLighting(day,brightness,night);baseSun=sun.intensity;baseHemi=hemisphere.intensity;dirty=true;
  }
  lighting();district.setWeather(weather,quality);
  let coverAuthor='博客作者';
  function makeCover(article,index){return district.texture(512,704,(ctx,w,h)=>{ctx.fillStyle=palette[index%8];ctx.fillRect(0,0,w,h);ctx.fillStyle='#0002';ctx.fillRect(0,0,20,h);ctx.strokeStyle='#e4dbc180';ctx.strokeRect(35,30,w-62,h-60);ctx.fillStyle='#f1e8cb';ctx.font='18px sans-serif';ctx.fillText('GOODNIGHT / ESSAYS',54,78);ctx.font='500 34px "Microsoft YaHei",sans-serif';let line='',lines=[];for(const char of article.title){if(ctx.measureText(line+char).width>390){lines.push(line);line='';}line+=char;}if(line)lines.push(line);lines.slice(0,8).forEach((v,i)=>ctx.fillText(v,54,157+i*48));ctx.font='italic 40px Georgia';ctx.fillText(String(index+1).padStart(2,'0'),w-110,h-69);ctx.font='20px sans-serif';ctx.fillText(article.author||coverAuthor,54,h-66,w-165);});}
  const paper=district.material('#ece7d6');
  function addBook(article,index,x,y,z,parent=scene){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(.7);parent.add(g);const coverMaterial=new THREE.MeshStandardMaterial({color:palette[index%8],roughness:.64});district.box(.47,.69,.09,0,.345,0,coverMaterial,g);district.box(.44,.655,.078,.01,.345,.003,paper,g);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.47,.69),new THREE.MeshStandardMaterial({map:makeCover(article,index),roughness:.66}));mesh.position.set(0,.345,.052);mesh.userData.article=article;g.add(mesh);targets.push(mesh);books.push(g);return g;}
  function setArticles(articles,offset=0){if(hovered){hovered=null;onAim(null);}for(const g of books){g.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material!==paper){o.material.map?.dispose();o.material.dispose();}}});g.removeFromParent();}books.length=0;targets.length=0;
    articles.slice(0,24).forEach((a,i)=>addBook(a,i+offset,-1.16+(i%4)*.77,i%8<4?1.20:2.17,.24,district.shelves[Math.floor(i/8)]));articles.slice(0,3).forEach((a,i)=>{const book=addBook(a,i+offset,-1.32+i*.82,1.14,.24);book.rotation.x=-Math.PI/2;});
    dirty=true;}
  function aim(ndc=new THREE.Vector2()){ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects([...targets,...district.interactionTargets]).find(h=>h.distance<3.4),next=hit?.object||null;if(next!==hovered){if(hovered)hovered.material.emissive?.set('#000');hovered=next;if(next)next.material.emissive?.set('#39352b');onAim(next?.userData.article||next?.userData.interaction||null);dirty=true;}return next;}
  function read(){if(hovered)onRead(hovered.userData.article||hovered.userData.interaction);}
  function shadowFocus(){const extent=mode==='walk'?14:22;Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=mode==='walk'?.02:.045;sun.shadow.needsUpdate=true;}
  function mouseCursor(){renderer.domElement.classList.toggle('mouse-look',enabled&&document.pointerLockElement===renderer.domElement);}
  function pause(){if(mode==='walk'){savedPosition.copy(camera.position);savedYaw=walkLook.yaw;savedPitch=walkLook.pitch;}enabled=false;pendingLock=false;lockRequest++;keys.clear();touchMove={x:0,y:0};if(drag&&renderer.domElement.hasPointerCapture(drag.id))renderer.domElement.releasePointerCapture(drag.id);drag=null;hadPointerLock=false;mouseCursor();if(hovered){hovered.material.emissive?.set('#000');hovered=null;onAim(null);}if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();dirty=true;}
  function requestPause(reason){if(enabled||pendingLock){if(onPause)onPause(reason);else pause();}}
  function activateWalk(){pendingLock=false;enabled=true;mouseCursor();dirty=true;onStart?.();}
  function lockFailed(error,request=lockRequest){if(!pendingLock||request!==lockRequest)return;requestPause({kind:'pointer-lock',name:error?.name||'PointerLockError'});}
  function lock(){
    orbit.enabled=false;mode='walk';playing=true;enabled=false;drag=null;pendingLock=!coarse;lockUsesPromise=false;const request=++lockRequest;
    mouseCursor();shadowFocus();camera.fov=64;camera.clearViewOffset();camera.updateProjectionMatrix();camera.position.copy(savedPosition);walkLook.set(savedYaw,savedPitch);dirty=true;
    if(coarse){activateWalk();return;}
    if(typeof renderer.domElement.requestPointerLock!=='function'){lockFailed({name:'NotSupportedError'},request);return;}
    renderer.domElement.focus({preventScroll:true});
    // Raw input avoids OS acceleration and cursor-warp deltas on supported browsers.
    // Promise failures own their error path, so pointerlockerror cannot cancel the fallback.
    function attempt(raw){
      if(!pendingLock||request!==lockRequest)return;
      function failed(error){if(raw&&error?.name==='NotSupportedError')attempt(false);else lockFailed(error,request);}
      try{const result=raw?renderer.domElement.requestPointerLock({unadjustedMovement:true}):renderer.domElement.requestPointerLock();lockUsesPromise=typeof result?.then==='function';result?.catch(failed);}catch(error){failed(error);}
    }
    attempt(true);
  }
  function overview(){pause();mode='orbit';playing=false;orbit.enabled=true;shadowFocus();frameCamera();}
  function reset(){overview();savedPosition.set(0,1.82,5.5);savedYaw=0;savedPitch=0;}
  function blocked(x,z){const level=camera.position.y-1.65>3.5?1:0;return x<-13.6||x>13.2||z<-10.5||z>11.5||district.colliders.some(c=>c.level===level&&Math.abs(x-c.x)<c.w&&Math.abs(z-c.z)<c.d);}
  function look(dx,dy,locked=false){if(!enabled)return;if(locked?walkLook.pointer(dx,dy):walkLook.turn(dx,dy))dirty=true;}
  function frame(time){requestAnimationFrame(frame);const dt=Math.min((time-last)/1000,.1);last=time;if(document.hidden||document.querySelector('dialog[open]'))return;elapsed+=dt;
    const timeDifference=THREE.MathUtils.euclideanModulo(hour-currentHour+12,24)-12;
    if(Math.abs(timeDifference)>.002){currentHour=THREE.MathUtils.euclideanModulo(currentHour+timeDifference*(1-Math.exp(-dt*7)),24);lighting();}
    if(mode==='orbit')orbit.update(dt);
    if(enabled){const dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x,dz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touchMove.y,len=Math.max(1,Math.hypot(dx,dz)),speed=dt*2.7,a=walkLook.yaw,vx=(Math.cos(a)*dx+Math.sin(a)*dz)/len*speed,vz=(-Math.sin(a)*dx+Math.cos(a)*dz)/len*speed;
      if(!blocked(camera.position.x+vx,camera.position.z))camera.position.x+=vx;if(!blocked(camera.position.x,camera.position.z+vz))camera.position.z+=vz;walking+=Math.hypot(vx,vz)*8;const floor=district.floorAt(camera.position.x,camera.position.z,camera.position.y-1.65);camera.position.y=floor+1.65+(Math.abs(dx)+Math.abs(dz)>0?.009*Math.sin(walking):0);aim();}
    atmosphere.animate(elapsed);const flash=district.animate(elapsed);hemisphere.intensity=baseHemi+flash*2.5;sun.intensity=baseSun+flash*4;atmosphere.setFlash(flash);
    if(enabled||dirty||time-lastRender>=1000/(quality?30:20)){if(quality)composer.render(dt);else renderer.render(scene,camera);dirty=false;lastRender=time;}
  }
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){if(e.buttons&&Math.abs(e.movementX)+Math.abs(e.movementY)>2)dragged=true;look(e.movementX,e.movementY,true);}});
  document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===renderer.domElement;if(locked){if(pendingLock||enabled){if(!hadPointerLock)walkLook.beginPointerInput();hadPointerLock=true;activateWalk();}else document.exitPointerLock?.();}else if(hadPointerLock){hadPointerLock=false;requestPause();}mouseCursor();});
  document.addEventListener('pointerlockerror',()=>{if(!lockUsesPromise)lockFailed();});
  document.addEventListener('keydown',e=>{if(!enabled||e.target?.matches?.('input,textarea'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)read();}});
  document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touchMove={x:0,y:0};requestPause();});
  renderer.domElement.addEventListener('pointerdown',e=>{dragged=false;if(!enabled)return;e.preventDefault();e.stopPropagation();if(e.button===0&&e.pointerType!=='mouse'&&!document.pointerLockElement){renderer.domElement.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};}});
  renderer.domElement.addEventListener('pointermove',e=>{if(!enabled||e.pointerType==='mouse'||document.pointerLockElement===renderer.domElement)return;if(drag?.id===e.pointerId){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>2)dragged=true;look(dx,dy);drag.x=e.clientX;drag.y=e.clientY;}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,e=>{drag=null;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);});
  for(const type of ['dragstart','contextmenu'])renderer.domElement.addEventListener(type,e=>{if(mode==='walk'){e.preventDefault();e.stopPropagation();}});
  renderer.domElement.addEventListener('click',e=>{if(!playing||!enabled||dragged||e.button!==0)return;if(document.pointerLockElement===renderer.domElement||(e.pointerType==='mouse'||!coarse)){aim();read();return;}pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);const book=aim(pointer);if(book)onRead(book.userData.article||book.userData.interaction);});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);if(mode==='orbit')frameCamera();dirty=true;});
  document.addEventListener('visibilitychange',()=>{last=performance.now();keys.clear();touchMove={x:0,y:0};if(document.hidden)requestPause();dirty=true;});
  frame(performance.now());
  return {setArticles,setAuthor:value=>{coverAuthor=String(value||'博客作者');},lock,pause,reset,overview,read,goToFloor:level=>{camera.position.set(level ? .15 : 0,level ? 5.89 : 1.82,level ? 3.55 : 5.5);walkLook.set(0,level ? -.12 : 0);savedPosition.copy(camera.position);savedYaw=walkLook.yaw;savedPitch=walkLook.pitch;dirty=true;},setTitle:t=>{district.setTitle(t);dirty=true;},setMove:(x,y)=>touchMove={x,y},setTime:value=>hour=Number(value),setView:value=>{if(['wide','corner','front'].includes(value)){view=value;overview();}},setClouds:value=>{cloudAmount=THREE.MathUtils.clamp(Number(value),0,1);lighting();},setWeather:value=>{weather=value;district.setWeather(weather,quality);lighting();},setBrightness:value=>{brightness=Number(value);lighting();},get enabled(){return enabled;},get mode(){return mode;},setQuality:()=>{quality=1-quality;const ratio=quality?Math.min(devicePixelRatio,1.75):1;renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);renderer.shadowMap.enabled=!!quality;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});district.setWeather(weather,quality);dirty=true;return quality;},renderer,camera,scene,orbit,atmosphere,...(import.meta.env.DEV?{debug:{composer,ao,bloom,district}}:{})};
}
