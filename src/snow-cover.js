import * as THREE from 'three';
import {animeMaterial} from './anime-material.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const clamp=THREE.MathUtils.clamp;
function hash(x,z){const h=Math.sin(x*127.1+z*311.7)*43758.5453;return h-Math.floor(h);}
function noise(x,z){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),u),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),u),v);
}

// Separate elevations keep snow above paving, paint, curbs and roof furniture.
export function createSnowCover(scene) {
  const group=new THREE.Group();group.name='SettledSnow';group.visible=false;scene.add(group);
  const geometries=[];
  function patch(w,d,x,y,z,thickness,kind=0) {
    const g=new THREE.PlaneGeometry(w,d,Math.max(1,Math.ceil(w/.30)),Math.max(1,Math.ceil(d/.30)));
    g.rotateX(-Math.PI/2);
    const p=g.getAttribute('position'),base=[],depth=[],types=[];
    for(let n=0;n<p.count;n++){
      const lx=p.getX(n),lz=p.getZ(n),wx=x+lx,wz=z+lz;
      const texture=noise(wx*.83,wz*.83)*.65+noise(wx*2.4+19,wz*2.4)*.35;
      const edge=Math.min(w/2-Math.abs(lx),d/2-Math.abs(lz));
      const bevel=clamp(edge/.20,0,1);
      let height=thickness*(.65+texture*.5)*(.20+.80*bevel*bevel*(3-2*bevel));
      // Wind-packed drifts collect against the street side of the curb.
      if(kind===1){
        const front=Math.exp(-Math.pow((wz-5.20)/.25,2.))*(1.-clamp((wx-6.1)/.5,0,1));
        const right=Math.exp(-Math.pow((wx-6.18)/.25,2.))*(1.-clamp((wz-5.2)/.5,0,1));
        height+=Math.max(front,right)*(.055+texture*.035);
      }
      p.setXYZ(n,wx,y+height,wz);base.push(y);depth.push(height);types.push(kind);
    }
    g.setAttribute('aSnowBase',new THREE.Float32BufferAttribute(base,1));
    g.setAttribute('aSnowDepth',new THREE.Float32BufferAttribute(depth,1));
    g.setAttribute('aSnowKind',new THREE.Float32BufferAttribute(types,1));
    g.computeVertexNormals();geometries.push(g);
  }
  // Road, raised sidewalk, and both lines of curb stones have different levels.
  patch(28.6,23.6,-.4,-.010,.6,.065,1);
  patch(20.0,16.0,-4.0,.146,-3.0,.055,2);
  patch(.60,16.0,-14.3,.120,-3.25,.055,2);
  patch(20.0,.24,-4.4,.155,4.92,.055,2);
  patch(.24,16.8,5.9,.155,-3.0,.055,2);
  // Bookshop roof, parapets and the cafe roof.
  patch(12.66,8.86,-.35,7.900,-.1,.085);
  for(const z of [-4.61,4.4])patch(13.0,.15,-.35,8.139,z,.052);
  for(const x of [-6.77,6.07])patch(.15,9.1,x,8.139,-.1,.052);
  patch(4.65,6.25,-11.4,11.029,-2.55,.085);
  // Exposed parts of the canopies and roof equipment collect their own caps.
  patch(13.45,.54,-.35,3.211,4.73,.05);
  patch(.36,8.70,6.34,3.971,-.1,.05);
  patch(1.29,.93,-3.3,8.614,-1.9,.045);
  patch(1.60,1.35,2.2,8.005,2.2,.045);
  for(let level=0;level<3;level++)patch(4.45,.56,-11.4,3.728+level*2.2,.72,.025);

  const accumulation={value:.55};
  const material=animeMaterial('#edf4fc');
  const compile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    compile(shader);
    shader.uniforms.uSnowDepth=accumulation;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>',`#include <common>
        uniform float uSnowDepth;
        attribute float aSnowBase;
        attribute float aSnowDepth;
        attribute float aSnowKind;
        varying vec3 vSnowWorld;
        varying float vSnowKind;
      `)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed.y=aSnowBase+aSnowDepth*uSnowDepth;
        vSnowKind=aSnowKind;
      `)
      .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        vSnowWorld=(modelMatrix*vec4(transformed,1.)).xyz;
      `);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform float uSnowDepth;
        varying vec3 vSnowWorld;
        varying float vSnowKind;
        float snowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float snowNoise(vec2 p){
          vec2 cell=floor(p),f=fract(p),u=f*f*(3.-2.*f);
          return mix(mix(snowHash(cell),snowHash(cell+vec2(1.,0.)),u.x),mix(snowHash(cell+vec2(0.,1.)),snowHash(cell+vec2(1.)),u.x),u.y);
        }
        float snowCoverage(vec2 p){
          if(vSnowKind>.5){
            // The shop floor and the sheltered entrance stay dry.
            bool shop=p.x>-6.88&&p.x<6.56&&p.y>-4.70&&p.y<4.99;
            bool cafe=p.x>-13.76&&p.x<-9.04&&p.y>-5.70&&p.y<.85;
            if(shop||cafe)return 0.;
          }
          if(vSnowKind>.5&&vSnowKind<1.5){
            // Broad, wind-shaped patches blend into the banks along the curb.
            // Snow spreads across the road as the snowfall continues.
            float field=snowNoise(p*vec2(.20,.48))*.65+snowNoise(p*.88)*.25+snowNoise(p*3.1)*.10;
            float threshold=.52-uSnowDepth*.10;
            float cover=smoothstep(threshold-.035,threshold+.045,field);
            float frontWidth=1.2+snowNoise(vec2(p.x*.36,12.))*.8;
            float sideWidth=1.1+snowNoise(vec2(17.,p.y*.36))*.8;
            float front=(1.-smoothstep(frontWidth,frontWidth+1.2,p.y-5.05))*(1.-smoothstep(6.0,6.8,p.x));
            float side=(1.-smoothstep(sideWidth,sideWidth+1.2,p.x-6.05))*(1.-smoothstep(4.8,5.8,p.y));
            return max(cover,max(front,side));
          }
          return 1.;
        }
      `)
      .replace('#include <alphatest_fragment>',`
        float coverage=snowCoverage(vSnowWorld.xz);
        // Broad painted patches replace photographic grain and speckled edges.
        if(coverage<.48)discard;
        diffuseColor.rgb*=mix(.94,1.,step(.5,snowNoise(vSnowWorld.xz*.75)));
        #include <alphatest_fragment>
      `);
  };
  material.customProgramCacheKey=()=> 'anime-settled-snow-v3';
  const geometry=mergeGeometries(geometries);
  geometries.forEach(g=>g.dispose());
  const snow=new THREE.Mesh(geometry,material);snow.receiveShadow=true;snow.userData.snowCover=true;group.add(snow);
  let age=0,lastTime=null;
  function set(weather){
    const visible=weather==='snow';
    if(visible&&!group.visible){age=0;accumulation.value=.55;}
    group.visible=visible;
  }
  function animate(time){
    const dt=lastTime===null?0:clamp(time-lastTime,0,.1);lastTime=time;
    if(group.visible){age+=dt;accumulation.value=Math.min(1,.55+age/70);}
  }
  return {set,animate,group};
}
