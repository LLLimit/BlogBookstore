import * as THREE from 'three';

export function createStreetLights(scene,texture){
  const lights=[];
  const glowMap=texture(128,128,(ctx,w,h)=>{const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.12,'#e7f2ffcc');gradient.addColorStop(.45,'#c0deff20');gradient.addColorStop(1,'#a9d0ff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);});
  function add(x,y,z){
    const light=new THREE.SpotLight('#e6eaf0',200,15,Math.PI*.28,.95,1.65);light.position.set(x,y,z);light.target.position.set(x-.4,.14,z+.5);
    light.castShadow=lights.length<2;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.00015;light.shadow.normalBias=.025;
    light.shadow.camera.near=.3;light.shadow.camera.far=15;light.shadow.radius=2;scene.add(light,light.target);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:'#dfebff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));halo.position.set(x,y-.035,z);halo.scale.set(1.05,.65,1);scene.add(halo);
    // Actual light and rain reflections provide the glow, without circular floor decals
    // or an intersecting cone mesh drawing bands across the sign and canopy.
    lights.push({light,halo});
  }
  function update(night,brightness,weather){
    const intensity=night*brightness;
    for(const {light,halo} of lights){light.intensity=200*intensity;halo.material.opacity=.6*intensity;}
  }
  return {add,update,lights};
}
