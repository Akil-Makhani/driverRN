/**
 * The live dispatch channel.
 *
 * Why a socket at all, when the app already has FCM: the two solve different
 * halves of the problem and neither covers both.
 *
 *   FCM    reaches a killed or dozing app, but delivery is best-effort and can
 *          lag by a minute — useless as the only path for a 30-second offer,
 *          and far too coarse for a location stream.
 *   Socket delivers in milliseconds and carries traffic in both directions,
 *          but only exists while the process does.
 *
 * So FCM is the wake-up ("open the app, there is work") and the socket is the
 * transport once awake. An offer that arrives by both paths is de-duplicated by
 * id in the job store, so the overlap is harmless.
 *
 * The connection is deliberately tied to *on duty*, not to *logged in*: an
 * off-duty driver must not hold a socket, must not receive offers, and must not
 * stream location.
 */
import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '../api/endpoints';
import { Preference } from '../storage/preference';

/** Server → client. Payloads are parsed by the subscriber, not here. */
export const SocketEvent = {
  /** A new order is on offer to every on-duty driver. */
  jobNew: 'job:new',
  /** Someone won the race for an offer — including, possibly, us. */
  jobTaken: 'job:taken',
  /** The order was cancelled or withdrawn while on offer. */
  jobCancelled: 'job:cancelled',
  /** An already-assigned trip changed server-side. */
  tripUpdated: 'trip:updated',
} as const;

/** Client → server. */
const Emit = {
  /** Announce readiness to receive offers; the server joins us to its room. */
  online: 'driver:online',
  offline: 'driver:offline',
  location: 'driver:location',
} as const;

type Handler = (payload: any) => void;

let socket: Socket | null = null;
/**
 * Subscriptions outlive the socket. A component subscribes once on mount, but
 * the socket underneath is torn down and rebuilt every time duty is toggled —
 * so handlers are held here and re-bound to each new socket rather than being
 * attached directly, which would silently stop firing after the first toggle.
 */
const handlers = new Map<string, Set<Handler>>();

/** Mirrors the socket's state for UI that wants to show "reconnecting…". */
let connected = false;
const connectionListeners = new Set<(isConnected: boolean) => void>();

function setConnected(value: boolean): void {
  if (connected === value) return;
  connected = value;
  connectionListeners.forEach((listener) => listener(value));
}

function bindHandlers(target: Socket): void {
  handlers.forEach((set, event) => {
    target.on(event, (payload: any) => set.forEach((handler) => handler(payload)));
  });
}

export const DispatchSocket = {
  isConnected: (): boolean => connected,

  /**
   * Opens the channel, or does nothing if it is already open. Safe to call on
   * every duty-on and every app foreground.
   */
  connect(): void {
    if (socket) {
      // An existing-but-dropped socket reconnects rather than being replaced;
      // replacing it would orphan the reconnection timers already in flight.
      if (!socket.connected) socket.connect();
      return;
    }
    if (!Preference.getAccessToken()) return;

    socket = io(SOCKET_URL, {
      // RN's XHR polling transport works but adds a round trip and breaks on
      // some corporate proxies; the socket is useless to us unless it can hold
      // a websocket open anyway.
      transports: ['websocket'],
      // Read from storage on every attempt rather than closing over the token:
      // a reconnect after a token refresh must not present the stale one.
      auth: (cb) => cb({ token: Preference.getAccessToken() ?? '' }),
      reconnection: true,
      reconnectionDelay: 1000,
      // Cap the backoff low. A driver waiting five minutes for the next retry
      // is a driver silently missing every order in that window.
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 15000,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket?.emit(Emit.online);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (e) => {
      setConnected(false);
      if (__DEV__) console.log('socket connect_error:', e.message);
    });

    bindHandlers(socket);
  },

  /** Closes the channel and stops reconnection. Duty-off and logout. */
  disconnect(): void {
    if (!socket) return;
    if (socket.connected) socket.emit(Emit.offline);
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    setConnected(false);
  },

  /** Subscribes to a server event. Returns an unsubscribe. */
  on(event: string, handler: Handler): () => void {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
      // First subscriber for this event: wire it on the live socket too, since
      // bindHandlers only ran for events that existed at connect time.
      socket?.on(event, (payload: any) =>
        handlers.get(event)?.forEach((h) => h(payload)),
      );
    }
    set.add(handler);
    return () => set.delete(handler);
  },

  /** Subscribes to connect/disconnect. Returns an unsubscribe. */
  onConnectionChange(listener: (isConnected: boolean) => void): () => void {
    connectionListeners.add(listener);
    return () => connectionListeners.delete(listener);
  },

  /**
   * Sends a location fix. Returns false when the socket is down, which is the
   * caller's cue to fall back to the batched HTTP endpoint rather than drop
   * the fix — a tracking gap is exactly what the customer notices.
   */
  sendLocation(fix: unknown): boolean {
    if (!socket?.connected) return false;
    socket.emit(Emit.location, fix);
    return true;
  },
} as const;
