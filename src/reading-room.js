import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// South is the storefront (+Z); shelves expose books to both north and south aisles.
export function addReadingRoom(scene,h){
  const {box,material,obstacle,texture}=h,bookSlots=[],bookPlaceholders=[];
  const wood=material('#a97951'),edge=material('#d6b68a'),dark=material('#574737'),paper=material('#eadfc4');
  const standMetal=material('#354b49'),standTrim=material('#aa8970'),standPad=material('#223733');
  const displayTilt=-.19,displayY=1.102;
  const colors=['#49776e','#bb7659','#bfa15f','#6e7895','#976b79','#748560'];
  const covers=colors.map((color,index)=>material('#ffffff',{map:texture(256,384,(ctx,w,height)=>{
    ctx.fillStyle=color;ctx.fillRect(0,0,w,height);ctx.strokeStyle='#ebdec3';ctx.lineWidth=2;ctx.strokeRect(15,15,w-30,height-30);
    ctx.fillStyle='#efdec4';ctx.font='bold 22px Georgia';ctx.textAlign='center';ctx.fillText('GOODNIGHT',w/2,63);ctx.font='16px Georgia';ctx.fillText('STORIES',w/2,91);
    ctx.beginPath();ctx.arc(w/2,192,43,0,Math.PI*2);ctx.fillStyle='#edd8a980';ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(w/2+15,183,38,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#efdec4';ctx.font='italic 28px Georgia';ctx.fillText(String(index+1).padStart(2,'0'),w/2,height-43);
  })}));
  function rounded(w,height,d,x,y,z,m,parent){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,height,d,2,.025),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function spines(width,y,z,parent,count=25){
    for(let n=0;n<count;n++){
      const x=-width/2+.12+n*(width-.24)/(count-1),height=(count<10?.25:.34)+(n%5)*(count<10?.018:.035),m=material(colors[n%colors.length]);
      box(.115,height,.18,x,y+height/2,z,m,parent);
      box(.075,.013,.009,x,y+.12,z+Math.sign(z)*.096,edge,parent);
      box(.088,.008,.008,x,y+height-.045,z+Math.sign(z)*.096,paper,parent);
    }
  }
  function displayBook(x,z,yaw,index,parent,placeholder=false,w=.28,height=.41){
    // Weighted, rounded base; two slim back supports and a padded retaining lip.
    // The stand survives when an RSS book replaces its decorative placeholder.
    const stand=new THREE.Group();stand.position.set(x,1.065,z);stand.rotation.y=yaw;parent.add(stand);
    rounded(w+.07,.024,.25,0,.012,-.015,standMetal,stand);
    rounded(w+.058,.006,.235,0,.026,-.015,standTrim,stand);
    for(const sx of [-w*.3,w*.3]){
      const support=rounded(.019,height*.70,.022,sx,height*.35+.032,-.081,standMetal,stand);support.rotation.x=displayTilt;
      const pad=box(.035,.038,.012,sx,height*.67+.026,-.106,standPad,stand);pad.rotation.x=displayTilt;
    }
    rounded(w*.9,.037,.022,0,.048,.057,standTrim,stand);
    box(w*.84,.008,.022,0,.034,.039,standPad,stand);
    const g=new THREE.Group();g.position.set(x,displayY,z);g.rotation.order='YXZ';g.rotation.set(displayTilt,yaw,0);parent.add(g);
    const depth=.063;
    box(w,height,depth,0,height/2,0,material(colors[index%6]),g);
    box(w-.018,height-.023,depth-.015,.003,height/2,.002,paper,g);
    const cover=new THREE.Mesh(new THREE.PlaneGeometry(w,height),covers[index%6]);cover.position.set(0,height/2,depth/2+.003);g.add(cover);
    if(placeholder){g.traverse(o=>o.userData.bookPlaceholder=true);bookPlaceholders.push(g);}
    return g;
  }
  for(const z of [-2.65,-.45,1.75]){
    const shelf=new THREE.Group();shelf.position.set(-3.9,0,z);scene.add(shelf);
    rounded(4.3,.17,.68,0,.29,0,wood,shelf);
    for(const x of [-2.12,2.12])rounded(.12,2.4,.65,x,1.48,0,wood,shelf);
    box(4.12,2.2,.045,0,1.46,0,dark,shelf);
    for(const y of [.38,1.08,1.78,2.48])rounded(4.3,.065,.65,0,y,0,edge,shelf);
    for(const side of [-1,1]){
      for(const y of [.415,1.115,1.815])spines(4.08,y,side*.16,shelf,27);
      for(const x of [-1.35,0,1.35])bookSlots.push({x:-3.9+x,y:1.115,z:z+side*.345,yaw:side<0?Math.PI:0});
    }
    obstacle(-3.9,z,4.3,.68);
  }
  for(const z of [-2.05,.95]){
    const table=new THREE.Group();table.position.set(1.5,0,z);scene.add(table);
    rounded(2.55,.11,1.55,0,1.01,0,wood,table);
    for(const x of [-1.06,1.06])for(const zz of [-.56,.56])rounded(.1,.79,.1,x,.61,zz,dark,table);
    box(2.3,.12,.045,0,.91,-.57,dark,table);box(2.3,.12,.045,0,.91,.57,dark,table);
    obstacle(1.5,z,2.55,1.55);
    // Standing browse tables: four edges stay stocked even before an RSS is configured.
    for(const [i,[x,zz,yaw]] of [[-1.08,0,-Math.PI/2],[1.08,0,Math.PI/2],[0,-.59,Math.PI],[0,.59,0]].entries()){
      bookSlots.push({x:1.5+x,y:displayY,z:z+zz,yaw,tilt:displayTilt});
      displayBook(x,zz,yaw,i,table,true,.329,.483);
    }
    for(const side of [-1,1]){
      for(const x of [-.65,.65])displayBook(x,side*.59,side<0?Math.PI:0,Math.round(x*10+15),table);
      for(const zz of [-.43,.43])displayBook(side*1.08,zz,side*Math.PI/2,Math.round(zz*10+14),table,false,.23,.34);
    }
    // Two tiers. A full central divider separates north-facing and south-facing books.
    for(const y of [1.10,1.43,1.76])rounded(.88,.035,.52,0,y,0,edge,table);
    for(const x of [-.41,.41])rounded(.035,.66,.52,x,1.43,0,wood,table);
    box(.82,.63,.035,0,1.43,0,dark,table);
    for(const y of [1.12,1.45])for(const side of [-1,1])for(let n=0;n<7;n++){
      const x=-.30+n*.10,height=.23+(n%3)*.019,depth=side*.125;
      box(.085,height,.18,x,y+height/2,depth,material(colors[(n+(side<0?2:0))%6]),table);
      box(.056,.012,.006,x,y+.065,depth+side*.093,edge,table);
      box(.06,.006,.006,x,y+height-.04,depth+side*.093,paper,table);
    }
  }
  return {bookSlots,bookPlaceholders};
}
