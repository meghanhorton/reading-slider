from pathlib import Path
from html.parser import HTMLParser
import re,shutil

ROOT=Path(__file__).resolve().parent
ROUTES='  /* LANGUAGE ROUTING: shared root services and backward-compatible tool links. */\n  const appScript=Array.from(document.scripts).find(script=>script.src&&new URL(script.src,location.href).pathname.endsWith(\'/assets/js/app.js\'));\n  R.siteRoot=new URL(appScript?\'../../\':(location.pathname.includes(\'/language/\')?\'../\':\'./\'),appScript?appScript.src:location.href);\n  R.siteURL=path=>new URL(path,R.siteRoot);\n  R.languageFiles=new Set([\'slider.html\',\'pyramid.html\',\'wordparts.html\',\'lettertiles.html\']);\n  R.route=path=>{\n    const text=String(path),match=text.match(/^(?:\\.\\/)?(?:language\\/)?(slider\\.html|pyramid\\.html|wordparts\\.html|lettertiles\\.html)([?#].*)?$/);\n    return match?\'language/\'+match[1]+(match[2]||\'\'):text;\n  };\n  R.resolveURL=value=>{\n    const text=String(value||\'\');\n    const owned=/^(?:\\.\\/)?(?:language\\/)?(?:slider|pyramid|wordparts|lettertiles|lesson|index)\\.html(?:[?#]|$)/.test(text);\n    let url=new URL(owned?R.route(text):text,owned?R.siteRoot:location.href);\n    if(![\'http:\',\'https:\'].includes(url.protocol)&&!(location.protocol===\'file:\'&&url.protocol===\'file:\'))throw Error(\'Use an http or https activity link.\');\n    const file=url.pathname.split(\'/\').pop(),root=R.siteRoot.pathname;\n    const ours=url.origin===R.siteRoot.origin&&(url.pathname===root+file||url.pathname===root+\'language/\'+file);\n    const legacy=url.hostname===\'meghanhorton.github.io\'&&url.pathname.startsWith(\'/reading-slider/\')&&R.languageFiles.has(file);\n    if(R.languageFiles.has(file)&&(ours||legacy)){\n      const canonical=R.siteURL(\'language/\'+file);canonical.search=url.search;canonical.hash=url.hash;url=canonical;\n    }\n    return url;\n  };\n  R.mascotFiles={slider:\'reading-slider\',pyramid:\'sentence-pyramids\',wordparts:\'word-parts\',lettertiles:\'letter-tiles\',lesson:\'lesson-plan\'};\n  R.brandIcon=key=>R.mascotFiles[key]?\'<img class="tool-brand-mascot" src="\'+R.siteURL(\'assets/img/tool-icons/\'+R.mascotFiles[key]+\'.png\').href+\'" alt="" width="42" height="42">\':(R.toolIcon?R.toolIcon(key):R.icon(\'home\'));\n  if(R.toolMetadata?.home)R.toolMetadata.language={name:\'Language\',icon:R.toolMetadata.home.icon};\n'
STYLES="/* LANGUAGE STRUCTURE / COLORED TOOL HEADERS */\nbody[data-page='slider'] { --tool-band:var(--theme-light-blue,#048CD6); --tool-band-ink:#25194f; }\nbody[data-page='pyramid'] { --tool-band:var(--theme-orange,#FF6B43); --tool-band-ink:#25194f; }\nbody[data-page='wordparts'] { --tool-band:var(--theme-purple,#552CB8); --tool-band-ink:#fff; }\nbody[data-page='lettertiles'] { --tool-band:var(--theme-pink,#FC7DA8); --tool-band-ink:#25194f; }\nbody[data-page='lesson'] { --tool-band:var(--theme-yellow,#FFC567); --tool-band-ink:#25194f; }\nbody[data-page='slider'] .appbar,body[data-page='pyramid'] .appbar,body[data-page='wordparts'] .appbar,body[data-page='lettertiles'] .appbar,body[data-page='lesson'] .appbar { background:var(--tool-band); color:var(--tool-band-ink); border-bottom:0; }\nbody:is([data-page='slider'],[data-page='pyramid'],[data-page='wordparts'],[data-page='lettertiles'],[data-page='lesson']) .appbar .icon-button { background:transparent; border:2px solid #fff; color:var(--tool-band-ink); }\nbody:is([data-page='slider'],[data-page='pyramid'],[data-page='wordparts'],[data-page='lettertiles'],[data-page='lesson']) .appbar .icon-button:hover:not(:disabled) { background:#ffffff30; border-color:#fff; color:var(--tool-band-ink); }\nbody:is([data-page='slider'],[data-page='pyramid'],[data-page='wordparts'],[data-page='lettertiles'],[data-page='lesson']) .appbar .icon-button:focus-visible { outline:3px solid var(--tool-band-ink); outline-offset:3px; }\nbody:is([data-page='slider'],[data-page='pyramid'],[data-page='wordparts'],[data-page='lettertiles'],[data-page='lesson']) .appbar .tool-brand-name,body:is([data-page='slider'],[data-page='pyramid'],[data-page='wordparts'],[data-page='lettertiles'],[data-page='lesson']) .appbar .nav-count { color:var(--tool-band-ink); }\nbody:is([data-page='slider'],[data-page='pyramid'],[data-page='wordparts'],[data-page='lettertiles'],[data-page='lesson']) .appbar .tool-brand-icon { background:transparent; padding:0; width:44px; height:46px; border-radius:0; }\n.tool-brand-mascot { display:block; width:100%; height:100%; object-fit:contain; object-position:center bottom; }\nbody:is([data-page='slider'],[data-page='pyramid'],[data-page='wordparts'],[data-page='lettertiles'],[data-page='lesson']) .appbar .timer-value { background:#ffffff30; color:var(--tool-band-ink); border:1px solid #fff; }\n.hero-language-preview { padding:20px; }\n.hero-language-heading { display:flex; align-items:center; gap:10px; margin-bottom:16px; font-size:15px; font-weight:700; color:#25194f; }\n.hero-language-heading img { width:30px; height:34px; object-fit:contain; }\n.hero-language-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px 12px; }\n.hero-language-card { min-width:0; }\n.hero-language-art { display:flex; align-items:flex-end; justify-content:center; aspect-ratio:4/5; background:var(--tool-color); border-radius:18px; overflow:hidden; }\n.hero-language-art img { display:block; width:90%; height:90%; object-fit:contain; object-position:center bottom; }\n.hero-language-label { display:block; margin-top:7px; color:#552CB8; text-align:center; font-size:12px; line-height:1.3; font-weight:700; }\n.language-page-heading { margin:16px 0 32px; }\n.language-page-heading h1 { color:#25194f; font-weight:700; font-size:44px; }\n.language-page-heading p { color:#6f6684; }\n@media(max-width:576px) { .hero-language-preview { padding:16px; } .language-page-heading h1 { font-size:34px; } }\n"
PREVIEW='<div class="hero-preview hero-language-preview" aria-hidden="true">\n        <div class="hero-language-heading"><img src="assets/img/tool-icons/lesson-plan.png" alt=""><span>Language tools</span></div>\n        <div class="hero-language-grid">\n          <div class="hero-language-card tool-theme" data-tool="slider"><div class="hero-language-art"><img src="assets/img/tool-icons/reading-slider.png" alt="" width="2048" height="2304" decoding="async"></div><span class="hero-language-label">Reading Slider</span></div>\n          <div class="hero-language-card tool-theme" data-tool="pyramid"><div class="hero-language-art"><img src="assets/img/tool-icons/sentence-pyramids.png" alt="" width="2048" height="2304" decoding="async"></div><span class="hero-language-label">Sentence Pyramids</span></div>\n          <div class="hero-language-card tool-theme" data-tool="wordparts"><div class="hero-language-art"><img src="assets/img/tool-icons/word-parts.png" alt="" width="2048" height="2304" decoding="async"></div><span class="hero-language-label">Word Parts</span></div>\n          <div class="hero-language-card tool-theme" data-tool="lettertiles"><div class="hero-language-art"><img src="assets/img/tool-icons/letter-tiles.png" alt="" width="2048" height="2304" decoding="async"></div><span class="hero-language-label">Letter Tiles</span></div>\n        </div>\n      </div>'
HUB='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Language Tools</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"><link rel="stylesheet" href="../assets/css/styles.css"></head><body data-page="language"><nav id="appbar" class="appbar" aria-label="App navigation"><div class="nav-group" data-nav-slot="links"></div><span class="appbar-title"></span><div class="nav-group" data-nav-slot="reading"></div><div class="nav-group nav-actions" data-nav-slot="actions"></div><div class="nav-group" data-nav-slot="timer"></div><p id="app-notice" class="app-notice" role="status" aria-live="polite"></p></nav><main class="page-content home-content"><header class="language-page-heading"><h1>Language</h1><p>Reading and spelling tools</p></header><nav class="tool-grid" aria-label="Language tools"><a class="mascot-tool-card" data-tool="slider" href="slider.html"><span class="mascot-tool-art"><img src="../assets/img/tool-icons/reading-slider.png" alt="" width="2048" height="2304" loading="lazy" decoding="async"></span><h2 class="mascot-tool-title">Reading Slider</h2></a>\n<a class="mascot-tool-card" data-tool="pyramid" href="pyramid.html"><span class="mascot-tool-art"><img src="../assets/img/tool-icons/sentence-pyramids.png" alt="" width="2048" height="2304" loading="lazy" decoding="async"></span><h2 class="mascot-tool-title">Sentence Pyramids</h2></a>\n<a class="mascot-tool-card" data-tool="wordparts" href="wordparts.html"><span class="mascot-tool-art"><img src="../assets/img/tool-icons/word-parts.png" alt="" width="2048" height="2304" loading="lazy" decoding="async"></span><h2 class="mascot-tool-title">Word Parts</h2></a>\n<a class="mascot-tool-card" data-tool="lettertiles" href="lettertiles.html"><span class="mascot-tool-art"><img src="../assets/img/tool-icons/letter-tiles.png" alt="" width="2048" height="2304" loading="lazy" decoding="async"></span><h2 class="mascot-tool-title">Letter Tiles</h2></a></nav></main><script src="https://code.jquery.com/jquery-3.7.1.min.js"></script><script src="../assets/js/app.js"></script></body></html>'
TOOLS=['slider','pyramid','wordparts','lettertiles']
CONTROLLERS=['reading','lettertiles']
app_path=ROOT/'assets/js/app.js'
if not app_path.exists():raise SystemExit('Extract into the current repository root first.')
if '/* LANGUAGE ROUTING:' in app_path.read_text(encoding='utf-8'):
    raise SystemExit('Language reorganization is already installed. No files changed.')
required=['index.html','lesson.html','assets/css/styles.css','assets/js/app.js','assets/js/lesson.js']+[p+'.html' for p in TOOLS]+['assets/js/'+p+'.js' for p in CONTROLLERS]
for name in required:
    if not (ROOT/name).exists():raise SystemExit('Missing '+name+'. No files changed.')
for name in ['reading-slider','sentence-pyramids','word-parts','letter-tiles','lesson-plan']:
    if not (ROOT/'assets/img/tool-icons'/(name+'.png')).exists():raise SystemExit('Missing mascot '+name+'.png in assets/img/tool-icons/. No files changed.')
for name in TOOLS+['index']:
    if (ROOT/'language'/(name+'.html')).exists():raise SystemExit('Existing language/'+name+'.html would be overwritten. No files changed.')
original={name:(ROOT/name).read_text(encoding='utf-8') for name in required}
writes={}

class Locate(HTMLParser):
    def __init__(self,text,classname):
        super().__init__(convert_charrefs=False);self.offsets=[0]
        for line in text.splitlines(keepends=True):self.offsets.append(self.offsets[-1]+len(line))
        self.classname=classname;self.tag=None;self.depth=0;self.start=None;self.end=None;self.found=0
    def source_pos(self):
        row,col=self.getpos();return self.offsets[row-1]+col
    def handle_starttag(self,tag,attrs):
        if self.tag:
            if tag==self.tag:self.depth+=1
        elif self.classname in dict(attrs).get('class','').split():
            self.found+=1
            if self.found==1:self.tag=tag;self.depth=1;self.start=self.source_pos()
    def handle_endtag(self,tag):
        if tag==self.tag:
            self.depth-=1
            if not self.depth:self.end=self.source_pos()+len('</'+tag+'>');self.tag=None

def patch_once(text,old,new,name):
    if text.count(old)!=1:raise SystemExit('Unexpected source layout in '+name+'. No files changed.')
    return text.replace(old,new,1)

def html_links(text,nested=False):
    def change(m):
        value=m.group(3)
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:|^//|^#',value):return m.group(0)
        if value.startswith('assets/'):
            value=value.replace('assets/js/reading.js','assets/js/language/reading.js').replace('assets/js/lettertiles.js','assets/js/language/lettertiles.js')
            if nested:value='../'+value
        else:
            match=re.fullmatch(r'(?:language/)?(slider|pyramid|wordparts|lettertiles)\.html([?#].*)?',value)
            if match:value=('' if nested else 'language/')+match.group(1)+'.html'+(match.group(2)or'')
            elif nested and re.match(r'^(?:index|lesson)\.html(?:[?#]|$)',value):value='../'+value
        return m.group(1)+m.group(2)+value+m.group(2)
    return re.sub(r'(\b(?:href|src)\s*=\s*)([\'\"])([^\'\"]*)\2',change,text)

text=original['index.html'];loc=Locate(text,'hero-preview');loc.feed(text)
if loc.found!=1 or loc.end is None:raise SystemExit('Expected one homepage hero-preview. No files changed.')
text=text[:loc.start]+PREVIEW+text[loc.end:]
text=html_links(text)
text=re.sub(r'(<h2\b[^>]*\bid=[\'\"]practice-title[\'\"][^>]*>)[^<]*(</h2>)',r'\1Language\2',text,count=1)
writes['index.html']=text
writes['lesson.html']=html_links(original['lesson.html'])
for page in TOOLS:
    writes['language/'+page+'.html']=html_links(original[page+'.html'],nested=True)
    writes[page+'.html']='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Language tool</title></head><body><p>This tool is now in Language. <a href="language/'+page+'.html">Open the tool</a>.</p><script>location.replace("language/'+page+'.html"+location.search+location.hash);</script></body></html>\n'
writes['language/index.html']=HUB

name='assets/js/app.js';text=original[name]
text,count=re.subn(r'  R\.safeURL = value => \{[^\n]*\};', '  R.safeURL = value => R.resolveURL(value);',text,count=1)
if count!=1:raise SystemExit('Could not locate shared URL validation. No files changed.')
text,count=re.subn(r'  R\.localURL = value => \{[^\n]*\};', "  R.localURL = value => {const u=R.safeURL(value),file=u.pathname.split('/').pop();return R.languageFiles.has(file)&&u.origin===R.siteRoot.origin&&u.pathname===R.siteURL('language/'+file).pathname?'language/'+file+u.search+(new URLSearchParams(u.hash.slice(1)).has('lesson')?'':u.hash):u.href;};",text,count=1)
if count!=1:raise SystemExit('Could not locate shared lesson-link normalization. No files changed.')
text=patch_once(text,'  R.init = () => {',ROUTES+'  R.init = () => {',name)
text=patch_once(text,'a.href=href;', 'a.href=R.siteURL(R.route(href)).href;',name)
text=text.replace("[['index.html','home','Home'],['lesson.html','lesson','Lesson plan']]", "[['index.html','home','Home'],['language/index.html','lesson','Language'],['lesson.html','lesson','Lesson plan']]")
text=text.replace('R.toolIcon(key) +', 'R.brandIcon(key) +')
if 'R.brandIcon(key) +' not in text:raise SystemExit('Could not locate the tool brand icon. No files changed.')
text=text.replace("const u=new URL(base,location.href);u.search='';u.hash='plan='", "const u=R.safeURL(base);u.search='';u.hash='plan='")
writes[name]=text
writes['assets/js/lesson.js']=original['assets/js/lesson.js']
for controller in CONTROLLERS:writes['assets/js/language/'+controller+'.js']=original['assets/js/'+controller+'.js']

# Root/Language routing in sharing, timers, builder links and existing lesson context.
for name in list(writes):
    if not name.endswith('.js'):continue
    text=writes[name]
    for page in TOOLS:
        text=re.sub(r"new URL\(\s*(['\"])"+page+r"\.html\1\s*,\s*location\.href\s*\)", "R.siteURL('language/"+page+".html')",text)
    text=re.sub(r"new URL\(\s*(['\"])lesson\.html\1\s*,\s*location\.href\s*\)", "R.siteURL('lesson.html')",text)
    text=re.sub(r"new URL\(\s*(page|mode)\s*\+\s*(['\"])\.html\2\s*,\s*location\.href\s*\)",lambda m:"R.siteURL('language/'+"+m.group(1)+"+'.html')",text)
    writes[name]=text
writes['assets/css/styles.css']=original['assets/css/styles.css'].rstrip()+'\n\n'+STYLES
if not (ROOT/'math/README.md').exists():writes['math/README.md']='# Math\n\nReserved for future Math pages and tools. Use shared root navigation, styles and lesson services; put subject-specific controllers in assets/js/math/. No Math activities are implemented yet.\n'
writes['language/README.md']='# Language\n\nReading Slider, Sentence Pyramids, Word Parts and Letter Tiles live here. Controllers live in assets/js/language/. Shared styles, navigation, mascot images and Lesson Plan remain at the application root. Original root tool pages are compatibility redirects.\n'
# Validate all local HTML asset references against planned files before changing anything.
planned=set(writes)
for name,text in writes.items():
    if not name.endswith('.html'):continue
    for value in re.findall(r'(?:src|href)=[\'\"]([^\'\"]+)[\'\"]',text):
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:|^//|^#',value):continue
        clean=value.split('?',1)[0].split('#',1)[0]
        target=((ROOT/name).parent/clean).resolve()
        relative=target.resolve().relative_to(ROOT.resolve()).as_posix()
        if relative not in planned and not target.exists():raise SystemExit('Unresolved local link '+value+' in '+name+'. No files changed.')
backup=ROOT.parent/(ROOT.name+'-language-backup')
for name in original:
    dst=backup/name;dst.parent.mkdir(parents=True,exist_ok=True)
    if not dst.exists():dst.write_text(original[name],encoding='utf-8')
for name,text in writes.items():
    path=ROOT/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
for controller in CONTROLLERS:(ROOT/'assets/js'/(controller+'.js')).unlink()
print('Language pages/controllers reorganized; hero and colored mascot headers updated.')
print('Old root tool links retain query and fragment via redirects. Shared Lesson Plan remains at the root.')
print('Backup is outside the repository:',backup)
print('Delete this updater after use. Review and test the changed files before publishing.')
