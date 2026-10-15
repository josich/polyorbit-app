# Run in CI after `npx cap add android`:
# - portrait, like the web app's manifest;
# - vibration (navigator.vibrate is silent without it inside an app);
# - saving files into Documents/Polyorbit on Android 10 and older (the permission and legacy storage);
# - Polyorbit links (challenges, patterns, routines on josich.github.io/polyrhythm) open the app.
import re, sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()

def perm(line):
    global s
    if line not in s:
        s = s.replace('</manifest>', '    ' + line + '\n</manifest>', 1)

perm('<uses-permission android:name="android.permission.VIBRATE" />')
perm('<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />')
perm('<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />')

if 'requestLegacyExternalStorage' not in s:
    s, n = re.subn(r'(<application\b)', r'\1 android:requestLegacyExternalStorage="true"', s, count=1)
    assert n == 1, 'no application tag found'

if 'screenOrientation' not in s:
    s, n = re.subn(r'(<activity\b)', r'\1 android:screenOrientation="portrait"', s, count=1)
    assert n == 1, 'no activity tag found'

LINKS = ('            <intent-filter android:autoVerify="true">\n'
         '                <action android:name="android.intent.action.VIEW" />\n'
         '                <category android:name="android.intent.category.DEFAULT" />\n'
         '                <category android:name="android.intent.category.BROWSABLE" />\n'
         '                <data android:scheme="https" android:host="josich.github.io" android:pathPrefix="/polyrhythm" />\n'
         '            </intent-filter>\n')
if 'josich.github.io' not in s:
    i = s.find('</activity>')
    assert i > 0, 'no activity end found'
    s = s[:i] + LINKS.lstrip(' ') + '        ' + s[i:]

open(p, 'w', encoding='utf8').write(s)
print(s)
