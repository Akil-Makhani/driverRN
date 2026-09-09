/**
 * The incoming-order alarm: a looping two-tone alert plus vibration.
 *
 * This covers the app-in-foreground case only, and that is deliberate. When the
 * app is backgrounded or killed there is no JS running to call `start()`, so the
 * alert has to come from the OS instead — which is why the `order_offers`
 * notification channel in `notification-manager.ts` is configured with the same
 * sound file and MAX importance. Between them the driver hears the same thing
 * whether the app was open or not:
 *
 *   foreground → this module
 *   background / killed → the FCM notification on the order_offers channel
 *
 * Both are stopped by the same `stop()` once the offer is answered, so a driver
 * who accepts from the notification does not walk around with a ringing phone.
 */
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { Vibration } from 'react-native';

const SIREN_SOURCE = require('../../../assets/sounds/new_order_siren.wav');

/**
 * Buzz, pause, repeat — deliberately in step with the audio's beep/gap so the
 * two read as one alert. The leading 0 means "start vibrating immediately".
 */
const VIBRATION_PATTERN = [0, 700, 500];

/**
 * Created on first use, then kept. Building a player costs a native round trip
 * and a file decode; paying that at the moment an offer lands would delay the
 * alert by exactly as long as the driver has to react.
 */
let player: AudioPlayer | null = null;
let isPlaying = false;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(SIREN_SOURCE);
    player.loop = true;
    player.volume = 1;
  }
  return player;
}

export const Siren = {
  /**
   * Warms the player up. Called once the driver goes on duty, so the first
   * offer of the shift rings as fast as the tenth.
   */
  prepare(): void {
    try {
      getPlayer();
    } catch (e) {
      if (__DEV__) console.log('siren prepare failed:', e);
    }
  },

  /** Starts the alarm. Idempotent — a second offer does not double it up. */
  async start(): Promise<void> {
    if (isPlaying) return;
    isPlaying = true;

    try {
      // An order alert is worth overriding the silent switch and interrupting
      // whatever the driver is listening to: a driver who misses it loses the
      // job. This is the one sound in the app that takes that liberty.
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
      });

      const p = getPlayer();
      // Rewind explicitly. A player left parked at the end of the clip by the
      // previous offer would otherwise "play" silence until the loop wrapped.
      await p.seekTo(0);
      p.play();
    } catch (e) {
      if (__DEV__) console.log('siren start failed:', e);
    }

    // Vibration is not a fallback for the audio, it is the other half of it:
    // in a loaded truck cab the phone is often heard through the seat, not the
    // ear. It runs even if the audio path above threw.
    Vibration.vibrate(VIBRATION_PATTERN, true);
  },

  /** Stops the alarm and hands audio focus back. Safe to call when idle. */
  async stop(): Promise<void> {
    Vibration.cancel();
    if (!isPlaying) return;
    isPlaying = false;

    try {
      player?.pause();
      await player?.seekTo(0);
      // Release the exclusive focus taken in start(), so the driver's music or
      // navigation voice resumes instead of staying ducked for the whole trip.
      await setAudioModeAsync({ interruptionMode: 'mixWithOthers' });
    } catch (e) {
      if (__DEV__) console.log('siren stop failed:', e);
    }
  },

  /** Frees the native player. Logout / duty off. */
  release(): void {
    void Siren.stop();
    try {
      player?.remove();
    } catch (e) {
      if (__DEV__) console.log('siren release failed:', e);
    }
    player = null;
  },
} as const;
