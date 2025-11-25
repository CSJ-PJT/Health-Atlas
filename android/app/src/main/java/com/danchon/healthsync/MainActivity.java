package com.danchon.healthsync;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Kotlin 플러그인 등록
        registerPlugin(HealthConnectPlugin.class);
    }
}