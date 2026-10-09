const originals=[
  {name:'夜色书架',bpm:74,shift:0,description:'原创 Lo-fi · Rhodes / Bass / Soft drums'},
  {name:'橘色窗边',bpm:82,shift:2,description:'原创 Lo-fi · 黄昏阅读时光'},
  {name:'雨巷来信',bpm:68,shift:-2,description:'原创 Lo-fi · 慢拍与柔和琴音'}
];
const stamp=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

// Original instrumental loops rendered locally. No remote music service is required.
async function compose(track){
  const beat=60/track.bpm,duration=beat*64,sampleRate=24000;
  const ctx=new OfflineAudioContext(2,Math.ceil((duration+1.6)*sampleRate),sampleRate);
  const master=ctx.createGain();master.gain.value=.78;master.connect(ctx.destination);
  const echo=ctx.createDelay(1),feedback=ctx.createGain(),wet=ctx.createGain();echo.delayTime.value=beat*.75;feedback.gain.value=.22;wet.gain.value=.17;echo.connect(feedback).connect(echo);echo.connect(wet).connect(master);
  const wave=ctx.createPeriodicWave(new Float32Array(8),new Float32Array([0,1,.15,.19,.07,.028,.016,.012]));
  function note(midi,start,length,volume,bass=false){
    const osc=ctx.createOscillator(),gain=ctx.createGain();if(bass)osc.type='sine';else osc.setPeriodicWave(wave);
    osc.frequency.value=440*2**((midi-69)/12);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+length);
    osc.connect(gain).connect(master);if(!bass)gain.connect(echo);osc.start(start);osc.stop(start+length+.015);
  }
  const noise=ctx.createBuffer(1,sampleRate,sampleRate);let seed=91;const data=noise.getChannelData(0);for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=(seed/2147483647*2-1)*.5;}
  function brush(start,length,volume,frequency){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise;filter.type='highpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+length);source.connect(filter).connect(gain).connect(master);source.start(start);source.stop(start+length);}
  const chords=[[48,52,55,59],[45,48,52,55],[50,53,57,60],[43,47,50,53]],melody=[72,76,79,74,71,69,67,72];
  for(let bar=0;bar<16;bar++){
    const start=bar*4*beat,chord=chords[bar%4];chord.forEach((n,i)=>note(n+track.shift,start+i*.022,beat*3.2,.043));
    note(chord[0]-12+track.shift,start,beat*1.4,.13,true);note(chord[0]-12+track.shift,start+2*beat,beat*1.2,.105,true);
    for(let n=0;n<4;n++)if((n+bar)%3!==0)note(melody[(bar*2+n)%8]+track.shift,start+(n+.13)*beat,beat*.94,.024);
    for(let n=0;n<8;n++)brush(start+n*beat*.5+(n%2?beat*.035:0),.065,n%2?.026:.037,6800);
    for(const n of [1,3])brush(start+n*beat,.14,.083,1700);
    for(const n of [0,2]){const osc=ctx.createOscillator(),gain=ctx.createGain(),t=start+n*beat;osc.frequency.setValueAtTime(108,t);osc.frequency.exponentialRampToValueAtTime(42,t+.14);gain.gain.setValueAtTime(.16,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.18);osc.connect(gain).connect(master);osc.start(t);osc.stop(t+.2);}
  }
  const rendered=await ctx.startRendering(),loop=new AudioBuffer({numberOfChannels:2,length:Math.floor(duration*sampleRate),sampleRate});
  for(let channel=0;channel<2;channel++){const a=rendered.getChannelData(channel),b=loop.getChannelData(channel);b.set(a.subarray(0,b.length));const overlap=Math.min(Math.floor(sampleRate*.08),b.length);for(let i=0;i<overlap;i++){const f=i/overlap;b[i]=b[i]*f+a[b.length+i]*(1-f);}}
  return loop;
}

export function initMusic(config,toast){
  const $=id=>document.getElementById(id),tracks=[...originals],cache=new Map(),audio=new Audio();let index=0,playing=false,pending=false,context,gain,source,offset=0,startedAt=0,buffer,request=0,loop=true;
  const urls=[];audio.preload='metadata';
  for(const track of config.music||[])try{const url=new URL(track.url,location.href);if(['https:','http:'].includes(url.protocol))tracks.push({name:String(track.name||'自定义音乐'),url:url.href,description:'书店歌单'});}catch{}
  function rebuild(){const select=$('music-track');select.replaceChildren();tracks.forEach((t,i)=>{const option=document.createElement('option');option.value=i;option.textContent=t.name;select.append(option);});select.value=index;}
  function position(){return tracks[index].url?audio.currentTime:playing&&context?((context.currentTime-startedAt+offset)%(buffer?.duration||999)):offset;}
  function update(){
    const track=tracks[index],duration=track.url?(Number.isFinite(audio.duration)?audio.duration:0):(buffer?.duration||60/track.bpm*64),time=position();
    $('music-title').textContent=track.name;$('music-subtitle').textContent=pending?'正在准备音乐…':playing?`正在播放 · ${loop?'循环':'顺序'}`:track.description;
    $('music-play').textContent=pending?'…':playing?'Ⅱ':'▶';$('music-play').setAttribute('aria-label',playing?'暂停音乐':'播放音乐');$('music-play').setAttribute('aria-pressed',String(playing));
    $('music-time').textContent=`${stamp(time)} / ${stamp(duration)}`;$('music-progress').value=duration?time/duration*100:0;$('music-track').value=index;
    for(const id of ['music-mini','reader-music']){$(id).textContent=playing?'Ⅱ 音乐':'♫ 音乐';$(id).setAttribute('aria-label',playing?'暂停背景音乐':'播放背景音乐');}
  }
  function pause(){request++;offset=position();playing=false;pending=false;source?.stop();source=null;audio.pause();context?.suspend();update();}
  async function play(){
    const id=++request;pending=true;update();
    try{
      if(tracks[index].url){audio.src!==tracks[index].url&&(audio.src=tracks[index].url);audio.loop=loop;await audio.play();}
      else{
        if(!context){context=new AudioContext();gain=context.createGain();gain.connect(context.destination);}await context.resume();gain.gain.value=Number($('music-volume').value)/100;
        const selected=index,ready=cache.get(selected)||await compose(tracks[selected]);cache.set(selected,ready);if(id!==request)return;buffer=ready;
        source=context.createBufferSource();source.buffer=buffer;source.loop=loop;source.connect(gain);source.start(0,Math.min(offset,buffer.duration-.01));startedAt=context.currentTime;
        source.onended=()=>{if(!loop&&playing&&id===request)next(1);};
      }
      if(id!==request){audio.pause();return;}playing=true;pending=false;update();
    }catch{playing=false;pending=false;update();toast('这首音乐无法播放，请换一首或添加本地音频。');}
  }
  function toggle(){playing||pending?pause():play();}
  function choose(value){const resume=playing||pending;pause();index=(value+tracks.length)%tracks.length;offset=0;buffer=cache.get(index);if(audio.src)audio.currentTime=0;if(resume)play();else update();}
  function next(step){choose(index+step);}
  $('music-play').addEventListener('click',toggle);for(const id of ['music-mini','reader-music'])$(id).addEventListener('click',toggle);
  $('music-prev').addEventListener('click',()=>next(-1));$('music-next').addEventListener('click',()=>next(1));$('music-track').addEventListener('change',e=>choose(Number(e.target.value)));
  $('music-loop').addEventListener('click',()=>{loop=!loop;audio.loop=loop;if(source)source.loop=loop;$('music-loop').setAttribute('aria-pressed',String(loop));update();});
  $('music-volume').addEventListener('input',e=>{const volume=Number(e.target.value)/100;audio.volume=volume;if(gain)gain.gain.setTargetAtTime(volume,context.currentTime,.025);$('music-volume-label').textContent=e.target.value+'%';try{localStorage.setItem('bookstore:music-volume',String(volume));}catch{}});
  $('music-progress').addEventListener('input',e=>{const percent=Number(e.target.value)/100;if(tracks[index].url&&Number.isFinite(audio.duration))audio.currentTime=audio.duration*percent;else if(buffer){const resume=playing;pause();offset=buffer.duration*percent;if(resume)play();}update();});
  $('music-files').addEventListener('change',e=>{const first=tracks.length;for(const file of e.target.files){if(file.type.startsWith('audio/')||/\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name)){const url=URL.createObjectURL(file);urls.push(url);tracks.push({name:file.name.replace(/\.[^.]+$/,''),url,description:'本地音乐'});}}rebuild();if(tracks.length>first)choose(first);e.target.value='';});
  audio.addEventListener('ended',()=>{if(!loop&&playing)next(1);});audio.addEventListener('error',()=>{if(playing){pause();toast('音频文件无法读取，请换一首音乐。');}});
  let volume=.55;try{const saved=localStorage.getItem('bookstore:music-volume');if(saved!==null)volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
  audio.volume=volume;$('music-volume').value=Math.round(volume*100);$('music-volume-label').textContent=Math.round(volume*100)+'%';
  rebuild();update();const timer=setInterval(update,500);window.addEventListener('pagehide',()=>{pause();clearInterval(timer);urls.forEach(URL.revokeObjectURL);context?.close();},{once:true});
  return {toggle,pause,get playing(){return playing;},get pending(){return pending;},get currentTime(){return position();},get duration(){return buffer?.duration||audio.duration;},get track(){return tracks[index];}};
}
