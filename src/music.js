export const originals=[
  {name:'夜色书架',bpm:74,shift:0,description:'原创 Lo-fi · Rhodes / Bass / Soft drums'},
  {name:'橘色窗边',bpm:82,shift:2,description:'原创 Lo-fi · 黄昏阅读时光'},
  {name:'雨巷来信',bpm:68,shift:-2,description:'原创 Lo-fi · 慢拍与柔和琴音'}
];

// Original instrumental loops rendered locally. No remote music service is required.
export async function compose(track){
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
