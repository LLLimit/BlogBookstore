import {safeUrl} from './articles.js';

export function normalizeTracks(rows,base=location.href){
  if(!Array.isArray(rows))return [];
  return rows.slice(0,300).flatMap(track=>{
    if(!track||typeof track!=='object')return [];
    const url=safeUrl(track.url||track.src,base);if(!url)return [];
    const artist=track.artist||track.author||'';
    return [{name:String(track.name||track.title||'未命名音乐').slice(0,120),artist:Array.isArray(artist)?artist.join(' / '):String(artist),url,description:Array.isArray(artist)?artist.join(' / '):String(artist)||'书店歌单'}];
  });
}
export function metingUrl(playlist){
  const id=String(playlist.playlistId||'').match(/(?:playlist\/|[?&#]id=)(\d+)/)?.[1]||String(playlist.playlistId||'');
  let value=String(playlist.url||'');
  if(value.includes(':server')||value.includes(':id')){
    for(const [key,replacement] of Object.entries({server:playlist.server||'netease',type:'playlist',id,r:Date.now()}))value=value.replaceAll(':'+key,encodeURIComponent(replacement));
    return value;
  }
  const url=new URL(value,location.href);url.searchParams.set('server',playlist.server||'netease');url.searchParams.set('type','playlist');url.searchParams.set('id',id);return url.href;
}
export function parseM3u(text,base){
  if(text.includes('#EXT-X-'))throw new Error('这是媒体分片清单，请将流地址作为单曲直链配置。');
  const rows=[];let name='未命名音乐';
  for(const raw of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const line=raw.trim();if(line.startsWith('#EXTINF:')){name=line.slice(line.indexOf(',')+1);continue;}
    if(!line||line.startsWith('#'))continue;
    rows.push({name,url:line});name='未命名音乐';if(rows.length>=300)break;
  }
  return normalizeTracks(rows,base);
}
export async function loadPlaylist(playlist,config){
  if(Array.isArray(playlist.tracks))return playlist.tracks;
  let url,server=false;
  if(config.musicEndpoint){url=new URL(config.musicEndpoint,location.href);url.searchParams.set('playlist',playlist.id);server=true;}
  else url=new URL(playlist.type==='meting'?metingUrl(playlist):playlist.url,location.href);
  if(!['https:','http:'].includes(url.protocol))throw new Error('歌单地址无效。');
  const response=await fetch(url,{signal:AbortSignal.timeout(45000),credentials:server?'same-origin':'omit',cache:'no-store'});
  const text=await response.text();if(text.length>1024*1024)throw new Error('歌单文件超过 1 MB。');
  if(!response.ok){let message;try{message=JSON.parse(text).error;}catch{}throw new Error(message||'歌单读取失败（HTTP '+response.status+'）。');}
  const base=response.url||url.href;
  const data=playlist.type==='m3u'&&!server?null:JSON.parse(text);
  const tracks=data?normalizeTracks(data.tracks||data.data||data,base):parseM3u(text,base);
  if(!tracks.length)throw new Error('歌单没有可用音频，请检查接口或音乐平台限制。');
  return tracks;
}
