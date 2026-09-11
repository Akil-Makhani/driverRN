# BST Driver (driverRN)

React Native / Expo 57 port of the `bst_driver` Flutter app. Drivers use it to
go on duty, accept trips, confirm what was actually loaded at pickup, attach the
weight slip and invoice, and mark deliveries complete.

A trip reaches a driver two ways:

- **Assigned** — an admin picks the driver, and the trip appears in their list.
  This is the original flow and is unchanged.
- **Broadcast** — a confirmed order is offered to every on-duty driver at once
  with a siren and a countdown, and the first to accept wins it. While that trip
  is live the driver's location streams to the customer.

Both halves are built. The server side lives in the `bst-api` repo — the Job
model, the atomic accept, the Socket.IO server and the location ingest — and is
described in [docs/BROADCAST-DISPATCH-BACKEND.md](docs/BROADCAST-DISPATCH-BACKEND.md),
which now documents what exists rather than what to build.

- **Package / bundle id:** `com.bst.driver` (unchanged from Flutter, so an
  update installs over the existing app)
- **API:** `https://api.bstm.in/v2` (production)

---

## Running in Android Studio

The native `android/` project is already generated and committed, so Android
Studio can open it directly.

### 1. Prerequisites

| Requirement | Version |
| --- | --- |
| Node.js | **20.19.4 or newer** — see below |
| JDK | 17 (bundled with recent Android Studio — "Embedded JDK" is fine) |
| Android Studio | Ladybug or newer |
| Android SDK | Platform **36**, Build-Tools 36.x |

> **Node 18 will not build this project.** Expo SDK 57 requires Node ≥ 20.19.4,
> and the Gradle build shells out to `node` for `:expo-constants:createExpoConfig`.
> On Node 18 that task dies with `TypeError: util.parseEnv is not a function`
> (`util.parseEnv` landed in Node 20.12) the moment a `.env` file exists. A
> `.nvmrc` pinning 20 is committed, so `nvm use` in this directory picks the
> right one.
>
> Gradle's daemon captures `PATH` when it starts, so switching Node in your
> shell does **not** reach an already-running daemon. After changing Node
> version, run `cd android && ./gradlew --stop` once.

In Android Studio: **Settings → Languages & Frameworks → Android SDK**, then on
the *SDK Platforms* tab tick **Android 16 (API 36)**, and on *SDK Tools* tick
**Android SDK Build-Tools 36**, **Android SDK Command-line Tools**, and
**Android Emulator**. Apply.

### 2. Install JS dependencies

Run this once from the project root **before** opening Android Studio — the
Gradle build reads packages out of `node_modules`, and the build fails without
them:

```bash
cd e:\Yogesh\driverRN
npm install
```

### 2a. Point the app at an API

`EXPO_PUBLIC_*` variables are inlined into the bundle by Metro. Create `.env` in
the project root (it is gitignored):

```bash
# Android emulator — 10.0.2.2 is the host machine as seen from inside it.
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/v2
```

On a **physical device** over USB, run `adb reverse tcp:3000 tcp:3000` and use
`http://localhost:3000/v2`; over Wi-Fi use this machine's LAN IP. Delete the
file to go back to production (`https://api.bstm.in/v2`).

The Socket.IO origin is derived from this by dropping `/v2`, which is correct
when bst-api serves both on one port. Override with `EXPO_PUBLIC_SOCKET_URL`
only if you split them.

### 2b. Add a Google Maps API key

The trip screen renders a live map, which needs a key. In
[app.json](app.json) replace both placeholders:

- `android.config.googleMaps.apiKey` → `REPLACE_WITH_ANDROID_GOOGLE_MAPS_API_KEY`
- `ios.config.googleMapsApiKey` → `REPLACE_WITH_IOS_GOOGLE_MAPS_API_KEY`

Get them from the Google Cloud console with **Maps SDK for Android** and **Maps
SDK for iOS** enabled, and restrict each key to the `com.bst.driver` package /
bundle id. Without a key the map area renders grey; nothing else breaks.

Then regenerate the native project, because the key, the new permissions and the
notification sound are all build-time config:

```bash
npx expo prebuild --platform android --clean
```

> `--clean` regenerates `android/` from scratch and **discards hand edits**. Two
> of them matter here and have to be put back afterwards:
>
> - `android/gradle.properties` — the `org.gradle.java.home` pin to JDK 17.
>   Android Studio ships JBR 25, which fails every native CMake task.
> - `android/local.properties` — `sdk.dir`.
>
> Copy both aside before running prebuild.

### 3. Open the project

In Android Studio choose **Open**, and select:

```
e:\Yogesh\driverRN\android
```

Select the `android` folder itself, **not** the repository root — pointing it at
the root gives you a plain folder with no Gradle project.

Wait for "Gradle sync finished" in the status bar. The first sync downloads the
Gradle distribution and dependencies and can take several minutes.

### 3b. Why `expo-dev-client` is a dependency

A debug build of this app is a **development build**, not Expo Go — the native
modules it needs (Firebase, MMKV, Maps) are not in Expo Go's binary.
`expo run:android` launches it through a
`bstdriver://expo-development-client/?url=…` deep link, and `expo-dev-client` is
what registers that handler and loads the bundle from Metro.

Without it the deep link goes nowhere, the app falls back to a bundle in its
assets that a debug build does not have, and you get **"Unable to load script"**
— usually followed by a misleading `Native module RNFBAppModule not found`, which
is the Expo-Go-shaped bundle failing, not a Firebase problem.

### 4. Start Metro

Android Studio builds and installs the app, but the JavaScript is served
separately by Metro. In a terminal, from the project root:

```bash
npx expo start --dev-client
```

`--dev-client` matters: plain `npx expo start` serves in Expo Go mode, where the
bundle lives at a different path and the app's request for `/index.bundle` gets
a 404.

Leave this running. (A debug build that can't reach Metro shows a red screen
saying it could not connect.)

### 5. Run

Pick a device or emulator in the toolbar and press **Run ▶** (`Shift+F10`).

For a physical device: enable **USB debugging** in Developer Options, plug it
in, and accept the debugging prompt on the phone. If the app can't reach Metro
over USB, forward the port:

```bash
adb reverse tcp:8081 tcp:8081
```

### Terminal alternative

You don't need the IDE at all — this builds, installs, and starts Metro in one
step:

```bash
npx expo run:android
```

---

## Release build

```bash
cd android
./gradlew assembleRelease        # APK  → android/app/build/outputs/apk/release/
./gradlew bundleRelease          # AAB  → android/app/build/outputs/bundle/release/
```

Both currently sign with the debug keystore. Before publishing to Play, add a
release keystore and point `signingConfigs.release` in
[android/app/build.gradle](android/app/build.gradle) at it.

---

## Troubleshooting

**Gradle sync fails with "SDK location not found"**
Create `android/local.properties` containing your SDK path:
`sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk`

**"Unable to load script" / red screen on launch**
In order of likelihood: Metro is running without `--dev-client`;
`expo-dev-client` is not installed; or Metro is unreachable — on a physical
device run `adb reverse tcp:8081 tcp:8081`. A `Native module RNFBAppModule not
found` alongside it is a symptom of the same thing, not a Firebase fault.

**Build errors referencing `node_modules`**
`npm install` wasn't run, or was run after the sync. Install, then
**File → Sync Project with Gradle Files**.

**Stale build after changing `app.json` or adding a native dependency**
Config changes reach the native project only through prebuild:

```bash
npx expo prebuild --platform android --clean
```

This regenerates `android/`, discarding hand edits made there.

**Map area is grey**
No Google Maps API key, or one that is not restricted to `com.bst.driver`. See
step 2b, then `npx expo prebuild --platform android --clean`.

**No siren, or only a short beep, when the app is closed**
Two separate causes, both about Android notification channels.

A channel's sound is fixed when the channel is first created; every later change
is ignored for the life of that install. So a sound change needs a NEW channel
id — bump `OFFER_CHANNEL_ID` in
[notification-manager.ts](src/core/services/notification-manager.ts), add the old
one to `RETIRED_CHANNEL_IDS`, and change `channelId` in the server's FCM payload
to match. Reinstalling also works, but only for you.

And a notification sound plays through exactly ONCE — its length is how long the
phone rings. `assets/sounds/new_order_siren.wav` runs the full offer window for
that reason; a short clip is a blip a driver misses. The in-app siren loops a
file of any length, so this only affects the app-closed case.

If nothing arrives at all, check the server log — every offer push now prints
`Offer push <id>: N sent, M failed` with the per-token FCM error.

**Offers never arrive**
Check, in this order: the driver is on duty (the socket only connects on duty);
the order actually reached In Process with a sub-order still in Assign Truck;
at least one driver is on duty, Active and not already `onTrip`; and
`EXPO_PUBLIC_SOCKET_URL` resolves — it defaults to the API base without `/v2`.
On the server, `GET /v2/backend/tracking/jobs` shows every recent offer, who it
went to and what became of it.

**Location stops when the screen locks**
"Allow all the time" was not granted. Android only offers it in a second prompt
after "while using the app"; if it was refused, the app degrades to tracking
only while open. Grant it in system settings.

**`:expo-constants:createExpoConfig` fails with `parseEnv is not a function`**
Gradle is running Node 18. `nvm use` (a `.nvmrc` pins 20), then
`cd android && ./gradlew --stop` so the daemon picks up the new `PATH`.

**Android resource name errors from `expo prebuild`**
Anything in `expo-notifications.sounds` becomes an Android `res/raw` resource,
so the filename must match `[a-z0-9_]` — hyphens fail the whole prebuild. The
siren is `new_order_siren.wav` for exactly that reason; the same name appears in
the notification channel and in the server's FCM payload, so rename all three
together or the phone plays the default sound.

**Clean rebuild**

```bash
cd android && ./gradlew clean
```

---

## Project layout

```
src/
├── app/                     # expo-router routes; file path = URL path
│   ├── _layout.tsx          # root stack, fonts, FCM background handler
│   ├── index.tsx            # splash → decides dashboard vs login
│   ├── (auth)/              # login, otp
│   ├── dashboard.tsx        # trip list, duty switch
│   ├── trip/[id].tsx        # trip detail + status state machine
│   ├── history.tsx, notifications.tsx, profile.tsx
├── components/              # app bar, sidebar, dialogs, shared widgets
├── core/
│   ├── api/                 # endpoints, fetch client, error types
│   ├── constants/           # colors, fonts, typography, strings, enums
│   ├── realtime/            # Socket.IO client + the duty-driven dispatch switch
│   ├── services/            # repositories, siren, location tracker
│   ├── storage/             # MMKV token storage
│   └── session.ts           # logged-in user (was UserSession singleton)
├── features/                # per-feature stores + screen-specific views
└── types/                   # API models and their parsers
```

### How the Flutter architecture maps across

| Flutter | Here |
| --- | --- |
| `provider` + `ChangeNotifier` view models | `zustand` stores |
| `repository/*.dart` | `src/core/services/*` |
| `Navigator` + named routes | `expo-router` file routes |
| `shared_preferences` | `react-native-mmkv` |
| `UserSession` singleton | `src/core/session.ts` |
| `dashboardRefreshNotifier` | refetch on screen focus |
| `pinput` | `react-native-otp-entry` |
| `image_picker` | `expo-image-picker` |
| `flutter_local_notifications` | `expo-notifications` |

Navigation flags (`shouldNavigateToDashboard` and friends) are gone: the Flutter
screens watched those in a post-frame callback, whereas here the screen awaits
the store call and routes from the result.

### Broadcast dispatch & live tracking

New in this app; no Flutter counterpart. The server side is specified in
[docs/BROADCAST-DISPATCH-BACKEND.md](docs/BROADCAST-DISPATCH-BACKEND.md).

| Piece | File | Does |
| --- | --- | --- |
| Socket client | [src/core/realtime/socket.ts](src/core/realtime/socket.ts) | Holds the live channel; re-binds handlers across reconnects |
| Dispatch switch | [src/core/realtime/dispatch.ts](src/core/realtime/dispatch.ts) | Turns the whole layer on and off with the duty toggle |
| Offer state machine | [src/features/job/job-store.ts](src/features/job/job-store.ts) | The queue, the countdown, and the race rules |
| Offer UI | [src/features/job/job-offer-overlay.tsx](src/features/job/job-offer-overlay.tsx) | The full-screen card, mounted above the router |
| Siren | [src/core/services/siren.ts](src/core/services/siren.ts) | Looping alert + vibration while an offer is unanswered |
| Location stream | [src/core/services/location-tracker.ts](src/core/services/location-tracker.ts) | Background fixes, throttled, buffered when offline |
| Map | [src/features/trip/trip-live-map.tsx](src/features/trip/trip-live-map.tsx) | What the driver sees of what the customer sees |

Two transports, because neither is sufficient alone: **FCM** reaches a killed or
dozing app but is best-effort and can lag past a 30-second offer, and the
**socket** is instant but only exists while the process does. An offer arriving
by both paths is de-duplicated by id.

Four rules the offer flow turns on, each enforced in `job-store.ts`:

1. An offer may arrive twice. De-duplicate by id.
2. Once accept is in flight, only its own HTTP response resolves that offer —
   the `job:taken` broadcast reaches the winner too, and acting on it would tell
   the driver who just won that they lost.
3. The countdown is UI only. The server rejects a late accept regardless.
4. One offer on screen at a time. Choosing between two at a junction is a safety
   problem, not a feature.

The race itself is settled by a single atomic write on the server, never by the
app. Losing is a normal outcome — every driver but one loses every offer — so
`JobRepository.accept` returns the verdict rather than throwing it.

Location streams only while a trip is `accepted` … `inTransit`, reconciled from
the trip list on every refresh rather than toggled at each status change, so it
survives an app restart mid-trip and stops when a delivery is closed elsewhere.

### Deliberate behavior changes

Everything else is a 1:1 port. These differ on purpose, and each is commented at
the site:

- **Pickup longitude** — the Dart `Address` parser read `latitude` into
  `longitude`, so "Get Direction" pointed at the wrong place. Fixed.
- **Notification "mark read"** — Dart refetched page 1 and appended it to the
  already-loaded list, duplicating rows. Now flips the flag locally.
- **Duty toggle** — the switch moves on tap and reconciles with the server
  response, instead of not moving until the request returns.
- **Notification permission** — denying it no longer throws the driver out to
  system settings; the app works without notifications.
- **Confirm-load quantity label** — was labelled `KG`; the unit was simply
  wrong, and the weight row beside it already says KG.
- **Request timeout** — added 30s. The Flutter client had none, so a dead
  network left the spinner up indefinitely.

---

## Not carried over

`my_wallet` (model, cell and screen) exists in the Flutter source but is
unreachable — nothing navigates to it, the sidebar has no entry for it, and it
renders `DummyData.transactions`, a hardcoded list with no backing endpoint.
There is nothing to port until the wallet API exists.

The pieces it would need are already here: the wallet artwork, the
`My Wallet` / `Total Balance` / `Recent Transactions` strings, and the shared
`HistoryWalletHeader` (its `isForWallet` mode does the ₹ prefix and the
positive/negative colouring). Building it later means writing the screen and
its endpoint, not re-porting the parts.
