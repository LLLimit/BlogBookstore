import DOMPurify from 'dompurify';

export function safeUrl(value, base) {
  if(typeof value!=='string'||!value.trim())return '';
  try { const url = new URL(value, base); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function cleanContent(html, base) {
  const fragment = DOMPurify.sanitize(html || '', {RETURN_DOM_FRAGMENT: true, FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'video', 'audio'], FORBID_ATTR: ['style', 'srcset'], ALLOW_DATA_ATTR: false});
  fragment.querySelectorAll('a').forEach(a => {const url = safeUrl(a.getAttribute('href'), base);if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}else a.removeAttribute('href');});
  fragment.querySelectorAll('img').forEach(img => {const url=safeUrl(img.getAttribute('src'),base);if(url){img.src=url;img.loading='lazy';img.referrerPolicy='no-referrer';}else img.remove();});
  return fragment;
}
export function parseFeed(xml, base) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const root=doc.documentElement;
  if(doc.querySelector('parsererror') || !['rss','feed','rdf'].includes(root?.localName.toLowerCase())) throw new Error('RSS / Atom 格式无效');
  const child=(el,name)=>[...el.children].find(n=>n.localName.toLowerCase()===name);
  const text=(el,name)=>child(el,name)?.textContent?.trim()||'';
  const channel=child(root,'channel')||root;
  const nodeBase=(el,fallback)=>{const ancestors=[];for(let n=el;n?.nodeType===1;n=n.parentElement)ancestors.unshift(n);return ancestors.reduce((url,n)=>safeUrl(n.getAttributeNS('http://www.w3.org/XML/1998/namespace','base'),url)||url,fallback);};
  const link=(el,fallback)=>{const links=[...el.children].filter(n=>n.localName==='link');const n=links.find(n=>n.getAttribute('rel')==='alternate')||links.find(n=>!n.getAttribute('rel'));return n?safeUrl(n.getAttribute('href')||n.textContent.trim(),nodeBase(n,fallback)):'';};
  const author=el=>text(el,'creator')||text(child(el,'author')||el,'name')||text(el,'author');
  const content=el=>{
    const n=child(el,'encoded')||child(el,'content')||child(el,'description')||child(el,'summary');
    if(!n)return '';
    if(n.getAttribute('type')==='xhtml')return [...n.childNodes].map(v=>new XMLSerializer().serializeToString(v)).join('');
    if(n.getAttribute('type')==='text'){const wrapper=document.createElement('div');wrapper.textContent=n.textContent;return wrapper.innerHTML;}
    return n.textContent.trim();
  };
  const nodes=[...doc.getElementsByTagNameNS('*',root.localName.toLowerCase()==='feed'?'entry':'item')].slice(0,1000);
  const articles = nodes.map((n,i) => {
    const url=link(n,base),body=content(n),category=child(n,'category');
    const scratch = document.createElement('div');scratch.append(cleanContent(text(n,'description') || body, url || base));
    return {id:text(n,'guid') || text(n,'id') || url || String(i),title:text(n,'title') || '未命名文章',author:author(n)||author(channel),url,date:text(n,'pubdate') || text(n,'published') || text(n,'updated') || text(n,'date'),category:category?.textContent.trim()||category?.getAttribute('term')||'随笔',excerpt:scratch.textContent.replace(/\s+/g,' ').slice(0,160),content:body};
  }).filter(a=>a.url);
  return {title:text(channel,'title'),blogUrl:link(channel,base),articles};
}
export async function getText(url, timeout=10000) {
  const response=await fetch(url,{signal:AbortSignal.timeout(timeout),credentials:'same-origin'});
  if(!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
export async function getFeed(url, base) {
  const response=await fetch(url,{signal:AbortSignal.timeout(45000),credentials:'same-origin'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const resolved=safeUrl(response.headers.get('X-Bookstore-Feed-Url'),base)||base;
  return parseFeed(await response.text(),resolved);
}
