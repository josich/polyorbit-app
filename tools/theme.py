# Run in CI after `npx cap add android`: the system bars (status bar on top, navigation bar with back / home / apps at
# the bottom) in the app's dark ground with light icons, instead of Android's white and Capacitor's blue (Oscar, 2026-10-15).
import re, sys
p = sys.argv[1]
GROUND = '#0D1318'
s = open(p, encoding='utf8').read()
if 'xmlns:tools' not in s:
    s = s.replace('<resources>', '<resources xmlns:tools="http://schemas.android.com/tools">', 1)
ITEMS = (
    '        <item name="android:statusBarColor">' + GROUND + '</item>\n'
    '        <item name="android:navigationBarColor">' + GROUND + '</item>\n'
    '        <item name="android:windowLightStatusBar" tools:targetApi="23">false</item>\n'
    '        <item name="android:windowLightNavigationBar" tools:targetApi="27">false</item>\n'
)
# v556: the app's own window background is the ground too (Android 15+ shows it in the strip behind the camera cutout);
# the launch theme keeps its own, which is the splash.
BG = '        <item name="android:windowBackground">' + GROUND + '</item>\n'
n = 0
for name in ('AppTheme.NoActionBar', 'AppTheme.NoActionBarLaunch'):
    m = re.search(r'(<style name="' + re.escape(name) + r'"[^>]*>)(.*?)(\s*</style>)', s, re.S)
    if not m or 'navigationBarColor' in m.group(2):
        continue
    items = ITEMS + (BG if name == 'AppTheme.NoActionBar' and 'windowBackground' not in m.group(2) else '')
    s = s[:m.end(2)] + '\n' + items.rstrip('\n') + s[m.end(2):]
    n += 1
assert n >= 1, 'no app theme found in styles.xml'
# v583 (Oscar: "the first icon at opening looks squashed"): the launch theme drew drawable/splash, a fixed-size picture,
# as its background, and Android stretched it to the screen's shape (Android 11 and older; his phone is Android 10).
# Now the launch background is a layer-list: the icon's own ground, and the mark at a fixed 128 dp in the middle,
# never scaled out of shape. Android 12+ draws its own splash from the app icon, so it is unchanged there.
import os, shutil
res = os.path.dirname(os.path.dirname(os.path.abspath(p)))
os.makedirs(os.path.join(res, 'drawable-nodpi'), exist_ok=True)
shutil.copy('www/icon-512-maskable.png', os.path.join(res, 'drawable-nodpi', 'splash_mark.png'))
os.makedirs(os.path.join(res, 'drawable'), exist_ok=True)
open(os.path.join(res, 'drawable', 'splash_fit.xml'), 'w', encoding='utf8').write(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <item><shape android:shape="rectangle"><solid android:color="#0C1015"/></shape></item>\n'
    '    <item android:width="128dp" android:height="128dp" android:gravity="center" android:drawable="@drawable/splash_mark"/>\n'
    '</layer-list>\n')
k = s.count('>@drawable/splash<')
s = s.replace('>@drawable/splash<', '>@drawable/splash_fit<')
print('launch splash: centred mark,', k, 'reference(s) replaced')
open(p, 'w', encoding='utf8').write(s)
print('system bars themed in', n, 'styles')
print(s)
