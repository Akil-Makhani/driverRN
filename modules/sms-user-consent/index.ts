import { NativeModule, requireOptionalNativeModule } from "expo";
import { useEffect, useRef } from "react";

type SmsUserConsentEvents = {
  onSmsReceived: (event: { message: string }) => void;
  onSmsConsentDenied: () => void;
};

declare class SmsUserConsentModule extends NativeModule<SmsUserConsentEvents> {
  start(): void;
  stop(): void;
  requestPhoneNumberHint(): Promise<string | null>;
}

// Android-only. Null on iOS/web (and in a build made before this module was
// added), so callers simply fall back to typing the OTP.
const native = requireOptionalNativeModule<SmsUserConsentModule>("SmsUserConsent");

/**
 * Android: opens Play Services' sheet listing the SIM's phone numbers and
 * resolves with the picked one as 10 digits (country code dropped). Null when
 * there is no SIM number, the driver dismisses the sheet, or on iOS / an
 * older build without this function.
 */
export async function requestPhoneNumberHint(): Promise<string | null> {
  if (!native?.requestPhoneNumberHint) return null;
  try {
    const number = await native.requestPhoneNumberHint();
    const digits = number?.replace(/\D/g, '') ?? '';
    return digits.length >= 10 ? digits.slice(-10) : null;
  } catch {
    return null;
  }
}

/**
 * Listens for the OTP SMS while mounted. When it arrives Android shows a
 * one-tap "Allow" sheet; on Allow the first `digits`-long number in the
 * message is passed to `onCode`.
 *
 * `restartKey` re-arms the listener (it is spent after one SMS or 5 minutes),
 * e.g. bump it on "Resend OTP".
 */
export function useSmsUserConsent(
  digits: number,
  onCode: (code: string) => void,
  restartKey: unknown = 0,
) {
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    if (!native) return;
    const pattern = new RegExp(`(?:^|\\D)(\\d{${digits}})(?!\\d)`);
    const sub = native.addListener("onSmsReceived", ({ message }) => {
      const code = message.match(pattern)?.[1];
      if (code) onCodeRef.current(code);
    });
    native.start();
    return () => {
      sub.remove();
      native.stop();
    };
  }, [digits, restartKey]);
}
