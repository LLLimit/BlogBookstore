import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
const palettes=[
  [0,'#08122f','#162b4a'],[5,'#14213f','#685d73'],[6.5,'#647b9f','#ebbd9e'],
  [8,'#68a4d3','#c4dbe7'],[15,'#6ba4cf','#c9dce3'],[17.5,'#626d97','#e4a08a'],
  [19,'#192743','#735374'],[20.5,'#08122f','#162b4a'],[24,'#08122f','#162b4a']
];

export function createAtmosphere(scene){
  const skyUniforms={top:{value:new THREE.Color()},horizon:{value:new THREE.Color()},sunDirection:{value:new THREE.Vector3()},sunAmount:{value:0},flash:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(105,32,20),new THREE.ShaderMaterial({
    uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false,toneMapped:false,
    vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 direction;uniform vec3 top;uniform vec3 horizon;uniform vec3 sunDirection;uniform float sunAmount;uniform float flash;void main(){vec3 d=normalize(direction);float h=smoothstep(-.15,.7,d.y);vec3 color=mix(horizon,top,h);color+=vec3(1.,.48,.2)*pow(max(dot(d,sunDirection),0.),24.)*sunAmount*.3;color=mix(color,vec3(.6,.72,.86),flash*.75);gl_FragColor=vec4(color,1.);#include <colorspace_fragment>}'
      .replace(';#include',';\n#include')
  }));sky.userData.sky=true;sky.renderOrder=-100;scene.add(sky);

  const starsPosition=[],starsSize=[];let seed=78;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let i=0;i<650;i++){const angle=random()*Math.PI*2,y=.10+random()*.88,r=Math.sqrt(1-y*y);starsPosition.push(Math.cos(angle)*r*85,y*85,Math.sin(angle)*r*85);starsSize.push(.7+random()*1.3);}
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starsPosition,3));starGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(starsSize,1));
  const starUniforms={uOpacity:{value:1},uTime:{value:0}};
  const stars=new THREE.Points(starGeo,new THREE.ShaderMaterial({uniforms:starUniforms,transparent:true,depthWrite:false,toneMapped:false,
    vertexShader:'attribute float aSize;varying float phase;void main(){phase=position.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*1.4;}',
    fragmentShader:'uniform float uOpacity;uniform float uTime;varying float phase;void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.83,.9,1.,a*uOpacity*(.7+.3*sin(uTime*.65+phase)));}'
  }));stars.userData.sky=true;scene.add(stars);

  const cloudMaterials=Array.from({length:6},()=>{const m=new THREE.MeshBasicMaterial({color:'#52688e',vertexColors:true});m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vCloudShade;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCloudShade=clamp(normal.y*.2+.8,.6,1.);');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCloudShade;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vCloudShade;');};m.customProgramCacheKey=()=> 'soft-cloud-shading';return m;});
  // A shallow base and overlapping broad crowns define the cloud silhouette.
  // Signed-distance union preserves those crowns without pinched satellite blobs.
  const cloudGeometry=[];
  const shapes=[
    {size:[6.5,3.7,3.5],lobes:[[0,-.10,0,.74,.21,.34],[-.43,.02,-.02,.30,.27,.30],[-.10,.20,.02,.34,.36,.34],[.32,.11,0,.34,.29,.31],[.59,-.03,.01,.20,.20,.25]]},
    {size:[5.8,3.8,3.7],lobes:[[0,-.10,0,.70,.21,.34],[-.43,.01,0,.28,.25,.29],[-.19,.15,.01,.34,.34,.33],[.25,.14,-.01,.33,.32,.34],[.51,-.02,0,.25,.20,.26]]},
    {size:[4.5,3.6,3.0],lobes:[[0,-.09,0,.60,.20,.31],[-.25,.06,.01,.32,.30,.30],[.13,.19,0,.33,.36,.33],[.41,-.02,0,.23,.21,.25]]},
    {size:[5.8,4.1,3.7],lobes:[[0,-.10,0,.73,.21,.35],[-.37,.19,.01,.32,.39,.32],[.03,.08,0,.36,.30,.34],[.40,.02,-.02,.29,.26,.29]]},
    {size:[7.5,2.1,2.8],lobes:[[0,-.08,0,.77,.17,.29],[-.40,.04,0,.34,.22,.26],[.04,.07,.01,.41,.26,.28],[.47,.03,0,.29,.20,.24]]},
    {size:[5.3,4.2,3.4],lobes:[[0,-.10,0,.71,.20,.33],[-.31,.19,-.01,.33,.35,.32],[.28,.23,.01,.32,.39,.33],[-.56,-.01,0,.19,.21,.25],[.56,.01,0,.20,.23,.25]]}
  ];
  for(let variant=0;variant<shapes.length;variant++){
    const resolution=20,field=new MarchingCubes(resolution,cloudMaterials[variant],false,false,6000);field.isolation=0;
    function distance(x,y,z,e){const vx=x-e[0],vy=y-e[1],vz=z-e[2],rx=e[3],ry=e[4],rz=e[5],a=Math.hypot(vx/rx,vy/ry,vz/rz),b=Math.hypot(vx/(rx*rx),vy/(ry*ry),vz/(rz*rz));return b?a*(a-1)/b:-Math.min(rx,ry,rz);}
    for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
      const px=x/resolution*2-1,py=y/resolution*2-1,pz=z/resolution*2-1;let d=10;
      for(const e of shapes[variant].lobes){const next=distance(px,py,pz,e),h=Math.max(.065-Math.abs(d-next),0)/.065;d=Math.min(d,next)-h*h*.065*.25;}
      field.field[z*resolution*resolution+y*resolution+x]=-d;
    }
    field.update();const geometry=new THREE.BufferGeometry();
    for(const name of ['position','normal']){const a=field.geometry.attributes[name];geometry.setAttribute(name,new THREE.BufferAttribute(a.array.slice(0,field.count*3),3));}
    const pos=geometry.attributes.position,colors=[];for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setY(i,Math.max(-.29,y));const shade=THREE.MathUtils.lerp(.84,1,smooth(-.29,.45,y));colors.push(shade,shade,Math.min(1,shade+.025));}geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.scale(...shapes[variant].size);const welded=mergeVertices(geometry);welded.computeBoundingSphere();cloudGeometry.push(welded);geometry.dispose();field.geometry.dispose();
  }
  const clouds=[];
  const locations=[[-11,18,-25,1.35],[10,19,-29,1.4],[29,17,-13,1.2],[-28,20,5,1.2],[26,23,8,1.1],[-2,24,17,.9]];
  locations.forEach(([x,y,z,scale],index)=>{
    const group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(scale);group.userData.cloud=true;scene.add(group);
    const cloudMesh=new THREE.Mesh(cloudGeometry[index],cloudMaterials[index]);cloudMesh.rotation.y=[-.08,.14,.28,-.33,.44,-.25][index];cloudMesh.userData.sky=true;group.add(cloudMesh);
    clouds.push({group,x,z,y,phase:index*2.4,speed:.19+index*.025});
  });
  const moonCanvas=document.createElement('canvas');moonCanvas.width=moonCanvas.height=256;const ctx=moonCanvas.getContext('2d');
  ctx.fillStyle='#fff7d9';ctx.beginPath();ctx.arc(126,126,68,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(155,109,66,0,Math.PI*2);ctx.fill();
  const moonTexture=new THREE.CanvasTexture(moonCanvas);moonTexture.colorSpace=THREE.SRGBColorSpace;
  const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTexture,transparent:true,depthWrite:false,toneMapped:false,color:'#eff3ff'}));moon.position.set(-20,19,-60);moon.scale.set(5,5,1);moon.userData.sky=true;scene.add(moon);
  const solarCanvas=document.createElement('canvas');solarCanvas.width=solarCanvas.height=256;const solarCtx=solarCanvas.getContext('2d');
  const solarGradient=solarCtx.createRadialGradient(128,128,0,128,128,126);solarGradient.addColorStop(0,'#fff9ed');solarGradient.addColorStop(.70,'#fff4d5');solarGradient.addColorStop(.78,'#ffc57cc0');solarGradient.addColorStop(1,'#ff904000');solarCtx.fillStyle=solarGradient;solarCtx.fillRect(0,0,256,256);
  const solarTexture=new THREE.CanvasTexture(solarCanvas);solarTexture.colorSpace=THREE.SRGBColorSpace;
  const sunDisc=new THREE.Sprite(new THREE.SpriteMaterial({map:solarTexture,transparent:true,depthWrite:false,toneMapped:false}));sunDisc.scale.set(6.4,6.4,1);sunDisc.userData.sky=true;scene.add(sunDisc);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:solarTexture,transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending,color:'#ff9b49',opacity:.12}));halo.scale.set(19,19,1);halo.userData.sky=true;scene.add(halo);
  let weather='clear',coverage=.56;
  function conditions(hour,nextWeather=weather,cloudAmount=coverage){
    weather=nextWeather;coverage=cloudAmount;
    let a=palettes[0],b=palettes[1];for(let i=0;i<palettes.length-1;i++){if(hour>=palettes[i][0]&&hour<palettes[i+1][0]){a=palettes[i];b=palettes[i+1];break;}}
    const f=smooth(a[0],b[0],hour),day=smooth(5.4,8,hour)*(1-smooth(16.7,19.3,hour));
    const top=new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),f),horizon=new THREE.Color(a[2]).lerp(new THREE.Color(b[2]),f);
    const overcast=weather==='storm'?.8:weather==='rain'?.55:weather==='cloudy'?.38:weather==='fog'?.7:weather==='snow'?.4:0;
    top.lerp(new THREE.Color(day>.4?'#687f94':'#17283f'),overcast);horizon.lerp(new THREE.Color(day>.4?'#a1afb5':'#314055'),overcast);
    skyUniforms.top.value.copy(top);skyUniforms.horizon.value.copy(horizon);
    const angle=(hour-6)/12*Math.PI,warmth=smooth(16.1,17.7,hour)*(1-smooth(18.6,19.4,hour));
    // Keep the sunset in view alongside the storefront, including narrow desktop windows.
    const solarPosition=new THREE.Vector3(-Math.cos(angle)*16,Math.sin(angle)*68+5,-110);
    const sunPosition=solarPosition.clone().normalize().multiplyScalar(30);
    sunDisc.position.copy(solarPosition);halo.position.copy(solarPosition);sunDisc.material.color.set(warmth>.2?'#ffaf5b':'#fff5de');
    sunDisc.material.opacity=smooth(5.6,6.15,hour)*(1-smooth(18.3,18.8,hour))*(1-overcast*.94);halo.material.opacity=sunDisc.material.opacity*(.04+warmth*.09);
    skyUniforms.sunDirection.value.copy(sunPosition).normalize();skyUniforms.sunAmount.value=day*(1-overcast);
    starUniforms.uOpacity.value=(1-day)*(1-overcast*.9);moon.material.opacity=(1-day)*(1-overcast*.8);
    const tint=new THREE.Color('#52688e').lerp(new THREE.Color('#f2f1e7'),day);
    tint.lerp(new THREE.Color('#edac8b'),warmth*.72);
    tint.lerp(new THREE.Color(day>.4?'#96a4b0':'#536782'),overcast*.6);
    cloudMaterials.forEach((m,i)=>m.color.copy(tint).multiplyScalar([1,.96,.91,.94,1,.93][i]));
    const visible=Math.round(coverage*clouds.length);clouds.forEach((c,i)=>c.group.visible=i<visible);
    return {day,overcast,top,horizon,sunPosition,warmth,night:1-smooth(.02,.65,day)};
  }
  function animate(time){starUniforms.uTime.value=time;clouds.forEach(c=>{c.group.position.x=THREE.MathUtils.euclideanModulo(c.x+time*c.speed+58,116)-58;c.group.position.z=c.z+Math.sin(time*.021+c.phase)*.8;c.group.position.y=c.y+Math.sin(time*.027+c.phase)*.12;});}
  return {conditions,animate,clouds,sky,sunDisc,setFlash:value=>skyUniforms.flash.value=value};
}
