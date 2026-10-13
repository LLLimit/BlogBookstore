// Painter order for an opaque two-sided sheet. Projected paper can overlap
// itself after crossing the spine; array order is not its visibility order.
export function paperFaces(points,columns,rows,pageWidth,pageHeight){
 const faces=[];
 for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
  const i=row*(columns+1)+col,a=points[i],b=points[i+1],c=points[i+columns+1],d=points[i+columns+2];
  for(const [vertices,coords]of [
   [[a,b,c],[[col,row],[col+1,row],[col,row+1]]],
   [[b,d,c],[[col+1,row],[col+1,row+1],[col,row+1]]]
  ]){
   const [p,q,r]=vertices,area=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);if(Math.abs(area)<.0001)continue;
   const reverse=area<0,uv=coords.map(([u,v])=>({x:(reverse?1-u/columns:u/columns)*pageWidth,y:v/rows*pageHeight}));
   faces.push({points:vertices,uv,reverse,depth:vertices.reduce((n,p)=>n+p.depth,0)/3});
  }
 }
 return faces.sort((a,b)=>a.depth-b.depth);
}
