package io.github.josich.polyorbit;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* The status bar and the navigation bar (back / home / apps) follow the app's skin: native.js calls
   Capacitor.Plugins.SystemBars.set({color:"#0D1318", light:false}) with the page's own ground colour. */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    @PluginMethod
    @SuppressWarnings("deprecation")
    public void set(final PluginCall call) {
        final String color = call.getString("color", "#0D1318");
        final boolean light = Boolean.TRUE.equals(call.getBoolean("light", false));
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    int c = Color.parseColor(color);
                    Window w = getActivity().getWindow();
                    w.setStatusBarColor(c);
                    w.setNavigationBarColor(c);
                    View d = w.getDecorView();
                    int f = d.getSystemUiVisibility();
                    if (Build.VERSION.SDK_INT >= 23) {
                        f = light ? (f | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
                    }
                    if (Build.VERSION.SDK_INT >= 26) {
                        f = light ? (f | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                    }
                    d.setSystemUiVisibility(f);
                    MainActivity.hideBars(getActivity());   /* v542: the colours are for the moments a swipe shows the bars */
                    call.resolve();
                } catch (Exception e) {
                    call.reject("bad colour: " + color);
                }
            }
        });
    }
}
