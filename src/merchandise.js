import * as THREE from 'three';
import {products} from './products.js';

export function createMerchandise(h){
  const {box,cylinder,material,texture}=h;
  const atlas=texture(2048,2048,(ctx)=>{
    products.forEach((p,i)=>{
      const x=i%4*512,y=Math.floor(i/4)*512;ctx.save();ctx.translate(x,y);
      ctx.fillStyle=p.color;ctx.fillRect(0,0,512,512);ctx.fillStyle=p.accent;ctx.fillRect(0,0,512,96);ctx.fillRect(0,426,512,86);
      ctx.fillStyle='#fff5df';ctx.textAlign='center';ctx.font='bold 29px sans-serif';ctx.fillText('LLLIMIT · DAILY MARKET',256,57);
      ctx.fillStyle='#fff4d3';ctx.beginPath();ctx.arc(256,250,116,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.accent;ctx.lineWidth=7;ctx.stroke();
      ctx.fillStyle=p.accent;ctx.font='bold 126px "Microsoft YaHei"';ctx.fillText(p.icon,256,292);
      ctx.fillStyle='#263b3f';ctx.font='bold 55px "Microsoft YaHei"';ctx.fillText(p.name,256,387);
      ctx.fillStyle='#fff4df';ctx.font='27px sans-serif';ctx.fillText(p.detail,256,465);
      ctx.fillStyle='#fff8';ctx.fillRect(19,113,73,135);ctx.fillStyle=p.accent;for(let n=0;n<14;n++)ctx.fillRect(25+n*4,120,2+(n%2),103);
      ctx.strokeStyle='#fff9';ctx.lineWidth=3;ctx.strokeRect(12,12,488,488);ctx.restore();
    });
  });
  const labelMaterial=new THREE.MeshStandardMaterial({map:atlas,roughness:.58});
  const prices=texture(1024,384,(ctx)=>{products.forEach((p,i)=>{const x=i%4*256,y=Math.floor(i/4)*128;ctx.fillStyle='#f5efdc';ctx.fillRect(x,y,256,128);ctx.fillStyle='#37584c';ctx.font='bold 30px "Microsoft YaHei"';ctx.fillText(p.name,x+12,y+41);ctx.font='bold 55px sans-serif';ctx.fillText(String(p.price),x+12,y+104);ctx.font='24px "Microsoft YaHei"';ctx.fillText('漫游币',x+77,y+99);});});
  const priceMaterial=new THREE.MeshBasicMaterial({map:prices});
  function price(index,x,y,z,parent){const geo=new THREE.PlaneGeometry(.18,.066),uv=geo.attributes.uv;for(let n=0;n<uv.count;n++)uv.setXY(n,(index%4+uv.getX(n))/4,1-(Math.floor(index/4)+1-uv.getY(n))/3);const mesh=new THREE.Mesh(geo,priceMaterial);mesh.position.set(x,y,z);parent.add(mesh);}
  function label(w,height,x,y,z,index,parent){
    const geometry=new THREE.PlaneGeometry(w,height),uv=geometry.attributes.uv;
    const col=index%4,row=Math.floor(index/4);
    for(let n=0;n<uv.count;n++)uv.setXY(n,(col+.012+uv.getX(n)*.976)/4,1-(row+.012+(1-uv.getY(n))*.976)/4);
    const mesh=new THREE.Mesh(geometry,labelMaterial);mesh.position.set(x,y,z);parent.add(mesh);
  }
  const cap=material('#eef0e6',{roughness:.48}),silver=material('#bec8c8',{metalness:.78,roughness:.27});
  function add(index,x,y,z,scale=1,parent){
    index%=products.length;const p=products[index],group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(scale);parent.add(group);
    const m=material(p.color,{roughness:.53});
    if(p.type==='bottle'){
      cylinder(.075,.27,0,.15,0,m,group);const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.034,.075,.065,12),m);shoulder.position.y=.318;group.add(shoulder);
      cylinder(.029,.052,0,.373,0,m,group);cylinder(.034,.034,0,.403,0,cap,group);label(.122,.186,0,.163,.077,index,group);
      for(const yy of [.056,.083,.277])cylinder(.076,.007,0,yy,0,material(p.accent),group);
    }else if(p.type==='can'){
      cylinder(.079,.262,0,.135,0,m,group);cylinder(.081,.012,0,.272,0,silver,group);cylinder(.079,.008,0,.003,0,silver,group);
      box(.026,.007,.055,.006,.282,0,silver,group);label(.125,.222,0,.136,.081,index,group);
    }else if(p.type==='carton'){
      box(.15,.28,.14,0,.14,0,m,group);const top=new THREE.Mesh(new THREE.CylinderGeometry(.001,.103,.075,4),cap);top.rotation.y=Math.PI/4;top.position.y=.316;group.add(top);
      box(.1,.012,.02,0,.357,0,m,group);label(.15,.25,0,.146,.072,index,group);
    }else{
      const w=p.type==='bag'?.19:.17,height=p.type==='bag'?.28:.25;
      const body=box(w,height,.068,0,height/2,0,m,group);if(p.type==='bag'){body.rotation.z=.024*(index%3-1);box(w+.01,.019,.077,0,height,0,material(p.accent),group);box(w+.01,.012,.077,0,.012,0,material(p.accent),group);}
      label(w,height*.9,0,height/2,.037,index,group);
    }
    return group;
  }
  function shelf(x,baseY,z,w=2.8,rows=4,parent){
    const white=material('#dbded1'),edge=material('#427665');
    box(w+.08,1.94,.06,x,baseY+.97,z-.18,white,parent);
    for(const xx of [x-w/2,x+w/2])box(.055,2.03,.49,xx,baseY+1,z,white,parent);
    for(let row=0;row<rows;row++){
      const y=baseY+.08+row*.47;box(w,.046,.51,x,y,z,white,parent);box(w,.075,.033,x,y-.014,z+.26,edge,parent);
      const columns=Math.floor(w/.225);
      for(let n=0;n<columns;n++){const index=(row*3+n)%products.length,xx=x-w/2+.14+n*.225;add(index,xx,y+.03,z+.1,.9,parent);if(n%3!==0)add(index,xx,y+.03,z-.09,.9,parent);price(index,xx,y-.014,z+.279,parent);}
    }
  }
  return {add,shelf,atlas,products};
}
