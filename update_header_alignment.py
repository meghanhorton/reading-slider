from pathlib import Path
import re,os
ROOT=Path(__file__).resolve().parent
STYLES='/* CENTERED HEADER ICONS */\n#appbar { align-items:center; min-height:64px; padding-top:6px; padding-bottom:6px; }\n#appbar .nav-group { align-items:center; }\n#appbar .appbar-title { display:flex; align-self:center; align-items:center; margin:0; padding:0; }\n#appbar .tool-brand { display:inline-flex; align-items:center; gap:10px; padding:0; margin:0; }\n#appbar .tool-brand-icon { display:flex; align-items:center; justify-content:center; width:44px; height:44px; min-height:44px; padding:0; margin:0; background:transparent; border:0; border-radius:0; }\n#appbar .tool-brand-mascot { display:block; width:44px; height:44px; object-fit:contain; object-position:center; padding:0; margin:0; }\n#appbar .tool-brand-name { display:block; margin:0; padding:0; line-height:1.2; }\n#appbar .home-logo-button,#appbar .home-logo-button:hover { display:inline-flex; align-items:center; justify-content:center; min-width:44px; min-height:44px; padding:0; border:0; background:transparent; box-shadow:none; }\n#appbar .home-logo-image { display:block; width:44px; height:auto; max-height:44px; object-fit:contain; object-position:center; margin:0; padding:0; border:0; border-radius:0; }\n#appbar .header-puppy-divider { align-self:center; height:30px; margin:0 5px; }\n@media(max-width:576px) { #appbar .tool-brand-icon,#appbar .tool-brand-mascot { width:40px; height:40px; min-height:40px; } #appbar .home-logo-image { width:40px; max-height:40px; } }\n'
BRAND='  R.brandIcon=key=>R.mascotFiles[key]?\'<img class="tool-brand-mascot" src="\'+R.siteURL(\'assets/img/tool-icons/nav/\'+R.mascotFiles[key]+\'.png?v=header1\').href+\'" alt="" width="44" height="44">\':(R.toolIcon?R.toolIcon(key):R.icon(\'home\'));'
app=ROOT/'assets/js/app.js';style=ROOT/'assets/css/styles.css'
if not app.exists() or not style.exists():raise SystemExit('Extract at the current repository root first. No code files changed.')
for name in ['reading-slider','sentence-pyramids','word-parts','letter-tiles','lesson-plan']:
    if not (ROOT/'assets/img/tool-icons/nav'/(name+'.png')).exists():raise SystemExit('Extract the full package, including the small header images. No code files changed.')
for name in ['favicon.ico','assets/img/branding/app-icon.png','assets/img/branding/favicon-32.png','assets/img/branding/apple-touch-icon.png']:
    if not (ROOT/name).exists():raise SystemExit('Missing '+name+'. Extract the full package first. No code files changed.')
source=app.read_text(encoding='utf-8');new=source
if 'R.homeLogoMarkup' not in source:raise SystemExit('Apply the puppy Home-icon integration first. No code files changed.')
new=re.sub(r'assets/img/branding/app-icon\.png(?:\?v=[a-zA-Z0-9_-]+)?','assets/img/branding/app-icon.png?v=puppy3',new)
new,count=re.subn(r'(?m)^  R\.brandIcon\s*=[^\n]*;[ \t]*$',lambda m:BRAND,new,count=1)
if count!=1:raise SystemExit('Could not safely locate the current tool-header image helper. No code files changed.')
updates={}
if new!=source:updates[app]=new
oldcss=style.read_text(encoding='utf-8')
if '/* CENTERED HEADER ICONS */' not in oldcss:updates[style]=oldcss.rstrip()+'\n\n'+STYLES
pages=list(ROOT.glob('*.html'))
for folder in ['language','math']:
    if (ROOT/folder).exists():pages.extend((ROOT/folder).rglob('*.html'))
pattern=r'<link\b(?=[^>]*\brel=[\'\"][^\'\"]*(?:\bicon\b|apple-touch-icon|mask-icon)[^\'\"]*[\'\"])[^>]*>'
for page in pages:
    original=page.read_text(encoding='utf-8');html=re.sub(pattern,'',original,flags=re.I);end=re.search(r'</head\s*>',html,flags=re.I)
    if not end:raise SystemExit('Missing head tag in '+str(page.relative_to(ROOT))+'. No code files changed.')
    def path(name):return os.path.relpath(ROOT/name,page.parent).replace(os.sep,'/')
    tags='\n'.join([
      '<link rel="icon" type="image/x-icon" href="'+path('favicon.ico')+'?v=puppy3">',
      '<link rel="icon" type="image/png" sizes="32x32" href="'+path('assets/img/branding/favicon-32.png')+'?v=puppy3">',
      '<link rel="apple-touch-icon" sizes="180x180" href="'+path('assets/img/branding/apple-touch-icon.png')+'?v=puppy3">'
    ])
    html=html[:end.start()].rstrip()+'\n'+tags+'\n'+html[end.start():]
    if html!=original:updates[page]=html
backup=ROOT.parent/(ROOT.name+'-centered-header-backup')
for file in updates:
    dst=backup/file.relative_to(ROOT);dst.parent.mkdir(parents=True,exist_ok=True)
    if not dst.exists():dst.write_text(file.read_text(encoding='utf-8'),encoding='utf-8')
for file,text in updates.items():file.write_text(text,encoding='utf-8');print('Updated',file.relative_to(ROOT))
print('Header icon alignment and rounded puppy head are ready. Dropdown/footer logic unchanged.')
print('Original code/pages backed up outside the repository:',backup)
