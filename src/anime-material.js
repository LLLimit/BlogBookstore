import * as THREE from 'three';

export const LIGHTING_SCALE=1.8;
const fill={value:.19},bounce={value:LIGHTING_SCALE};
export function setAnimeDaylight(day,brightness=1){fill.value=.13+.10*day;bounce.value=Math.max(0,brightness)*LIGHTING_SCALE;}

// Quantize the accumulated light too: overlapping lamps and distance falloff
// otherwise restore continuous, realistic gradients on every toon surface.
export function animeMaterial(color='#ffffff',options={}){
  const {roughness=.8,metalness=0,cel=true,flatShading=false,surface=metalness>.35?'metal':roughness<.4?'glazed':'matte',...parameters}=options;
  const specular={value:surface==='metal'?.14:surface==='glazed'?.045:0};
  function setup(target){
    target.userData.animeSurface=surface;
    if(flatShading)target.defines={...target.defines,FLAT_SHADED:''};
    target.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{animeFill:fill,animeBounce:bounce,animeSpecular:specular});
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>','#include <common>\nuniform float animeFill;\nuniform float animeBounce;\nuniform float animeSpecular;\nvarying vec3 vAnimePosition;')
        .replace('#include <gradientmap_pars_fragment>',`vec3 getGradientIrradiance(vec3 n,vec3 l){
          float facing=dot(n,l),aa=clamp(fwidth(facing)*.7,.004,.022);
          return vec3(.06+.72*smoothstep(.015-aa,.015+aa,facing)+.22*smoothstep(.67-aa,.67+aa,facing));
        }`)
        .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
          vec3 ratio=reflectedLight.directDiffuse/max(diffuseColor.rgb,vec3(.001));
          float luminance=dot(ratio,vec3(.2126,.7152,.0722));
          float energy=1.-exp(-max(luminance,0.)*1.55);
          float aa=clamp(fwidth(energy)*.75,.004,.018);
          float middle=smoothstep(.11-aa,.11+aa,energy);
          float light=smoothstep(.59-aa,.59+aa,energy);
          vec3 lightTint=clamp(ratio/max(luminance,.02),vec3(.75),vec3(1.22));
          vec3 tone=mix(vec3(.66,.74,.98),lightTint,middle);
          reflectedLight.directDiffuse=diffuseColor.rgb*tone*(.16+.44*middle+.50*light);
          vec3 roomMin=vec3(-6.78,.13,-4.51),roomMax=vec3(6.08,7.62,4.28);
          vec3 boundary=smoothstep(roomMin,roomMin+vec3(.12),vAnimePosition)*(vec3(1.)-smoothstep(roomMax-vec3(.12),roomMax,vAnimePosition));
          float indoors=boundary.x*boundary.y*boundary.z;
          reflectedLight.indirectDiffuse=diffuseColor.rgb*(animeFill*vec3(.68,.78,1.)+indoors*animeBounce*vec3(.145,.123,.098));
          #if NUM_DIR_LIGHTS > 0
            vec3 halfDirection=normalize(directionalLights[0].direction+geometryViewDir);
            float shine=dot(normal,halfDirection),shineAA=clamp(fwidth(shine),.003,.015);
            float highlight=smoothstep(.94-shineAA,.94+shineAA,shine);
            reflectedLight.directDiffuse+=vec3(1.,.94,.80)*highlight*animeSpecular*middle;
          #endif
        `);
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec3 vAnimePosition;')
        .replace('#include <project_vertex>','#include <project_vertex>\nvAnimePosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    };
    if(surface==='glass')target.onBeforeCompile=((compile)=>shader=>{compile(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float graze=1.-abs(dot(normal,normalize(vViewPosition)));diffuseColor.a=min(.3,diffuseColor.a+smoothstep(.62,.65,graze)*.035);\n#include <opaque_fragment>`);})(target.onBeforeCompile);
    target.customProgramCacheKey=()=>`anime-three-tone-v3-${surface}-${cel}-${flatShading}`;
    target.clone=()=>setup(new THREE.MeshToonMaterial().copy(target));
    return target;
  }
  return setup(new THREE.MeshToonMaterial({color,...parameters}));
}

export function animeGlass(color='#c7e0dc',options={}){
  return animeMaterial(color,{opacity:.045,side:THREE.DoubleSide,...options,surface:'glass',transparent:true,depthWrite:false});
}
