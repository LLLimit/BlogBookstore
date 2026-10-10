import * as THREE from 'three';

// These edges match the underside of the roof slab and the two fascia overhangs.
// Upper runoff lands on the canopy; lower runoff reaches the pavement.
const edges=[
  {from:[-6.76,7.705,4.483],to:[6.06,7.705,4.483],normal:[0,1],landing:3.21,count:38},
  {from:[6.158,7.705,-4.42],to:[6.158,7.705,4.14],normal:[1,0],landing:3.97,count:25},
  {from:[-6.858,7.705,-4.55],to:[-6.858,7.705,4.36],normal:[-1,0],landing:.145,count:26},
  {from:[-6.76,7.705,-4.683],to:[6.06,7.705,-4.683],normal:[0,-1],landing:.145,count:38},
  {from:[-7.02,3.045,5.018],to:[6.32,3.045,5.018],normal:[0,1],landing:-.004,count:48},
  {from:[6.523,3.205,-4.36],to:[6.523,3.205,4.18],normal:[1,0],landing:-.004,count:29},
  {from:[-7.083,3.045,4.12],to:[-7.083,3.045,4.92],normal:[-1,0],landing:.145,count:6},
  {from:[6.383,3.045,4.28],to:[6.383,3.045,4.92],normal:[1,0],landing:-.004,count:6},
];

const motion=/* glsl */`
attribute vec3 aLip;
attribute vec2 aOutward;
attribute vec4 aFlow;
attribute vec2 aImpact;
attribute float aSlot;
uniform float uTime;
uniform float uStorm;
uniform float uSlots;
uniform vec2 uWind;

void runoff(out float age,out float hold,out float flight,out float radius,out vec3 impact) {
  hold=mix(.30+aFlow.y*.28,.09+aFlow.y*.10,uStorm);
  radius=mix(.009,.018,aFlow.y)*mix(1.,1.25,uStorm)*aImpact.y;
  float distance=max(.01,aLip.y-radius-aImpact.x);
  flight=sqrt(2.*distance/9.81);
  float period=mix(1.7+aFlow.x*3.9,.28+aFlow.x*.65,uStorm)/aImpact.y;
  // Each slot must survive to impact, including when fewer slots are rendered.
  period=max(period,(hold+flight+.36)/uSlots);
  float clock=uTime+.12*sin(uTime*.71+aFlow.w*9.);
  age=mod(clock+(aFlow.w-aSlot)*period,period*uSlots);
  vec2 drift=(aOutward*.10+uWind*aFlow.z)*flight*flight;
  impact=vec3(aLip.x+drift.x,aImpact.x,aLip.z+drift.y);
}
`;

export function createEaveRain(scene) {
  let seed=781;
  const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const emitters=[];
  for(const edge of edges)for(let n=0;n<edge.count;n++) {
    // Irregular spacing and stronger corner runoff avoid a uniformly spaced curtain.
    const f=(n+.18+random()*.64)/edge.count;
    const lip=new THREE.Vector3(...edge.from).lerp(new THREE.Vector3(...edge.to),f);
    const corner=n===0||n===edge.count-1;
    emitters.push({lip:lip.toArray(),normal:edge.normal,
      flow:[random(),random(),.65+random()*.65,random()*6],
      impact:[edge.landing,corner?1.35:1]});
  }
  const lips=[],normals=[],flows=[],impacts=[],slots=[],maxSlots=6;
  // Slot-first ordering makes the lighter quality mode keep every edge populated.
  for(let slot=0;slot<maxSlots;slot++)for(const e of emitters) {
    lips.push(...e.lip);normals.push(...e.normal);flows.push(...e.flow);
    impacts.push(...e.impact);slots.push(slot);
  }
  function geometry() {
    const quad=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();
    g.setIndex(quad.index);g.setAttribute('position',quad.getAttribute('position'));g.setAttribute('uv',quad.getAttribute('uv'));
    for(const [name,data,size] of [['aLip',lips,3],['aOutward',normals,2],['aFlow',flows,4],['aImpact',impacts,2],['aSlot',slots,1]])
      g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(data),size));
    g.instanceCount=emitters.length*maxSlots;
    return g;
  }
  const uniforms={uTime:{value:0},uStorm:{value:0},uSlots:{value:6},
    uWind:{value:new THREE.Vector2(.025,-.012)},
    uColor:{value:new THREE.Color('#a8c4cf')},uHighlight:{value:new THREE.Color('#fff0d2')},uAlpha:{value:.65}};
  const drops=new THREE.Mesh(geometry(),new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    vertexShader:/* glsl */`
      ${motion}
      varying vec2 vWater;
      varying float vTrail;
      varying float vStretch;
      varying float vOpacity;
      void main() {
        float age,hold,flight,radius;vec3 impact;
        runoff(age,hold,flight,radius,impact);
        float fall=clamp(age-hold,0.,flight);
        float growth=mix(.25,1.,pow(clamp(age/hold,0.,1.),.45));
        vec3 head=aLip;
        head.y-=radius*growth+.5*9.81*fall*fall;
        vec2 drift=aOutward*.10+uWind*aFlow.z;
        head.xz+=drift*fall*fall;
        vec3 velocity=vec3(drift.x*2.*fall,-max(.3,9.81*fall),drift.y*2.*fall);
        vec4 headView=modelViewMatrix*vec4(head,1.);
        vec4 tailView=modelViewMatrix*vec4(head-normalize(velocity),1.);
        vec2 axis=normalize(tailView.xy-headView.xy+vec2(0.,.00001));
        vec2 across=vec2(axis.y,-axis.x);
        float bead=radius*growth;
        float trail=mix(.035,.18,uStorm)*(.35+.65*aFlow.y)*min(1.,fall*3.);
        trail*=aImpact.y;
        float stretch=1.25+min(8.,9.81*fall)*.14;
        float height=bead*stretch*2.+trail;
        vec4 view=headView;
        view.xy+=axis*(uv.y*height-bead*stretch)+across*position.x*bead*2.;
        gl_Position=projectionMatrix*view;
        vWater=vec2(position.x*2.,(uv.y*height-bead*stretch)/bead);
        vTrail=trail/bead+stretch;vStretch=stretch;
        float emission=step(aFlow.x,mix(.65,1.,uStorm));
        if(aImpact.y>1.)emission=1.;
        vOpacity=emission*step(age,hold+flight)*(1.-smoothstep(27.,48.,-view.z));
      }
    `,
    fragmentShader:/* glsl */`
      uniform vec3 uColor;
      uniform vec3 uHighlight;
      uniform float uAlpha;
      varying vec2 vWater;
      varying float vTrail;
      varying float vStretch;
      varying float vOpacity;
      void main() {
        if(vOpacity<.001)discard;
        vec2 pear=vWater/vec2(1.-.30*smoothstep(0.,vStretch,vWater.y),vStretch);
        float r=length(pear),aa=max(.035,fwidth(r));
        float bead=1.-smoothstep(1.-aa,1.+aa,r);
        float filament=exp(-pow(vWater.x/.18,2.));
        filament*=smoothstep(.55,vStretch,vWater.y)*(1.-smoothstep(vStretch,max(vStretch+.05,vTrail),vWater.y));
        // A transparent body catches one reflected glint.
        float core=sqrt(max(0.,1.-r*r));
        float rim=exp(-pow((r-.82)/.15,2.))*smoothstep(-.3,.5,-pear.x)*smoothstep(-.4,.45,pear.y);
        float shine=exp(-length((pear-vec2(-.30,.42))*vec2(5.,4.))*2.5);
        float alpha=max(bead*(.22+core*.20+rim*.10+shine*.16),filament*.46)*vOpacity*uAlpha;
        if(alpha<.004)discard;
        vec3 color=mix(uColor*.95,uHighlight,clamp(rim*.3+shine*.9+filament*.12,0.,1.));
        gl_FragColor=vec4(color,alpha);
      }
    `,
  }));
  // Expanding impact rings and brief crowns belong to the same emitted droplets.
  const splashes=new THREE.Mesh(geometry(),new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    vertexShader:/* glsl */`
      ${motion}
      varying vec2 vSplash;
      varying float vAge;
      varying float vOpacity;
      void main() {
        float age,hold,flight,radius;vec3 impact;
        runoff(age,hold,flight,radius,impact);
        float splashAge=age-hold-flight;
        float life=.26+.08*uStorm;
        float t=clamp(splashAge/life,0.,1.);
        float size=(.03+t*.21)*aImpact.y*mix(1.,1.3,uStorm);
        vec3 p=impact+vec3(position.x*size,0.,position.y*size);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        vSplash=uv*2.-1.;vAge=t;
        float emission=step(aFlow.x,mix(.65,1.,uStorm));
        if(aImpact.y>1.)emission=1.;
        vOpacity=step(0.,splashAge)*step(splashAge,life)*(1.-t)*(1.-t)*emission;
      }
    `,
    fragmentShader:/* glsl */`
      uniform vec3 uHighlight;
      uniform float uAlpha;
      varying vec2 vSplash;
      varying float vAge;
      varying float vOpacity;
      void main() {
        if(vOpacity<.001)discard;
        float r=length(vSplash),aa=max(.05,fwidth(r));
        float ring=1.-smoothstep(aa,aa*2.,abs(r-.74));
        float angle=atan(vSplash.y,vSplash.x);
        float crown=pow(max(0.,sin(angle*7.+vAge*2.)),5.);
        crown*=exp(-pow((r-.37)/.14,2.))*(1.-smoothstep(.1,.65,vAge));
        float alpha=(ring*.65+crown*.5)*vOpacity*uAlpha;
        if(alpha<.003)discard;
        gl_FragColor=vec4(uHighlight,alpha);
      }
    `,
  }));
  for(const mesh of [drops,splashes]){mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);}
  function set(weather,quality=true) {
    const storm=weather==='storm',wet=weather==='rain'||storm;
    uniforms.uStorm.value=storm?1:0;
    uniforms.uSlots.value=quality?6:4;
    uniforms.uWind.value.set(storm?.095:.025,storm?-.040:-.012);
    for(const mesh of [drops,splashes]){mesh.visible=wet;mesh.geometry.instanceCount=emitters.length*uniforms.uSlots.value;}
  }
  function setLighting(day,brightness=1) {
    uniforms.uColor.value.set('#789cac').lerp(new THREE.Color('#b4d1d7'),day);
    uniforms.uHighlight.value.set('#ffe4b1').lerp(new THREE.Color('#e3f2f5'),day);
    uniforms.uAlpha.value=(.67+day*.10)*brightness;
  }
  return {set,setLighting,animate:time=>{uniforms.uTime.value=time;},drops,splashes};
}
