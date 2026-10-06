$(function () {
  'use strict';
  const $reader = $('#reader'), $pages = $('#pages'), $measure = $('#measure');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity:'grapheme'}) : null;
  let words = [], pages = [], current = 0, advance, settle, resize, navigating = null;
  let audio = null, celebrated = false, canvas = null, animation = null;
  function stopAdvance() { clearTimeout(advance); }
  function dragging() { return $pages.find('.dragging').length > 0; }
  function unlockAudio() {
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioClass) return;
      if (!audio) audio = new AudioClass();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch (error) { console.warn('Audio unavailable.', error); }
  }
  document.addEventListener('pointerdown', unlockAudio, {passive:true});
  document.addEventListener('keydown', unlockAudio);
  function stopConfetti() {
    cancelAnimationFrame(animation); animation = null;
    if (canvas) canvas.remove(); canvas = null;
  }
  function celebrate() {
    if (celebrated) return;
    celebrated = true;
    if (audio && audio.state === 'running') {
      const now = audio.currentTime;
      [[1046.5,.15,.85],[2093,.045,.6],[3139.5,.018,.4]].forEach(([frequency,volume,duration]) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0,now);
        gain.gain.linearRampToValueAtTime(volume,now+.012);
        gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(now); oscillator.stop(now+duration+.03);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    }
    stopConfetti(); canvas = document.createElement('canvas');
    canvas.classList.add('reading-confetti'); canvas.setAttribute('aria-hidden','true');
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) { stopConfetti(); return; }
    const width = innerWidth, height = innerHeight, ratio = Math.min(devicePixelRatio || 1,2);
    canvas.width = width*ratio; canvas.height = height*ratio; context.scale(ratio,ratio);
    const colors = ['#2375dc','#ffca48','#ec6394','#52b788','#9c7bea'];
    const particles = Array.from({length:reduced.matches?45:160},() => {
      const left = Math.random()<.5;
      return {x:reduced.matches?Math.random()*width:left?width*.12:width*.88,
        y:reduced.matches?Math.random()*height:height*.55,
        vx:(left?1:-1)*(100+Math.random()*330),vy:-270-Math.random()*430,
        size:5+Math.random()*7,rotation:Math.random()*6.28,spin:(Math.random()-.5)*12,
        color:colors[Math.floor(Math.random()*colors.length)]};
    });
    const start = performance.now(); let previous = start;
    function frame(now) {
      const duration = reduced.matches?1100:3200, elapsed = now-start;
      if (elapsed>duration) { stopConfetti(); return; }
      const dt = Math.min((now-previous)/1000,.04); previous = now;
      context.clearRect(0,0,width,height); context.globalAlpha = Math.min(1,(duration-elapsed)/650);
      particles.forEach(p => {
        if (!reduced.matches) { p.vy+=380*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.rotation+=p.spin*dt; }
        context.save(); context.translate(p.x,p.y); context.rotate(p.rotation);
        context.fillStyle=p.color; context.fillRect(-p.size/2,-p.size/3,p.size,p.size*.65); context.restore();
      });
      animation=requestAnimationFrame(frame);
    }
    animation=requestAnimationFrame(frame);
  }
  function measure(word) {
    const rect=word.slider[0].getBoundingClientRect();
    word.thresholds=word.letters.children().toArray().map(letter => {
      const r=letter.getBoundingClientRect();
      return Math.max(0,Math.min(1,(r.left+r.width/2-rect.left)/rect.width));
    });
  }
  function paint(word) {
    let passed=0;
    word.letters.children().each(function(index) {
      const read=word.value>0 && word.value>=word.thresholds[index];
      $(this).toggleClass('read',read); if(read)passed++;
    });
    word.complete=passed===word.thresholds.length;
  }
  function status(auto=false) {
    stopAdvance(); if(!pages[current])return;
    const complete=pages[current].every(w=>w.complete),allComplete=words.every(w=>w.complete);
    $('#status').text(allComplete?'Great reading! You finished the passage.':complete?'Great reading!':'Drag the blue dot across the words as you read.');
    if(!allComplete)celebrated=false;
    if(auto && allComplete && !dragging())celebrate();
    if(auto && complete && current<pages.length-1 && !navigating && !dragging()) {
      const from=current; advance=setTimeout(()=>{if(current===from && !$reader.prop('hidden'))go(current+1,true);},650);
    }
  }
  function update() {
    $('#count').text(`Page ${current+1} of ${pages.length}`);
    $('#prev').prop('disabled',current===0); $('#next').prop('disabled',current===pages.length-1);
    $pages.children('.page').each(function(index){$(this).find('.row-dot').attr('tabindex',index===current?'0':'-1');});
    status();
  }
  function focusHandle() {
    const handle=$pages.children('.page').eq(current).find('.row-dot')[0];
    if(handle)handle.focus({preventScroll:true});
  }
  function go(index,focus=false,smooth=true) {
    if(index<0 || index>=pages.length || dragging())return;
    stopAdvance();clearTimeout(settle);current=index;update();
    const container=$pages[0],top=index*container.clientHeight;
    if(!smooth || reduced.matches || Math.abs(container.scrollTop-top)<1) {
      navigating=null;container.scrollTo({top,behavior:'instant'});if(focus)focusHandle();
    } else {navigating={index,focus};container.scrollTo({top,behavior:'smooth'});}
  }
  $pages.on('scroll',function(){
    stopAdvance();clearTimeout(settle);
    settle=setTimeout(()=>{
      if($reader.prop('hidden') || !pages.length)return;
      const index=Math.max(0,Math.min(pages.length-1,Math.round($pages[0].scrollTop/$pages[0].clientHeight)));
      const focus=navigating && navigating.index===index && navigating.focus;
      navigating=null;current=index;update();if(focus)focusHandle();
    },180);
  }).on('wheel touchstart',function(event){if($(event.target).closest('.row-dot').length)return;navigating=null;stopAdvance();});
  function makeWord(text,sentence) {
    const box=$('<div class="word">'),letters=$('<div class="letters" aria-hidden="true">');
    const chars=segmenter?Array.from(segmenter.segment(text),item=>item.segment):Array.from(text);
    chars.forEach(c=>$('<span class="letter">').text(c).appendTo(letters));
    const slider=$('<div class="slider">').append($('<div class="track">'));box.append(letters,slider);
    return {box,letters,slider,sentence,value:0,complete:false,thresholds:[]};
  }
  function bindRow(row,page,pageNumber) {
    const handle=$('<div class="row-dot">').attr({role:'slider',tabindex:'-1','aria-label':`Reading progress for page ${pageNumber+1}`,'aria-orientation':'horizontal','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':0});
    row.append(handle);let pointer=null,offset=0;
    function geometry() {
      const origin=row[0].getBoundingClientRect().left;
      const segments=page.map(word=>{const r=word.slider[0].getBoundingClientRect();return {word,left:r.left-origin,width:r.width};});
      const last=segments[segments.length-1];return {segments,start:segments[0].left,end:last.left+last.width};
    }
    function position(x,bounds) {
      row.data('dotX',x);
      row[0].style.setProperty('--dot-x',x+'px');
      handle.attr({'aria-valuenow':Math.round(100*(x-bounds.start)/(bounds.end-bounds.start)),'aria-valuetext':`${page.filter(w=>w.complete).length} of ${page.length} words passed`});
    }
    function apply(x) {
      const bounds=geometry();x=Math.max(bounds.start,Math.min(bounds.end,x));
      bounds.segments.forEach(s=>{s.word.value=Math.max(0,Math.min(1,(x-s.left)/s.width));paint(s.word);});
      position(x,bounds);status(false);
    }
    function restore() {
      const bounds=geometry(),next=bounds.segments.find(s=>!s.word.complete);
      position(next?next.left+next.word.value*next.width:bounds.end,bounds);
    }
    function move(p){apply(p.clientX-row[0].getBoundingClientRect().left-offset);}
    function cancel() {
      const id=pointer;pointer=null;row.removeClass('dragging');
      if(id!==null && handle[0].hasPointerCapture(id))handle[0].releasePointerCapture(id);
    }
    handle.on('pointerdown',function(event){
      const p=event.originalEvent;if(!p.isPrimary || p.button!==0 || pointer!==null || navigating || current!==pageNumber)return;
      event.preventDefault();stopAdvance();const rect=handle[0].getBoundingClientRect();offset=p.clientX-(rect.left+rect.width/2);pointer=p.pointerId;
      page.forEach(measure);row.addClass('dragging');handle[0].focus({preventScroll:true});handle[0].setPointerCapture(pointer);
    }).on('pointermove',event=>{if(event.originalEvent.pointerId===pointer)move(event.originalEvent);})
      .on('pointerup pointercancel',function(event){const p=event.originalEvent;if(p.pointerId!==pointer)return;if(p.type==='pointerup')move(p);cancel();status(p.type==='pointerup');})
      .on('lostpointercapture',()=>{if(pointer===null)return;pointer=null;row.removeClass('dragging');status(false);})
      .on('keydown',function(event){
        if(navigating || current!==pageNumber)return;page.forEach(measure);const bounds=geometry(),x=Number(row.data('dotX'));let next;
        switch(event.key){case'ArrowRight':case'ArrowUp':next=x+12;break;case'ArrowLeft':case'ArrowDown':next=x-12;break;case'Home':next=bounds.start;break;case'End':next=bounds.end;break;default:return;}
        event.preventDefault();apply(next);status(true);
      });
    row.data('restoreDot',restore).data('cancelDrag',cancel);
  }
  function cancelDrags(){$pages.find('.row-text').each(function(){const fn=$(this).data('cancelDrag');if(fn)fn();});}
  function restoreDots(){$pages.find('.row-text').each(function(){const fn=$(this).data('restoreDot');if(fn)fn();});}
  function paginate(anchor) {
    cancelDrags();stopAdvance();clearTimeout(settle);navigating=null;
    words.forEach(w=>w.box.detach());$pages.empty();$measure.empty();
    const probe=$('<div class="page">'),row=$('<div class="row-text">');probe.append(row);$pages.append(probe);
    const style=getComputedStyle(probe[0]),available=Math.max(46,probe[0].clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
    const gap=parseFloat(getComputedStyle(row[0]).gap)||28,size=Number($('#size').val());probe.remove();
    words.forEach(w=>{
      w.letters[0].style.removeProperty('--word-size');$measure.append(w.box);let width=w.box[0].getBoundingClientRect().width;
      if(width>available){w.letters[0].style.setProperty('--word-size',size*available/width+'px');width=w.box[0].getBoundingClientRect().width;}
      w.width=width;
    });
    pages=[];let group=[],width=0,sentence=null;
    function finish(){if(group.length)pages.push(group);group=[];width=0;}
    words.forEach(w=>{if(group.length && (sentence!==w.sentence || width+gap+w.width>available))finish();sentence=w.sentence;width+=w.width+(group.length?gap:0);group.push(w);});finish();
    pages.forEach((page,index)=>{const screen=$('<div class="page">').attr({role:'group','aria-label':`Reading page ${index+1}`}),row=$('<div class="row-text">');page.forEach(w=>row.append(w.box));screen.append(row);$pages.append(screen);bindRow(row,page,index);});
    words.forEach(w=>{measure(w);paint(w);});restoreDots();const index=pages.findIndex(page=>page.includes(anchor));go(index>=0?index:0,false,false);
  }
  $('#setup').on('submit',async function(event){
    event.preventDefault();const text=$('#text').val().trim();if(!text){$('#message').text('Enter some text before starting.');return;}
    const button=$(this).find('button');button.prop('disabled',true);
    try{if(document.fonts)await document.fonts.load('64px "KG Primary Penmanship Alt"');}catch(error){console.warn('Custom font unavailable.',error);}
    button.prop('disabled',false);$('#message').text('');cancelDrags();stopAdvance();clearTimeout(settle);clearTimeout(resize);stopConfetti();celebrated=false;$pages.empty();$measure.empty();words=[];
    const sentences=text.split(/(?<=[.!?…])\s+|(?<=[.!?…]["”’'])\s+|\n+/u).map(s=>s.trim()).filter(Boolean);
    sentences.forEach((s,i)=>s.split(/\s+/u).forEach(word=>words.push(makeWord(word,i))));
    $reader.prop('hidden',false);$('body').addClass('reading');paginate(words[0]);focusHandle();
  });
  $('#size').on('input',function(){document.documentElement.style.setProperty('--text-size',this.value+'px');$('#size-label').text(this.value+'px');});
  $('#prev').on('click',()=>go(current-1,true));$('#next').on('click',()=>go(current+1,true));
  $('#reset').on('click',()=>{cancelDrags();stopConfetti();celebrated=false;words.forEach(w=>{w.value=0;paint(w);});restoreDots();go(0,true);});
  $('#edit').on('click',()=>{cancelDrags();stopAdvance();clearTimeout(settle);clearTimeout(resize);stopConfetti();navigating=null;$reader.prop('hidden',true);$('body').removeClass('reading');$('#text').trigger('focus');});
  $(window).on('resize',()=>{if($reader.prop('hidden'))return;stopAdvance();clearTimeout(resize);resize=setTimeout(()=>paginate(pages[current]?.[0]),120);});
  $(document).on('keydown',event=>{if($reader.prop('hidden'))return;if(event.key==='PageDown'){event.preventDefault();go(current+1,true);}else if(event.key==='PageUp'){event.preventDefault();go(current-1,true);}else if(event.key==='Escape')$('#edit').trigger('click');});
});
