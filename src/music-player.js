import {originals,compose} from './music.js';
import {loadPlaylist,normalizeTracks} from './playlists.js';

const stamp=t=>{t=Number.isFinite(t)?Math.max(0,t):0;return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;};
export function initMusic(config,toast){
  const $=id=>document.getElementById(id),audio=new Audio(),buffers=new Map(),urls=[];
  const playlists=[{id:'builtin',name:'书店原创',tracks:originals}];
  for(const item of Array.isArray(config.musicPlaylists)?config.musicPlaylists:[])if(item?.id&&(!Object.hasOwn(item,'enabled')||[true,1,'1'].includes(item.enabled))&&item.id!=='builtin'&&item.id!=='local'&&!playlists.some(p=>p.id===item.id))playlists.push({...item,tracks:item.type==='tracks'?normalizeTracks(item.tracks):undefined});
  if(playlists.length===1&&Array.isArray(config.music)&&config.music.length)playlists.push({id:'custom',name:'自定义音乐',tracks:normalizeTracks(config.music)});
  let tracks=originals,playlistId='builtin',index=0,playing=false,pending=false,loading=false,context,gain,source,offset=0,startedAt=0,buffer,request=0,loadRequest=0,loop=true;
  audio.preload='metadata';
  const key=track=>track.bpm+':'+track.shift;
  function rebuild(){
    $('music-playlist').replaceChildren(...playlists.map(p=>new Option(p.name,p.id)));$('music-playlist').value=playlistId;
    $('music-track').replaceChildren(...tracks.map((t,i)=>new Option(t.name+(t.artist?' · '+t.artist:''),String(i))));$('music-track').value=String(index);
  }
  function position(){if(tracks[index]?.url)return audio.currentTime;const time=playing&&context?context.currentTime-startedAt+offset:offset;return buffer?.duration?(loop?time%buffer.duration:Math.min(time,buffer.duration)):time;}
  function update(){
    const track=tracks[index]||originals[0],duration=track.url?(Number.isFinite(audio.duration)?audio.duration:0):(buffer?.duration||60/track.bpm*64),time=position();
    $('music-title').textContent=loading?'正在读取歌单…':track.name;
    $('music-subtitle').textContent=loading?'歌单信息加载中':pending?'正在准备音乐…':playing?`正在播放 · ${loop?'单曲循环':'歌单循环'}`:track.description||track.artist||'书店歌单';
    $('music-play').textContent=pending?'…':playing?'Ⅱ':'▶';$('music-play').setAttribute('aria-label',playing?'暂停音乐':'播放音乐');$('music-play').setAttribute('aria-pressed',String(playing));
    $('music-time').textContent=`${stamp(time)} / ${stamp(duration)}`;$('music-progress').value=duration?Math.min(100,time/duration*100):0;$('music-track').value=String(index);
    $('music-loop').textContent=loop?'单曲':'歌单';$('music-loop').setAttribute('aria-label',loop?'单曲循环，切换为歌单循环':'歌单循环，切换为单曲循环');$('music-loop').setAttribute('aria-pressed',String(loop));
    for(const id of ['music-play','music-track','music-prev','music-next','music-progress'])$(id).disabled=loading||!tracks.length;
    for(const id of ['music-mini','reader-music']){$(id).textContent=playing?'Ⅱ 音乐':'♫ 音乐';$(id).setAttribute('aria-label',playing?'暂停背景音乐':'播放背景音乐');}
  }
  function pause(){request++;offset=position();playing=false;pending=false;try{source?.stop();}catch{}source=null;audio.pause();context?.suspend();update();}
  async function play(){
    if(loading||!tracks.length)return;
    const token=++request,track=tracks[index];pending=true;update();
    try{
      if(track.url){if(audio.src!==track.url)audio.src=track.url;audio.loop=loop;await audio.play();}
      else{
        if(!context){context=new AudioContext();gain=context.createGain();gain.connect(context.destination);}
        await context.resume();gain.gain.value=Number($('music-volume').value)/100;
        const ready=buffers.get(key(track))||await compose(track);buffers.set(key(track),ready);if(token!==request)return;
        buffer=ready;source=context.createBufferSource();source.buffer=buffer;source.loop=loop;source.connect(gain);source.start(0,Math.min(offset,buffer.duration-.01));startedAt=context.currentTime;
        source.onended=()=>{if(!loop&&playing&&token===request)next(1);};
      }
      if(token!==request)return;playing=true;pending=false;update();
    }catch{if(token!==request)return;playing=false;pending=false;update();toast('这首音乐无法播放，请换一首或选择其他歌单。');}
  }
  function toggle(){playing||pending?pause():play();}
  function clearAudio(){audio.removeAttribute('src');audio.load();}
  function choose(value){if(loading||!tracks.length)return;const resume=playing||pending;pause();index=(value+tracks.length)%tracks.length;offset=0;buffer=buffers.get(key(tracks[index]));clearAudio();if(resume)play();else update();}
  function next(step){choose(index+step);}
  async function selectPlaylist(id){
    const selected=playlists.find(p=>p.id===id);if(!selected)return;
    const resume=playing||pending,previous=playlistId;pause();const token=++loadRequest;loading=true;update();
    try{
      const ready=await loadPlaylist(selected,config);if(token!==loadRequest)return;if(!ready.length)throw new Error('歌单没有可用歌曲。');
      tracks=ready;playlistId=id;index=0;offset=0;buffer=buffers.get(key(tracks[0]));clearAudio();loading=false;rebuild();update();
      try{localStorage.setItem('bookstore:music-playlist',id);}catch{}
      if(resume)play();
    }catch(error){if(token!==loadRequest)return;loading=false;$('music-playlist').value=previous;update();toast(error.message||'歌单无法读取，请更换音乐来源。');if(resume)play();}
  }
  $('music-playlist').addEventListener('change',e=>selectPlaylist(e.target.value));
  $('music-play').addEventListener('click',toggle);for(const id of ['music-mini','reader-music'])$(id).addEventListener('click',toggle);
  $('music-prev').addEventListener('click',()=>next(-1));$('music-next').addEventListener('click',()=>next(1));$('music-track').addEventListener('change',e=>choose(Number(e.target.value)));
  $('music-loop').addEventListener('click',()=>{loop=!loop;audio.loop=loop;if(source)source.loop=loop;update();});
  $('music-volume').addEventListener('input',e=>{const volume=Number(e.target.value)/100;audio.volume=volume;if(gain)gain.gain.setTargetAtTime(volume,context.currentTime,.025);$('music-volume-label').textContent=e.target.value+'%';try{localStorage.setItem('bookstore:music-volume',String(volume));}catch{}});
  $('music-progress').addEventListener('input',e=>{const percent=Number(e.target.value)/100;if(tracks[index].url&&Number.isFinite(audio.duration))audio.currentTime=audio.duration*percent;else if(buffer){const resume=playing;pause();offset=buffer.duration*percent;if(resume)play();}update();});
  $('music-files').addEventListener('change',e=>{
    let local=playlists.find(p=>p.id==='local');if(!local){local={id:'local',name:'本地音乐',tracks:[]};playlists.push(local);}
    for(const file of e.target.files)if(file.type.startsWith('audio/')||/\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name)){const url=URL.createObjectURL(file);urls.push(url);local.tracks.push({name:file.name.replace(/\.[^.]+$/,''),url,description:'本地音乐'});}
    rebuild();if(local.tracks.length)selectPlaylist('local');e.target.value='';
  });
  audio.addEventListener('ended',()=>{if(!loop&&playing)next(1);});
  audio.addEventListener('error',()=>{if((playing||pending)&&tracks[index]?.url===audio.src){pause();toast('音频地址无法播放，可能已失效或受到平台限制，请选择其他歌曲。');}});
  let volume=.55;try{const saved=localStorage.getItem('bookstore:music-volume');if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
  audio.volume=volume;$('music-volume').value=Math.round(volume*100);$('music-volume-label').textContent=Math.round(volume*100)+'%';rebuild();update();
  let selected=playlists.some(p=>p.id===config.defaultMusicPlaylist)?config.defaultMusicPlaylist:'builtin';try{const saved=localStorage.getItem('bookstore:music-playlist');if(playlists.some(p=>p.id===saved))selected=saved;}catch{}
  if(selected!=='builtin'){$('music-playlist').value=selected;selectPlaylist(selected);}
  const timer=setInterval(update,500);window.addEventListener('pagehide',()=>{loadRequest++;pause();clearInterval(timer);urls.forEach(URL.revokeObjectURL);context?.close();},{once:true});
  return {toggle,pause,get playing(){return playing;},get pending(){return pending;},get currentTime(){return position();},get duration(){return tracks[index]?.url?audio.duration:buffer?.duration;},get track(){return tracks[index];},get playlist(){return playlistId;}};
}
