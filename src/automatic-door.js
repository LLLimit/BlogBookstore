import * as THREE from 'three';

// One fixed sensor covers the doorway even after the moving leaves slide away.
export function createAutomaticDoor(scene,{box,material,rainPane,glass}){
  const x=-.305,z=4.075,bottom=.185,width=2.28,height=2.82,leafWidth=1.14,travel=1.16;
  const root=new THREE.Group();root.name='BookstoreAutomaticDoor';root.position.set(x,bottom,z);scene.add(root);
  const frame=material('#37494d'),rail=material('#647876'),stripe=material('#d9e7e1');
  const doorGlass=glass.clone();doorGlass.opacity=.14;doorGlass.roughness=.16;doorGlass.color.set('#c2e2df');
  const leaves=[-1,1].map(side=>{
    const leaf=new THREE.Group();leaf.name=side<0?'SlidingDoorLeft':'SlidingDoorRight';root.add(leaf);
    const pane=rainPane(leafWidth-.05,height-.08,.032,0,height/2,0,doorGlass,leaf);pane.receiveShadow=false;
    for(const edge of [-1,1])box(.033,height,.075,edge*(leafWidth/2-.0165),height/2,0,frame,leaf);
    for(const y of [.026,height-.026])box(leafWidth,.052,.075,0,y,0,frame,leaf);
    // Frosted safety stripes and soft highlights make the clear glass readable.
    for(const y of [1.02,1.09])box(leafWidth-.09,.021,.003,0,y,.02,stripe,leaf);
    const shine=new THREE.Mesh(new THREE.PlaneGeometry(.016,1.98),new THREE.MeshBasicMaterial({color:'#edfaff',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));
    shine.position.set(side*.37,1.52,.018);shine.rotation.z=-.08;leaf.add(shine);
    leaf.traverse(part=>{part.userData.slidingDoor=true;});
    return leaf;
  });
  box(width+.08,.14,.24,0,height+.072,.016,frame,root);
  box(.14,.064,.095,0,height+.069,.158,material('#162a30'),root);
  box(.022,.011,.003,.042,height+.055,.208,material('#8fd5bb',{emissive:'#8fd5bb',emissiveIntensity:.32}),root);
  box(width+.02,.014,.14,0,0,0,rail,root);
  const sensor=new THREE.Box3(new THREE.Vector3(x-width/2-.32,.13,z-.18),new THREE.Vector3(x+width/2+.32,height+.39,z+.24));
  const ray=new THREE.Raycaster(),hit=new THREE.Vector3();let progress=0,wanted=false,hold=0;
  function near(player,margin){return player.y>.4&&player.y<3.35&&Math.abs(player.x-x)<width/2+.8+margin&&Math.abs(player.z-z)<2.05+margin;}
  function hover(pointer,camera){if(!pointer||camera.position.z<z+.15)return false;camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);return !!ray.ray.intersectBox(sensor,hit);}
  function pose(){leaves.forEach((leaf,i)=>leaf.position.x=(i?1:-1)*(leafWidth/2+travel*progress));}
  function update(dt,{player=null,pointer=null,camera=null}={}){
    const occupied=player?near(player,wanted ? .35 : 0):!!camera&&hover(pointer,camera);
    if(occupied){wanted=true;hold=1.1;}
    else{hold=Math.max(0,hold-dt);if(!hold)wanted=false;}
    const before=progress;progress+=((wanted?1:0)-progress)*(1-Math.exp(-dt*(wanted?7.5:4.2)));
    if(Math.abs(progress-(wanted?1:0))<.001)progress=wanted?1:0;
    if(progress!==before)pose();return progress!==before;
  }
  function blocked(px,pz){return Math.abs(pz-z)<.29&&leaves.some(leaf=>Math.abs(px-x-leaf.position.x)<leafWidth/2+.24);}
  pose();return {root,update,blocked,hover,get progress(){return progress;},get open(){return wanted;}};
}
