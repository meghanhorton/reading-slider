$(function () {
  'use strict';
  const S=window.LessonStore;let plan=null,editing=false;
  const example={"version": 1, "id": "", "title": "Reading Lesson", "updatedAt": 0, "sections": [{"id": "section-0", "title": "Word Parts", "items": [{"id": "activity-0-0", "title": "-AG", "url": "https://meghanhorton.github.io/reading-slider/wordparts.html?part=ag&text=tag%2C+sag%2C+wag%2C+bag", "done": false}, {"id": "activity-0-1", "title": "-AD", "url": "https://meghanhorton.github.io/reading-slider/wordparts.html?part=ad&text=dad%2C+sad%2C+bad%2C+mad", "done": false}, {"id": "activity-0-2", "title": "AR", "url": "https://meghanhorton.github.io/reading-slider/wordparts.html?part=ar&text=car%2C+star%2C+far%2C+barn%2C+bar%2C+park%2C+jar%2C+part%2C+art%2C+harm%2C+farm%2C+sharp%2C+march%2C+start%2C+yard%2C+hard", "done": false}]}, {"id": "section-1", "title": "Word Pyramid", "items": [{"id": "activity-1-0", "title": "We know where...", "url": "https://meghanhorton.github.io/reading-slider/pyramid.html?text=We%0AWe+know%0AWe+know+where%0AWe+know+where+we+could%0AWe+know+where+we+could+stand+around.", "done": false}]}, {"id": "section-2", "title": "More Word Parts", "items": [{"id": "activity-2-0", "title": "ALK", "url": "https://meghanhorton.github.io/reading-slider/wordparts.html?part=alk&text=walk%2C+talk%2C+chalk%2C+stalk", "done": false}, {"id": "activity-2-1", "title": "OLD", "url": "https://meghanhorton.github.io/reading-slider/wordparts.html?part=old&text=old%2C+gold%2C+cold%2C+sold%2C+bold%2C+mold%2C+hold%2C+told%2C+scold%2C+fold", "done": false}]}, {"id": "section-3", "title": "Sight Words", "items": [{"id": "activity-3-0", "title": "Booster A - 1", "url": "https://meghanhorton.github.io/reading-slider/slider.html?text=he+%0Ashe+%0Ame%0Athe+%0Awe+%0Ato%0Ayou+%0Alove+%0Ago", "done": false}]}]};
  function examplePlan(){const copy=JSON.parse(JSON.stringify(example));copy.id=S.id();return copy;}
  function message(text){$('#lesson-message').text(text);}
  function persist(){const stored=S.save(plan);try{history.replaceState(null,'',S.lessonURL(plan));}catch(error){}if(!stored)message('Browser storage is unavailable. Copy the lesson link to keep your changes.');}
  function changed(){S.touch(plan);persist();updateProgress();}
  function updateProgress(){const items=plan.sections.flatMap(s=>s.items),done=items.filter(i=>i.done).length;$('#lesson-progress').text(`${done} of ${items.length} activities complete`);}
  function activityURL(item){const url=new URL(S.safeURL(item.url));if(url.origin===location.origin&&/\/(slider|pyramid|wordparts)\.html$/.test(url.pathname)){url.hash='lesson='+S.encode({version:1,plan,itemId:item.id,returnBase:new URL('lesson.html',location.href).href});}return url.href;}
  function render(){
    $('#lesson-title').text(plan.title);$('#lesson-title-input').val(plan.title);$('#lesson-page').toggleClass('lesson-editing',editing);$('#lesson-edit').text(editing?'Done editing':'Edit lesson');
    const root=$('#lesson-sections').empty();
    plan.sections.forEach((section,index)=>{
      const card=$('<section class="lesson-section">').attr('data-section',section.id).appendTo(root);
      const heading=$('<div class="lesson-section-heading">').appendTo(card);$('<h2 class="lesson-view">').text(section.title).appendTo(heading);
      $('<input class="form-control lesson-editor section-title">').val(section.title).attr({'aria-label':'Section title','maxlength':200}).appendTo(heading);
      const controls=$('<div class="lesson-editor lesson-section-actions">').appendTo(heading);
      $('<button type="button" class="btn btn-sm btn-outline-secondary section-up" aria-label="Move section up">').text('↑').prop('disabled',index===0).appendTo(controls);
      $('<button type="button" class="btn btn-sm btn-outline-secondary section-down" aria-label="Move section down">').text('↓').prop('disabled',index===plan.sections.length-1).appendTo(controls);
      $('<button type="button" class="btn btn-sm btn-outline-danger section-delete">').text('Remove section').appendTo(controls);
      const list=$('<ul class="lesson-items">').appendTo(card);
      section.items.forEach((item,i)=>{
        const row=$('<li class="lesson-item">').toggleClass('is-complete',item.done).attr('data-item',item.id).appendTo(list);
        $('<input type="checkbox" class="form-check-input lesson-check">').prop('checked',item.done).attr('aria-label',`Mark ${item.title} completed`).appendTo(row);
        const content=$('<div class="lesson-item-content">').appendTo(row);
        $('<a class="lesson-activity lesson-view">').attr('href',S.safeURL(item.url)).text(item.title).appendTo(content);
        $('<input class="form-control lesson-editor item-title">').val(item.title).attr({'aria-label':'Activity title','maxlength':200}).appendTo(content);
        $('<input type="url" class="form-control lesson-editor item-url">').val(item.url).attr('aria-label','Activity URL').appendTo(content);
        const actions=$('<div class="lesson-editor lesson-item-actions">').appendTo(content);
        $('<button type="button" class="btn btn-sm btn-outline-secondary item-up" aria-label="Move activity up">').text('↑').prop('disabled',i===0).appendTo(actions);
        $('<button type="button" class="btn btn-sm btn-outline-secondary item-down" aria-label="Move activity down">').text('↓').prop('disabled',i===section.items.length-1).appendTo(actions);
        $('<button type="button" class="btn btn-sm btn-outline-danger item-delete">').text('Remove').appendTo(actions);
      });
      $('<button type="button" class="btn btn-outline-primary lesson-editor item-add">').text('+ Add activity').appendTo(card);
    });updateProgress();
  }
  function locate(el){const sid=$(el).closest('[data-section]').attr('data-section'),iid=$(el).closest('[data-item]').attr('data-item');const section=plan.sections.find(s=>s.id===sid);return{section,item:section?.items.find(i=>i.id===iid)};}
  $('#lesson-edit').on('click',()=>{editing=!editing;render();});
  $('#lesson-title-input').on('input',function(){plan.title=this.value||'Reading Lesson';$('#lesson-title').text(plan.title);changed();});
  $('#lesson-sections').on('change','.lesson-check',function(){const {item}=locate(this);item.done=this.checked;$(this).closest('.lesson-item').toggleClass('is-complete',item.done);changed();})
    .on('input','.section-title',function(){locate(this).section.title=this.value;changed();})
    .on('input','.item-title',function(){locate(this).item.title=this.value;changed();})
    .on('change','.item-url',function(){try{locate(this).item.url=S.safeURL(this.value);$(this).removeClass('is-invalid');message('');changed();}catch(error){$(this).addClass('is-invalid');message(error.message);}})
    .on('click','.lesson-activity',function(event){event.preventDefault();const {item}=locate(this);persist();location.assign(activityURL(item));})
    .on('click','.item-add',function(){if(plan.sections.flatMap(s=>s.items).length>=200){message('Maximum 200 activities per plan.');return;}const {section}=locate(this);section.items.push({id:S.id(),title:'New activity',url:new URL('slider.html',location.href).href,done:false});changed();render();})
    .on('click','.item-delete',function(){const {section,item}=locate(this);section.items=section.items.filter(i=>i!==item);changed();render();})
    .on('click','.section-delete',function(){const {section}=locate(this);if(!confirm('Remove this section and its activities?'))return;plan.sections=plan.sections.filter(s=>s!==section);changed();render();})
    .on('click','.item-up,.item-down',function(){const {section,item}=locate(this),i=section.items.indexOf(item),j=i+($(this).hasClass('item-up')?-1:1);if(j<0||j>=section.items.length)return;[section.items[i],section.items[j]]=[section.items[j],section.items[i]];changed();render();})
    .on('click','.section-up,.section-down',function(){const {section}=locate(this),i=plan.sections.indexOf(section),j=i+($(this).hasClass('section-up')?-1:1);if(j<0||j>=plan.sections.length)return;[plan.sections[i],plan.sections[j]]=[plan.sections[j],plan.sections[i]];changed();render();});
  $('#lesson-add-section').on('click',()=>{if(plan.sections.length>=50){message('Maximum 50 sections per plan.');return;}plan.sections.push({id:S.id(),title:'New section',items:[]});changed();render();});
  $('#lesson-clear').on('click',()=>{if(!confirm('Clear all completion checkboxes?'))return;plan.sections.forEach(s=>s.items.forEach(i=>i.done=false));changed();render();});
  $('#lesson-new').on('click',()=>{if(!confirm('Start a new blank plan? Your current plan remains saved in its link.'))return;plan={version:1,id:S.id(),title:'New Reading Lesson',updatedAt:0,sections:[]};editing=true;changed();render();});
  function showLink(url){$('#lesson-link').val(url);document.getElementById('lesson-share-dialog').showModal();$('#lesson-link').trigger('focus').select();}
  $('#lesson-copy').on('click',async()=>{persist();const url=S.lessonURL(plan);try{if(location.protocol==='file:'||!navigator.clipboard)throw new Error('manual');await navigator.clipboard.writeText(url);message('Lesson link copied. Open it on your iPad.');}catch(error){showLink(url);}});
  $('#lesson-share').on('click',async()=>{persist();const url=S.lessonURL(plan);if(navigator.share){try{await navigator.share({title:plan.title,url});}catch(error){if(error.name!=='AbortError')showLink(url);}}else showLink(url);});
  $('#lesson-dialog-close').on('click',()=>document.getElementById('lesson-share-dialog').close());
  $('#lesson-export').on('click',()=>{const blob=new Blob([JSON.stringify(plan,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(plan.title.replace(/[^a-z0-9_-]+/gi,'-')||'lesson')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('#lesson-import').on('change',async function(){if(!this.files[0])return;try{plan=S.normalize(JSON.parse(await this.files[0].text()));editing=false;changed();render();message('Lesson imported.');}catch(error){message('Import failed: '+error.message);}this.value='';});
  try{const encoded=new URLSearchParams(location.hash.slice(1)).get('plan');plan=encoded?S.freshest(S.normalize(S.decode(encoded))):S.last()||examplePlan();render();persist();}
  catch(error){plan=examplePlan();render();message('Could not load that lesson link: '+error.message+' The example is shown instead.');}
});
