(function(global){
  'use strict';
  const paths={home:'M3 10l9-7 9 7M5 9v12h5v-7h4v7h5V9',lesson:'M8 5h13M8 12h13M8 19h13M2 5h1M2 12h1M2 19h1',edit:'M4 16l12-12 4 4-12 12H4v-4M14 6l4 4',copy:'M8 8h13v13H8zM16 8V3H3v13h5',share:'M12 16V3M7 8l5-5 5 5M4 12v9h16v-9',done:'M4 12l5 5L20 6',play:'M7 4l14 8-14 8z',pause:'M8 4v16M16 4v16',reset:'M4 8a9 9 0 1 1-1 8M4 3v6h6',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7',up:'M5 15l7-7 7 7',down:'M5 9l7 7 7-7',new:'M12 4v16M4 12h16',save:'M5 3h14l2 2v16H3V3h2M7 3v6h10V3M7 21v-8h10v8',clock:'M12 7v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'};
  function svg(name){return '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="'+(paths[name]||paths.lesson)+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
  function button(name,label){const el=document.createElement('button');el.type='button';el.className='btn btn-outline-secondary ui-icon-button';el.setAttribute('aria-label',label);el.title=label;el.innerHTML=svg(name);return el;}
  function timer(value){const raw=value||{};return{elapsedMs:Math.max(0,Number(raw.elapsedMs)||0),runningSince:Number.isFinite(raw.runningSince)&&raw.runningSince>0?raw.runningSince:null,updatedAt:Math.max(0,Number(raw.updatedAt)||0)};}
  function elapsed(value,now=Date.now()){const t=timer(value);return t.elapsedMs+(t.runningSince?Math.max(0,now-t.runningSince):0);}
  function act(value,action,now=Date.now()){const t=timer(value);if(action==='start'&&!t.runningSince)t.runningSince=now;if(action==='pause'){t.elapsedMs=elapsed(t,now);t.runningSince=null;}if(action==='reset'){t.elapsedMs=0;t.runningSince=null;}t.updatedAt=Math.max(now,t.updatedAt+1);return t;}
  function format(ms){const seconds=Math.floor(ms/1000),h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;return(h?h+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
  global.ReadingUI={svg,button};global.ReadingTimerCore={timer,elapsed,act,format};
})(window);
