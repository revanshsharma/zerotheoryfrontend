#!/usr/bin/env python3
"""Turn Channel Green's global stylesheet into one that only affects the Channel Green section.

Usage: channel-green-scope-css.py <globals.css> > scoped.css

Every rule is prefixed with `.cg-root`, so nothing can leak into the rest of the ZeroTheory site.
Dropped on purpose (the site owns them, see client/src/channel-green-site/theme.css):
the Tailwind import, the @theme block, the html/body rules and the universal scrollbar rule.
Called by scripts/sync-channel-green.sh. Needs only Python 3, no packages.
"""
import re,sys
src=open(sys.argv[1], encoding="utf-8").read()
# strip tailwind import + @theme + html/body + universal scrollbar rule
src=re.sub(r"@import 'tailwindcss';\s*","",src)
src=re.sub(r"@theme \{.*?\n\}\s*","",src,flags=re.S)
src=re.sub(r"html,\s*body \{.*?\n\}\s*","",src,flags=re.S)
src=re.sub(r"\* \{\s*scrollbar-width.*?\n\}\s*","",src,flags=re.S)
src=src.replace("var(--font-sans)","var(--cg-sans)")
out=[];i=0
# tokenise rules at brace level
def scope_sel(sel):
    parts=[p.strip() for p in sel.split(',')]
    res=[]
    for p in parts:
        if p.startswith(':focus-visible') or p.startswith('a:') or p.startswith('button:') or p.startswith('.'):
            res.append('.cg-root '+p if not p.startswith('.cream-section a') else '.cg-root '+p)
        elif p.startswith('*'):
            res.append('.cg-root '+p)
        else:
            res.append('.cg-root '+p)
    return ',\n'.join(res)
def process(block, in_keyframes=False, in_media=False):
    # returns processed text of a sequence of rules
    res='';pos=0
    while pos<len(block):
        m=re.compile(r"\s*").match(block,pos); 
        res+=m.group(0); pos=m.end()
        if pos>=len(block): break
        if block.startswith('/*',pos):
            e=block.index('*/',pos)+2; res+=block[pos:e]; pos=e; continue
        b=block.index('{',pos)
        sel=block[pos:b].strip()
        # find matching brace
        d=0;j=b
        while True:
            if block[j]=='{': d+=1
            elif block[j]=='}':
                d-=1
                if d==0: break
            j+=1
        body=block[b+1:j]
        if sel.startswith('@keyframes'):
            res+=sel+' {'+body+'}'
        elif sel.startswith('@media'):
            res+=sel+' {'+process(body,in_media=True)+'}'
        else:
            res+=scope_sel(sel)+' {'+body+'}'
        pos=j+1
    return res
css=process(src)
print(css)
