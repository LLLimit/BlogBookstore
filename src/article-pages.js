import {safeUrl} from './articles.js';
import {PAGE_W,PAGE_H} from './album-paint.js';

export function articleBlocks(root,base){
 const blocks=[];const text=(value,type='body')=>{if(value.trim())blocks.push({type,text:type==='code'?value.replace(/\r/g,'').replace(/\t/g,'    '):value.replace(/\s+/g,' ').trim()});};
 function picture(node){const url=safeUrl(node.getAttribute('src')||node.getAttribute('data-src'),base);if(url)blocks.push({type:'image',url,alt:node.getAttribute('alt')||''});}
 function walk(node){
  if(node.nodeType===3){text(node.textContent);return;}if(node.nodeType!==1)return;const tag=node.tagName;
  if(tag==='IMG'){picture(node);return;}
  if(tag==='PRE'){text(node.textContent,'code');return;}
  if(tag==='TABLE'){for(const row of node.querySelectorAll('tr'))text([...row.children].map(c=>c.textContent.trim()).join(' | '),'code');return;}
  if(/^(P|H[1-6]|BLOCKQUOTE|LI|FIGCAPTION)$/.test(tag)){const prefix=tag==='LI'?'• ':'';text(prefix+node.textContent,tag==='BLOCKQUOTE'?'quote':/^H/.test(tag)?'heading':'body');for(const img of node.querySelectorAll('img'))picture(img);return;}
  for(const child of node.childNodes)walk(child);
 }
 for(const child of root.childNodes)walk(child);return blocks;
}
function wrap(ctx,text,width){const rows=[];for(const paragraph of text.split('\n')){let line='';for(const char of paragraph){if(line&&ctx.measureText(line+char).width>width){const space=line.lastIndexOf(' ');if(space>0){rows.push(line.slice(0,space));line=line.slice(space+1);}else{rows.push(line);line='';}}line+=char;}rows.push(line);}return rows;}
export function paginateArticle(blocks,size,ctx){
 const pages=[];let items=[],y=125;const maxY=1300;
 const flush=()=>{if(items.length){pages.push({kind:'article',items});items=[];y=125;}};
 for(const block of blocks){
  if(block.type==='image'){const height=690;if(y+height>maxY)flush();items.push({...block,y,height});y+=height+55;continue;}
  const fontSize=block.type==='heading'?Math.round(size*1.35):block.type==='code'?Math.round(size*.84):size,lineHeight=Math.ceil(fontSize*1.55),indent=block.type==='quote'?32:0,font=(block.type==='code'?'':'heading'===block.type?'bold ':block.type==='quote'?'italic ':'')+fontSize+'px '+(block.type==='code'?'monospace':'Georgia,"Microsoft YaHei",serif');
  ctx.font=font;const wrapped=wrap(ctx,block.text,818-indent);for(const line of wrapped){if(y+lineHeight>maxY)flush();items.push({type:'text',text:line,font,y,indent,kind:block.type});y+=lineHeight;}y+=Math.round(size*.75);
 }
 flush();if(!pages.length)pages.push({kind:'article',items:[]});if(pages.length%2)pages.push({kind:'article-end',items:[]});return pages;
}
export function paintArticlePage(book,index,loader,cover=false){
 const canvas=document.createElement('canvas');canvas.width=PAGE_W;canvas.height=PAGE_H;const ctx=canvas.getContext('2d');
 ctx.fillStyle=cover?book.color:'#fff';ctx.fillRect(0,0,PAGE_W,PAGE_H);
 if(cover){ctx.fillStyle='white';ctx.font='70px Georgia,"Microsoft YaHei",serif';const title=wrap(ctx,book.title,800).slice(0,10);const start=(PAGE_H-title.length*105)/2;title.forEach((line,i)=>ctx.fillText(line,104,start+i*105));return canvas;}
 const page=book.pages[index];if(!page)return canvas;
 for(const item of page.items||[]){
  if(item.type==='image'){const img=loader.peek(item.url);if(img){const scale=Math.min(818/img.naturalWidth,item.height/img.naturalHeight);ctx.drawImage(img,95+(818-img.naturalWidth*scale)/2,item.y,img.naturalWidth*scale,img.naturalHeight*scale);}else{ctx.fillStyle='#edf2f5';ctx.fillRect(95,item.y,818,item.height);}continue;}
  ctx.fillStyle=item.kind==='quote'?'#567084':'#263741';ctx.font=item.font;ctx.textBaseline='top';ctx.fillText(item.text,95+item.indent,item.y);
 }
 ctx.textBaseline='alphabetic';ctx.font='23px Georgia';ctx.fillStyle='#98a8b2';ctx.textAlign=index%2?'right':'left';ctx.fillText(String(index+1),index%2?913:95,1380);
 if(page.kind==='article-end'){ctx.textAlign='center';ctx.font='29px Georgia';ctx.fillStyle='#718897';ctx.fillText('END',PAGE_W/2,PAGE_H/2);}return canvas;
}
