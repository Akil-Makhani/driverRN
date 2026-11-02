package expo.modules.smsuserconsent

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.google.android.gms.auth.api.identity.GetPhoneNumberHintIntentRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CONSENT_REQUEST_CODE = 0x5C0D
private const val HINT_REQUEST_CODE = 0x5C0E

/**
 * Wraps Google's SMS User Consent API. After `start()`, the next SMS (within
 * 5 minutes) that contains a 4–10 character code, from a sender that is not in
 * the user's contacts, makes Play Services show a bottom sheet asking to let
 * the app read that one message. On "Allow" the full text is sent to JS as
 * `onSmsReceived`; JS pulls the OTP out of it.
 */
class SmsUserConsentModule : Module() {
  private var receiver: BroadcastReceiver? = null
  private var hintPromise: Promise? = null

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

    // Resolves with the number the driver picked from the SIM sheet, e.g.
    // "+919876543210", or null when there is none, the sheet was dismissed,
    // or Play Services cannot show it.
    AsyncFunction("requestPhoneNumberHint") { promise: Promise ->
      requestPhoneNumberHint(promise)
    }

    OnDestroy {
      unregister()
      finishHint(null)
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode == HINT_REQUEST_CODE) {
        val number = if (payload.resultCode == Activity.RESULT_OK) {
          try {
            Identity.getSignInClient(activity).getPhoneNumberFromIntent(payload.data)
          } catch (_: Exception) {
            null
          }
        } else {
          null
        }
        finishHint(number)
        return@OnActivityResult
      }
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

  private fun requestPhoneNumberHint(promise: Promise) {
    val activity = appContext.currentActivity
    if (activity == null) {
      promise.resolve(null)
      return
    }
    // One sheet at a time; an older request that never came back answers null.
    finishHint(null)
    hintPromise = promise

    val request = GetPhoneNumberHintIntentRequest.builder().build()
    Identity.getSignInClient(activity)
      .getPhoneNumberHintIntent(request)
      .addOnSuccessListener { pending ->
        try {
          activity.startIntentSenderForResult(pending.intentSender, HINT_REQUEST_CODE, null, 0, 0, 0)
        } catch (_: Exception) {
          finishHint(null)
        }
      }
      // No SIM, no number on it, or Play Services too old.
      .addOnFailureListener { finishHint(null) }
  }

  private fun finishHint(number: String?) {
    val p = hintPromise ?: return
    hintPromise = null
    p.resolve(number)
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
