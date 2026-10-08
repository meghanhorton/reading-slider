$(function () {
  'use strict';
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const chars=text=>segmenter?Array.from(segmenter.segment(text),s=>s.segment):Array.from(text);
  let targets=[],targetSet=new Set(),completed=new Set(),tokens=[],nextId=0,locked=false,clearTimer=null;
  let pointer=null,suppressUntil=0;
  const $reader=$('#reader'),$board=$('#lt-board');
  function feedback(text,positive=false){$('#lt-feedback').text(text).toggleClass('positive',positive);}
  function parse(text){const words=text.normalize('NFC').toLocaleLowerCase().split(/[\s,;]+/u).filter(Boolean);const invalid=words.filter(w=>!/^\p{L}[\p{L}\p{M}]*$/u.test(w));if(invalid.length)throw new Error('Use single spelling words containing letters only: '+invalid.join(', '));return [...new Set(words)];}
  function makeTile(letter,id=null){
    const tile=$('<div class="lt-tile">');if(id!==null)tile.attr('data-token',id);else tile.attr('data-bank-letter',letter);
    $('<button type="button" class="lt-grab">').text(letter).attr('aria-label',id===null?`Add letter ${letter}`:`Move letter ${letter}`).appendTo(tile);
    if(id!==null)$('<button type="button" class="lt-remove">').text('×').attr('aria-label',`Remove letter ${letter}`).appendTo(tile);return tile;
  }
  function renderBoard(){
    $board.empty().removeClass('is-correct');
    if(!tokens.length)$('<p class="lt-placeholder">').text('Drag letters here').appendTo($board);
    tokens.forEach(t=>$board.append(makeTile(t.letter,t.id)));
    $('#lt-clear,#lt-delete,#lt-check').prop('disabled',locked||!tokens.length);
  }
  function updateProgress(){$('#lt-progress').text(`${completed.size} of ${targets.length} words completed`);}
  function check(manual=false){
    if(locked||!tokens.length)return;const word=tokens.map(t=>t.letter).join('');
    if(!targetSet.has(word)){if(manual)feedback('Keep trying! Check the letters and their order.');return;}
    if(completed.has(word)){feedback('You already spelled that word! Try another one.',true);return;}
    completed.add(word);$('<li>').text(word).appendTo('#lt-completed-list');updateProgress();
    feedback(completed.size===targets.length?'Wonderful! You spelled every word!':`Great spelling! ${word} is correct.`,true);
    locked=true;$board.addClass('is-correct');$('#lt-clear,#lt-delete,#lt-check').prop('disabled',true);
    clearTimer=setTimeout(()=>{locked=false;if(completed.size<targets.length){tokens=[];renderBoard();feedback('Ready for the next word!',true);}else $('#lt-clear,#lt-delete,#lt-check').prop('disabled',!tokens.length);},1100);
  }
  function changed(){renderBoard();feedback('');check();}
  function add(letter,index=tokens.length){if(locked)return;tokens.splice(index,0,{id:++nextId,letter});changed();}
  function remove(id){if(locked)return;tokens=tokens.filter(t=>t.id!==id);changed();}
  function insertionIndex(x,y,exclude=null){
    const candidates=$board.children('.lt-tile').toArray().filter(el=>Number(el.dataset.token)!==exclude);
    if(!candidates.length)return 0;
    let nearest=0,distance=Infinity;
    candidates.forEach((el,i)=>{const r=el.getBoundingClientRect(),dx=x-(r.left+r.width/2),dy=y-(r.top+r.height/2),d=dx*dx+dy*dy*4;if(d<distance){distance=d;nearest=i;}});
    const rect=candidates[nearest].getBoundingClientRect();return nearest+(x>rect.left+rect.width/2?1:0);
  }
  function inside(el,x,y){const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
  function ghostPosition(p){pointer.ghost[0].style.setProperty('--ghost-x',p.clientX+'px');pointer.ghost[0].style.setProperty('--ghost-y',p.clientY+'px');}
  function endPointer(){
    if(!pointer)return;const old=pointer;pointer=null;old.ghost?.remove();old.source.closest('.lt-tile').removeClass('lt-drag-source');$board.removeClass('is-drop-target');
    if(old.source[0].hasPointerCapture(old.id))old.source[0].releasePointerCapture(old.id);
  }
  $('#lt-bank,#lt-board').on('pointerdown','.lt-grab',function(event){
    const p=event.originalEvent;if(locked||pointer||!p.isPrimary||p.button!==0)return;
    event.preventDefault();this.focus({preventScroll:true});const tile=$(this).closest('.lt-tile');
    pointer={id:p.pointerId,source:$(this),letter:$(this).text(),token:tile.attr('data-token')===undefined?null:Number(tile.attr('data-token')),x:p.clientX,y:p.clientY,moved:false,ghost:null};this.setPointerCapture(p.pointerId);
  }).on('pointermove','.lt-grab',function(event){
    const p=event.originalEvent;if(!pointer||p.pointerId!==pointer.id)return;
    if(!pointer.moved&&Math.hypot(p.clientX-pointer.x,p.clientY-pointer.y)>6){pointer.moved=true;pointer.ghost=makeTile(pointer.letter).addClass('lt-ghost').attr('aria-hidden','true').appendTo('body');pointer.source.closest('.lt-tile').addClass('lt-drag-source');}
    if(pointer.moved){ghostPosition(p);$board.toggleClass('is-drop-target',inside($board[0],p.clientX,p.clientY));}
  }).on('pointerup pointercancel','.lt-grab',function(event){
    const p=event.originalEvent;if(!pointer||p.pointerId!==pointer.id)return;
    const old=pointer;const drop=p.type==='pointerup'&&old.moved&&inside($board[0],p.clientX,p.clientY);const index=drop?insertionIndex(p.clientX,p.clientY,old.token):0;
    endPointer();suppressUntil=Date.now()+500;
    if(p.type!=='pointerup')return;
    if(!old.moved){if(old.token===null)add(old.letter);return;}
    if(drop){if(old.token===null)add(old.letter,index);else{const token=tokens.find(t=>t.id===old.token);tokens=tokens.filter(t=>t.id!==old.token);tokens.splice(index,0,token);changed();}}
    else if(old.token!==null&&inside($('#lt-bank')[0],p.clientX,p.clientY))remove(old.token);
  }).on('lostpointercapture','.lt-grab',function(event){if(pointer&&event.originalEvent.pointerId===pointer.id)endPointer();});
  $('#lt-bank').on('click','.lt-grab',function(event){if(event.detail!==0&&Date.now()<suppressUntil)return;add($(this).text());});
  $board.on('click','.lt-remove',function(){remove(Number($(this).closest('.lt-tile').attr('data-token')));})
    .on('keydown','.lt-grab',function(event){
      if(locked)return;const id=Number($(this).closest('.lt-tile').attr('data-token')),i=tokens.findIndex(t=>t.id===id);if(i<0)return;
      if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();remove(id);}
      else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const j=i+(event.key==='ArrowLeft'?-1:1);if(j<0||j>=tokens.length)return;[tokens[i],tokens[j]]=[tokens[j],tokens[i]];changed();$board.find(`[data-token="${id}"] .lt-grab`).trigger('focus');}
    });
  $('#lt-check').on('click',()=>check(true));$('#lt-clear').on('click',()=>{if(locked)return;tokens=[];changed();});$('#lt-delete').on('click',()=>{if(locked)return;tokens.pop();changed();});
  $('#lt-form').on('submit',async function(event){
    event.preventDefault();let words;try{words=parse($('#lt-words').val());if(!words.length)throw new Error('Enter at least one spelling word.');if(words.length>200)throw new Error('Maximum 200 words per lesson.');}catch(error){$('#lt-error').text(error.message);return;}
    const button=$(this).find('button');button.prop('disabled',true);try{if(document.fonts)await document.fonts.load('52px "KG Primary Penmanship Alt"');}catch(error){console.warn(error);}button.prop('disabled',false);$('#lt-error').text('');
    endPointer();clearTimeout(clearTimer);targets=words;targetSet=new Set(words);completed=new Set();tokens=[];locked=false;$('#lt-completed-list').empty();
    const letters=[...new Set(words.flatMap(chars))].sort((a,b)=>a.localeCompare(b));$('#lt-bank').empty();letters.forEach(letter=>$('#lt-bank').append(makeTile(letter)));renderBoard();updateProgress();feedback('Listen to your teacher, then spell a word.');
    $('#lt-setup').prop('hidden',true);$reader.prop('hidden',false);$('body').addClass('reading');$('#lt-bank .lt-grab').first().trigger('focus');
  });
  $('#edit').on('click',()=>{endPointer();clearTimeout(clearTimer);$reader.prop('hidden',true);$('#lt-setup').prop('hidden',false);$('body').removeClass('reading');$('#lt-words').trigger('focus');});
  $('#lt-copy').on('click',async()=>{const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('text',targets.join(', '));try{if(location.protocol==='file:'||!navigator.clipboard)throw new Error('manual');await navigator.clipboard.writeText(url.href);feedback('Spelling lesson link copied.');}catch(error){$('#lt-share-url').val(url.href);document.getElementById('lt-share-dialog').showModal();$('#lt-share-url').trigger('focus').select();}});
  $('#lt-share-close').on('click',()=>document.getElementById('lt-share-dialog').close());
  $(document).on('keydown',event=>{if(event.key==='Escape'&&!$reader.prop('hidden'))$('#edit').trigger('click');});
  const params=new URLSearchParams(location.search);if(params.has('text')||params.has('words')){$('#lt-words').val(params.get(params.has('text')?'text':'words'));if(params.get('autostart')!=='0')document.getElementById('lt-form').requestSubmit();}
});
