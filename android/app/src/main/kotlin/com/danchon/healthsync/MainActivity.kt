package com.danchon.healthsync

import android.os.Bundle
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    private var lastBackPressAt: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(HealthConnectPlugin::class.java)
        registerPlugin(ContactsPlugin::class.java)
        super.onCreate(savedInstanceState)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                bridge.webView.evaluateJavascript(
                    "(function(){try{return window.__rhHandleBack ? (window.__rhHandleBack() ? 'handled' : 'unhandled') : 'unhandled';}catch(e){return 'unhandled';}})();"
                ) { result ->
                    val normalized = result?.replace("\"", "") ?: "unhandled"
                    if (normalized == "handled") {
                        return@evaluateJavascript
                    }

                    val now = System.currentTimeMillis()
                    if (now - lastBackPressAt < 2000) {
                        finishAffinity()
                    } else {
                        lastBackPressAt = now
                        Toast.makeText(
                            this@MainActivity,
                            "종료하려면 다시 눌러 주세요",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
        })
    }
}
