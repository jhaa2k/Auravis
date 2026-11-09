package com.auravis.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloadsPlugin.class);
        registerPlugin(NativeMediaPlugin.class);
        registerPlugin(NativeVisualizerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
