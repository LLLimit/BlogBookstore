import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {addShopDetails} from './shop-details.js';
import {createStreetLights} from './street-lights.js';
import {createWeather} from './weather.js';
import {createMerchandise} from './merchandise.js';
import {addLounge} from './lounge.js';
import {createGlassRain} from './glass-rain.js';

// A complete street corner, built locally without external models or textures.
export function createDistrict(scene) {
  const materials=new Map(), colliders=[], shelves=[], lamps=[], emissives=[];
  const glassRain=createGlassRain();
  const material=(color,extra={})=>{const key=color+JSON.stringify(Object.fromEntries(Object.entries(extra).map(([k,v])=>[k,v?.uuid||v])));if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.78,...extra}));return materials.get(key);};
  const ivory=material('#dedbd1'), concrete=material('#9ea6a5'), trim=material('#315554'), metal=material('#39434b',{metalness:.6,roughness:.38}), gold=material('#d7ae53',{metalness:.5,roughness:.4}), oak=material('#715035'), darkOak=material('#44362c');
  function box(w,h,d,x,y,z,m,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent&&Math.min(w,h,d)>.035;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function rainPane(w,h,d,x,y,z,m){const pane=box(w,h,d,x,y,z,m);glassRain.add(pane,w<d?d:w,h,w<d?'x':'z',Math.min(w,d));return pane;}
  function cylinder(r,h,x,y,z,m,parent=scene){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),m);mesh.position.set(x,y,z);mesh.castShadow=r>.035;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function bar(a,b,r,m,parent=scene){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);const mesh=cylinder(r,from.distanceTo(to),0,0,0,m,parent);mesh.position.copy(from.add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return mesh;}
  function texture(width,height,draw){const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  function plaque(text,w,h,x,y,z,color='#324a49',bg='#eee7d7',parent=scene){const tex=texture(1024,Math.max(64,Math.round(1024*h/w)),(ctx,cw,ch)=>{ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 '+Math.round(ch*.55)+'px "Microsoft YaHei",sans-serif';ctx.fillText(text,cw/2,ch/2,cw-65);});const m=material('#ffffff');const unique=m.clone();unique.map=tex;unique.emissive=new THREE.Color('#ffffff');unique.emissiveMap=tex;unique.emissiveIntensity=.12;unique.userData.lightKind='sign';emissives.push(unique);return box(w,h,.025,x,y,z,unique,parent);}
  function obstacle(x,z,w,d,level=0){colliders.push({x,z,w:w/2+.24,d:d/2+.24,level});}
  const glow=(color,kind='led')=>{const m=material(color,{emissive:color,emissiveIntensity:kind==='window'?.8:1.25,roughness:.3});m.userData.lightKind=kind;if(!emissives.includes(m))emissives.push(m);return m;};
  const warm=glow('#ffdfac'), shopLight=glow('#e9f0da'),windowLight=glow('#ffc98b','window');
  const streetLights=createStreetLights(scene,texture);
  function point(color,intensity,range,x,y,z){const p=new THREE.PointLight(color,intensity,range,2);p.position.set(x,y,z);scene.add(p);lamps.push({light:p,intensity});return p;}
  // Raised diorama platform, curb stones, drainage and actual road markings.
  box(29,.7,24,-.4,-.53,.6,material('#171c28'));
  box(28.8,.1,23.8,-.4,-.12,.6,material('#6b6c6d'));
  const asphaltTex=texture(512,512,(ctx,w,h)=>{ctx.fillStyle='#3d4653';ctx.fillRect(0,0,w,h);let seed=32;for(let i=0;i<18000;i++){seed=seed*16807%2147483647;ctx.fillStyle=seed%2?'#ffffff09':'#00000012';ctx.fillRect(seed%w,(seed>>>9)%h,1,1);}});
  asphaltTex.wrapS=asphaltTex.wrapT=THREE.RepeatWrapping;asphaltTex.repeat.set(12,10);
  box(28.6,.06,23.6,-.4,-.05,.6,material('#657182',{map:asphaltTex,roughness:.86}));
  box(20,.18,16,-4.6,.025,-3.25,concrete);
  const tileMats=['#c4c7bf','#bfc4bd','#b7beb8','#cbd0c7'].map(c=>material(c));
  for(let x=-14;x<5.6;x+=.8)for(let z=-11;z<4.75;z+=.8){const tile=box(.784,.025,.784,x+.4,.127,z+.4,tileMats[Math.abs(Math.round(x*13+z*7))%4]);tile.castShadow=false;}
  for(let x=-14;x<6;x+=.8)box(.79,.22,.22,x,.04,4.92,ivory);
  for(let z=-11;z<5;z+=.8)box(.22,.22,.79,5.9,.04,z,ivory);
  const roadPaint=material('#d9dee0',{roughness:.55});
  for(let x=-13;x<14;x+=3.5)box(1.65,.012,.095,x,.002,8.5,roadPaint);
  for(let z=-10;z<12;z+=3.5)box(.095,.012,1.65,10,.002,z,roadPaint);
  for(let x=6.7;x<12.9;x+=.76)box(.43,.012,3.7,x,.006,5.9,roadPaint);
  for(let z=6.3;z<10.6;z+=.7)box(3.5,.012,.4,3.4,.006,z,roadPaint);
  box(6.2,.012,.1,-6.8,.004,10.75,material('#d8b24a'));box(.1,.012,5.1,12.9,.004,-5.9,material('#d8b24a'));
  for(const [x,z] of [[-10,4.64],[3.8,4.64],[5.65,-4.5]]){box(.65,.015,.3,x,.16,z,metal);for(let j=0;j<8;j++)box(.022,.017,.25,x-.27+j*.077,.171,z,material('#141d25'));}
  const stop=plaque('止 ま れ',2,.5,10.8,.013,-2.2,'#dee3e7','#3d4653');stop.rotation.x=-Math.PI/2;stop.rotation.z=Math.PI/2;
  // Shop shell and illuminated striped fascia.
  box(12.4,4.15,.22,-.35,2.23,-4.35,ivory);box(.22,4.15,8.6,-6.65,2.23,-.15,ivory);
  obstacle(-6.65,-.15,.25,8.6);obstacle(-.35,-4.35,12.4,.3);
  const glass=new THREE.MeshPhysicalMaterial({color:'#d7ece6',transparent:true,opacity:.045,metalness:.02,roughness:.12,side:THREE.DoubleSide,depthWrite:false});
  // Door gap in the middle is walkable; front windows remain solid to players.
  for(const x of [-3.8,3.1]){
    box(4.5,.48,.12,x,.42,4.13,trim);rainPane(4.45,2.23,.035,x,1.77,4.15,glass);obstacle(x,4.15,4.45,.2);
    for(const xx of [x-2.22,x,x+2.22])box(.045,2.8,.065,xx,1.7,4.18,metal);
    box(4.5,.04,.06,x,2.85,4.18,metal);box(4.5,.04,.06,x,.66,4.18,metal);
  }
  for(const x of [-1.49,.88])box(.075,3,.12,x,1.7,4.14,metal);
  box(2.45,.12,.14,-.3,3.14,4.16,metal);
  for(let z=-3.6;z<3.8;z+=2.4){box(.12,.55,2.4,5.97,.43,z,trim);rainPane(.035,2.4,2.33,5.98,1.9,z,glass);for(const zz of [z-1.17,z+1.17])box(.09,3.25,.055,6,1.82,zz,metal);}
  obstacle(6,.1,.25,8.6);
  box(13,.75,.7,-.35,3.59,4.25,ivory);box(13,.075,.72,-.35,3.91,4.25,trim);box(13,.09,.73,-.35,3.25,4.25,material('#d6ae4c'));
  box(13,.045,.76,-.35,3.15,4.25,shopLight);
  const shopSign=new THREE.Mesh(new THREE.PlaneGeometry(12.94,.65),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}));shopSign.position.set(-.35,3.59,4.657);scene.add(shopSign);
  box(.75,.75,8.7,6.12,3.59,-.1,ivory);box(.79,.09,8.7,6.12,3.25,-.1,material('#d6ae4c'));box(.78,.07,8.7,6.12,3.91,-.1,trim);
  // Flat roof with parapet, one ventilation unit, ducts, and access hatch.
  const roof=new THREE.Group();scene.add(roof);
  box(13,.19,9.15,-.35,4.1,-.1,material('#a2aaa5'),roof);
  for(const z of [-4.61,4.4])box(13,.27,.12,-.35,4.3,z,ivory,roof);
  for(const x of [-6.77,6.07])box(.12,.27,9.1,x,4.3,-.1,ivory,roof);
  for(const [x,z] of [[-3.3,-1.9]]){
    box(1.25,.65,.88,x,4.52,z,material('#c1c7c5'),roof);box(1.29,.06,.93,x,4.88,z,ivory,roof);
    for(let i=0;i<9;i++)box(.88,.02,.034,x,4.32+i*.052,z+.446,metal,roof);
    cylinder(.12,.34,x-.26,5.04,z,metal,roof);
  }
  box(1.6,.06,1.35,2.2,4.23,2.2,metal,roof);box(1.37,.055,1.13,2.2,4.27,2.2,concrete,roof);
  bar([-3.3,4.27,-1.9],[-3.3,4.27,1.6],.08,concrete,roof);bar([-3.3,4.27,1.6],[-.3,4.27,1.6],.08,concrete,roof);
  roof.position.y=3.7;
  // Detailed shop interior remains a real playable space behind the glass.
  const grain=texture(256,1024,(ctx,w,h)=>{ctx.fillStyle='#977557';ctx.fillRect(0,0,w,h);let seed=12;for(let i=0;i<800;i++){seed=seed*16807%2147483647;ctx.strokeStyle='#3c251917';ctx.beginPath();ctx.moveTo(seed%w,0);ctx.bezierCurveTo(seed%w+5,300,seed%w-6,650,seed%w,h);ctx.stroke();}});
  const floor=material('#d0b794',{map:grain,roughness:.72});
  for(let x=-6.55;x<5.85;x+=.52)box(.51,.03,8.15,x+.25,.163,-.1,floor);
  for(let i=0;i<3;i++){
    const g=new THREE.Group();g.position.set(-4.55+i*3.35,0,-3.62);scene.add(g);shelves.push(g);
    box(3.1,2.75,.075,0,1.7,-.31,darkOak,g);
    for(const x of [-1.58,1.58])box(.10,2.95,.62,x,1.65,0,oak,g);
    for(const y of [.27,1.15,2.12,3.1])box(3.27,.075,.65,0,y,0,oak,g);
    for(const y of [1.12,2.09,3.06])box(3.05,.016,.03,0,y,.22,warm,g);
    obstacle(g.position.x,-3.6,3.25,.65);
    for(let n=0;n<18;n++){const colors=['#525e61','#b86d45','#777b57','#c2a67c','#4c6382'];const h=.36+(n%4)*.04;box(.12,h,.28,-1.39+n*.16,.32+h/2,.1,material(colors[n%5]),g);box(.06,.012,.01,-1.39+n*.16,.5,.25,gold,g);}
  }
  box(2.55,.095,1.3,-.5,1.08,.0,oak);for(const x of [-1.53,.53])for(const z of [-.48,.48])box(.1,.93,.1,x,.65,z,darkOak);obstacle(-.5,0,2.65,1.4);
  box(2.3,.035,1.1,-.5,.45,0,darkOak);
  const rug=box(3.8,.017,2.9,-.5,.197,.1,material('#767c67'));rug.castShadow=false;
  for(const [x,z] of [[-3.1,1.5],[2.6,1.5],[-3.1,-2.4],[2.6,-2.4]]){box(1.98,.06,.31,x,4.015,z,metal);box(1.9,.025,.24,x,3.98,z,shopLight);point('#ffe1b0',16,6,x,3.66,z);}
  // Recessed decorative spines keep the shop furnished even with a short RSS feed.
  for(const shelf of shelves)for(const y of [1.2,2.17])for(let n=0;n<22;n++){const h=.47+(n%5)*.031;box(.115,h,.19,-1.44+n*.133,y+h/2,-.15,material(['#486865','#ba8c66','#65718a','#8d6356','#b5a47f','#5a7255'][n%6]),shelf);box(.05,.015,.012,-1.44+n*.133,y+.14,-.048,gold,shelf);}
  for(const y of [3.6,3.86])box(12.15,.06,.05,-.35,y,-4.2,trim);
  for(const x of [-3.45,2.45]){box(.025,.38,3.1,x,3.76,-.13,oak);}
  plaque('READ SLOWLY. STAY A LITTLE.',3.5,.32,-.5,3.45,-4.17,'#ede1c8','#4a6159');
  // Shop-front book bins.
  for(const x of [-4.8,-3.6]){box(.98,.68,.5,x,.5,4.63,oak);for(let n=0;n<6;n++)box(.1,.35,.18,x-.38+n*.14,.93,4.62,material(['#9e7253','#667f79','#c7b48e'][n%3]));obstacle(x,4.63,1,.52);}
  // Outdoor plant pots, shrubs, bicycle rack, and letter box.
  function plant(x,z,scale=1){const g=new THREE.Group();g.position.set(x,.14,z);g.scale.setScalar(scale);scene.add(g);cylinder(.22,.46,0,.23,0,material('#9f7452'),g);cylinder(.19,.01,0,.47,0,darkOak,g);
    for(let n=0;n<9;n++){const a=n*2.4,h=.45+(n%4)*.17;bar([0,.47,0],[Math.sin(a)*.16,.45+h,Math.cos(a)*.16],.013,trim,g);const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),material(n%2?'#476d53':'#68845d'));leaf.scale.set(.13,.32,.045);leaf.position.set(Math.sin(a)*.2,.56+h,Math.cos(a)*.2);leaf.rotation.set(.4,a,Math.sin(a)*.55);g.add(leaf);}obstacle(x,z,.42*scale,.42*scale);}
  plant(-6,3.4,1.2);plant(5.3,3.4,1.2);
  box(.75,.12,.52,-8.4,.36,3.8,material('#b1b3aa'));box(.74,.52,.51,-8.4,.67,3.8,material('#294c42'));box(.5,.015,.02,-8.4,.8,4.07,metal);
  function bike(x,z,rotation=0){const g=new THREE.Group();g.position.set(x,.16,z);g.rotation.y=rotation;scene.add(g);const frame=material('#657d72',{metalness:.5,roughness:.4});
    for(const xx of [-.63,.63]){const tyre=new THREE.Mesh(new THREE.TorusGeometry(.42,.035,6,28),material('#20242a'));tyre.position.set(xx,.43,0);g.add(tyre);const rim=new THREE.Mesh(new THREE.TorusGeometry(.37,.012,5,24),concrete);rim.position.copy(tyre.position);g.add(rim);for(let i=0;i<8;i++){const a=i*Math.PI/4;bar([xx,.43,0],[xx+Math.sin(a)*.37,.43+Math.cos(a)*.37,0],.005,concrete,g);}}
    for(const [a,b] of [[[-.63,.43,0],[-.2,1,0]],[[-.2,1,0],[.14,.43,0]],[[.14,.43,0],[-.63,.43,0]],[[-.2,1,0],[.48,1.03,0]],[[.48,1.03,0],[.14,.43,0]],[[.48,1.03,0],[.63,.43,0]]])bar(a,b,.018,frame,g);
    box(.3,.045,.13,-.22,1.08,0,metal,g);bar([.48,1.03,0],[.5,1.22,0],.015,metal,g);bar([.5,1.22,-.17],[.5,1.22,.17],.014,metal,g);box(.35,.22,.3,.7,1.05,0,concrete,g);obstacle(x,z,1.7,.6);}
  bike(-10.4,2.2,.18);bike(-12.6,2.2,-.08);
  // A street-facing vending machine in the widened space left of the bookstore.
  const vending=new THREE.Group();vending.position.set(-8.12,.14,1.4);scene.add(vending);
  box(1.15,2.24,.8,0,1.12,0,material('#9b3d38'),vending);box(.82,1.35,.05,-.06,1.52,.43,shopLight,vending);
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){cylinder(.04,.17,-.4+col*.16,1.05+row*.37,.47,material(['#95b5af','#dfb456','#de7155','#657f9c','#e9e4d9'][col]),vending);box(.12,.028,.015,-.4+col*.16,.93+row*.37,.51,metal,vending);}
  box(.58,.18,.05,-.09,.4,.45,material('#202835'),vending);box(.16,.38,.04,.41,.68,.45,metal,vending);plaque('GOODNIGHT',.9,.16,0,2.12,.46,'#e7e8df','#9b3d38',vending);obstacle(vending.position.x,vending.position.z,1.19,.96);
  // Move every apartment detail together, leaving room for the vending alcove.
  const apartment=new THREE.Group();apartment.position.x=-1.4;scene.add(apartment);
  box(4.4,10.7,6,-10,5.48,-2.55,material('#8b8981'),apartment);obstacle(-10+apartment.position.x,-2.55,4.45,6.1);
  box(4.65,.17,6.25,-10,10.94,-2.55,concrete,apartment);
  for(let level=0;level<3;level++){
    const y=4.45+level*2.2;
    for(let n=0;n<3;n++){const x=-11.5+n*1.48;box(.92,1.33,.04,x,y,.477,metal,apartment);box(.76,1.19,.045,x,y,.504,(n+level)%3===0?windowLight:material('#344654'),apartment);box(.035,1.2,.05,x,y,.533,concrete,apartment);}
    box(4.45,.085,.59,-10,y-.77,.7,concrete,apartment);bar([-12.13,y-.27,.96],[-7.87,y-.27,.96],.026,metal,apartment);
    for(let x=-12.1;x<-7.8;x+=.31)bar([x,y-.74,.96],[x,y-.27,.96],.014,metal,apartment);
    box(.68,.36,.29,-7.69,y-.34,-.64,ivory,apartment);for(let n=0;n<5;n++)box(.015,.27,.26,-7.33,y-.34,-.76+n*.052,metal,apartment);
  }
  for(let level=0;level<4;level++)for(let n=0;n<3;n++)box(.034,1.13,.72,-7.78,2.2+level*2.2,-4.6+n*1.62,(n+level)%3===0?windowLight:material('#344654'),apartment);
  box(3.99,.18,.35,-10,3.36,.59,ivory,apartment);plaque('晚安街 · 旧书与咖啡',3.7,.32,-10,3.12,.642,'#d4d8cc','#344e4c',apartment);
  for(let n=0;n<20;n++)box(2.23,.092,.06,-10.77,.28+n*.119,.516,material(n%2?'#808980':'#727f7a'),apartment);
  box(.95,2.6,.05,-8.77,1.52,.513,metal,apartment);box(.78,2.34,.04,-8.77,1.52,.552,material('#344e4c'),apartment);plaque('喫 茶',.54,.32,-8.77,2.16,.58,'#c9bb92','#344e4c',apartment);
  // A normal horizontal sign on the cafe's left frontage, clear of the building gap.
  box(1.34,.50,.10,-11.13,2.66,.60,ivory,apartment);plaque('COFFEE',1.22,.38,-11.13,2.66,.665,'#e3d6b4','#30564f',apartment);
  cylinder(.7,1.25,-10.3,11.65,-2.8,material('#a0aaa8'),apartment);cylinder(.76,.06,-10.3,12.3,-2.8,metal,apartment);
  for(const x of [-10.8,-9.8])bar([x,10.97,-2.8],[x,11.25,-2.8],.045,metal,apartment);
  // A distant ground plane and mountain silhouettes anchor the surrounding street.
  const surroundings=box(160,.1,150,-.4,-.94,-24,material('#33474a'));surroundings.castShadow=false;
  for(const [x,z,r,height] of [[28,-48,29,23],[-31,-52,30,17],[4,-61,31,20]]){
    const hill=new THREE.Mesh(new THREE.ConeGeometry(r,height,7,1),material('#344e62',{flatShading:true}));hill.position.set(x,height/2-11,z);hill.rotation.y=x*.09;scene.add(hill);
  }
  // Dark skyline behind the side street gives the horizon depth without heavy assets.
  for(const [x,z,w,height,color] of [[17,-28,7,8,'#253b50'],[10,-32,5,5.7,'#2a4257'],[-4,-31,8,7,'#283b51'],[-18,-28,7,9,'#2b3b4e']]){
    box(w,height+.9,5,x,(height-.9)/2,z,material(color));box(w+.15,.13,5.2,x,height,z,material('#34495b'));
    for(let n=0;n<3;n++)box(.46,.67,.025,x-w*.3+n*w*.3,height*.68,z+2.52,material('#526879'));
  }
  // Street furniture: electric poles, sagging cables and traffic lights.
  for(const [x,z] of [[7.2,4.45],[7.2,-8.5],[-12,4.45]]){
    cylinder(.14,8.2,x,4.2,z,material('#5b786e'));box(1.15,.1,.09,x,7.45,z,metal);
    for(let i=0;i<5;i++){const band=cylinder(.147,.25,x,.32+i*.32,z,material(i%2?'#d6b543':'#232b32'));band.castShadow=false;}
    box(.34,.46,.18,x,4.8,z,concrete);bar([x,6.3,z],[x-.9,6.3,z],.065,metal);box(.45,.1,.22,x-.96,6.2,z,warm);streetLights.add(x-.96,6.12,z);
  }
  for(const zOffset of [-.15,.08,.27]){
    for(const [a,b] of [[[7.2,7.62,4.45+zOffset],[7.2,7.62,-8.5+zOffset]],[[-12,7.62,4.45+zOffset],[7.2,7.62,4.45+zOffset]]]){
      const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),mid=start.clone().lerp(end,.5);mid.y-=.7;const curve=new THREE.CatmullRomCurve3([start,mid,end]);const line=new THREE.Mesh(new THREE.TubeGeometry(curve,28,.018,4,false),metal);scene.add(line);
    }
  }
  bar([7.2,5.85,4.45],[9.3,5.85,4.45],.075,metal);box(1.18,.47,.28,9.3,5.65,4.45,material('#27343d'));
  for(let i=0;i<3;i++){const signal=new THREE.Mesh(new THREE.SphereGeometry(.135,14,10),i===2?glow('#71cdad'):material(i?'#8c7452':'#813d3b'));signal.position.set(8.93+i*.36,5.65,4.61);scene.add(signal);}
  // A small A-board by the open door.
  const board=plaque('新刊上架',.85,.8,1.55,.71,4.71,'#f6e4b6','#385953');board.rotation.x=-.16;bar([1.15,.16,4.9],[1.15,1.16,4.59],.025,oak);bar([1.95,.16,4.9],[1.95,1.16,4.59],.025,oak);obstacle(1.55,4.71,.9,.45);
  const helpers={box,rainPane,cylinder,bar,material,texture,obstacle,point,emissives,metal,trim,ivory,oak,sideGlass:glass};
  const market=createMerchandise(helpers);
  addShopDetails(scene,helpers);
  const lounge=addLounge(scene,helpers,market);
  // Merge static meshes by material; preserve glass, lamps and signage controls.
  scene.updateMatrixWorld(true);const batches=new Map(), originals=[];
  scene.traverse(o=>{if(o.isMesh&&o!==shopSign&&!o.material.transparent){const key=o.material.uuid+o.castShadow+o.receiveShadow;if(!batches.has(key))batches.set(key,{m:o.material,cast:o.castShadow,receive:o.receiveShadow,g:[]});const clone=o.geometry.clone().applyMatrix4(o.matrixWorld),normal=clone.index?clone.toNonIndexed():clone;if(normal!==clone)clone.dispose();batches.get(key).g.push(normal);originals.push(o);}});
  originals.forEach(o=>{o.removeFromParent();o.geometry.dispose();});
  for(const b of batches.values()){const geometry=mergeGeometries(b.g);b.g.forEach(g=>g.dispose());if(geometry){const mesh=new THREE.Mesh(geometry,b.m);mesh.castShadow=b.cast;mesh.receiveShadow=b.receive;scene.add(mesh);}}
  const wetShader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,uTime:{value:0}}};
  wetShader.vertexShader=wetShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vSurfaceUv;').replace('vUv = textureMatrix','vSurfaceUv = uv; vUv = textureMatrix');
  wetShader.fragmentShader=wetShader.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vSurfaceUv; uniform float uTime;').replace('vec4 base = texture2DProj( tDiffuse, vUv );','vec2 p=vSurfaceUv*vec2(25.,20.); float puddle=smoothstep(-.4,.65,sin(p.x*.83+sin(p.y*.9))*cos(p.y*.66)+sin(p.x*1.77+p.y*1.3)*.22); vec4 reflectedUv=vUv; reflectedUv.xy+=vec2(sin(p.y*34.+uTime*1.5),cos(p.x*29.+uTime))*reflectedUv.w*.0008; vec4 base = texture2DProj(tDiffuse,reflectedUv);').replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4(mix(vec3(.025,.032,.042),blendOverlay(base.rgb,color),.2+.8*puddle),1.0)');
  const mirror=new Reflector(new THREE.PlaneGeometry(28.6,23.6),{color:0x596c81,textureWidth:1024,textureHeight:1024,clipBias:.004,multisample:0,shader:wetShader});mirror.rotation.x=-Math.PI/2;mirror.position.set(-.4,-.013,.6);mirror.visible=false;scene.add(mirror);
  const wetTint=new THREE.Mesh(new THREE.PlaneGeometry(28.6,23.6),new THREE.MeshBasicMaterial({color:'#182230',transparent:true,opacity:.5,depthWrite:false}));wetTint.rotation.x=-Math.PI/2;wetTint.position.set(-.4,-.01,.6);wetTint.visible=false;scene.add(wetTint);
  const weatherEffects=createWeather(scene,texture);
  let currentWeather='clear';
  function setWeather(weather,quality){currentWeather=weather;weatherEffects.set(weather);glassRain.set(weather,quality);mirror.visible=(weather==='rain'||weather==='storm')&&!!quality;wetTint.visible=mirror.visible;}
  function setLighting(day,brightness=1,night=1-day){
    for(const {light,intensity} of lamps)light.intensity=intensity*(.72+night*.28)*brightness;
    for(const m of emissives){const kind=m.userData.lightKind;m.emissiveIntensity=(kind==='sign'?.06+night*.38:kind==='window'?.05+night*1.5:.55+night*1.65)*brightness;}
    streetLights.update(night,brightness,currentWeather);
  }
  function setTitle(title){
    shopSign.material.map?.dispose();
    const tex=texture(3072,154,(ctx,w,h)=>{
      const bg='#fff2d8';ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#d69f24';ctx.beginPath();ctx.arc(157,76,57,0,Math.PI*2);ctx.fill();ctx.fillStyle=bg;ctx.beginPath();ctx.arc(181,60,54,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#174c69';ctx.font='bold 113px "Microsoft YaHei",sans-serif';ctx.textBaseline='middle';ctx.fillText(title,303,79,2040);
      ctx.fillStyle='#447a77';ctx.font='bold 24px sans-serif';ctx.fillText('BOOKS · SNACKS · READING LOUNGE',1750,118);
      ctx.fillStyle='#b97025';ctx.textAlign='right';ctx.font='bold 92px sans-serif';ctx.fillText('24H',2915,81);
    });
    shopSign.material.map=tex;shopSign.material.needsUpdate=true;
  }
  function floorAt(x,z,foot){const s=lounge.stair;if(x>s.left&&x<s.right&&z>s.back-.1&&z<s.front+.03)return s.bottom+THREE.MathUtils.clamp((s.front-z)/(s.front-s.back),0,1)*(s.top-s.bottom);return foot>3.5?lounge.floorY:.17;}
  return {shelves,colliders,box,material,texture,setTitle,setWeather,setLighting,floorAt,...lounge,animate:t=>{mirror.material.uniforms.uTime.value=t;glassRain.animate(t);return weatherEffects.animate(t);},mirror};
}
