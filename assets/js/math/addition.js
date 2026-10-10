/* Addition practice: settings, phone-style keypad and optional counting stars. */
(function(global){
  'use strict';
  const R=global.ReadingApp;
  const integer=(value,min,max,name)=>{if(value===null||value===undefined||String(value).trim()==='')throw Error('Enter '+name.toLowerCase()+'.');const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw Error(name+' must be a whole number from '+min+' to '+max+'.');return n;};
  function normalize(raw){
    const mode=raw.mode||'sum';if(!['sum','fixed','range'].includes(mode))throw Error('Choose a supported practice type.');
    const config={mode,count:integer(raw.count??10,1,50,'Question count'),includeZero:raw.includeZero===undefined?true:!!raw.includeZero};
    if(mode==='sum'){config.sumMin=integer(raw.sumMin??0,0,40,'Minimum sum');config.sumMax=integer(raw.sumMax??10,0,40,'Maximum sum');if(config.sumMin>config.sumMax)throw Error('Minimum sum must not exceed maximum sum.');}
    if(mode==='fixed'){config.fixed=integer(raw.fixed??5,0,20,'Fixed number');config.otherMin=integer(raw.otherMin??0,0,20,'Other-number minimum');config.otherMax=integer(raw.otherMax??5,0,20,'Other-number maximum');if(config.otherMin>config.otherMax)throw Error('Other-number minimum must not exceed its maximum.');}
    if(mode==='range'){config.min=integer(raw.min??0,0,20,'Minimum number');config.max=integer(raw.max??10,0,20,'Maximum number');if(config.min>config.max)throw Error('Minimum number must not exceed maximum number.');}
    return config;
  }
  function bank(raw){
    const c=normalize(raw),pairs=[],seen=new Set();
    const add=(a,b)=>{if(!c.includeZero&&(a===0||b===0))return;const key=Math.min(a,b)+','+Math.max(a,b);if(!seen.has(key)){seen.add(key);pairs.push({a,b});}};
    if(c.mode==='sum'){for(let a=0;a<=20;a++)for(let b=a;b<=20;b++)if(a+b>=c.sumMin&&a+b<=c.sumMax)add(a,b);}
    if(c.mode==='fixed'){for(let b=c.otherMin;b<=c.otherMax;b++)add(c.fixed,b);}
    if(c.mode==='range'){for(let a=c.min;a<=c.max;a++)for(let b=a;b<=c.max;b++)add(a,b);}
    if(!pairs.length)throw Error('No addition questions match these settings. Change the range or allow zero.');return pairs;
  }
  function questions(raw,rng=Math.random){
    const c=normalize(raw),pool=bank(c),result=[];let cycle=[];
    const key=q=>Math.min(q.a,q.b)+','+Math.max(q.a,q.b);
    while(result.length<c.count){
      if(!cycle.length){cycle=pool.map(q=>({...q}));for(let i=cycle.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cycle[i],cycle[j]]=[cycle[j],cycle[i]];}if(cycle.length>1&&result.length&&key(cycle[0])===key(result.at(-1)))[cycle[0],cycle[1]]=[cycle[1],cycle[0]];}
      let q=cycle.shift();if(c.mode!=='fixed'&&rng()<.5)q={a:q.b,b:q.a};result.push(q);
    }return result;
  }
  function appendDigit(buffer,digit){if(!/^[0-9]$/.test(String(digit)))return buffer;const next=buffer==='0'?String(digit):buffer+digit;return next.length<=2?next:buffer;}
  const correct=(buffer,q)=>/^\d{1,2}$/.test(buffer)&&Number(buffer)===q.a+q.b;
  R.additionMath={normalize,bank,questions,appendDigit,correct};
  class Addition {
    constructor(){
      this.form=R.$('#addition-settings');this.setup=R.$('#setup-panel');this.practice=R.$('#addition-practice');this.round=R.$('#addition-round');this.summary=R.$('#addition-summary');this.keys=Array.from(document.querySelectorAll('#addition-keypad button'));this.active=false;this.finished=false;this.locked=false;this.answer='';this.index=0;this.epoch=0;this.advance=null;
      this.editButton=R.action('addition-edit','edit','Edit addition settings',()=>this.edit());this.copyButton=R.action('addition-copy','copy','Copy addition practice link',()=>R.copyLink(this.url(this.config)));
      R.setAction(this.editButton,{visible:false});R.setAction(this.copyButton,{visible:false});
      R.creator.register(()=>{const c=this.readSettings();bank(c);return{url:this.url(c),title:this.description(c)};});
      this.bind();this.updateMode();this.loadURL();
    }
    readSettings(){const get=id=>R.$('#addition-'+id).value;return normalize({mode:get('mode'),count:get('count'),includeZero:R.$('#addition-zero').checked,sumMin:get('sum-min'),sumMax:get('sum-max'),fixed:get('fixed'),otherMin:get('other-min'),otherMax:get('other-max'),min:get('min'),max:get('max')});}
    description(c){return c.mode==='sum'?'Addition: sums '+c.sumMin+'–'+c.sumMax:c.mode==='fixed'?'Addition: add with '+c.fixed:'Addition: numbers '+c.min+'–'+c.max;}
    url(raw){const c=normalize(raw),url=R.siteURL('math/addition.html');for(const [key,value] of Object.entries(c))url.searchParams.set(key,typeof value==='boolean'?(value?'1':'0'):String(value));return url.href;}
    updateMode(){const mode=R.$('#addition-mode').value;document.querySelectorAll('[data-addition-mode]').forEach(panel=>{const visible=panel.dataset.additionMode===mode;panel.hidden=!visible;panel.querySelectorAll('input').forEach(input=>input.disabled=!visible);});}
    fill(c){R.$('#addition-mode').value=c.mode;R.$('#addition-count').value=c.count;R.$('#addition-zero').checked=c.includeZero;const fields={sumMin:'sum-min',sumMax:'sum-max',fixed:'fixed',otherMin:'other-min',otherMax:'other-max',min:'min',max:'max'};for(const [key,id] of Object.entries(fields))if(c[key]!==undefined)R.$('#addition-'+id).value=c[key];this.updateMode();}
    loadURL(){const params=new URLSearchParams(location.search);if(!params.has('mode'))return;try{const raw=Object.fromEntries(params);raw.includeZero=params.get('includeZero')!=='0';const c=normalize(raw);bank(c);this.fill(c);if(params.get('autostart')!=='0')this.start();}catch(error){R.$('#addition-settings-error').textContent='Could not load those settings: '+error.message;}}
    bind(){
      this.form.addEventListener('submit',event=>{event.preventDefault();try{if(this.form.reportValidity())this.start();}catch(error){R.$('#addition-settings-error').textContent=error.message;}});
      R.$('#addition-mode').addEventListener('change',()=>this.updateMode());
      document.querySelectorAll('[data-addition-preset]').forEach(button=>button.addEventListener('click',()=>{const preset=button.dataset.additionPreset;let c={mode:'sum',sumMin:0,sumMax:Number(preset),count:Number(R.$('#addition-count').value)||10,includeZero:R.$('#addition-zero').checked};if(preset==='fixed5')c={...c,mode:'fixed',fixed:5,otherMin:0,otherMax:5};if(preset==='range')c={...c,mode:'range',min:0,max:10};this.fill(normalize(c));R.$('#addition-settings-error').textContent='';}));
      this.keys.forEach(button=>{if(button.dataset.digit!==undefined)button.addEventListener('click',()=>this.digit(button.dataset.digit));});
      R.$('#addition-backspace').addEventListener('click',()=>this.backspace());R.$('#addition-answer-form').addEventListener('submit',event=>{event.preventDefault();this.check();});R.$('#addition-hint').addEventListener('click',()=>this.hint());R.$('#addition-again').addEventListener('click',()=>this.start());
      document.addEventListener('keydown',event=>{if(!this.active||this.finished||event.ctrlKey||event.altKey||event.metaKey||event.target.closest('input,textarea,select,dialog,details'))return;if(/^[0-9]$/.test(event.key)){event.preventDefault();this.digit(event.key);}else if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();this.backspace();}else if(event.key==='Enter'&&event.target.tagName!=='BUTTON'){event.preventDefault();this.check();}});
    }
    stop(){clearTimeout(this.advance);this.advance=null;this.epoch++;R.stopCelebration();}
    start(){const c=this.readSettings(),list=questions(c);this.stop();this.config=c;this.list=list;this.index=0;this.active=true;this.finished=false;this.setup.hidden=true;this.practice.hidden=false;this.round.hidden=false;this.summary.hidden=true;R.$('#addition-settings-error').textContent='';R.setAction(this.editButton,{visible:true});R.setAction(this.copyButton,{visible:true});this.renderProblem();R.$('#addition-keypad [data-digit="1"]').focus({preventScroll:true});}
    edit(){this.stop();this.active=false;this.practice.hidden=true;this.setup.hidden=false;R.setAction(this.editButton,{visible:false});R.setAction(this.copyButton,{visible:false});R.$('#addition-mode').focus();}
    feedback(text,error=false){const el=R.$('#addition-feedback');el.textContent=text;el.classList.toggle('is-error',error);}
    renderAnswer(){R.$('#addition-answer').textContent=this.answer||'?';}
    renderProblem(){this.answer='';this.locked=false;this.keys.forEach(button=>button.disabled=false);const q=this.list[this.index];R.$('#addition-a').textContent=q.a;R.$('#addition-b').textContent=q.b;R.$('#addition-progress').textContent='Question '+(this.index+1)+' of '+this.list.length;R.$('#addition-question-description').textContent='What is '+q.a+' plus '+q.b+'?';this.renderAnswer();this.feedback('Tap the numbers, then check your answer.');R.$('#addition-stars').hidden=true;R.$('#addition-hint').setAttribute('aria-expanded','false');this.renderStars(q);}
    digit(value){if(!this.active||this.finished||this.locked)return;this.answer=appendDigit(this.answer,value);this.renderAnswer();this.feedback('');}
    backspace(){if(!this.active||this.finished||this.locked)return;this.answer=this.answer.slice(0,-1);this.renderAnswer();this.feedback('');}
    check(){if(!this.active||this.finished||this.locked)return;if(this.answer===''){this.feedback('Tap a number first.',true);return;}if(!correct(this.answer,this.list[this.index])){this.feedback('Not yet. Try again, or tap ? to count the stars.',true);return;}this.locked=true;this.keys.forEach(button=>button.disabled=true);this.feedback('Great adding!');const epoch=this.epoch;this.advance=setTimeout(()=>{if(epoch!==this.epoch||!this.active)return;this.advance=null;this.index++;if(this.index===this.list.length)this.finish();else this.renderProblem();},800);}
    finish(){this.finished=true;this.round.hidden=true;this.summary.hidden=false;R.$('#addition-result').textContent='You finished '+this.list.length+' addition questions!';R.celebrate();R.$('#addition-again').focus({preventScroll:true});}
    hint(){const stars=R.$('#addition-stars'),show=stars.hidden;stars.hidden=!show;R.$('#addition-hint').setAttribute('aria-expanded',String(show));}
    renderStars(q){
      for(const [side,count] of [['a',q.a],['b',q.b]]){const pile=R.$('#addition-stars-'+side);pile.replaceChildren();pile.setAttribute('aria-label',count+' stars in the '+(side==='a'?'first':'second')+' group');if(!count){const text=document.createElement('span');text.className='addition-no-stars';text.textContent='No stars';pile.appendChild(text);continue;}
        for(let i=0;i<count;i++){const star=document.createElementNS('http://www.w3.org/2000/svg','svg');star.setAttribute('viewBox','0 0 40 40');star.setAttribute('aria-hidden','true');star.classList.add('addition-count-star');const shape=document.createElementNS('http://www.w3.org/2000/svg','polygon');shape.setAttribute('points','20,3 25,14 37,15 28,23 31,36 20,29 9,36 12,23 3,15 15,14');shape.setAttribute('fill',side==='a'?'#FFC567':'#FC7DA8');shape.setAttribute('stroke','#552CB8');shape.setAttribute('stroke-width','1.5');star.appendChild(shape);pile.appendChild(star);}
      }
    }
  }
  R.AdditionController=Addition;
  $(function(){R.init();if(document.body.dataset.page==='addition')new Addition();});
})(window);
