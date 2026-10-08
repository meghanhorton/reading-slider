(function () {
  'use strict';
  function init(){
    const S=window.LessonStore,reader=document.getElementById('reader'),setup=document.querySelector('main.setup');if(!S||!reader)return;
    let context=null;
    try{const encoded=new URLSearchParams(location.hash.slice(1)).get('lesson');if(encoded){const data=S.decode(encoded);if(data.version!==1)throw new Error('Unsupported lesson');const plan=S.normalize(data.plan),base=S.returnBase(data.returnBase);if(!plan.sections.some(s=>s.items.some(i=>i.id===data.itemId)))throw new Error('Activity missing');context={plan,itemId:data.itemId,base};}}
    catch(error){console.warn('Lesson return link unavailable.',error);}
    function complete(){
      const plan=S.freshest(context.plan),item=plan.sections.flatMap(s=>s.items).find(i=>i.id===context.itemId);
      if(!item){alert('This activity was removed from the lesson.');return;}
      item.done=true;S.touch(plan);S.save(plan);location.assign(S.lessonURL(plan,context.base));
    }
    function button(container){if(!context||container.querySelector('.lesson-return-button'))return;const btn=document.createElement('button');btn.type='button';btn.className='btn btn-success lesson-return-button';btn.textContent='✓ Complete & return';btn.addEventListener('click',complete);container.appendChild(btn);}
    function home(container){
      const found=Array.from(container.querySelectorAll('a')).find(a=>{try{return new URL(a.href).pathname.endsWith('/index.html');}catch(error){return false;}});
      if(found){found.textContent='home';found.classList.add('btn','btn-outline-secondary','tool-home-button');return;}
      const a=document.createElement('a');a.href='index.html';a.className='btn btn-outline-secondary tool-home-button';a.textContent='home';container.appendChild(a);
    }
    const header=reader.querySelector('header');if(header){home(header);button(header);header.classList.add('lesson-tool-header');}
    if(setup){let bar=setup.querySelector('.tool-setup-nav');if(!bar){bar=document.createElement('div');bar.className='tool-setup-nav';setup.prepend(bar);}
      const old=setup.querySelector('.wp-home-link');if(old)old.remove();home(bar);button(bar);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
