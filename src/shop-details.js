import * as THREE from 'three';

export function addShopDetails(scene,h){
  const {box,cylinder,bar,material,texture,obstacle,point,emissives,metal,trim,ivory,oak}=h;
  const ink=material('#23333d'),white=material('#ecefe9'),orange=material('#ce7945'),teal=material('#278779');
  const prints=new Map();
  function panel(w,height,x,y,z,draw,parent=scene,key){
    let m=key&&prints.get(key);if(!m){const tex=texture(512,Math.max(96,Math.round(512*height/w)),draw);m=new THREE.MeshStandardMaterial({map:tex,roughness:.62,alphaTest:.1,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:.12});m.userData.lightKind='sign';emissives.push(m);if(key)prints.set(key,m);}
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,height),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  const colors=['#ce6555','#449887','#e2b556','#658bac','#937799','#dd995d','#567752','#486a81'];
  function cover(w,height,x,y,z,index,parent=scene){
    box(w,height,.065,x,y,z,material(colors[index%8]),parent);
    panel(w,height,x,y,z+.034,(ctx,cw,ch)=>{
      ctx.fillStyle=colors[index%8];ctx.fillRect(0,0,cw,ch);ctx.strokeStyle='#fff8';ctx.lineWidth=4;ctx.strokeRect(25,25,cw-50,ch-50);
      ctx.fillStyle='#efe9d8';ctx.font='24px sans-serif';ctx.fillText('GOODNIGHT BOOKS',45,65);ctx.font='bold 47px "Microsoft YaHei"';
      const title=['在文字里','留一盏灯','生活碎片','明日来信','探索世界','深夜书架','山与远方','写下此刻'][index%8];ctx.fillText(title.slice(0,2),50,175);ctx.fillText(title.slice(2),50,240);
      ctx.beginPath();ctx.arc(cw*.52,ch*.57,85,0,Math.PI*2);ctx.fillStyle='#f6e8b42e';ctx.fill();ctx.strokeStyle='#eee4bd';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(120,480);ctx.lineTo(245,370);ctx.lineTo(375,475);ctx.stroke();
      ctx.fillStyle='#efe9d8';ctx.font='22px sans-serif';ctx.fillText('ESSAYS / STORIES',45,ch-100);ctx.fillText('VOL. '+String(index+1).padStart(2,'0'),45,ch-55);
    },parent,'cover-'+index%8);
  }
  // Layered window displays: stacked books, face-out books, labels and magazines.
  for(const {side,width,columns,stacks} of [{side:-3.75,width:3.48,columns:8,stacks:9},{side:2.4,width:2.7,columns:6,stacks:7}]){
    box(width,.1,.62,side,.91,3.63,oak);box(width,.055,.66,side,1.63,3.63,white);
    for(const x of [side-width/2+.09,side+width/2-.09])box(.055,1.53,.55,x,.93,3.63,white);
    for(let row=0;row<2;row++)for(let n=0;n<columns;n++){
      const x=side-(width-.6)/2+n*(width-.6)/(columns-1),y=1.17+row*.7;cover(.32,.48,x,y,3.81,n+row*8+(side>0?4:0));
      box(.34,.045,.12,x,y-.28,3.97,ivory);
    }
    for(let n=0;n<stacks;n++)for(let layer=0;layer<3;layer++)box(.29,.035,.4,side-(width-.55)/2+n*(width-.55)/(stacks-1),.4+layer*.04,3.62,material(colors[(n+layer)%8]));
    box(width+.02,.055,.13,side,.72,3.99,teal);obstacle(side,3.63,width+.06,.83);
  }
  // Tall posters and smaller stickers on the glass, with designed print layouts.
  for(const [x,y,text,color] of [[-5.35,1.99,'今夜读什么','#d65d43'],[-2.45,2.12,'新刊上架','#dca44b'],[4.55,2.04,'把故事带回家','#348c83']]){
    panel(.52,.91,x,y,4.205,(ctx,w,height)=>{
      ctx.fillStyle='#faf1db';ctx.fillRect(0,0,w,height);ctx.fillStyle=color;ctx.fillRect(0,0,w,155);ctx.fillStyle='#fff9e9';ctx.font='bold 60px "Microsoft YaHei"';ctx.textAlign='center';ctx.fillText(text.slice(0,4),w/2,105);
      ctx.fillStyle=color;ctx.fillRect(120,230,260,285);ctx.fillStyle='#f5d789';ctx.beginPath();ctx.arc(w/2,350,78,0,Math.PI*2);ctx.fill();ctx.fillStyle='#365450';ctx.font='bold 82px Georgia';ctx.fillText('BOOK',w/2,420);
      ctx.fillStyle='#3a5054';ctx.font='32px sans-serif';ctx.fillText('STORIES FOR EVERYONE',w/2,height-155);ctx.font='bold 48px sans-serif';ctx.fillText('24 HOURS',w/2,height-90);
    });
  }
  for(const x of [-5.6,4.98]){
    panel(.35,.35,x,1.04,4.212,(ctx,w,height)=>{ctx.clearRect(0,0,w,height);ctx.fillStyle='#459388';ctx.beginPath();ctx.arc(w/2,height/2,w*.47,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e4f0dd';ctx.font='55px sans-serif';ctx.textAlign='center';ctx.fillText('READ',w/2,height/2+18);});
  }
  // Sliding doors parked open, threshold, handles and non-slip entry mat.
  for(const x of [-1.8,1.19]){
    box(.42,2.6,.026,x,1.61,4.16,new THREE.MeshPhysicalMaterial({color:'#c5e4df',transparent:true,opacity:.055,roughness:.16,depthWrite:false}));
    box(.025,2.63,.06,x-.21,1.61,4.19,metal);box(.025,2.63,.06,x+.21,1.61,4.19,metal);
    box(.45,.025,.06,x,2.93,4.19,metal);box(.45,.025,.06,x,.3,4.19,metal);bar([x,1.15,4.235],[x,1.52,4.235],.018,white);
    box(.42,.10,.03,x,1.63,4.2,teal);
  }
  box(2.36,.025,.15,-.3,.19,4.18,metal);box(1.73,.018,.78,-.3,.192,4.61,material('#355d50'));
  for(let n=0;n<14;n++)box(.06,.003,.66,-1.06+n*.118,.203,4.61,material('#517266'));
  // Continuous multi-colour fascia and canopy. Lighting stays inside the shop.
  box(13.1,.085,.075,-.35,3.91,4.63,teal);box(13.1,.075,.077,-.35,3.21,4.63,orange);
  box(13.45,.11,.98,-.35,3.15,4.5,trim);box(13.45,.065,1.02,-.35,3.08,4.5,orange);
  // A joined sorting station: different openings, coloured headers, icons and removable doors.
  box(2.02,.07,.77,-8.18,.24,4.28,oak);box(2.02,.09,.77,-8.18,1.17,4.28,oak);
  const binKinds=[['可燃垃圾','BURNABLE','#b85645'],['瓶罐回收','BOTTLES / CANS','#3b758a'],['纸类回收','PAPER','#5c8054']];
  for(let i=0;i<3;i++){
    const x=-8.82+i*.64,[label,english,color]=binKinds[i];
    box(.60,.83,.64,x,.72,4.28,material('#e9e4d5'));box(.62,.24,.67,x,1.04,4.28,material(color));
    const hole=new THREE.Mesh(i===2?new THREE.PlaneGeometry(.29,.065):new THREE.CircleGeometry(.105,24),ink);hole.position.set(x,.864,4.608);if(i===0)hole.scale.x=1.27;scene.add(hole);
    if(i!==2){const rim=new THREE.Mesh(new THREE.TorusGeometry(.11,.014,8,24),material('#bdbdac',{metalness:.5,roughness:.4}));rim.position.set(x,.864,4.614);if(i===0)rim.scale.x=1.27;scene.add(rim);}
    panel(.58,.19,x,1.06,4.622,(ctx,w,height)=>{ctx.fillStyle=color;ctx.fillRect(0,0,w,height);ctx.fillStyle='#fff5e1';ctx.font='bold 63px "Microsoft YaHei"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,w/2,height/2,w*.93);});
    panel(.48,.30,x,.567,4.608,(ctx,w,height)=>{
      ctx.fillStyle='#f0ecd9';ctx.fillRect(0,0,w,height);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=12;
      if(i===0){ctx.beginPath();ctx.moveTo(230,42);ctx.bezierCurveTo(330,90,195,133,293,170);ctx.bezierCurveTo(423,159,373,233,256,242);ctx.bezierCurveTo(90,214,130,137,230,42);ctx.fill();}
      if(i===1){ctx.strokeRect(153,103,66,124);ctx.strokeRect(264,75,81,151);ctx.strokeRect(283,36,43,39);ctx.strokeRect(154,77,64,26);}
      if(i===2){ctx.strokeRect(141,56,220,168);for(let n=0;n<4;n++){ctx.beginPath();ctx.moveTo(172,90+n*32);ctx.lineTo(327,90+n*32);ctx.stroke();}}
      ctx.font='bold 32px sans-serif';ctx.textAlign='center';ctx.fillText(english,w/2,height-20,w*.95);
    });
    box(.08,.015,.02,x,.368,4.626,metal);box(.54,.012,.022,x,.285,4.615,metal);
    for(const xx of [x-.19,x+.19])cylinder(.028,.12,xx,.184,4.28,metal);
    obstacle(x,4.28,.62,.76);
  }
  // Right-hand guard rails, joint clamps, curb bollards and a side street sign.
  for(let z=-9.85;z<3.9;z+=1.16){cylinder(.035,1.08,7.4,.74,z,white);cylinder(.08,.1,7.4,.23,z,concrete());}
  for(const y of [.65,1.12])bar([7.4,y,-10],[7.4,y,3.95],.035,white);
  for(let z=-9.7;z<3.9;z+=.28)bar([7.4,.45,z],[7.4,1.1,z],.015,white);
  for(const x of [-11.25,5.36]){cylinder(.105,.79,x,.56,4.72,metal);cylinder(.11,.07,x,.81,4.72,orange);obstacle(x,4.72,.24,.24);}
  const street=panel(1.15,.27,7.42,2.5,-5.4,(ctx,w,height)=>{ctx.fillStyle='#347787';ctx.fillRect(0,0,w,height);ctx.fillStyle='#eef5e8';ctx.textAlign='center';ctx.font='65px "Microsoft YaHei"';ctx.fillText('晚安街 · 三丁目',w/2,height*.56);});street.rotation.y=Math.PI/2;
  bar([7.4,.14,-5.4],[7.4,2.75,-5.4],.022,white);
  // Road stop bars.
  box(4.5,.012,.17,2.6,.013,6.11,white);box(.17,.012,3.7,7.04,.013,2.6,white);
  // Front window transoms, awning supports, door bell and external utility hardware.
  for(const x of [-6.07,5.41]){box(.07,2.61,.07,x,1.68,4.23,white);bar([x,2.73,4.17],[x,3.11,4.91],.027,metal);}
  box(.11,.17,.055,.87,2.53,4.24,ink);box(.045,.045,.06,.87,2.53,4.27,teal);
  box(.39,.43,.16,-6.82,.91,2.21,metal);box(.015,1.2,.035,-6.96,1.61,2.21,ivory);bar([-6.95,2.21,2.21],[-6.95,3.6,2.21],.023,ivory);
  box(.12,3.51,.13,-6.91,1.88,-3.85,material('#849291'));box(.31,.11,.3,-6.9,.25,-3.85,metal);
  // A folding caution sign at the far-right storefront corner.
  const warning=panel(.48,.66,5.55,.55,4.61,(ctx,w,height)=>{ctx.fillStyle='#edd348';ctx.fillRect(0,0,w,height);ctx.fillStyle='#273539';ctx.beginPath();ctx.moveTo(w/2,90);ctx.lineTo(w-55,370);ctx.lineTo(55,370);ctx.closePath();ctx.fill();ctx.fillStyle='#efd94c';ctx.font='bold 195px sans-serif';ctx.textAlign='center';ctx.fillText('!',w/2,322);ctx.fillStyle='#293536';ctx.font='bold 62px "Microsoft YaHei"';ctx.fillText('小心防滑',w/2,503);ctx.font='40px sans-serif';ctx.fillText('CAUTION',w/2,591);ctx.fillText('WET FLOOR',w/2,663);});warning.rotation.x=-.14;
  for(const x of [5.28,5.82]){bar([x,.16,4.74],[x,.94,4.56],.024,material('#d3b938'));bar([x,.94,4.56],[x,.16,4.25],.024,material('#d3b938'));}obstacle(5.55,4.61,.54,.48);
  function concrete(){return material('#8b999d');}
}
