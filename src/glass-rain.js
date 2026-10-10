import * as THREE from 'three';

// Water lives on the exterior panes, not on the camera or indoor refrigerator.
// Coordinates are metres so large and small windows have the same droplet scale.
const rainShader=/* glsl */`
uniform float uRainTime;
uniform float uStorm;
uniform float uPaneSeed;
uniform vec2 uPaneSize;
varying vec2 vRainUv;

vec3 rainHash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));
  q+=dot(q,q.yxz+33.33+uPaneSeed);
  return fract((q.xxy+q.yzz)*q.zyx);
}

float movingWater(vec2 p,vec2 spacing,float scale,float offset) {
  float water=0.;
  float column=floor(p.x/spacing.x);
  for(int i=-1;i<=1;i++) {
    float cx=column+float(i);
    vec3 lane=rainHash(vec2(cx,offset));
    // Each lane has its own speed; the sway changes smoothly, never each frame.
    float speed=mix(.025,.072,lane.y)*mix(1.,2.9,uStorm)*scale;
    float travel=uRainTime*speed;
    float row=floor((p.y+travel)/spacing.y);
    for(int j=-1;j<=1;j++) {
      vec3 rnd=rainHash(vec2(cx,row+float(j)+offset));
      float present=step(rnd.z,mix(.58,.91,uStorm));
      float headY=(row+float(j)+rnd.y)*spacing.y-travel;
      float phase=headY*5.7+lane.x*35.;
      float headX=(cx+.18+rnd.x*.64)*spacing.x;
      headX+=sin(phase)*.013+sin(phase*1.73)*.004;
      vec2 q=p-vec2(headX,headY);
      float radius=mix(.010,.028,rnd.x)*scale*mix(1.,1.16,uStorm);
      // Pear shaped bead: rounded bottom, narrower towards its trailing neck.
      float neck=1.-.3*smoothstep(0.,radius*1.8,q.y);
      vec2 bead=q/vec2(radius*neck,radius*1.35);
      float dome=pow(max(0.,1.-dot(bead,bead)),.65)*radius*.46;
      float length=mix(.07,.27,rnd.y)*scale*mix(1.,1.8,uStorm);
      float taper=clamp(1.-q.y/length,0.,1.);
      float curve=(sin(phase+q.y*9.)-sin(phase))*.009;
      curve+=(sin(phase*1.73+q.y*17.)-sin(phase*1.73))*.003;
      float width=radius*mix(.20,.34,uStorm)*( .35+.65*taper );
      float trail=exp(-pow((q.x-curve)/width,2.))*taper*taper;
      trail*=smoothstep(0.,radius*.6,q.y)*step(q.y,length)*radius*.09;
      water=max(water,(dome+trail)*present);
    }
  }
  return water;
}

float glassWater(vec2 p) {
  vec2 spacing=mix(vec2(.36,.74),vec2(.25,.52),uStorm);
  float water=movingWater(p,spacing,1.,3.);
  water=max(water,movingWater(p+vec2(.103,.27),spacing*.71,.56,29.));
  // Fine beads cling to the glass and slowly swell, then yield to moving water.
  vec2 cell=floor(p/.065),local=fract(p/.065)*.065;
  vec3 bead=rainHash(cell+83.);
  vec2 center=(.18+bead.xy*.64)*.065;
  float radius=mix(.0025,.006,bead.z);
  float swell=.65+.35*sin(uRainTime*.19+bead.x*19.);
  float small=pow(max(0.,1.-dot((local-center)/radius,(local-center)/radius)),.7);
  water=max(water,small*radius*.4*swell*step(bead.z,mix(.24,.58,uStorm)));
  // Storm-only continuous rivulets have distinct meandering paths and pulses.
  float channel=floor(p.x/.48);
  vec3 stream=rainHash(vec2(channel,137.));
  float x=(channel+.18+stream.x*.64)*.48;
  x+=sin(p.y*4.1+stream.y*16.)*.021+sin(p.y*10.+stream.x*21.)*.007;
  float width=mix(.002,.005,stream.z)*(1.+.3*sin(p.y*7.+uRainTime*1.5));
  float pulse=.55+.45*sin(p.y*8.+uRainTime*2.+stream.y*30.);
  water=max(water,exp(-pow((p.x-x)/width,2.))*.0018*pulse*uStorm*step(stream.z,.46));
  return water;
}
`;

export function createGlassRain() {
  const time={value:0},storm={value:0},panes=[];
  function add(pane,width,height,axis,depth) {
    const material=new THREE.MeshPhysicalMaterial({
      color:'#ffffff',roughness:.035,metalness:0,transmission:1,
      thickness:.16,ior:1.333,envMapIntensity:1.8,specularIntensity:1.2,
      transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false,
    });
    const uniforms={uRainTime:time,uStorm:storm,
      uPaneSeed:{value:panes.length*7.13+2.7},uPaneSize:{value:new THREE.Vector2(width,height)}};
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec2 vRainUv;')
        .replace('#include <uv_vertex>','#include <uv_vertex>\nvRainUv=uv;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>','#include <common>\n'+rainShader)
        .replace('#include <alphatest_fragment>',`
          float waterHeight=glassWater(vRainUv*uPaneSize);
          // Derivatives must be evaluated before any fragments are discarded.
          vec2 waterSlope=vec2(dFdx(waterHeight),dFdy(waterHeight));
          float waterMask=smoothstep(.000025,.00055,waterHeight);
          diffuseColor.a*=waterMask;
          if(diffuseColor.a<.003)discard;
          #include <alphatest_fragment>
        `)
        .replace('#include <normal_fragment_maps>',`
          #include <normal_fragment_maps>
          vec3 waterDx=dFdx(-vViewPosition),waterDy=dFdy(-vViewPosition);
          vec3 waterR1=cross(waterDy,normal),waterR2=cross(normal,waterDx);
          float waterDet=dot(waterDx,waterR1)*faceDirection;
          vec3 waterGradient=sign(waterDet)*(waterSlope.x*waterR1+waterSlope.y*waterR2);
          normal=normalize(abs(waterDet)*normal-waterGradient*1.45);
        `);
    };
    material.customProgramCacheKey=()=> 'exterior-glass-water-v1';
    const overlay=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    if(axis==='x'){overlay.rotation.y=Math.PI/2;overlay.position.x=depth/2+.0015;}
    else overlay.position.z=depth/2+.0015;
    overlay.visible=false;
    pane.add(overlay);
    panes.push(overlay);
  }
  function set(weather,quality) {
    const wet=weather==='rain'||weather==='storm';
    storm.value=weather==='storm'?1:0;
    for(const pane of panes) {
      pane.visible=wet;
      // The lightweight mode keeps highlights without another refraction pass.
      const material=pane.material,nextTransmission=quality?1:0;
      if(material.transmission!==nextTransmission){material.transmission=nextTransmission;material.needsUpdate=true;}
      material.color.set(quality?'#ffffff':'#788d91');
      material.opacity=quality?.92:.24;
    }
  }
  return {add,set,animate:t=>{time.value=t;}};
}
