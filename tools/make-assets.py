# Run locally by deploy-app.sh: the source images @capacitor/assets turns into the Android icons and splash
# (without them the app kept Capacitor's own logo for the adaptive icon and the splash).
import sys
from PIL import Image
pwa, out = sys.argv[1], sys.argv[2]
mask = Image.open(pwa + '/icon-512-maskable.png').convert('RGBA')
ground = mask.getpixel((4, 4))[:3]          # the icon's own dark ground, so nothing shows a seam
Image.open(pwa + '/icon-512.png').convert('RGBA').resize((1024, 1024), Image.LANCZOS).save(out + '/icon-only.png')
mask.resize((1024, 1024), Image.LANCZOS).save(out + '/icon-foreground.png')
Image.new('RGBA', (1024, 1024), ground + (255,)).save(out + '/icon-background.png')
for name in ('splash.png', 'splash-dark.png'):
    sp = Image.new('RGBA', (2732, 2732), ground + (255,))
    m = mask.resize((760, 760), Image.LANCZOS)
    sp.paste(m, ((2732 - 760) // 2, (2732 - 760) // 2), m)
    sp.save(out + '/' + name)
print('assets ok', '#%02X%02X%02X' % ground)
