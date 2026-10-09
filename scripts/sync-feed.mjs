import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(resolve(root,'public/config.json'),'utf8'));
if(!config.feedUrl)throw new Error('请先在 public/config.json 填写 feedUrl，再执行 pnpm sync。');
const url=new URL(config.feedUrl);
if(!['https:','http:'].includes(url.protocol))throw new Error('feedUrl 必须是 HTTP(S) 地址。');
const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'BlogBookstore/1.4 (+https://github.com/LLLimit)'}});
if(!response.ok)throw new Error(`RSS 下载失败：HTTP ${response.status}。原快照已保留。`);
const reader=response.body.getReader(),chunks=[];let size=0;
while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw new Error('RSS 超过 4 MB，原快照已保留。');}chunks.push(Buffer.from(value));}
const xml=Buffer.concat(chunks).toString('utf8');
if(!/<(?:[\w.-]+:)?(?:rss|feed|rdf)\b/i.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('RSS 格式无效，原快照已保留。');
await writeFile(resolve(root,'public/feed.xml'),xml);
await writeFile(resolve(root,'public/feed-meta.json'),JSON.stringify({syncedAt:new Date().toISOString(),feedUrl:config.feedUrl,resolvedUrl:response.url},null,2));
console.log(`已同步 ${config.feedUrl}，${(xml.match(/<(?:[\w.-]+:)?(?:item|entry)\b/g)||[]).length} 篇文章。请运行 pnpm build 后上传 dist。`);
