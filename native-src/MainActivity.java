package io.github.josich.polyorbit;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;

import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemBarsPlugin.class);   /* the app's own plugin: the system bars follow the skin */
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);   /* v555: Capacitor 8 / Android 15+: the page gets its safe areas (camera cutout) as insets */
        hideBars(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        hideBars(this);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars(this);
    }

    /* Oscar (v542): the status bar and the navigation bar are hidden - the app fills the screen. A swipe from the top or
       the bottom edge shows them for a moment, then they hide again by themselves. */
    static void hideBars(Activity a) {
        try {
            Window w = a.getWindow();
            WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
            c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            c.hide(WindowInsetsCompat.Type.systemBars());
        } catch (Exception e) {
            /* an old WebView host without the controller: the bars simply stay */
        }
    }
}
