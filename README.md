# BST Driver (driverRN)

React Native / Expo 57 port of the `bst_driver` Flutter app. Drivers use it to
go on duty, accept assigned trips, confirm what was actually loaded at pickup,
attach the weight slip and invoice, and mark deliveries complete.

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
| Node.js | 20 or newer |
| JDK | 17 (bundled with recent Android Studio — "Embedded JDK" is fine) |
| Android Studio | Ladybug or newer |
| Android SDK | Platform **36**, Build-Tools 36.x |

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

### 3. Open the project

In Android Studio choose **Open**, and select:

```
e:\Yogesh\driverRN\android
```

Select the `android` folder itself, **not** the repository root — pointing it at
the root gives you a plain folder with no Gradle project.

Wait for "Gradle sync finished" in the status bar. The first sync downloads the
Gradle distribution and dependencies and can take several minutes.

### 4. Start Metro

Android Studio builds and installs the app, but the JavaScript is served
separately by Metro. In a terminal, from the project root:

```bash
npx expo start
```

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
Metro isn't running or isn't reachable. Start `npx expo start`, and on a
physical device run `adb reverse tcp:8081 tcp:8081`.

**Build errors referencing `node_modules`**
`npm install` wasn't run, or was run after the sync. Install, then
**File → Sync Project with Gradle Files**.

**Stale build after changing `app.json` or adding a native dependency**
Config changes reach the native project only through prebuild:

```bash
npx expo prebuild --platform android --clean
```

This regenerates `android/`, discarding hand edits made there.

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
│   ├── services/            # repositories (one per Flutter repository)
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
