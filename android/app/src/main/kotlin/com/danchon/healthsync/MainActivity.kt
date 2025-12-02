package com.danchon.healthsync

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.danchon.healthsync.HealthConnectPlugin   // ✅ 우리 플러그인 import

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // ✅ 커스텀 플러그인은 여기서 등록해야 JS 에서 보인다
        registerPlugin(HealthConnectPlugin::class.java)

        super.onCreate(savedInstanceState)
    }
}
