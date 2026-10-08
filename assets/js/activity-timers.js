/* Load after lesson-common.js and lesson-local-links.js, before DOM-ready callbacks. */
(function(){
  'use strict';
  const S=window.LessonStore,C=window.ReadingTimerCore,U=window.ReadingUI;if(!S||!C||!U)return;
  const oldNormalize=S.normalize,oldSave=S.save,oldURL=S.lessonURL;
  const items=plan=>plan?.sections?.flatMap(section=>section.items)||[];
  S.normalize=function(data){const plan=oldNormalize(data),map=new Map(items(data).map(i=>[i.id,i]));items(plan).forEach(item=>item.timer=C.timer(map.get(item.id)?.timer));return plan;};
  S.read=function(id){try{const raw=localStorage.getItem('reading:lesson:'+id);return raw?S.normalize(JSON.parse(raw)):null;}catch(error){return null;}};
  S.last=function(){try{const id=localStorage.getItem('reading:last-lesson');return id?S.read(id):null;}catch(error){return null;}};
  function mergeTimers(plan,local){const map=new Map(items(local).map(i=>[i.id,i]));items(plan).forEach(item=>{const own=C.timer(item.timer),other=C.timer(map.get(item.id)?.timer);item.timer=other.updatedAt>own.updatedAt?other:own;});return plan;}
  S.freshest=function(plan){const local=S.read(plan.id);if(!local)return mergeTimers(plan,null);const chosen=local.updatedAt>=plan.updatedAt?local:plan;return mergeTimers(chosen,chosen===local?plan:local);};
  S.save=function(plan){mergeTimers(plan,S.read(plan.id));return oldSave(plan);};
  function snapshot(plan){const local=S.read(plan.id);const copy=JSON.parse(JSON.stringify(mergeTimers(plan,local)));items(copy).forEach(item=>{const t=C.timer(item.timer);item.timer={...t,elapsedMs:C.elapsed(t),runningSince:null};});return copy;}
  S.lessonURL=function(plan,base){return oldURL(snapshot(plan),base);};
  let context=null;
  try{const encoded=new URLSearchParams(location.hash.slice(1)).get('lesson');if(encoded){const raw=S.decode(encoded);context={plan:S.normalize(raw.plan),itemId:raw.itemId,base:S.returnBase(raw.returnBase)};}}
  catch(error){console.warn('Timer lesson context unavailable.',error);}
  function planForPage(){
    if(context)return S.freshest(context.plan);
    const encoded=new URLSearchParams(location.hash.slice(1)).get('plan');return encoded?S.freshest(S.normalize(S.decode(encoded))):S.last();
  }
  function change(id,action){
    const plan=planForPage();if(!plan)return;
    const item=items(plan).find(i=>i.id===id);if(!item)return;
    item.timer=C.act(item.timer,action);S.touch(plan);S.save(plan);
    if(document.getElementById('lesson-page')){try{history.replaceState(null,'',S.lessonURL(plan));}catch(error){}}
    if(context)context.plan=plan;refresh();
  }
  function widget(id){
    const root=document.createElement('div');root.className='activity-timer';root.dataset.timerItem=id;root.setAttribute('role','group');root.setAttribute('aria-label','Activity stopwatch');
    const time=document.createElement('output');time.className='activity-time';time.textContent='00:00';time.setAttribute('aria-label','Elapsed time');root.appendChild(time);
    [['play','Start timer','start'],['pause','Pause timer','pause'],['reset','Reset timer','reset']].forEach(([icon,label,action])=>{const button=U.button(icon,label);button.dataset.timerAction=action;button.addEventListener('click',()=>{if(action==='reset'&&!confirm('Reset this activity’s recorded time?'))return;change(id,action);});root.appendChild(button);});return root;
  }
  function decorate(){document.querySelectorAll('.lesson-item[data-item]').forEach(row=>{if(!row.querySelector('.activity-timer'))row.querySelector('.lesson-item-content').appendChild(widget(row.dataset.item));});}
  function refresh(){let plan;try{plan=planForPage();}catch(error){return;}const map=new Map(items(plan).map(i=>[i.id,i]));document.querySelectorAll('.activity-timer').forEach(root=>{const timer=C.timer(map.get(root.dataset.timerItem)?.timer);const display=root.querySelector('.activity-time'),text=C.format(C.elapsed(timer));if(display.textContent!==text)display.textContent=text;root.querySelector('[data-timer-action="start"]').disabled=!!timer.runningSince;root.querySelector('[data-timer-action="pause"]').disabled=!timer.runningSince;root.classList.toggle('timer-running',!!timer.runningSince);});}
  function complete(){
    if(!context)return;const plan=planForPage(),item=items(plan).find(i=>i.id===context.itemId);if(!item){alert('This activity is no longer in the lesson.');return;}
    item.timer=C.act(item.timer,'pause');item.done=true;S.touch(plan);S.save(plan);location.assign(S.lessonURL(plan,context.base));
  }
  document.addEventListener('click',event=>{
    if(context&&event.target.closest?.('.lesson-return-button')){event.preventDefault();event.stopImmediatePropagation();complete();}
    const exportButton=event.target.closest?.('#lesson-export');if(exportButton){event.preventDefault();event.stopImmediatePropagation();const plan=planForPage();if(!plan)return;const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(plan),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=(plan.title.replace(/[^a-z0-9_-]+/gi,'-')||'lesson')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  },true);
  document.addEventListener('change',event=>{if(event.target.matches?.('.lesson-check')&&event.target.checked)change(event.target.closest('[data-item]').dataset.item,'pause');},true);
  function init(){
    const root=document.getElementById('lesson-sections');if(root){new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.activity-timer'))){decorate();refresh();}}).observe(root,{childList:true,subtree:true});decorate();}
    if(context){window.ReadingActivityTimer=widget(context.itemId);window.dispatchEvent(new Event('reading:timer-ready'));}
    refresh();setInterval(refresh,250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
