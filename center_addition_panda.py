from pathlib import Path
import re

ROOT=Path(__file__).resolve().parent
path=ROOT/'assets/css/styles.css'
if not path.exists():raise SystemExit('Place this updater in the repository root first.')
source=path.read_text(encoding='utf-8')
pattern=r'(\.math-addition-art\s*\{)([^{}]*)(\})'
rule=list(re.finditer(pattern,source))
if not rule:raise SystemExit('No Addition mascot card rule found. No files changed.')
match=rule[-1]
new='.math-addition-art { display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding:0; gap:0; background:#FC4F42; }'
updated=source[:match.start()]+new+source[match.end():]
pattern=r'(\.math-addition-art img\s*\{)([^{}]*)(\})'
images=list(re.finditer(pattern,updated))
if not images:raise SystemExit('No Addition mascot image rule found. No files changed.')
match=images[-1]
new='.math-addition-art img { display:block; width:90%; height:auto; max-height:100%; object-fit:contain; object-position:center bottom; margin:0 auto; }'
updated=updated[:match.start()]+new+updated[match.end():]
if updated!=source:
    backup=ROOT.parent/(ROOT.name+'-panda-centering-backup')/'styles.css'
    backup.parent.mkdir(parents=True,exist_ok=True)
    if not backup.exists():backup.write_text(source,encoding='utf-8')
    path.write_text(updated,encoding='utf-8')
print('Addition mascot centered horizontally and bottom-aligned. No HTML or image changes.')
