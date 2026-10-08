/* Load before app.js; uses the shared reading extension interface. */
(function () {
  'use strict';
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const chars=text=>segmenter?Array.from(segmenter.segment(text.normalize('NFC')),x=>x.segment):Array.from(text.normalize('NFC'));
  const list=text=>text.trim().split(/[\s,]+/u).filter(Boolean).map(w=>w.normalize('NFC'));
  const cleanPart=text=>text.trim().replace(/^-+|-+$/g,'').normalize('NFC');
  function match(word,part){const w=chars(word),p=chars(part);for(let start=0;start<=w.length-p.length;start++){if(p.every((c,i)=>c.toLocaleLowerCase()===w[start+i].toLocaleLowerCase()))return{start,end:start+p.length};}return null;}
  let lesson=null;
  $(function(){
    const params=new URLSearchParams(location.search);if(params.has('part'))$('#wp-part').val(cleanPart(params.get('part')));
    document.getElementById('setup').addEventListener('submit',event=>{
      const part=cleanPart($('#wp-part').val()),words=list($('#text').val());let error='';
      if(!part)error='Enter a word part.';else if(!words.length)error='Enter at least one word.';
      else{const invalid=words.filter(w=>!match(w,part));if(invalid.length)error=`These words do not contain “${part}”: ${invalid.join(', ')}.`;}
      if(error){event.preventDefault();event.stopImmediatePropagation();$('#message').text(error);return;}
      lesson={part,words};
    },true);
  });
  window.ReadingPyramid=function(api){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let intro=true,busy=false,animationTimer=null,advanceTimer=null,scheduledIndex=null,snapshot=null;
    let observerTimer=null,epoch=0,paused=false;
    const rowAt=i=>api.$pages.find('.wp-word').eq(i);
    function clearAdvance(){clearTimeout(advanceTimer);advanceTimer=null;scheduledIndex=null;}
    function stop(){epoch++;clearTimeout(animationTimer);clearTimeout(observerTimer);clearAdvance();busy=false;api.cancelDrags();}
    function updateControls(){
      const i=api.getCurrent(),count=api.getPages().length;
      $('#wp-count').text(intro?'Word part':`${i+1} of ${count}`);
      $('#wp-previous').prop('disabled',intro||busy||i===0);$('#wp-next').prop('disabled',intro||busy||i===count-1);
      api.$pages.find('.row-dot').attr('tabindex','-1');if(!intro&&!busy&&!paused)rowAt(i).find('.row-dot').attr('tabindex','0');
    }
    function focus(){const h=intro?api.$pages.find('#wp-begin')[0]:rowAt(api.getCurrent()).find('.row-dot')[0];if(h)h.focus({preventScroll:true});}
    function fit(){
      const available=Math.max(46,api.$pages[0].clientWidth-48),size=Number($('#size').val());api.$pages[0].style.setProperty('--text-size',size+'px');
      api.$pages.find('.wp-word').each(function(){
        const row=$(this),word=api.words()[Number(row.data('index'))];word.letters[0].style.removeProperty('--wp-word-size');
        const width=word.box[0].getBoundingClientRect().width;if(width>available)word.letters[0].style.setProperty('--wp-word-size',size*available/width+'px');
        const letters=word.letters.children().toArray(),first=letters[word.part.start].getBoundingClientRect(),last=letters[word.part.end-1].getBoundingClientRect();
        const rect=this.getBoundingClientRect(),partCenter=(first.left+last.right)/2;let offset=rect.width/2-(partCenter-rect.left);
        const limit=Math.max(0,(api.$pages[0].clientWidth-rect.width)/2-24);offset=Math.max(-limit,Math.min(limit,offset));this.style.setProperty('--anchor-offset',offset+'px');api.measure(word);api.paint(word);
      });api.restoreDots();
    }
    function checkAdvance(){
      if(paused||intro||busy||api.$reader.prop('hidden'))return;
      const index=api.getCurrent(),word=api.words()[index];
      if(!word||!word.complete){clearAdvance();return;}
      // Keep the word still while a pointer is held down.
      if(api.$pages.find('.dragging').length)return;
      if(scheduledIndex===index)return;
      clearAdvance();scheduledIndex=index;const token=epoch;
      advanceTimer=setTimeout(()=>{
        advanceTimer=null;scheduledIndex=null;
        if(token!==epoch||paused||intro||busy||api.$reader.prop('hidden')||api.getCurrent()!==index||api.$pages.find('.dragging').length)return;
        const active=api.words()[index];if(!active?.complete)return;
        active.value=1;api.paint(active);api.restoreDots();
        if(index<api.words().length-1)go(index+1,true);
        else if(api.words().every(w=>w.complete)){api.celebrate();$('#status').text('Great reading! You finished all the words.');}
      },350);
    }
    function status(){
      api.stopAdvance();if(intro||paused)return;
      const index=api.getCurrent(),word=api.words()[index];if(!word)return;
      $('#status').text(word.complete?(index===api.words().length-1?'Great reading! You finished this word.':'Great reading! Next word…'):'Drag the dot to sound out the word.');
      checkAdvance();
    }
    function go(index,moveFocus=false){
      const count=api.getPages().length;if(paused||intro||busy||index<0||index>=count||api.$pages.find('.dragging').length)return;
      clearAdvance();const previous=api.getCurrent();if(index===previous){if(moveFocus)focus();return;}
      busy=true;api.setCurrent(index);api.setSavedPage(index);
      const old=rowAt(previous),next=rowAt(index);old.removeClass('current-word incoming').addClass('outgoing');next.removeClass('outgoing').addClass('current-word incoming');updateControls();
      const token=epoch;
      animationTimer=setTimeout(()=>{
        if(token!==epoch)return;
        old.removeClass('outgoing');next.removeClass('incoming');busy=false;updateControls();status();if(moveFocus)focus();
        checkAdvance();
      },reduced.matches?0:320);
    }
    function begin(){
      if(!intro||busy||paused)return;busy=true;api.$pages.find('.wp-intro').addClass('leaving');const token=epoch;
      animationTimer=setTimeout(()=>{if(token!==epoch)return;api.$pages.find('.wp-intro').remove();intro=false;busy=false;api.setCurrent(0);rowAt(0).addClass('current-word');updateControls();status();focus();},reduced.matches?0:280);
    }
    function paginate(){
      const same=snapshot&&snapshot.first===api.words()[0]&&api.$pages.find('.wp-stage').length;stop();api.clearNavigation();paused=false;
      if(same){api.$pages.find('.wp-word').removeClass('outgoing incoming current-word');if(!intro)rowAt(api.getCurrent()).addClass('current-word');else api.$pages.find('.wp-intro').removeClass('leaving');fit();updateControls();status();return;}
      snapshot={...lesson,first:api.words()[0]};intro=true;api.setCurrent(0);api.words().forEach(w=>w.box.detach());api.$pages.empty();api.$measure.empty();
      const groups=api.words().map(word=>[word]);api.setPages(groups);const stage=$('<div class="wp-stage">').appendTo(api.$pages);
      groups.forEach((group,i)=>{const word=group[0];word.part=match(snapshot.words[i],snapshot.part);word.letters.children().each(function(j){$(this).toggleClass('part-letter',j>=word.part.start&&j<word.part.end);});const row=$('<div class="row-text wp-word">').data('index',i).append(word.box).appendTo(stage);api.bindRow(row,group,i);row.find('.row-dot').attr('aria-label',`Read ${snapshot.words[i]}`);});
      const slide=$('<section class="wp-intro" aria-label="Introduce the word part">').appendTo(api.$pages);$('<h2>').text('Our word part').appendTo(slide);$('<div class="wp-intro-part">').text(snapshot.part).appendTo(slide);$('<p>').text(`Look for ${snapshot.part} in each word.`).appendTo(slide);$('<button type="button" id="wp-begin" class="btn btn-primary btn-lg">').text('Let’s read →').on('click',begin).appendTo(slide);fit();updateControls();$('#status').text('Say the word part, then start reading.');
    }
    // Recheck after highlighting, pointer-release classes, and transition classes change.
    const observer=new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(checkAdvance,0);});
    observer.observe(api.$pages[0],{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    api.$pages.on('pointerdown.wpAdvance','.row-dot',clearAdvance);
    api.$pages.on('pointerup.wpAdvance pointercancel.wpAdvance',()=>{clearTimeout(observerTimer);observerTimer=setTimeout(checkAdvance,0);});
    $('#wp-previous').on('click',()=>go(api.getCurrent()-1,true));$('#wp-next').on('click',()=>go(api.getCurrent()+1,true));
    document.getElementById('edit').addEventListener('click',()=>{paused=true;stop();},true);
    $('#setup').on('submit.wordparts',()=>{paused=true;stop();});
    $('#wp-copy').on('click',async function(){
      if(!snapshot)return;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('part',snapshot.part);url.searchParams.set('text',snapshot.words.join(', '));
      try{if(location.protocol==='file:'||!navigator.clipboard)throw new Error('manual');await navigator.clipboard.writeText(url.href);$('#status').text('Lesson link copied.');}
      catch(error){$('#wp-link').val(url.href);$('#wp-local-warning').prop('hidden',location.protocol!=='file:');document.getElementById('wp-link-dialog').showModal();$('#wp-link').trigger('focus').select();}
    });$('#wp-close-dialog').on('click',()=>document.getElementById('wp-link-dialog').close());
    return{split:text=>list(text),paginate,status,update:()=>{updateControls();status();},focus,go};
  };
})();
