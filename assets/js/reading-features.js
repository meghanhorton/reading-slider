/* Load after pyramid.js/wordparts.js, but BEFORE app.js. app.js stays unchanged. */
(function(){
  'use strict';
  if(!document.getElementById('setup'))return;
  const originalFactory=window.ReadingPyramid;
  const normalSlider=!originalFactory;
  document.body.classList.add('pyramid-mode','slider-enhanced');if(normalSlider)document.body.classList.add('normal-slider-mode');
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const chars=text=>segmenter?Array.from(segmenter.segment(text.normalize('NFC')),s=>s.segment):Array.from(text.normalize('NFC'));
  const entries=text=>text.split(/[,\n]+/u).map(s=>s.trim().normalize('NFC').toLocaleLowerCase()).filter(Boolean);
  const params=new URLSearchParams(location.search);
  const form=document.getElementById('setup');
  const fieldset=document.createElement('fieldset');fieldset.className='emphasis-settings';
  fieldset.innerHTML='<legend>Reading emphasis</legend><label for="reading-groups" class="form-label">Letter combinations (comma-separated)</label><input id="reading-groups" class="form-control" placeholder="ee, ea, sh"><label for="reading-sight" class="form-label mt-3">Whole sight words (comma-separated)</label><input id="reading-sight" class="form-control" placeholder="the, to, you"><p class="small text-secondary mt-2 mb-0">Matched letters are highlighted together. The dot moves through these sections with a shorter drag.</p>';
  const submit=form.querySelector('button[type="submit"],button');form.insertBefore(fieldset,submit);
  document.getElementById('reading-groups').value=params.get('groups')||'';
  document.getElementById('reading-sight').value=params.get('sight')||'';
  function settings(){const groups=entries(document.getElementById('reading-groups').value);const part=document.getElementById('wp-part');if(part){const text=part.value.trim().replace(/^-+|-+$/g,'').toLocaleLowerCase();if(text)groups.push(text);}return{groups:[...new Set(groups)],sight:entries(document.getElementById('reading-sight').value)};}
  form.addEventListener('submit',()=>{try{const url=new URL(location.href);['groups','sight'].forEach(key=>{const value=document.getElementById(key==='groups'?'reading-groups':'reading-sight').value.trim();if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);});history.replaceState(null,'',url.href);}catch(error){}},true);
  function compileUnits(text,options){
    const letters=chars(text),lower=letters.map(c=>c.toLocaleLowerCase()),clean=text.toLocaleLowerCase().replace(/[^\p{L}\p{M}]/gu,'');
    if(options.sight.includes(clean))return[{start:0,end:letters.length,emphasis:true}];
    const combinations=options.groups.map(chars).filter(a=>a.length).sort((a,b)=>b.length-a.length),units=[];
    for(let i=0;i<letters.length;){const group=combinations.find(g=>g.every((c,j)=>lower[i+j]===c));const length=group?group.length:1;units.push({start:i,end:i+length,emphasis:!!group});i+=length;}return units;
  }
  function mapProgress(units,raw){
    raw=Math.max(0,Math.min(1,raw));if(raw===0||raw===1)return raw;
    const u=units.find(unit=>raw<=unit.inputEnd)||units[units.length-1];if(!u)return raw;
    const f=(raw-u.inputStart)/(u.inputEnd-u.inputStart);
    if(u.emphasis&&f>=.5)return u.endFraction;
    return u.startFraction+Math.max(0,Math.min(1,f))*(u.endFraction-u.startFraction);
  }
  function inverseProgress(units,value){
    value=Math.max(0,Math.min(1,value));if(value===0||value===1)return value;
    const u=units.find(unit=>value<=unit.endFraction)||units[units.length-1];if(!u)return value;
    const f=(value-u.startFraction)/(u.endFraction-u.startFraction);return u.inputStart+f*(u.inputEnd-u.inputStart);
  }
  window.ReadingGroupHelpers={compileUnits,mapProgress,inverseProgress};
  window.ReadingPyramid=function(api){
    const baseMeasure=api.measure;
    let extension=null;
    function measure(word){
      baseMeasure(word);
      const elements=word.letters.children().toArray(),rects=elements.map(el=>el.getBoundingClientRect()),track=word.slider[0].getBoundingClientRect();
      const units=compileUnits(word.letters.text(),settings());
      elements.forEach(el=>el.classList.remove('emphasis-letter'));
      units.forEach(unit=>{
        const first=rects[unit.start],last=rects[unit.end-1];
        unit.startFraction=unit.start===0?0:((rects[unit.start-1].right+first.left)/2-track.left)/track.width;
        unit.endFraction=unit.end===elements.length?1:((last.right+rects[unit.end].left)/2-track.left)/track.width;
        unit.startFraction=Math.max(0,Math.min(1,unit.startFraction));unit.endFraction=Math.max(unit.startFraction+.00001,Math.min(1,unit.endFraction));
        if(unit.emphasis){const threshold=((first.left+last.right)/2-track.left)/track.width;for(let i=unit.start;i<unit.end;i++){word.thresholds[i]=threshold;elements[i].classList.add('emphasis-letter');}}
      });
      const total=units.reduce((sum,u)=>sum+(u.endFraction-u.startFraction)*(u.emphasis?.4:1),0)||1;let at=0;
      units.forEach(u=>{u.inputStart=at;at+=(u.endFraction-u.startFraction)*(u.emphasis?.4:1)/total;u.inputEnd=at;});if(units.length)units[units.length-1].inputEnd=1;word.readingUnits=units;
    }
    api.measure=measure;
    api.bindRow=function(row,page,index){
      const handle=$('<div class="row-dot">').attr({role:'slider',tabindex:-1,'aria-label':`Reading progress, row ${index+1}`,'aria-orientation':'horizontal','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':0});row.append(handle);let pointer=null,offset=0;
      function bounds(){const origin=row[0].getBoundingClientRect().left;const segments=page.map(word=>{const r=word.slider[0].getBoundingClientRect();return{word,left:r.left-origin,width:r.width};});const last=segments[segments.length-1];return{segments,start:segments[0].left,end:last.left+last.width};}
      function position(x,b){row.data('dotX',x);row[0].style.setProperty('--dot-x',x+'px');handle.attr({'aria-valuenow':Math.round(100*(x-b.start)/(b.end-b.start)),'aria-valuetext':`${page.filter(w=>w.complete).length} of ${page.length} words passed`});}
      function apply(x){const b=bounds();x=Math.max(b.start,Math.min(b.end,x));let display=x;
        b.segments.forEach(s=>{const raw=Math.max(0,Math.min(1,(x-s.left)/s.width));s.word.value=mapProgress(s.word.readingUnits||[],raw);api.paint(s.word);if(x>=s.left&&x<=s.left+s.width)display=s.left+s.word.value*s.width;});row.data('rawX',x);position(display,b);extension.status();
      }
      function restore(){const b=bounds(),next=b.segments.find(s=>!s.word.complete);const display=next?next.left+next.word.value*next.width:b.end;row.data('rawX',next?next.left+inverseProgress(next.word.readingUnits||[],next.word.value)*next.width:b.end);position(display,b);}
      function move(p){apply(p.clientX-row[0].getBoundingClientRect().left-offset);}
      function cancel(){const id=pointer;pointer=null;row.removeClass('dragging');if(id!==null&&handle[0].hasPointerCapture(id))handle[0].releasePointerCapture(id);}
      handle.on('pointerdown',e=>{const p=e.originalEvent;if(!p.isPrimary||p.button!==0||pointer!==null||api.getCurrent()!==index||row.hasClass('incoming'))return;e.preventDefault();api.stopAdvance();page.forEach(measure);const r=row[0].getBoundingClientRect();const raw=Number(row.data('rawX'));offset=p.clientX-r.left-(Number.isFinite(raw)?raw:0);pointer=p.pointerId;row.addClass('dragging');handle[0].focus({preventScroll:true});handle[0].setPointerCapture(pointer);})
        .on('pointermove',e=>{if(e.originalEvent.pointerId===pointer)move(e.originalEvent);})
        .on('pointerup pointercancel',e=>{const p=e.originalEvent;if(p.pointerId!==pointer)return;if(p.type==='pointerup')move(p);cancel();extension.status(p.type==='pointerup');})
        .on('lostpointercapture',()=>{if(pointer===null)return;pointer=null;row.removeClass('dragging');extension.status();})
        .on('keydown',e=>{if(api.getCurrent()!==index)return;page.forEach(measure);const b=bounds(),x=Number(row.data('rawX'));let next;switch(e.key){case'ArrowRight':case'ArrowUp':next=x+12;break;case'ArrowLeft':case'ArrowDown':next=x-12;break;case'Home':next=b.start;break;case'End':next=b.end;break;default:return;}e.preventDefault();apply(next);extension.status(true);});
      row.data('restoreDot',restore).data('cancelDrag',cancel);
    };
    extension=originalFactory?originalFactory(api):standard(api);
    return extension;
  };
  function standard(api){
    let transition=null,advance=null,scrollTimer=null;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function dragging(){return api.$pages.find('.dragging').length>0;}
    function status(auto=false){clearTimeout(advance);const pages=api.getPages(),current=api.getCurrent();if(!pages[current])return;const complete=pages[current].every(w=>w.complete),all=api.words().every(w=>w.complete);$('#status').text(all?'Great reading! This example is complete.':complete?'Great reading!':'Drag the blue dot across the words as you read.');api.updateExamples();if(auto&&all&&!dragging())api.celebrate();if(auto&&complete&&current<pages.length-1&&!dragging()&&!transition)advance=setTimeout(()=>{if(api.getCurrent()===current&&!api.$reader.prop('hidden'))go(current+1,true);},650);}
    function update(){const current=api.getCurrent(),pages=api.getPages();api.setSavedPage(current);$('#prev').prop('disabled',current===0);$('#next').prop('disabled',current===pages.length-1);api.$pages.children('.page').each(function(i){$(this).find('.row-dot').attr('tabindex',i===current?'0':'-1');});status();}
    function focus(){const h=api.$pages.children('.page').eq(api.getCurrent()).find('.row-dot')[0];if(h)h.focus({preventScroll:true});}
    function go(index,moveFocus=false,smooth=true){if(index<0||index>=api.getPages().length||dragging())return;clearTimeout(advance);clearTimeout(scrollTimer);api.setCurrent(index);update();const el=api.$pages[0],top=index*el.clientHeight;if(!smooth||reduced.matches||Math.abs(el.scrollTop-top)<1){transition=null;el.scrollTo({top,behavior:'instant'});if(moveFocus)focus();}else{transition={index,moveFocus};el.scrollTo({top,behavior:'smooth'});}}
    api.$pages.on('scroll.readingEnhanced',()=>{clearTimeout(advance);clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{const el=api.$pages[0],index=Math.max(0,Math.min(api.getPages().length-1,Math.round(el.scrollTop/el.clientHeight)));const needFocus=transition&&transition.index===index&&transition.moveFocus;transition=null;api.setCurrent(index);update();if(needFocus)focus();},180);});
    function paginate(anchor,target=0){api.cancelDrags();api.stopAdvance();clearTimeout(advance);clearTimeout(scrollTimer);api.clearNavigation();transition=null;api.words().forEach(w=>w.box.detach());api.$pages.empty();api.$measure.empty();const probe=$('<div class="page">'),row=$('<div class="row-text">');probe.append(row);api.$pages.append(probe);const s=getComputedStyle(probe[0]),available=Math.max(46,probe[0].clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)),gap=parseFloat(getComputedStyle(row[0]).gap)||28,size=Number($('#size').val());probe.remove();api.words().forEach(w=>{w.letters[0].style.removeProperty('--word-size');api.$measure.append(w.box);let width=w.box[0].getBoundingClientRect().width;if(width>available){w.letters[0].style.setProperty('--word-size',size*available/width+'px');width=w.box[0].getBoundingClientRect().width;}w.width=width;});const pages=[];let group=[],width=0,sentence=null;function finish(){if(group.length)pages.push(group);group=[];width=0;}api.words().forEach(w=>{if(group.length&&(sentence!==w.sentence||width+gap+w.width>available))finish();sentence=w.sentence;width+=w.width+(group.length?gap:0);group.push(w);});finish();api.setPages(pages);pages.forEach((page,i)=>{const screen=$('<div class="page">').attr({role:'group','aria-label':`Reading row ${i+1}`}),row=$('<div class="row-text">');page.forEach(w=>row.append(w.box));screen.append(row);api.$pages.append(screen);api.bindRow(row,page,i);});api.words().forEach(w=>{api.measure(w);api.paint(w);});api.restoreDots();const index=pages.findIndex(page=>page.includes(anchor));go(index>=0?index:Math.min(target,pages.length-1),false,false);}
    document.getElementById('edit').addEventListener('click',()=>{clearTimeout(advance);clearTimeout(scrollTimer);transition=null;},true);
    return{split:text=>text.split(/(?<=[.!?…])\s+|(?<=[.!?…]["”’'])\s+|\n+/u),paginate,status,update,focus,go};
  }
  document.addEventListener('selectstart',event=>{if(event.target.closest?.('#reader')&&!event.target.closest('input,textarea'))event.preventDefault();});
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('.copy-link-button,#wp-copy');if(!button)return;
    const groups=document.getElementById('reading-groups').value.trim(),sight=document.getElementById('reading-sight').value.trim();if(!groups&&!sight)return;
    event.preventDefault();event.stopImmediatePropagation();const url=new URL(location.href);url.hash='';['text','csv','autostart','groups','sight'].forEach(key=>url.searchParams.delete(key));url.searchParams.set($('#mode').val()==='csv'?'csv':'text',$('#text').val().trim());if(document.getElementById('wp-part'))url.searchParams.set('part',$('#wp-part').val().trim().replace(/^-+|-+$/g,''));if(groups)url.searchParams.set('groups',groups);if(sight)url.searchParams.set('sight',sight);
    try{if(location.protocol==='file:'||!navigator.clipboard)throw new Error('manual');await navigator.clipboard.writeText(url.href);$('#status').text('Reading link copied, including emphasis settings.');}
    catch(error){let dialog=document.getElementById('emphasis-share-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='emphasis-share-dialog';dialog.innerHTML='<h2>Copy reading link</h2><textarea class="form-control" rows="5" readonly></textarea><button class="btn btn-primary mt-3">Close</button>';dialog.querySelector('button').addEventListener('click',()=>dialog.close());document.body.appendChild(dialog);}dialog.querySelector('textarea').value=url.href;dialog.showModal();dialog.querySelector('textarea').select();}
  },true);
})();
