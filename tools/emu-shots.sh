#!/bin/bash
# Run on the Android 16 emulator in CI: install the APK, open it, and take screenshots of the first screens - the welcome
# card, the tour's first card over the page (the top edge, the camera cutout), and the page after Skip.
mkdir -p shots
adb install -r polyorbit.apk
adb shell am start -n io.github.josich.polyorbit/.MainActivity
sleep 40
adb exec-out screencap -p > shots/android16-1-start.png
tap(){   # tap the element whose text is $1 (WebView pages show up in the accessibility tree)
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb shell cat /sdcard/ui.xml > ui.xml
  xy=$(python3 tools/tap-text.py ui.xml "$1")
  echo "tap '$1' at: $xy"
  [ -n "$xy" ] && adb shell input tap $xy
}
tap "Next"; sleep 5
adb exec-out screencap -p > shots/android16-2-wheel.png
tap "Skip tour"; sleep 3
tap "Skip"; sleep 4
adb exec-out screencap -p > shots/android16-3-page.png
adb shell input swipe 540 1800 540 600 400; sleep 2
adb exec-out screencap -p > shots/android16-4-scrolled.png
ls -la shots
exit 0
