const cards=document.getElementById('playlist-cards'),defaults=document.getElementById('default-music-playlist');
function sync(){
  const selected=defaults.value;
  defaults.replaceChildren(new Option('书店原创','builtin'));
  cards.querySelectorAll('[data-playlist-card]').forEach((card,i)=>{
    card.querySelectorAll('[name]').forEach(el=>{el.name=el.name.replace(/musicPlaylists\[\d+\]/,`musicPlaylists[${i}]`);});
    const id=card.querySelector('[data-playlist-id]').value,name=card.querySelector('[data-playlist-name]').value.trim();
    card.querySelector('[data-test-playlist]').value=id;
    const enabled=card.querySelector('[data-playlist-enabled]').checked;
    card.dataset.enabled=String(enabled);
    if(name&&enabled)defaults.add(new Option(name,id));
    const type=card.querySelector('[data-source-type]').value;
    card.querySelectorAll('[data-source-fields]').forEach(group=>{
      group.hidden=!group.dataset.sourceFields.split(' ').includes(type);
      group.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=group.hidden);
    });
    card.querySelector('[data-source-url-label]').textContent=type==='meting'?'Meting API 地址':'歌单文件地址';
  });
  defaults.value=[...defaults.options].some(o=>o.value===selected)?selected:'builtin';
}
cards.addEventListener('input',sync);cards.addEventListener('change',sync);
cards.addEventListener('click',e=>{if(e.target.closest('[data-remove-playlist]')){e.target.closest('[data-playlist-card]').remove();sync();}});
document.getElementById('add-playlist').addEventListener('click',()=>{
  if(cards.children.length>=20)return;
  const fragment=document.getElementById('playlist-template').content.cloneNode(true);
  fragment.querySelector('[data-playlist-id]').value='list-'+crypto.randomUUID();
  cards.append(fragment);sync();cards.lastElementChild.querySelector('[data-playlist-name]').focus();
});
sync();
