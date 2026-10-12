import * as THREE from 'three';
import {animeMaterial} from './anime-material.js';

// A leaf grows from its petiole, with a pointed tip, folded midrib and arched blade.
function leafGeometry(length,width,upright=false){
  const positions=[],colors=[],indices=[],rows=10;
  const shade=new THREE.Color('#24543b'),middle=new THREE.Color('#3d764a'),tip=new THREE.Color('#668249');
  for(let i=0;i<=rows;i++){
    const t=i/rows,breadth=width*Math.pow(Math.sin(Math.PI*t),.85);
    for(let column=0;column<3;column++){
      const side=column-1;
      const y=length*(t*(upright?.92:.38)+Math.sin(Math.PI*t)*.18)-Math.abs(side)*.028*Math.sin(Math.PI*t);
      const z=length*t*(upright?.29:.84);
      positions.push(side*breadth,y,z);
      const color=shade.clone().lerp(middle,Math.sin(Math.PI*t)*.8).lerp(tip,t*.24);
      if(column===1)color.lerp(tip,.2);
      colors.push(color.r,color.g,color.b);
      if(i<rows&&column<2){const a=i*3+column,b=a+3;indices.push(a,b,a+1,b,b+1,a+1);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  return geometry;
}

export function addPottedPlant(scene,h,x,y,z,scale=1){
  const {cylinder,bar,material}=h,group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(scale);scene.add(group);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.225,.17,.43,24),material('#a07755'));
  pot.position.y=.225;pot.castShadow=true;pot.receiveShadow=true;group.add(pot);
  cylinder(.229,.045,0,.442,0,material('#bd9773'),group);
  cylinder(.204,.012,0,.468,0,material('#3c3529'),group);
  const leafMaterial=animeMaterial('#ffffff',{vertexColors:true,side:THREE.DoubleSide,cel:true});
  const stem=material('#486b3c');
  for(let n=0;n<9;n++){
    const angle=n*2.399+(x<0?.35:.8),layer=n%3,stemHeight=.20+layer*.24;
    const anchor=[Math.sin(angle)*.085,.47+stemHeight,Math.cos(angle)*.085];
    bar([0,.46,0],anchor,.009,stem,group);
    const length=.60+layer*.08+(n%2)*.04,upright=n===8;
    const leaf=new THREE.Mesh(leafGeometry(length,.13+layer*.016,upright),leafMaterial);
    leaf.position.set(...anchor);leaf.rotation.y=angle;leaf.receiveShadow=true;group.add(leaf);
    // Painted central vein follows the blade's bend instead of floating above it.
    const points=[];for(let i=0;i<=8;i++){const t=i/10;points.push(new THREE.Vector3(0,length*(t*(upright?.92:.38)+Math.sin(Math.PI*t)*.18)+.002,length*t*(upright?.29:.84)));}
    const vein=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.003,3,false),material('#708953'));
    vein.position.copy(leaf.position);vein.rotation.copy(leaf.rotation);group.add(vein);
  }
  return group;
}
