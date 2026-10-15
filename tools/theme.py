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
n = 0
for name in ('AppTheme.NoActionBar', 'AppTheme.NoActionBarLaunch'):
    m = re.search(r'(<style name="' + re.escape(name) + r'"[^>]*>)(.*?)(\s*</style>)', s, re.S)
    if not m or 'navigationBarColor' in m.group(2):
        continue
    s = s[:m.end(2)] + '\n' + ITEMS.rstrip('\n') + s[m.end(2):]
    n += 1
assert n >= 1, 'no app theme found in styles.xml'
open(p, 'w', encoding='utf8').write(s)
print('system bars themed in', n, 'styles')
print(s)
