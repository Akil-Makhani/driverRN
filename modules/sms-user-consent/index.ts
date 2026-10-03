import { NativeModule, requireOptionalNativeModule } from "expo";
import { useEffect, useRef } from "react";

type SmsUserConsentEvents = {
  onSmsReceived: (event: { message: string }) => void;
  onSmsConsentDenied: () => void;
};

declare class SmsUserConsentModule extends NativeModule<SmsUserConsentEvents> {
  start(): void;
  stop(): void;
}

// Android-only. Null on iOS/web (and in a build made before this module was
// added), so callers simply fall back to typing the OTP.
const native = requireOptionalNativeModule<SmsUserConsentModule>("SmsUserConsent");

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
