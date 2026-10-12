{
 const form=document.querySelector('.settings-form'),status=document.getElementById('settings-save-status');
 if(form&&status){let busy=false;
  form.addEventListener('submit',async e=>{
   const button=e.submitter;if(button&&!(button.name==='action'&&button.value==='save'))return;e.preventDefault();if(busy)return;if(window.BookstoreGalleryEditor?.busy){status.textContent='旅游册正在保存，完成后再保存网站设置。';return;}busy=true;
   const data=new FormData(form);data.set('action','save');const controls=[...form.querySelectorAll('button,input,textarea,select')].map(node=>({node,disabled:node.disabled}));controls.forEach(({node})=>node.disabled=true);
   let phase='旅游册';status.textContent='正在保存旅游册和网站设置…';status.className='hint';
   try{
    await window.BookstoreGalleryEditor?.saveAll();phase='网站设置';
    let response;try{response=await fetch('./settings-save.php',{method:'POST',body:data,signal:AbortSignal.timeout(20000)});}catch(error){throw Error(error.name==='TimeoutError'?'网站设置保存超时。输入已保留，请查看服务器日志后重试。':'网站设置连接中断。输入已保留，请重试保存；不要直接刷新页面。');}
    const text=await response.text();let result;try{result=JSON.parse(text);}catch{throw Error(`网站设置接口返回 HTTP ${response.status}，响应不是 JSON，请查看 PHP / nginx 错误日志。`);}
    if(!response.ok||result.error)throw Error(result.error||`保存设置返回 HTTP ${response.status}`);
    status.textContent='旅游册和网站设置已保存，刷新书店即可查看。';status.className='hint save-success';
   }catch(error){status.textContent=(phase==='网站设置'?'旅游册编辑已保存；':'')+error.message;status.className='hint save-error';status.scrollIntoView({block:'nearest'});}
   finally{controls.forEach(({node,disabled})=>node.disabled=disabled);busy=false;}
  });
 }
}
