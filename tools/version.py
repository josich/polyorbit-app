# Run in CI after `npx cap add android`: versionCode = the GitHub run number, versionName = the web build (www-version.txt).
# Works with the old (`versionCode 1`) and the Capacitor 8 (`versionCode = 1`) Gradle syntax.
import re, sys
p, code, name = sys.argv[1], int(sys.argv[2]), sys.argv[3].strip()
s = open(p, encoding='utf8').read()
s, a = re.subn(r'versionCode\s*=?\s*\d+', 'versionCode = %d' % code, s, count=1)
s, b = re.subn(r'versionName\s*=?\s*"[^"]*"', 'versionName = "%s"' % name, s, count=1)
assert a == 1 and b == 1, ('version lines not found', a, b)
open(p, 'w', encoding='utf8').write(s)
print('versionCode', code, 'versionName', name)
