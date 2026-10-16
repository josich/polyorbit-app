# Prints "x y" - the centre of the first element in a uiautomator dump whose text (or content-desc) is the given text.
import re, sys, xml.etree.ElementTree as ET
path, want = sys.argv[1], sys.argv[2].strip().lower()
try:
    root = ET.parse(path).getroot()
except Exception:
    sys.exit(0)
for n in root.iter('node'):
    t = (n.get('text') or n.get('content-desc') or '').strip().lower()
    if t == want:
        m = re.findall(r'\d+', n.get('bounds') or '')
        if len(m) == 4:
            x1, y1, x2, y2 = map(int, m)
            print((x1 + x2) // 2, (y1 + y2) // 2)
            break
