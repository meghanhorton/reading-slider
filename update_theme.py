from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
CSS = ROOT / 'assets/css/styles.css'
PALETTE = {'--theme-yellow': '#FFC567', '--theme-red': '#FC4F42', '--theme-purple': '#552CB8', '--theme-pink': '#FC7DA8', '--theme-orange': '#FF6B43', '--theme-light-blue': '#048CD6'}
COLORS = {'#6246e5': '#552CB8', '#8652c9': '#552CB8', '#63309e': '#442393', '#4930c6': '#442393', '#5138d4': '#4A26A2', '#8a75ed': '#8864D0', '#8c77e8': '#8864D0', '#a391ed': '#8864D0', '#58dfea': '#048CD6', '#53dfef': '#048CD6', '#6aebc7': '#FF6B43', '#f56a80': '#FC7DA8', '#f5667a': '#FC7DA8', '#ffda81': '#FFC567', '#ffd981': '#FFC567', '#d89220': '#FF6B43', '#238566': '#552CB8', '#1d7157': '#442393', '#43b997': '#048CD6', '#3ba88c': '#552CB8', '#43a88d': '#552CB8', '#24846c': '#C04F30', '#157687': '#04699F', '#b3445a': '#B65376', '#8d6c23': '#906E37', '#be435b': '#BC3B32', '#a63249': '#BC3B32', '#edbbc6': '#FECBC7', '#de899b': '#FC4F42', '#fff0f3': '#FFF2F6', '#e5fcf3': '#EDF8FF', '#578574': '#567A91'}
HERO_RULES = "/* Hero contrast and the new palette's lesson action. */\n.hero-actions .btn-outline-primary {\n  color: #fff;\n  border-color: #ffffff80;\n  background: transparent;\n}\n.hero-actions .btn-outline-primary:hover,\n.hero-actions .btn-outline-primary:focus-visible {\n  color: #552CB8;\n  border-color: #fff;\n  background: #fff;\n}\n@media (max-width: 576px) {\n  .home-hero { padding: 26px 22px; border-radius: 20px; }\n}\n"

if not CSS.exists():
    raise SystemExit('Extract this package into the existing repository root first.')
source = CSS.read_text(encoding='utf-8')
if '.home-hero' not in source:
    raise SystemExit('Apply the previous Homepage + Icons update first. Your current stylesheet has no hero section. No files were changed.')
text = source

def recolor(match):
    value = match.group(0).lower()
    if len(value) == 9 and value[:7] in COLORS:
        return COLORS[value[:7]] + value[7:]
    return COLORS.get(value, match.group(0))

text = re.sub(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', recolor, text)

def declarations(block, updates, remove=()):
    for name in remove:
        block = re.sub(r'(?<![\w-])' + re.escape(name) + r'\s*:\s*[^;{}]+;?', '', block)
    for name, value in updates.items():
        pattern = r'(?<![\w-])' + re.escape(name) + r'\s*:\s*[^;{}]+;?'
        replacement = name + ': ' + value + ';'
        if re.search(pattern, block):
            block = re.sub(pattern, replacement, block)
        else:
            block = block.rstrip() + '\n  ' + replacement + '\n'
    return block

def rule(selector, updates, remove=()):
    global text
    pattern = '(' + re.escape(selector) + r'\s*\{)([^{}]*)(\})'
    text, count = re.subn(pattern, lambda m: m.group(1) + declarations(m.group(2), updates, remove) + m.group(3), text, count=1)
    return count

if not rule(':root', {**PALETTE,
    '--accent':'var(--theme-purple)',
    '--accent-dark':'#442393',
    '--part-color':'var(--theme-purple)',
    '--part-read-color':'#442393',
    '--dot-color':'var(--theme-purple)',
    '--emphasis-track-color':'var(--theme-yellow)',
    '--emphasis-track-read-color':'var(--theme-orange)'}):
    raise SystemExit('Could not locate the design-token block. No files were changed.')

rule('.home-hero', {'background':'var(--theme-purple)', 'color':'#fff',
    'padding':'48px', 'border-radius':'24px', 'margin-bottom':'48px'}, ('background-image',))
rule('.home-hero h1', {'color':'#fff'})
rule('.hero-eyebrow', {'color':'var(--theme-yellow)'})
rule('.hero-description', {'color':'#ffffffdc'})
rule('.hero-lesson-button', {'background':'var(--theme-yellow)', 'border-color':'var(--theme-yellow)', 'color':'#25194f'})
rule('.hero-lesson-button:hover,.hero-lesson-button:focus-visible', {'background':'#FFD18B', 'border-color':'#FFD18B', 'color':'#25194f'})
# Allow whitespace between grouped selectors if the stylesheet was formatted.
pattern = r'(\.hero-lesson-button:hover\s*,\s*\.hero-lesson-button:focus-visible\s*\{)([^{}]*)(\})'
text = re.sub(pattern, lambda m: m.group(1) + declarations(m.group(2), {'background':'#FFD18B','border-color':'#FFD18B','color':'#25194f'}) + m.group(3), text)
rule('.hero-preview', {'border':'7px solid #fff', 'background':'#fff'})

# Maintain spacing on the mobile hero instead of inheriting the old almost-zero top padding.
pattern = r'(\.home-hero\s*\{)([^{}]*)(\})'
def mobile_hero(match):
    block = match.group(2)
    if re.search(r'grid-template-columns\s*:\s*1fr', block):
        block = declarations(block, {'padding':'32px 24px'}, ('padding-top','padding-bottom'))
    return match.group(1) + block + match.group(3)
text = re.sub(pattern, mobile_hero, text)

for key, background, ink, name in [
    ('slider','var(--theme-light-blue)','#25194f','#04699F'),
    ('pyramid','var(--theme-orange)','#25194f','#C04F30'),
    ('wordparts','var(--theme-purple)','#fff','var(--theme-purple)'),
    ('lettertiles','var(--theme-pink)','#25194f','#B65376'),
    ('lesson','var(--theme-yellow)','#25194f','#906E37'),
]:
    # Support both quote styles used in CSS selectors.
    pattern = r'(\.tool-theme\[data-tool=[\'\"]' + key + r'[\'\"]\]\s*\{)([^{}]*)(\})'
    text = re.sub(pattern, lambda m: m.group(1) + declarations(m.group(2), {
        '--tool-color':background,'--tool-ink':ink,'--tool-name-color':name}) + m.group(3), text)

rule('.btn-outline-danger', {
    '--bs-btn-color':'#BC3B32', '--bs-btn-border-color':'var(--theme-red)',
    '--bs-btn-hover-color':'#fff', '--bs-btn-hover-bg':'var(--theme-red)',
    '--bs-btn-hover-border-color':'var(--theme-red)'})

if '/* Hero contrast and the new palette' not in text:
    text = text.rstrip() + '\n\n' + HERO_RULES

if text != source:
    backup_root = ROOT.parent / (ROOT.name + '-theme-backup')
    backup = backup_root / 'assets/css/styles.css'
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        backup.write_text(source, encoding='utf-8')
    CSS.write_text(text, encoding='utf-8')
    print('Updated assets/css/styles.css')
    print('Original stylesheet backed up outside the repository:', backup_root)
else:
    print('Theme is already updated.')
print('No JavaScript or HTML changes. Delete this updater after use.')
