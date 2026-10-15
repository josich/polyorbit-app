# Run locally by deploy-app.sh on the copy of the web build that goes into the app (www/):
# - mark the page as the native app (window.POLY_NATIVE) before anything else runs;
# - no service worker inside the app: every file is already in the APK, updates come with the app;
# - no "Install Polyorbit" offer: it already is the installed app;
# - native.js (copied next to it by deploy-app.sh) fills in what the WebView lacks: share, save, wake lock, links.
import sys
www, ver = sys.argv[1], sys.argv[2]

def rep(path, a, b, n=1):
    s = open(path, encoding='utf8').read()
    k = s.count(a)
    assert k >= n, (path, k, a[:60])
    s = s.replace(a, b, n)
    open(path, 'w', encoding='utf8').write(s)

idx = www + '/index.html'
rep(idx, '<head>', '<head>\n<script>window.POLY_NATIVE = "android";</script>\n<script src="./native.js"></script>')
rep(idx, 'if("serviceWorker" in navigator){', 'if("serviceWorker" in navigator && !window.POLY_NATIVE){')
rep(www + '/app.js', 'function installCtx(){', 'function installCtx(){if(window.POLY_NATIVE)return false;')
print('native patch ok', ver)
