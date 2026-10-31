import { NativeModule, requireOptionalNativeModule } from "expo";

type LocationSettingEvents = {
  onChanged: () => void;
};

declare class LocationSettingModule extends NativeModule<LocationSettingEvents> {
  start(): void;
  stop(): void;
}

// Android-only. Null on iOS/web (and in a build made before this module was
// added), so callers fall back to checking when the app comes forward.
const native = requireOptionalNativeModule<LocationSettingModule>("LocationSetting");

/**
 * Calls `onChanged` when the phone's location setting is switched, including
 * while the app is in the background. Returns the function that stops it.
 */
export function watchLocationSetting(onChanged: () => void): () => void {
  if (!native) return () => {};
  const sub = native.addListener("onChanged", onChanged);
  native.start();
  return () => {
    sub.remove();
    native.stop();
  };
}
