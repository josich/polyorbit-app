package io.github.josich.polyorbit;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemBarsPlugin.class);   /* the app's own plugin: the system bars follow the skin */
        super.onCreate(savedInstanceState);
    }
}
