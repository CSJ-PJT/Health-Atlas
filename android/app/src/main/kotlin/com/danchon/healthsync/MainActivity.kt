package com.danchon.healthsync

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(HealthConnectPlugin::class.java)
        registerPlugin(ContactsPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
