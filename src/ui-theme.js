import './ui-theme.css';

export function applyUiAccent(value){
  const accent=/^#[0-9a-f]{6}$/i.test(String(value))?value:'#83baff';
  const rgb=[1,3,5].map(i=>parseInt(accent.slice(i,i+2),16));
  const mix=(target,amount)=>`rgb(${rgb.map(v=>Math.round(v*(1-amount)+target*amount)).join(' ')})`;
  const linear=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
  const luminance=linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
  const vars={'--ui-accent':accent,'--ui-accent-rgb':rgb.join(' '),'--ui-accent-light':mix(255,.22),'--ui-accent-deep':mix(0,.08),'--ui-accent-text':mix(255,.55),'--ui-accent-ink':luminance>.179?'#142435':'#ffffff'};
  for(const [key,color] of Object.entries(vars))document.documentElement.style.setProperty(key,color);
}
