import * as THREE from 'three';

export function createStreetLights(scene,texture){
  const lights=[];
  const glowMap=texture(128,128,(ctx,w,h)=>{const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.12,'#e7f2ffcc');gradient.addColorStop(.45,'#c0deff20');gradient.addColorStop(1,'#a9d0ff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);});
  const poolMap=texture(256,256,(ctx,w,h)=>{const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.49);gradient.addColorStop(0,'#e9f2ff5c');gradient.addColorStop(.42,'#dfedff35');gradient.addColorStop(1,'#c5e0ff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);});
  function add(x,y,z){
    const light=new THREE.SpotLight('#dcecff',200,15,Math.PI*.28,.65,1.65);light.position.set(x,y,z);light.target.position.set(x-.4,.14,z+.5);
    light.castShadow=lights.length<2;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0008;light.shadow.normalBias=.075;scene.add(light,light.target);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:'#dfebff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));halo.position.set(x,y-.035,z);halo.scale.set(1.05,.65,1);scene.add(halo);
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(6.6,5.5),new THREE.MeshBasicMaterial({map:poolMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.8}));pool.rotation.x=-Math.PI/2;pool.position.set(x-.4,.151,z+.4);scene.add(pool);
    const coneGeometry=new THREE.ConeGeometry(2.5,y-.15,32,1,true);coneGeometry.translate(0,-(y-.15)/2,0);
    const beam=new THREE.Mesh(coneGeometry,new THREE.ShaderMaterial({uniforms:{uOpacity:{value:.05}},side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vView=-p.xyz;vNormal=normalMatrix*normal;gl_Position=projectionMatrix*p;}',
      fragmentShader:'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;uniform float uOpacity;void main(){float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),2.4);float a=pow(vUv.y,1.8)*(1.-smoothstep(.83,1.,vUv.y))*edge;gl_FragColor=vec4(.68,.8,1.,a*uOpacity);}'
    }));beam.position.set(x,y,z);scene.add(beam);lights.push({light,halo,pool,beam});
  }
  function update(night,brightness,weather){
    const intensity=night*brightness;
    for(const {light,halo,pool,beam} of lights){light.intensity=200*intensity;halo.material.opacity=.8*intensity;pool.material.opacity=.5*intensity;beam.material.uniforms.uOpacity.value=(weather==='fog'?.075:weather==='rain'||weather==='storm'?.035:.008)*intensity;}
  }
  return {add,update,lights};
}
