const picker=document.getElementById('ui-accent'),hex=document.getElementById('ui-accent-hex');
function choose(value){
  if(!/^#[0-9a-f]{6}$/i.test(value)){hex.setCustomValidity('请输入六位 HEX 颜色，例如 #83baff');return;}
  hex.setCustomValidity('');picker.value=value.toLowerCase();hex.value=picker.value;
  document.querySelectorAll('[data-accent]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.accent===picker.value)));
}
picker.addEventListener('input',()=>choose(picker.value));
hex.addEventListener('input',()=>choose(hex.value));
document.querySelectorAll('[data-accent]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.accent)));
choose(picker.value);
