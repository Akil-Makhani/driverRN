package expo.modules.smsuserconsent

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CONSENT_REQUEST_CODE = 0x5C0D

/**
 * Wraps Google's SMS User Consent API. After `start()`, the next SMS (within
 * 5 minutes) that contains a 4–10 character code, from a sender that is not in
 * the user's contacts, makes Play Services show a bottom sheet asking to let
 * the app read that one message. On "Allow" the full text is sent to JS as
 * `onSmsReceived`; JS pulls the OTP out of it.
 */
class SmsUserConsentModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context?
    get() = appContext.reactContext?.applicationContext

  override fun definition() = ModuleDefinition {
    Name("SmsUserConsent")

    Events("onSmsReceived", "onSmsConsentDenied")

    Function("start") {
      start()
    }

    Function("stop") {
      unregister()
    }

    OnDestroy {
      unregister()
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != CONSENT_REQUEST_CODE) return@OnActivityResult
      val message = payload.data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
      if (payload.resultCode == Activity.RESULT_OK && message != null) {
        sendEvent("onSmsReceived", mapOf("message" to message))
      } else {
        sendEvent("onSmsConsentDenied")
      }
    }
  }

  private fun start() {
    val ctx = context ?: return
    unregister()

    SmsRetriever.getClient(ctx).startSmsUserConsent(null)

    val r = object : BroadcastReceiver() {
      override fun onReceive(c: Context, intent: Intent) {
        if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
        val extras = intent.extras ?: return
        val status = extras.parcelable<Status>(SmsRetriever.EXTRA_STATUS) ?: return
        // One SMS per start(): the listener is spent either way (TIMEOUT after
        // 5 minutes, or SUCCESS), so drop the receiver now.
        unregister()
        if (status.statusCode != CommonStatusCodes.SUCCESS) return

        val consentIntent = extras.parcelable<Intent>(SmsRetriever.EXTRA_CONSENT_INTENT) ?: return
        // Only launch the intent if it really is Play Services' consent sheet,
        // and never hand it URI grants (Android intent-redirection guidance).
        val component = consentIntent.resolveActivity(c.packageManager) ?: return
        if (component.packageName != "com.google.android.gms") return
        consentIntent.flags = consentIntent.flags and
          (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION).inv()

        val activity = appContext.currentActivity ?: return
        try {
          activity.startActivityForResult(consentIntent, CONSENT_REQUEST_CODE)
        } catch (_: Exception) {
          // Activity gone / sheet unavailable — the user can still type the OTP.
        }
      }
    }

    val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ctx.registerReceiver(r, filter, SmsRetriever.SEND_PERMISSION, null, Context.RECEIVER_EXPORTED)
    } else {
      ctx.registerReceiver(r, filter, SmsRetriever.SEND_PERMISSION, null)
    }
    receiver = r
  }

  private fun unregister() {
    val r = receiver ?: return
    receiver = null
    try {
      context?.unregisterReceiver(r)
    } catch (_: IllegalArgumentException) {
      // Already unregistered.
    }
  }
}

@Suppress("DEPRECATION")
private inline fun <reified T : android.os.Parcelable> android.os.Bundle.parcelable(key: String): T? =
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) getParcelable(key, T::class.java)
  else getParcelable(key) as? T
