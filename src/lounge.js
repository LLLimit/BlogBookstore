import * as THREE from 'three';
import {animeGlass} from './anime-material.js';
import {addPottedPlant} from './plants.js';

export function addLounge(scene,h,market){
  const {box,rainPane,cylinder,bar,material,texture,obstacle,point,emissives,metal,trim,ivory,oak,sideGlass}=h;
  const floorY=4.24,cream=material('#e8dfc9'),wood=material('#b4936c'),ink=material('#294747');
  const stair={x:4.86,left:4.16,right:5.57,front:2.35,back:-3.15,bottom:.17,top:floorY};
  const floorMap=texture(1024,1024,(ctx,w,height)=>{ctx.fillStyle='#c09b73';ctx.fillRect(0,0,w,height);for(let n=0;n<16;n++){const y=n*64;ctx.fillStyle=n%3===0?'#b28b64':n%3===1?'#c09b73':'#c6a27b';ctx.fillRect(0,y,w,64);ctx.strokeStyle='#795c3b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.moveTo((n%3)*330+110,y);ctx.lineTo((n%3)*330+110,y+64);ctx.stroke();for(let k=0;k<7;k++){ctx.strokeStyle='#795c3b15';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y+8+k*7);ctx.bezierCurveTo(350,y+3+k*7,700,y+13+k*7,w,y+8+k*7);ctx.stroke();}}});
  const flooring=material('#fff4df',{map:floorMap,roughness:.8});
  const readingTables=[],interactionTargets=[];
  function sign(text,w,height,x,y,z,bg='#284e4d',fg='#ffe7ad'){
    const tex=texture(1024,Math.max(96,Math.round(1024*height/w)),(ctx,cw,ch)=>{ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${Math.round(ch*.53)}px "Microsoft YaHei"`;ctx.fillText(text,cw/2,ch/2,cw*.92);});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,height),new THREE.MeshBasicMaterial({map:tex}));mesh.position.set(x,y,z);scene.add(mesh);return mesh;
  }
  // One continuous slab with a real stairwell cutout: no overlapping landing surfaces.
  const outline=new THREE.Shape();outline.moveTo(-6.8,-4.05);outline.lineTo(6.1,-4.05);outline.lineTo(6.1,4.35);outline.lineTo(-6.8,4.35);outline.closePath();
  const opening=new THREE.Path();opening.moveTo(stair.left,-stair.front);opening.lineTo(stair.left,-stair.back);opening.lineTo(stair.right,-stair.back);opening.lineTo(stair.right,-stair.front);opening.closePath();outline.holes.push(opening);
  const slabGeometry=new THREE.ExtrudeGeometry(outline,{depth:.15,bevelEnabled:false,steps:1});slabGeometry.rotateX(-Math.PI/2);
  const slabUV=slabGeometry.attributes.uv,slabPosition=slabGeometry.attributes.position;
  for(let n=0;n<slabUV.count;n++)slabUV.setXY(n,(slabPosition.getX(n)+6.8)/12.9,(slabPosition.getZ(n)+4.35)/8.4);
  const slab=new THREE.Mesh(slabGeometry,flooring);slab.position.y=floorY-.15;slab.receiveShadow=true;slab.castShadow=true;scene.add(slab);
  box(.17,3.52,8.55,-6.65,5.92,-.15,cream);
  for(const x of [-6.65,6])obstacle(x,-.15,.19,8.55,1);
  // Match the lower floor's right-side glazing, green sill and metal mullions.
  for(let n=0;n<4;n++){
    const z=-3.3+n*2.1;
    box(.12,.55,2.1,5.97,floorY+.26,z,trim);rainPane(.035,2.4,2.03,5.98,floorY+1.73,z,sideGlass);
  }
  for(let n=0;n<=4;n++)box(.09,3.25,.055,6,floorY+1.65,-4.35+n*2.1,metal);
  box(.17,.53,8.55,6,7.435,-.15,cream);
  box(12.5,3.52,.16,-.35,5.92,-4.35,cream);obstacle(-.35,-4.35,12.5,.18,1);
  const glass=animeGlass('#b8d8d5',{opacity:.04});
  box(12.8,.57,.18,-.35,4.53,4.17,trim);box(12.8,.48,.18,-.35,7.46,4.17,cream);
  for(let x=-5.93;x<6;x+=2.32){rainPane(2.25,2.4,.03,x,5.96,4.17,glass);box(.055,2.44,.08,x+1.12,5.96,4.18,metal);box(2.3,.055,.09,x,4.75,4.19,metal);}
  obstacle(-.35,4.17,12.8,.18,1);
  for(const x of [-6.52,5.87])for(const z of [-4.13,4.01])box(.19,3.45,.19,x,5.94,z,wood);
  // Twenty-four real treads. Walking height follows the same stair footprint.
  for(let n=0;n<24;n++){
    const depth=(stair.front-stair.back)/24,y=stair.bottom+(n+1)*(floorY-stair.bottom)/24,z=stair.front-(n+.5)*depth;
    box(1.34,.12,depth,stair.x,y-.06,z,wood);box(1.34,.022,.034,stair.x,y+.003,z+depth/2-.017,material('#e0c791'));
  }
  const railXs=[stair.left-.09,stair.right+.10];
  // Stop the inclined handrails just below the slab; the rest used to pierce upstairs.
  const railStartY=stair.bottom+.98,railEndY=floorY-.15-.03;
  const railEndFraction=(railEndY-railStartY)/(stair.top+.99-railStartY);
  const railEndZ=THREE.MathUtils.lerp(stair.front,stair.back,railEndFraction);
  for(const x of railXs){
    bar([x,railStartY,stair.front],[x,railEndY,railEndZ],.025,metal);
    for(let n=0;n/8<=railEndFraction;n++){const f=n/8,z=stair.front-f*(stair.front-stair.back),y=stair.bottom+f*(floorY-stair.bottom);bar([x,y,z],[x,y+.98,z],.017,metal);}
    // Rails prevent sideways entry at the middle of the stairs on either floor.
    obstacle(x,(stair.front+stair.back)/2,.04,stair.front-stair.back,0);obstacle(x,(stair.front+stair.back)/2,.04,stair.front-stair.back,1);
  }
  // Guard the stairwell on both long edges and the low end. Keep the upper landing open.
  const guardY=floorY+1.04,guardFront=stair.front+.08;
  function guard(a,b,endPosts=true){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),sections=Math.ceil(length/.85),infill=Math.ceil(length/.18);
    bar([a[0],guardY,a[1]],[b[0],guardY,b[1]],.027,metal);
    bar([a[0],floorY+.16,a[1]],[b[0],floorY+.16,b[1]],.014,metal);
    for(let n=endPosts?0:1;n<=sections-(endPosts?0:1);n++){
      const f=n/sections,x=THREE.MathUtils.lerp(a[0],b[0],f),z=THREE.MathUtils.lerp(a[1],b[1],f);
      bar([x,floorY+.02,z],[x,guardY,z],.022,metal);box(.085,.02,.085,x,floorY+.01,z,metal);
    }
    for(let n=1;n<infill;n++){
      const f=n/infill,x=THREE.MathUtils.lerp(a[0],b[0],f),z=THREE.MathUtils.lerp(a[1],b[1],f);
      if(Math.abs(f*sections-Math.round(f*sections))*length/sections>.05)bar([x,floorY+.16,z],[x,guardY,z],.011,metal);
    }
  }
  for(const x of railXs)guard([x,stair.back],[x,guardFront]);
  guard([railXs[0],guardFront],[railXs[1],guardFront],false);
  obstacle((railXs[0]+railXs[1])/2,guardFront,railXs[1]-railXs[0],.04,1);
  // Warm pendant lights and a woven ceiling grid.
  for(const x of [-4.25,-.7,2.4])for(const z of [-2.35,1.65]){
    cylinder(.025,.53,x,7.18,z,metal);const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.18,20,1,true),material('#bb9862'));shade.position.set(x,6.87,z);scene.add(shade);
    const lampMat=material('#ffe2a3',{emissive:'#ffe2a3',emissiveIntensity:1.6});lampMat.userData.lightKind='led';if(!emissives.includes(lampMat))emissives.push(lampMat);
    cylinder(.19,.02,x,6.78,z,lampMat);point('#ffdeb1',14,5,x,6.72,z);
  }
  for(let x=-6.3;x<6;x+=1.2)box(.035,.06,8.1,x,7.61,-.15,wood);
  // Keep the reading tables clear, with only lamps and cups.
  for(const [x,z] of [[-.65,-.47],[2.15,-.47],[-.65,2.20],[2.15,2.20]]){
    const g=new THREE.Group();g.position.set(x,floorY,z);scene.add(g);readingTables.push(g);
    box(1.76,.095,1.02,0,.81,0,oak,g);for(const xx of [-.74,.74])for(const zz of [-.36,.36])box(.075,.78,.075,xx,.39,zz,wood,g);
    obstacle(x,z,1.86,1.12,1);
    for(const [xx,zz,rot] of [[0,-.73,0],[0,.73,Math.PI]]){
      const chair=new THREE.Group();chair.position.set(xx,0,zz);chair.rotation.y=rot;g.add(chair);
      box(.49,.08,.45,0,.48,0,material('#68827b'),chair);box(.49,.53,.065,0,.82,-.23,material('#68827b'),chair);
      for(const legX of [-.2,.2])for(const legZ of [-.17,.17])box(.045,.44,.045,legX,.22,legZ,wood,chair);
      obstacle(x+xx,z+zz,.50,.50,1);
    }
    cylinder(.075,.035,.61,.883,.24,metal,g);bar([x+.61,floorY+.88,z+.24],[x+.61,floorY+1.24,z+.24],.014,metal);
    cylinder(.1,.075,.61,1.27,.24,material('#d6ba80'),g);box(.16,.04,.14,-.62,.888,.2,cream,g);
    cylinder(.047,.10,-.63,.934,.21,material('#eee5cf'),g);
  }
  // Matching sofas face one another symmetrically across the coffee table.
  for(const [z,direction] of [[2.8,1],[2*1.73-2.8,-1]]){
    box(2.3,.43,.7,-4.61,floorY+.36,z,material('#af765c'));box(2.3,.65,.16,-4.61,floorY+.74,z+direction*.32,material('#af765c'));obstacle(-4.61,z,2.4,.84,1);
    for(const x of [-5.64,-3.58])box(.18,.5,.76,x,floorY+.48,z,wood);
    for(const x of [-5.03,-4.19])box(.63,.27,.10,x,floorY+.83,z+direction*.21,material('#e1caaa'));
  }
  box(1.6,.09,.65,-4.61,floorY+.54,1.73,wood);obstacle(-4.61,1.73,1.7,.7,1);
  for(const x of [-5.24,-3.99])box(.065,.53,.065,x,floorY+.265,1.73,wood);
  for(const [x,z] of [[-5.93,3.55],[5.23,3.55]]){
    addPottedPlant(scene,{cylinder,bar,material},x,floorY,z,.92);obstacle(x,z,.4,.4,1);
  }
  // A fully stocked snack wall, cold drinks fridge and checkout counter.
  market.shelf(-4.3,floorY+.13,-3.68,3.9,4,scene);obstacle(-4.3,-3.68,4,.65,1);
  market.shelf(1.55,floorY+.13,-3.63,2.1,4,scene);obstacle(1.55,-3.63,2.2,.65,1);
  sign('零 食 · 饮 料',3.88,.27,-4.3,6.54,-3.38);
  const fridgeWhite=material('#e5e8dd');box(1.45,2.17,.62,-1.42,floorY+1.1,-3.69,fridgeWhite);box(1.31,1.8,.12,-1.42,floorY+1.17,-3.34,material('#354e54'));
  for(let row=0;row<4;row++)for(let n=0;n<6;n++)market.add((row+n)%6,-1.95+n*.204,floorY+.31+row*.43,-3.20,.9,scene);
  for(let row=0;row<4;row++)box(1.29,.035,.37,-1.42,floorY+.27+row*.43,-3.19,fridgeWhite);
  box(1.25,1.85,.018,-1.42,floorY+1.16,-3.08,glass);box(.035,1.84,.06,-1.42,floorY+1.16,-3.04,metal);bar([-1.27,floorY+.74,-3.015],[-1.27,floorY+1.33,-3.015],.016,ivory);obstacle(-1.42,-3.69,1.55,.82,1);
  sign('COLD DRINKS',1.24,.22,-1.42,6.35,-3.03,'#dbe7df','#24534f');
  box(3.22,.96,.65,-3.99,floorY+.53,-1.84,trim);box(3.45,.085,.83,-3.99,floorY+1.05,-1.84,wood);obstacle(-3.99,-1.84,3.53,.93,1);
  for(let n=0;n<9;n++)market.add(6+n%6,-5.1+n*.23,floorY+1.1,-1.77,.9,scene);
  box(.31,.04,.22,-2.76,floorY+1.12,-1.74,metal);const till=box(.29,.21,.037,-2.76,floorY+1.25,-1.74,ink);till.rotation.x=-.22;
  // Stylised shopkeeper: apron, hair, face, arms, hands and shoes.
  const skin=material('#e2b293'),hair=material('#453329'),apron=material('#697a56');
  cylinder(.18,.64,-3.91,floorY+.77,-2.58,apron);box(.36,.12,.24,-3.91,floorY+1.07,-2.58,material('#e8d9bc'));
  const head=new THREE.Mesh(new THREE.SphereGeometry(.215,20,14),skin);head.position.set(-3.91,floorY+1.39,-2.58);head.scale.set(1,1.09,.96);scene.add(head);
  const coiffure=new THREE.Mesh(new THREE.SphereGeometry(.227,18,12,0,Math.PI*2,0,Math.PI*.55),hair);coiffure.position.copy(head.position);coiffure.position.y+=.04;scene.add(coiffure);
  for(const x of [-3.986,-3.834]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.022,10,8),ink);eye.position.set(x,floorY+1.405,-2.381);scene.add(eye);}
  box(.072,.018,.01,-3.91,floorY+1.325,-2.371,material('#b56a63'));
  for(const x of [-4.19,-3.63]){bar([x,floorY+1,-2.58],[x,floorY+.82,-2.40],.065,skin);cylinder(.055,.085,x,floorY+.82,-2.40,skin);box(.13,.10,.25,x,floorY+.1,-2.56,ink);}
  box(.105,.075,.018,-3.91,floorY+.97,-2.397,cream);
  const npcTarget=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));npcTarget.position.set(-3.91,floorY+1.3,-2.48);npcTarget.userData.interaction={kind:'shop',title:'掌柜 · 零食与饮料'};scene.add(npcTarget);interactionTargets.push(npcTarget);
  return {stair,floorY,readingTables,interactionTargets};
}
