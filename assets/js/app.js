/* Shared services: navigation, sharing, lesson storage, timers and celebrations. */
(function (global) {
  'use strict';
  const R = global.ReadingApp = {};
  R.$ = selector => document.querySelector(selector);
  R.chars = text => typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text.normalize('NFC')), s=>s.segment)
    : Array.from(text.normalize('NFC'));
  R.entries = text => text.split(/[,\n]+/u).map(s=>s.trim().normalize('NFC').toLocaleLowerCase()).filter(Boolean);
  R.words = text => text.normalize('NFC').split(/[\s,;]+/u).map(s=>s.trim()).filter(Boolean);
  R.id = () => global.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  R.timer = raw => ({elapsedMs:Math.max(0,Number(raw?.elapsedMs)||0),runningSince:Number.isFinite(raw?.runningSince)&&raw.runningSince>0?raw.runningSince:null,updatedAt:Math.max(0,Number(raw?.updatedAt)||0)});
  R.elapsed = (raw,now=Date.now()) => {const t=R.timer(raw);return t.elapsedMs+(t.runningSince?Math.max(0,now-t.runningSince):0);};
  R.timerAction = (raw,action,now=Date.now()) => {const t=R.timer(raw);if(action==='start'&&!t.runningSince)t.runningSince=now;if(action==='pause'){t.elapsedMs=R.elapsed(t,now);t.runningSince=null;}if(action==='reset'){t.elapsedMs=0;t.runningSince=null;}t.updatedAt=Math.max(now,t.updatedAt+1);return t;};
  R.formatTime = ms => {const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s/60)%60;return(h?h+':':'')+String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
  R.encode = value => {let binary='';for(const b of new TextEncoder().encode(JSON.stringify(value)))binary+=String.fromCharCode(b);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
  R.decode = value => {if(!value||value.length>300000)throw Error('Invalid or oversized lesson link.');let text=value.replace(/-/g,'+').replace(/_/g,'/');text+='='.repeat((4-text.length%4)%4);return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text),c=>c.charCodeAt(0))));};
  const toolNames=new Set(['slider.html','pyramid.html','wordparts.html','lettertiles.html']);
  R.safeURL = value => {const u=new URL(String(value||''),location.href);if(!['http:','https:'].includes(u.protocol)&&!(location.protocol==='file:'&&u.protocol==='file:'))throw Error('Use an http or https activity link.');return u;};
  R.localURL = value => {const u=R.safeURL(value),file=u.pathname.split('/').pop(),ours=u.origin===location.origin||(u.hostname==='meghanhorton.github.io'&&u.pathname.startsWith('/reading-slider/'));return ours&&toolNames.has(file)?file+u.search+(new URLSearchParams(u.hash.slice(1)).has('lesson')?'':u.hash):u.href;};
  R.planItems = plan => plan?.sections?.flatMap(s=>s.items)||[];
  R.normalizePlan = raw => {
    if(!raw||raw.version!==1||typeof raw.id!=='string'||!raw.id||raw.id.length>100||!Array.isArray(raw.sections)||raw.sections.length>50)throw Error('Invalid lesson plan.');
    const ids=new Set();let count=0;
    return {version:1,id:raw.id,title:String(raw.title||'Reading Lesson').slice(0,200),updatedAt:Math.max(0,Number(raw.updatedAt)||0),sections:raw.sections.map(section=>{
      if(!section||typeof section.id!=='string'||ids.has(section.id)||!Array.isArray(section.items))throw Error('Invalid section.');ids.add(section.id);
      return{id:section.id,title:String(section.title||'Section').slice(0,200),items:section.items.map(item=>{
        if(!item||typeof item.id!=='string'||ids.has(item.id)||++count>200)throw Error('Invalid activity.');ids.add(item.id);
        return{id:item.id,title:String(item.title||'Activity').slice(0,200),url:R.localURL(item.url),done:!!item.done,timer:R.timer(item.timer)};
      })};
    })};
  };
  R.readPlan = id => {try{const data=localStorage.getItem('reading:lesson:'+id);return data?R.normalizePlan(JSON.parse(data)):null;}catch(error){return null;}};
  R.lastPlan = () => {try{const id=localStorage.getItem('reading:last-lesson');return id?R.readPlan(id):null;}catch(error){return null;}};
  function mergeTimers(plan,other){const map=new Map(R.planItems(other).map(i=>[i.id,i]));R.planItems(plan).forEach(item=>{const local=R.timer(map.get(item.id)?.timer);if(local.updatedAt>R.timer(item.timer).updatedAt)item.timer=local;});return plan;}
  R.freshPlan = plan => {const local=R.readPlan(plan.id);return local?mergeTimers(local.updatedAt>=plan.updatedAt?local:plan,local.updatedAt>=plan.updatedAt?plan:local):plan;};
  R.touchPlan = plan => {plan.updatedAt=Math.max(Date.now(),plan.updatedAt+1);return plan;};
  R.savePlan = plan => {mergeTimers(plan,R.readPlan(plan.id));R.planItems(plan).forEach(i=>i.url=R.localURL(i.url));try{localStorage.setItem('reading:lesson:'+plan.id,JSON.stringify(plan));localStorage.setItem('reading:last-lesson',plan.id);return true;}catch(error){return false;}};
  R.planSnapshot = plan => {const copy=JSON.parse(JSON.stringify(mergeTimers(plan,R.readPlan(plan.id))));R.planItems(copy).forEach(item=>{const t=R.timer(item.timer);item.timer={...t,elapsedMs:R.elapsed(t),runningSince:null};});return copy;};
  R.lessonURL = (plan,base='lesson.html') => {const u=new URL(base,location.href);u.search='';u.hash='plan='+R.encode(R.planSnapshot(plan));return u.href;};
  R.activityURL = (item,plan) => {const u=R.safeURL(item.url);if(u.origin===location.origin&&toolNames.has(u.pathname.split('/').pop()))u.hash='lesson='+R.encode({version:1,plan,itemId:item.id,returnBase:new URL('lesson.html',location.href).href});return u.href;};
  R.parseCSV = text => {
    const rows=[];let row=[],cell='',quoted=false,closed=false;text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}else if(c==='"'&&!cell.trim()&&!closed){cell='';quoted=true;}else if(c===','){row.push(cell);cell='';closed=false;}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';closed=false;}else if(closed&&!/\s/.test(c))throw Error('Unexpected text after a CSV quote.');else if(!closed)cell+=c;}
    if(quoted)throw Error('CSV has an unclosed quote.');row.push(cell);rows.push(row);const first=rows.findIndex(r=>r.some(c=>c.trim()));if(first>=0&&rows[first].length===1&&/^(text|sentence|example)$/i.test(rows[first][0].trim()))rows.splice(first,1);return rows.flat().map(c=>c.trim()).filter(Boolean);
  };
  const icons={home:'M3 10l9-7 9 7M5 9v12h5v-7h4v7h5V9',lesson:'M8 5h13M8 12h13M8 19h13M2 5h1M2 12h1M2 19h1',edit:'M4 16l12-12 4 4-12 12H4v-4M14 6l4 4',copy:'M8 8h13v13H8zM16 8V3H3v13h5',share:'M12 16V3M7 8l5-5 5 5M4 12v9h16v-9',done:'M4 12l5 5L20 6',play:'M7 4l14 8-14 8z',pause:'M8 4v16M16 4v16',reset:'M4 8a9 9 0 1 1-1 8M4 3v6h6',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7',up:'M5 15l7-7 7 7',down:'M5 9l7 7 7-7',new:'M12 4v16M4 12h16',save:'M5 3h14l2 2v16H3V3h2M7 3v6h10V3M7 21v-8h10v8'};
  R.icon = name => '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="'+(icons[name]||icons.lesson)+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  R.action = (id,icon,label,handler,slot='actions') => {const el=document.createElement('button');el.id=id;el.type='button';el.className='icon-button';el.title=label;el.setAttribute('aria-label',label);el.innerHTML=R.icon(icon);el.addEventListener('click',handler);document.querySelector(`[data-nav-slot="${slot}"]`).appendChild(el);return el;};
  R.setAction = (el,{visible=true,disabled=false}={}) => {el.hidden=!visible;el.disabled=disabled;};
  let noticeTimer;R.notice = text => {const el=R.$('#app-notice');if(!el)return;clearTimeout(noticeTimer);el.textContent=text;if(text)noticeTimer=setTimeout(()=>{el.textContent='';},5000);};
  R.copyLink = async (url,share=false,title=document.title) => {
    try{if(share&&navigator.share){await navigator.share({title,url});return;}if(location.protocol==='file:'||!navigator.clipboard)throw Error('manual');await navigator.clipboard.writeText(url);R.notice('Link copied.');}
    catch(error){if(error.name==='AbortError')return;let d=R.$('#share-dialog');if(!d){d=document.createElement('dialog');d.id='share-dialog';d.innerHTML='<h2>Copy link</h2><label for="share-url">Select and copy this link</label><textarea id="share-url" class="form-control mt-3" rows="6" readonly></textarea><button type="button" class="btn btn-primary mt-3">Close</button>';d.querySelector('button').addEventListener('click',()=>d.close());document.body.appendChild(d);}d.querySelector('textarea').value=url;d.showModal();d.querySelector('textarea').focus();d.querySelector('textarea').select();}
  };
  let context=null,audio=null,canvas=null,animation=null;
  R.stopCelebration = () => {cancelAnimationFrame(animation);if(canvas)canvas.remove();canvas=null;};
  function unlockAudio(){try{const A=global.AudioContext||global.webkitAudioContext;if(!A)return;if(!audio)audio=new A();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(error){}}
  R.celebrate = () => {
    if(audio?.state==='running'){const now=audio.currentTime;[[1046.5,.15,.85],[2093,.04,.6]].forEach(([f,v,d])=>{const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(v,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+d);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+d+.03);o.onended=()=>{o.disconnect();g.disconnect();};});}
    R.stopCelebration();canvas=document.createElement('canvas');canvas.className='confetti';canvas.setAttribute('aria-hidden','true');document.body.appendChild(canvas);const ctx=canvas.getContext('2d');if(!ctx){R.stopCelebration();return;}
    const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);const colors=['#2375dc','#ffca48','#ec6394','#52b788','#9c7bea'];const parts=Array.from({length:reduce?40:140},()=>({x:Math.random()*w,y:reduce?Math.random()*h:-Math.random()*h*.5,vx:(Math.random()-.5)*100,vy:140+Math.random()*220,s:5+Math.random()*7,a:Math.random()*6.28,color:colors[Math.floor(Math.random()*5)]}));const start=performance.now();let last=start;
    function frame(now){const duration=reduce?1000:3000;if(now-start>duration){R.stopCelebration();return;}const dt=Math.min((now-last)/1000,.04);last=now;ctx.clearRect(0,0,w,h);ctx.globalAlpha=Math.min(1,(duration-(now-start))/600);parts.forEach(p=>{if(!reduce){p.x+=p.vx*dt;p.y+=p.vy*dt;p.a+=2*dt;}ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.color;ctx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.65);ctx.restore();});animation=requestAnimationFrame(frame);}animation=requestAnimationFrame(frame);
  };
  function currentContext(){if(!context)return null;const plan=R.freshPlan(context.plan),item=R.planItems(plan).find(i=>i.id===context.itemId);return item?{plan,item}:null;}
  function timerChange(action){const data=currentContext();if(!data)return;data.item.timer=R.timerAction(data.item.timer,action);R.touchPlan(data.plan);R.savePlan(data.plan);context.plan=data.plan;}
  R.init = () => {
    if(R.initialized)return;R.initialized=true;
    const bar=R.$('#appbar');if(!bar)return;
    [['index.html','home','Home'],['lesson.html','lesson','Lesson plan']].forEach(([href,icon,label])=>{const a=document.createElement('a');a.href=href;a.className='icon-button';a.title=label;a.setAttribute('aria-label',label);a.innerHTML=R.icon(icon);bar.querySelector('[data-nav-slot="links"]').appendChild(a);});
    bar.querySelector('.appbar-title').textContent=document.title;
    const size=()=>{const h=Math.ceil(bar.getBoundingClientRect().height);if(R.navHeight!==h){R.navHeight=h;document.documentElement.style.setProperty('--nav-height',h+'px');global.dispatchEvent(new Event('reading:layout'));}};
    if(typeof ResizeObserver==='function')new ResizeObserver(size).observe(bar);else global.addEventListener('resize',size);size();
    document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);
    try{const value=new URLSearchParams(location.hash.slice(1)).get('lesson');if(value){const raw=R.decode(value),base=new URL(raw.returnBase,location.href),plan=R.normalizePlan(raw.plan);if(raw.version!==1||base.origin!==location.origin||!base.pathname.endsWith('/lesson.html')||!R.planItems(plan).some(i=>i.id===raw.itemId))throw Error('Invalid checklist context.');context={plan,itemId:raw.itemId,base:base.href};}}
    catch(error){R.notice('Checklist return link could not be loaded.');}
    if(context){
      const finish=R.action('complete-return','done','Complete and return to checklist',()=>{const data=currentContext();if(!data)return;data.item.timer=R.timerAction(data.item.timer,'pause');data.item.done=true;R.touchPlan(data.plan);R.savePlan(data.plan);location.assign(R.lessonURL(data.plan,context.base));});finish.classList.add('success-button');
      const slot=bar.querySelector('[data-nav-slot="timer"]'),time=document.createElement('output');time.className='timer-value';time.setAttribute('aria-label','Activity elapsed time');slot.appendChild(time);
      const start=R.action('timer-start','play','Start timer',()=>timerChange('start'),'timer'),pause=R.action('timer-pause','pause','Pause timer',()=>timerChange('pause'),'timer');R.action('timer-reset','reset','Reset timer',()=>{if(confirm('Reset this activity’s recorded time?'))timerChange('reset');},'timer');
      const refresh=()=>{const data=currentContext();if(!data)return;time.textContent=R.formatTime(R.elapsed(data.item.timer));start.disabled=!!data.item.timer.runningSince;pause.disabled=!data.item.timer.runningSince;};refresh();setInterval(refresh,250);
    }
    if(document.body.dataset.page==='home'){const p=new URLSearchParams(location.search);if(p.has('text')||p.has('csv')){const u=new URL('slider.html',location.href);u.search=location.search;u.hash=location.hash;location.replace(u.href);}}
  };
})(window);

$(function(){ window.ReadingApp.init(); });
