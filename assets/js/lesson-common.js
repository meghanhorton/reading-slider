(function (global) {
  'use strict';
  const PREFIX='reading:lesson:',LAST='reading:last-lesson';
  function id(){return global.crypto?.randomUUID?global.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
  function encode(value){const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decode(value){if(!value||value.length>300000)throw new Error('This lesson link is empty or too large.');let input=value.replace(/-/g,'+').replace(/_/g,'/');input+='='.repeat((4-input.length%4)%4);const binary=atob(input);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  function safeURL(value){const url=new URL(String(value||''),location.href);if(!['https:','http:'].includes(url.protocol)&&!(location.protocol==='file:'&&url.protocol==='file:'))throw new Error('Activity links must be http or https URLs.');return url.href;}
  function normalize(data){
    if(!data||data.version!==1||typeof data.id!=='string'||!data.id||data.id.length>100||!Array.isArray(data.sections)||data.sections.length>50)throw new Error('Invalid lesson plan.');
    const seen=new Set();let count=0;
    const sections=data.sections.map(s=>{
      if(!s||typeof s.id!=='string'||seen.has(s.id)||!Array.isArray(s.items))throw new Error('Invalid or duplicate section.');seen.add(s.id);
      return{id:s.id,title:String(s.title||'Section').slice(0,200),items:s.items.map(item=>{
        if(!item||typeof item.id!=='string'||seen.has(item.id)||++count>200)throw new Error('Invalid or duplicate activity.');seen.add(item.id);
        return{id:item.id,title:String(item.title||'Activity').slice(0,200),url:safeURL(item.url),done:!!item.done};
      })};
    });
    return{version:1,id:data.id,title:String(data.title||'Reading Lesson').slice(0,200),updatedAt:Number.isFinite(data.updatedAt)?data.updatedAt:0,sections};
  }
  function save(plan){try{localStorage.setItem(PREFIX+plan.id,JSON.stringify(plan));localStorage.setItem(LAST,plan.id);return true;}catch(error){return false;}}
  function read(idValue){try{const data=localStorage.getItem(PREFIX+idValue);return data?normalize(JSON.parse(data)):null;}catch(error){return null;}}
  function last(){try{const value=localStorage.getItem(LAST);return value?read(value):null;}catch(error){return null;}}
  function freshest(plan){const local=read(plan.id);return local&&local.updatedAt>plan.updatedAt?local:plan;}
  function touch(plan){plan.updatedAt=Math.max(Date.now(),plan.updatedAt+1);return plan;}
  function lessonURL(plan,base){const url=new URL(base||'lesson.html',location.href);url.search='';url.hash='plan='+encode(plan);return url.href;}
  function returnBase(value){const url=new URL(value,location.href);if(url.origin!==location.origin||!url.pathname.endsWith('/lesson.html'))throw new Error('Invalid lesson return address.');url.search='';url.hash='';return url.href;}
  global.LessonStore={id,encode,decode,safeURL,normalize,save,read,last,freshest,touch,lessonURL,returnBase};
})(window);
