#!/bin/bash
# Run on the Android 16 emulator in CI: install the APK, open it, and take screenshots of the first screens - the welcome
# card, the tour's first card over the page (the top edge, the camera cutout), and the page after Skip.
# Android shows a one-time "Viewing full screen" notice over an app that hides the bars; it took every tap of the first run
# (build 26), so it is marked as seen before the launch, and tapped away if it shows anyway.
mkdir -p shots
adb install -r polyorbit.apk
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell am start -n io.github.josich.polyorbit/.MainActivity
sleep 40
tap(){   # tap the element whose text is $1 (WebView pages show up in the accessibility tree); else the fallback x y
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb shell cat /sdcard/ui.xml > ui.xml
  xy=$(python3 tools/tap-text.py ui.xml "$1")
  [ -z "$xy" ] && [ -n "$2" ] && xy="$2 $3"
  echo "tap '$1' at: $xy"
  [ -n "$xy" ] && adb shell input tap $xy
}
tap "Got it"; sleep 3
adb exec-out screencap -p > shots/android16-1-start.png
tap "Next" 540 1426; sleep 5
adb exec-out screencap -p > shots/android16-2-wheel.png
adb shell input keyevent KEYCODE_BACK; sleep 3     # in the tour, back asks to skip it
tap "Skip"; sleep 4
adb exec-out screencap -p > shots/android16-3-page.png
adb shell input swipe 540 1800 540 600 400; sleep 2
adb exec-out screencap -p > shots/android16-4-scrolled.png
ls -la shots
md5sum shots/*.png
exit 0
