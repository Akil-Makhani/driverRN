/**
 * "Location is off", drawn like the app's other dialogs instead of a bare
 * system alert, with a button that fixes it: Android's own "turn on location"
 * prompt, or the app's settings page when the permission was refused for good.
 *
 * One copy at the root (app/_layout.tsx); raise it from anywhere with
 * showLocationOff(). `onFixed` runs once location is on - the dashboard uses
 * it to finish going On Duty, so the driver does not have to tap the toggle
 * again.
 */
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { create } from 'zustand';

import { ActionConfirmDialog } from '@/components/action-confirm-dialog';
import { Strings } from '@/core/constants/strings';
import { LocationTracker } from '@/core/services/location-tracker';

/** 'needed': going On Duty was refused. 'wentOff': the app took the driver off duty. */
type Reason = 'needed' | 'wentOff';

const useLocationOffStore = create<{
  reason: Reason | null;
  onFixed?: () => void;
}>(() => ({ reason: null }));

export function showLocationOff(reason: Reason, onFixed?: () => void) {
  useLocationOffStore.setState({ reason, onFixed });
}

const close = () => useLocationOffStore.setState({ reason: null, onFixed: undefined });

export function LocationOffDialog() {
  const reason = useLocationOffStore((s) => s.reason);

  const turnOn = async () => {
    const { onFixed } = useLocationOffStore.getState();
    close();
    // The app's permission first: without it, turning the phone's location on
    // would still leave the app unable to read it.
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (!permission.granted) {
      // Refused for good: only the settings page can change it now.
      void Linking.openSettings();
      return;
    }
    if (await LocationTracker.ensureLocationOn()) onFixed?.();
  };

  return (
    <ActionConfirmDialog
      visible={reason != null}
      tone="warning"
      icon="map-marker-off"
      label={Strings.locationDialogLabel}
      title={Strings.dutyOffLocationTitle}
      message={reason === 'wentOff' ? Strings.dutyOffLocationBody : Strings.dutyNeedsLocationBody}
      details={[Strings.locationDialogStepPhone, Strings.locationDialogStepApp]}
      confirmLabel={Strings.locationDialogTurnOn}
      confirmIcon="crosshairs-gps"
      cancelLabel={Strings.locationDialogLater}
      onConfirm={() => void turnOn()}
      onCancel={close}
    />
  );
}
