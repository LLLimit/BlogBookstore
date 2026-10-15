import * as THREE from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// Only geometry makes ink edges; text, photographs and grain stay readable.
// A normal/depth pass replaces the old SSAO samples and blur passes.
export function createAnimeInkPass(scene,camera){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(1,1,THREE.UnsignedIntType)});
  const normals=new THREE.MeshNormalMaterial({blending:THREE.NoBlending,side:THREE.DoubleSide});
  const pass=new ShaderPass({uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},texel:{value:new THREE.Vector2()},near:{value:camera.near},far:{value:camera.far}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse,tNormal,tDepth;
      uniform vec2 texel;uniform float near,far;varying vec2 vUv;
      float distanceAt(vec2 uv){float d=texture2D(tDepth,uv).x;return near*far/(far-d*(far-near));}
      void main(){
        vec4 c=texture2D(tDiffuse,vUv);float d=texture2D(tDepth,vUv).x;
        vec3 n=texture2D(tNormal,vUv).rgb;float z=distanceAt(vUv),bend=0.,gap=0.;
        for(int i=0;i<4;i++){
          vec2 offset=i==0?vec2(texel.x,0.):i==1?vec2(-texel.x,0.):i==2?vec2(0.,texel.y):vec2(0.,-texel.y);
          vec2 uv=vUv+offset;float other=distanceAt(uv);
          bend=max(bend,length(n-texture2D(tNormal,uv).rgb));
          gap=max(gap,abs(z-other)/max(min(z,other),.5));
        }
        float line=max(smoothstep(.18,.47,bend),smoothstep(.018,.045,gap));
        line*=1.-step(.999999,d);
        gl_FragColor=vec4(mix(c.rgb,c.rgb*vec3(.22,.27,.38),line*.72),c.a);
      }`});
  // ShaderPass clones uniforms; render target textures must keep their identity.
  pass.uniforms.tNormal.value=target.texture;pass.uniforms.tDepth.value=target.depthTexture;
  const draw=pass.render.bind(pass),oldColor=new THREE.Color();let width=1,height=1;
  pass.setSize=(w,h)=>{width=w;height=h;target.setSize(w,h);};
  pass.render=(renderer,...args)=>{
    const hidden=[],previous={material:scene.overrideMaterial,background:scene.background,target:renderer.getRenderTarget(),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,shadows:renderer.shadowMap.autoUpdate};
    renderer.getClearColor(oldColor);
    scene.traverse(o=>{if(o.visible&&(o.userData.sky||o.userData.snowCover||o.isPoints||o.isSprite||o.isReflector||(o.isMesh&&(Array.isArray(o.material)?o.material.some(m=>m.transparent):o.material.transparent)))){hidden.push(o);o.visible=false;}});
    try{scene.overrideMaterial=normals;scene.background=null;renderer.autoClear=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(target);renderer.setClearColor(0x7777ff,1);renderer.clear();renderer.render(scene,camera);}
    finally{scene.overrideMaterial=previous.material;scene.background=previous.background;hidden.forEach(o=>o.visible=true);renderer.autoClear=previous.autoClear;renderer.shadowMap.autoUpdate=previous.shadows;renderer.setClearColor(oldColor,previous.alpha);renderer.setRenderTarget(previous.target);}
    const radius=.9*renderer.getPixelRatio();pass.uniforms.texel.value.set(radius/width,radius/height);pass.uniforms.near.value=camera.near;pass.uniforms.far.value=camera.far;draw(renderer,...args);
  };
  const dispose=pass.dispose.bind(pass);pass.dispose=()=>{target.dispose();normals.dispose();dispose();};
  return pass;
}
