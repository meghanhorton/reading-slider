/* Load after lesson-common.js and BEFORE lesson.js. Keeps stored activity URLs relative. */
(function () {
  'use strict';
  const S=window.LessonStore;if(!S)return;
  const toolFiles=new Set(['slider.html','pyramid.html','wordparts.html','lettertiles.html']);
  function localize(value){
    const url=new URL(S.safeURL(value),location.href),name=url.pathname.split('/').pop();
    const ourHosted=url.hostname==='meghanhorton.github.io'&&url.pathname.startsWith('/reading-slider/');
    if(toolFiles.has(name)&&(url.origin===location.origin||ourHosted)){
      const hash=new URLSearchParams(url.hash.slice(1)).has('lesson')?'':url.hash;
      return name+url.search+hash;
    }
    return url.href;
  }
  function localPlan(plan){if(plan?.sections)plan.sections.forEach(s=>s.items.forEach(item=>item.url=localize(item.url)));return plan;}
  const original={normalize:S.normalize,save:S.save,read:S.read,last:S.last,freshest:S.freshest};
  S.normalize=data=>localPlan(original.normalize(data));
  S.save=plan=>original.save(localPlan(plan));
  S.read=id=>localPlan(original.read(id));S.last=()=>localPlan(original.last());S.freshest=plan=>localPlan(original.freshest(plan));
  S.localize=localize;
  function init(){
    const root=document.getElementById('lesson-sections');if(!root)return;
    function updateFields(){root.querySelectorAll('.item-url').forEach(input=>{try{input.value=localize(input.value);}catch(error){}});root.querySelectorAll('.lesson-activity').forEach(a=>{try{a.setAttribute('href',localize(a.getAttribute('href')));}catch(error){}});}
    new MutationObserver(updateFields).observe(root,{childList:true,subtree:true});updateFields();
    document.addEventListener('click',function(event){
      const anchor=event.target.closest?.('#lesson-sections .lesson-activity');if(!anchor)return;
      try{
        const encoded=new URLSearchParams(location.hash.slice(1)).get('plan');
        const plan=encoded?S.freshest(S.normalize(S.decode(encoded))):S.last();
        const id=anchor.closest('[data-item]').getAttribute('data-item'),item=plan?.sections.flatMap(s=>s.items).find(i=>i.id===id);if(!item)return;
        S.save(plan);const url=new URL(item.url,location.href),name=url.pathname.split('/').pop();
        if(url.origin===location.origin&&toolFiles.has(name))url.hash='lesson='+S.encode({version:1,plan,itemId:id,returnBase:new URL('lesson.html',location.href).href});
        anchor.href=url.href;
        // Keep native link behavior (including opening a new tab), bypass older delegated routing.
        event.stopImmediatePropagation();
      }catch(error){event.preventDefault();alert('Could not open activity: '+error.message);}
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
