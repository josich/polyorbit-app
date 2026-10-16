# Run in CI for the Google Play flavour only, on www/ before `npx cap sync`:
# window.POLY_STORE = "play" before anything else runs. The app reads it for
# - Pro gates on (PRO_GATES_BUILD) and the Play package id (PLAY_ID, the Rate row);
# - no editor test switches for Pro (they would hand Pro out for free);
# - native.js: Play Billing on, and no GitHub update card (an app from Play may only update through Play).
import sys
p = sys.argv[1] + '/index.html'
s = open(p, encoding='utf8').read()
assert s.count('<head>') == 1, 'no single <head> in index.html'
if 'POLY_STORE' not in s:
    s = s.replace('<head>', '<head>\n<script>window.POLY_STORE = "play";</script>', 1)
open(p, 'w', encoding='utf8').write(s)
print('store patch ok: play')
