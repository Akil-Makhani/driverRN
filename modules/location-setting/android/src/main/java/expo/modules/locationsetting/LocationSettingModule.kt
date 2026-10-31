package expo.modules.locationsetting

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.LocationManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Tells JS when the phone's location setting changes. JS timers are paused
 * while the app is in the background, and the location task gets no fixes once
 * location is off, so neither can notice it; a system broadcast can, for as
 * long as the process is alive (the on-duty foreground service keeps it so).
 */
class LocationSettingModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context?
    get() = appContext.reactContext?.applicationContext

  override fun definition() = ModuleDefinition {
    Name("LocationSetting")

    Events("onChanged")

    Function("start") {
      start()
    }

    Function("stop") {
      unregister()
    }

    OnDestroy {
      unregister()
    }
  }

  private fun start() {
    val ctx = context ?: return
    unregister()

    val r = object : BroadcastReceiver() {
      override fun onReceive(c: Context, intent: Intent) {
        sendEvent("onChanged")
      }
    }
    val filter = IntentFilter().apply {
      addAction(LocationManager.PROVIDERS_CHANGED_ACTION)
      addAction(LocationManager.MODE_CHANGED_ACTION)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ctx.registerReceiver(r, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      ctx.registerReceiver(r, filter)
    }
    receiver = r
  }

  private fun unregister() {
    val r = receiver ?: return
    receiver = null
    context?.unregisterReceiver(r)
  }
}
