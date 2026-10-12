import * as THREE from 'three';

const fill={value:.16};
export const LIGHTING_SCALE=1.8;
const bounce={value:LIGHTING_SCALE};
export function setAnimeDaylight(day,brightness=1){fill.value=.14+.12*day;bounce.value=Math.max(0,brightness)*LIGHTING_SCALE;}

// Painted backgrounds use soft lighting; small objects have stronger cel planes.
// Quantize the normal response only: distance, cone falloff and shadows stay smooth.
export function animeMaterial(color='#ffffff',options={}){
  const {roughness,metalness,cel=false,...parameters}=options;
  const base=new THREE.Color(color),hsl={};base.getHSL(hsl);
  base.setHSL(hsl.h,Math.min(.8,hsl.s*1.06),Math.min(.92,hsl.l));
  const m=new THREE.MeshToonMaterial({color:base,...parameters});
  function setup(target){
    target.onBeforeCompile=shader=>{
      shader.uniforms.animeFill=fill;
      shader.uniforms.animeBounce=bounce;
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>','#include <common>\nuniform float animeFill;\nuniform float animeBounce;\nvarying vec3 vAnimePosition;')
        .replace('#include <gradientmap_pars_fragment>',`vec3 getGradientIrradiance(vec3 n,vec3 l){
          float facing=max(0.,dot(n,l));
          float w=max(fwidth(facing)*1.5,${cel?'.045':'.10'});
          float bands=.27*smoothstep(.12-w,.12+w,facing)+.36*smoothstep(.46-w,.46+w,facing)+.37*smoothstep(.78-w,.78+w,facing);
          return vec3(mix(facing,bands,${cel?'.75':'.22'}));
        }`)
        .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
          // Compress overlapping lamps without bleaching the painted base colour.
          vec3 lightRatio=reflectedLight.directDiffuse/max(diffuseColor.rgb,vec3(.001));
          reflectedLight.directDiffuse=diffuseColor.rgb*(vec3(1.)-exp(-lightRatio))*1.65;
          reflectedLight.indirectDiffuse+=diffuseColor.rgb*animeFill*vec3(.68,.80,1.);
          // Painted indoor bounce keeps the room readable with downward-facing lamps.
          vec3 roomMin=vec3(-6.78,.13,-4.51),roomMax=vec3(6.08,7.62,4.28);
          vec3 boundary=smoothstep(roomMin,roomMin+vec3(.16),vAnimePosition)*(vec3(1.)-smoothstep(roomMax-vec3(.16),roomMax,vAnimePosition));
          float indoors=boundary.x*boundary.y*boundary.z;
          reflectedLight.indirectDiffuse+=diffuseColor.rgb*indoors*animeBounce*vec3(.34,.29,.21);`);
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec3 vAnimePosition;')
        .replace('#include <project_vertex>','#include <project_vertex>\nvAnimePosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    };
    target.customProgramCacheKey=()=>cel?'anime-cel-soft-v2':'anime-painted-soft-v2';
    target.clone=()=>setup(new THREE.MeshToonMaterial().copy(target));
    return target;
  }
  return setup(m);
}
