# Run in CI after `npx cap add android`: portrait like the web app's manifest, and the vibration permission the
# game's haptics need (navigator.vibrate is silent without it inside an app).
import re, sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()
if 'android.permission.VIBRATE' not in s:
    s = s.replace('</manifest>', '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>', 1)
if 'screenOrientation' not in s:
    s, n = re.subn(r'(<activity\b)', r'\1 android:screenOrientation="portrait"', s, count=1)
    assert n == 1, 'no activity tag found'
open(p, 'w', encoding='utf8').write(s)
print('manifest patched')
