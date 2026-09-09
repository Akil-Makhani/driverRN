# Broadcast dispatch & live tracking — backend contract

The driver app in this repo implements the client side of a Porter-style
dispatch flow. This document describes the other half, in `bst-api`.

> **Status: built.** Everything below is implemented in the `bst-api` repo. The
> file map is at the end of this document, and
> `npm run script:verify-dispatch-race` there proves the accept can never hand
> one order to two drivers (500 concurrent accepts, one winner each time).
> Keep this document in step with that code — it is the reference for both.

**The change in one line:** today an order is assigned to one driver and only
that driver ever sees it. From now on a confirmed order is *offered* to every
on-duty driver at once, and the first to accept wins it.

The existing admin-assigns-a-driver path is unchanged and must keep working.
Broadcast is an additional way for a trip to acquire a driver, not a
replacement — see [Coexistence](#coexistence-with-manual-assignment).

---

## Contents

1. [The flow](#the-flow)
2. [Data model](#data-model)
3. [REST endpoints](#rest-endpoints)
4. [Socket.IO](#socketio)
5. [FCM payloads](#fcm-payloads)
6. [Winning the race](#winning-the-race) ← the part that must be exactly right
7. [Live location](#live-location)
8. [Coexistence with manual assignment](#coexistence-with-manual-assignment)
9. [Configuration the app expects](#configuration-the-app-expects)
10. [Test checklist](#test-checklist)

---

## The flow

```
Customer or admin confirms an order
          │
          ▼
   Create Job  (status: broadcasting, expiresAt: now + 30s)
          │
          ├──── Socket  "job:new"   → room drivers:onduty
          └──── FCM     data push   → every on-duty driver's tokens
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                    Driver A          Driver B          Driver C
                  siren + card      siren + card      siren + card
                        │                 │                 │
                        │   taps ACCEPT   │  taps ACCEPT    │
                        └────────┬────────┘                 │
                                 ▼                          │
                    POST /driver/jobs/:id/accept            │
                    (atomic; exactly one wins)              │
                                 │                          │
              ┌──────────────────┼──────────────────┐       │
              ▼                  ▼                  ▼       ▼
        A: 200 + tripId    B: 409 TAKEN     "job:taken" broadcast
        opens the trip     card dismisses    C's card dismisses
              │
              ├──── notify customer: "Driver assigned: <name>, <truck>"
              └──── notify admin room: order assigned
```

Nobody accepts before `expiresAt` → the job expires. Either re-broadcast on a
wider radius (recommended, see [Waves](#waves)) or fall back to manual
assignment and tell the admin.

---

## Data model

### New collection: `jobs`

One document per broadcast. Deliberately separate from `trips`: a job exists
before any driver owns it, and a trip in this system already means "work a
specific driver is doing".

```js
{
  _id:            ObjectId,
  orderId:        ObjectId,   // the confirmed order
  subOrderId:     ObjectId,
  tripId:         ObjectId,   // set when a driver wins; null while broadcasting

  status:         'broadcasting' | 'assigned' | 'expired' | 'cancelled',

  // THE race field. Null means unclaimed. See "Winning the race".
  acceptedBy:     ObjectId | null,   // → drivers._id
  acceptedAt:     Date | null,

  // Everyone this wave went out to, so a late accept from a driver who was
  // never offered the job can be rejected.
  offeredTo:      [ObjectId],
  rejectedBy:     [ObjectId],        // explicit declines; excluded from later waves

  expiresAt:      Date,              // now + ttlSeconds at creation
  ttlSeconds:     Number,            // 30 is a good default
  wave:           Number,            // 1, 2, 3… see "Waves"

  // Denormalised so the offer card renders without extra lookups. The app has
  // ~30 seconds; it must not need three round trips to draw the card.
  pickupAddress:  { ...Address },
  deliveryAddress:{ ...Address },
  distanceKm:     Number,            // pickup → drop
  totalWeight:    Number,
  payout:         Number,            // rupees, what the driver earns
  productSummary: String,            // e.g. "Cement · 40 bags"

  createdAt:      Date,
  updatedAt:      Date,
}
```

Indexes:

```js
db.jobs.createIndex({ status: 1, expiresAt: 1 })   // the expiry sweeper
db.jobs.createIndex({ offeredTo: 1, status: 1 })   // GET /driver/jobs/open
db.jobs.createIndex({ orderId: 1 })
```

`Address` is the shape the driver app already parses — `contactName`,
`contactNumber`, `companyName`, `buildingName`, `locality`, `landmark`, `city`,
`pincode`, `latitude`, `longitude`, `_id`.

> **Send real `latitude` / `longitude`.** They are currently absent or empty on
> driver-facing addresses. The offer card copes without them, but the in-app map
> cannot draw pickup and drop pins, and no ETA is possible. This is the single
> highest-value field to add.

### `drivers` — additions

```js
{
  // …existing fields…
  dutyStatus:   'on' | 'off',     // already exists; now also gates broadcast
  fcmTokens:    [String],         // array, not one string — drivers use 2 phones
  lastLocation: {
    type: 'Point',
    coordinates: [lng, lat],      // GeoJSON order: longitude FIRST
    heading: Number,
    speed: Number,
    accuracy: Number,
    recordedAt: Date,
  },
}
```

```js
db.drivers.createIndex({ lastLocation: '2dsphere' })
db.drivers.createIndex({ dutyStatus: 1 })
```

The 2dsphere index is what makes "on-duty drivers within 15 km of the pickup"
a query rather than a full scan.

### `trip_locations` — the breadcrumb trail

```js
{
  tripId:    ObjectId,
  driverId:  ObjectId,
  location:  { type: 'Point', coordinates: [lng, lat] },
  heading:   Number,
  speed:     Number,
  accuracy:  Number,
  recordedAt: Date,   // when the GPS fix was taken, NOT when it arrived
  createdAt: Date,
}
```

```js
db.trip_locations.createIndex({ tripId: 1, recordedAt: -1 })
// Trails are only interesting for a few weeks; let Mongo do the cleanup.
db.trip_locations.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })
```

The app streams a fix roughly every 5 s or 25 m while a trip is live, so budget
~500–1500 documents per trip.

---

## REST endpoints

All under the existing `/v2` prefix, all `Authorization: Bearer <accessToken>`,
all returning the house envelope `{ status, message, data }`.

### `GET /driver/jobs/open`

Offers currently open to the calling driver. The app calls this on duty-on, on
every socket reconnect, and on every app foreground — it is how a driver who was
in a tunnel still sees live work. **Must be cheap.**

```js
{
  status: 'success',
  data: [
    {
      _id: '652f…',
      orderId: '652a…',
      subOrderId: '652b…',
      pickupAddress:   { companyName: 'Shree Cement Depot', locality: 'Naroda',
                         city: 'Ahmedabad', pincode: '382330',
                         latitude: '23.0725', longitude: '72.6300' },
      deliveryAddress: { companyName: 'Patel Traders', locality: 'Bopal',
                         city: 'Ahmedabad', pincode: '380058',
                         latitude: '23.0301', longitude: '72.4700' },
      distanceKm: 24.6,
      pickupDistanceKm: 3.1,   // from this driver to the pickup
      totalWeight: 2500,
      payout: 1450,
      productSummary: 'Cement · 50 bags',
      expiresAt: '2026-09-05T09:31:12.000Z',
      ttlSeconds: 30,
      createdAt: '2026-09-05T09:30:42.000Z'
    }
  ]
}
```

Return only jobs where `status === 'broadcasting'`, `expiresAt > now`,
`offeredTo` contains this driver, and `rejectedBy` does not. Empty array, never
404, when there is nothing.

### `POST /driver/jobs/:jobId/accept`

The one that matters. See [Winning the race](#winning-the-race) for the
implementation — the status codes below are a contract the app branches on.

| Status | `code` | App behaviour |
| --- | --- | --- |
| `200` | — | Driver won. Opens the trip. |
| `409` | `JOB_ALREADY_TAKEN` | Card dismisses, "Another driver took this order" |
| `410` | `JOB_EXPIRED` | Card dismisses, "The order expired before you answered" |
| `404` | `JOB_CANCELLED` | Card dismisses, "This order was cancelled" |
| `403` | — | Not offered to this driver / off duty |

Success body — `tripId` is what the app navigates to:

```js
{ status: 'success', message: 'Trip assigned', data: { tripId: '653c…', jobId: '652f…' } }
```

Failure body — send both `message` and `code`. The app prefers `code` and falls
back to the HTTP status, so a new code it has not been taught degrades safely:

```js
{ status: 'error', code: 'JOB_ALREADY_TAKEN', message: 'This order has already been assigned' }
```

### `POST /driver/jobs/:jobId/reject`

Driver declined. Push the id onto `rejectedBy` so later waves skip them. Return
`200` even if the job is already gone — the app has dismissed the card either
way and ignores the response.

### `POST /driver/location`

The fallback path for fixes the socket could not carry, sent as a batch when
connectivity returns.

```js
// Request
{ fixes: [ { tripId, latitude, longitude, accuracy, heading, speed, recordedAt } ] }
```

`recordedAt` is epoch **milliseconds**, and is when the fix was taken — not when
it was sent. A replayed backlog will have `recordedAt` values minutes old; store
them at their real time and order the trail by `recordedAt`, or a tunnel exit
will draw the truck jumping backwards.

Up to 250 fixes per request. Respond `200` with the envelope; the app does not
read the body.

### `GET /orders/:orderId/tracking` — customer-facing

Not consumed by the driver app; the customer app needs it for the initial map
render before its socket connects.

```js
{
  status: 'success',
  data: {
    tripId: '653c…',
    status: 'inTransit',
    driver: { name: 'Ramesh Patel', mobileNumber: '98…', truckNumber: 'GJ01AB1234' },
    location: { latitude: 23.05, longitude: 72.55, heading: 118, recordedAt: 1757060000000 },
    pickup:   { latitude: 23.0725, longitude: 72.63 },
    drop:     { latitude: 23.0301, longitude: 72.47 },
    etaMinutes: 34
  }
}
```

---

## Socket.IO

Same origin as the API, default path (`/socket.io`). The app connects with
`transports: ['websocket']` only.

### Handshake

The token arrives in `handshake.auth.token`, re-read from storage on every
reconnect attempt, so a refreshed token is presented without a restart.

```js
io.use(async (socket, next) => {
  try {
    const { token } = socket.handshake.auth ?? {};
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.driverId = payload.driverId;   // or userId for customers
    socket.data.role = payload.role;           // 'driver' | 'customer' | 'admin'
    next();
  } catch {
    next(new Error('unauthorised'));
  }
});
```

Reject unauthenticated sockets. The app treats a connect error as "offline" and
retries with backoff capped at 10 s.

### Rooms

| Room | Members | Carries |
| --- | --- | --- |
| `drivers:onduty` | every on-duty driver | `job:new`, `job:taken`, `job:cancelled` |
| `driver:<driverId>` | one driver's sockets | targeted messages |
| `trip:<tripId>` | that trip's customer + admins | `trip:driver-location`, `trip:updated` |
| `admins` | admin panel sessions | assignment and status events |

Membership is derived server-side from `dutyStatus`, never from what the client
claims. `driver:online` is a hint that the driver is ready, not an instruction.

### Client → server

| Event | Payload | Server does |
| --- | --- | --- |
| `driver:online` | — | Join `drivers:onduty` **if** `dutyStatus === 'on'` in the DB |
| `driver:offline` | — | Leave `drivers:onduty` |
| `driver:location` | `{ tripId, latitude, longitude, accuracy, heading, speed, recordedAt }` | Persist + relay, see [Live location](#live-location) |

### Server → client

| Event | Room | Payload |
| --- | --- | --- |
| `job:new` | `drivers:onduty` | The full job object from `GET /driver/jobs/open` |
| `job:taken` | `drivers:onduty` | `{ jobId, tripId }` |
| `job:cancelled` | `drivers:onduty` | `{ jobId }` |
| `trip:updated` | `trip:<id>` | `{ tripId }` |
| `trip:driver-location` | `trip:<id>` | `{ tripId, latitude, longitude, heading, speed, recordedAt }` |

> `job:taken` goes to **everyone**, winner included. The app handles that: while
> its own accept is in flight it ignores `job:taken` for that job and lets the
> HTTP response decide, because otherwise the driver who just won would be told
> they lost. Do not try to exclude the winner server-side — the exclusion is
> racy and the client already handles the simple broadcast correctly.

---

## FCM payloads

The socket only exists while the app process does, and Android closes it within
seconds of the app leaving the foreground. **FCM is what actually reaches a
driver with the phone in their pocket** — send both, always.

### Offer

```js
{
  token: driverFcmToken,
  // The notification block is what makes a killed app ring. Send it.
  notification: { title: 'New order available',
                  body: 'Cement · 50 bags · ₹1,450 · Naroda → Bopal' },
  data: {
    type: 'job_offer',
    jobId: String(job._id),
    // The whole offer as a JSON string, so the app can render the card without
    // a round trip. Omit if it would push the payload over FCM's 4KB limit —
    // the app falls back to GET /driver/jobs/open when `job` is absent.
    job: JSON.stringify(offerPayload),
  },
  android: {
    priority: 'high',                    // required, or Doze delays it
    notification: {
      channelId: driver.offerChannelId,    // the channel THIS install created
      sound: 'new_order_siren',          // res/raw name, no extension
      notificationPriority: 'PRIORITY_MAX',
    },
    ttl: 30000,                          // pointless to deliver after expiry
  },
  apns: {
    headers: { 'apns-priority': '10', 'apns-expiration': String(expiryEpochSeconds) },
    payload: { aps: { sound: 'new_order_siren.wav', 'interruption-level': 'time-sensitive' } },
  },
}
```

Notes that will cost you a day each if missed:

- **`channelId` must name a channel that exists on that device.** This one is
  worth reading twice, because getting it wrong produces no error anywhere: FCM
  reports the push delivered, the phone stays completely silent, and the in-app
  siren keeps working because it rides the socket instead. Symptom: "the siren
  works when the app is open and never when it is closed."
- Android fixes a channel's sound at creation and will not change it, so a new
  siren means a **new channel id** — and the app deletes the superseded one at
  startup (`RETIRED_CHANNEL_IDS`). A server that hardcodes one id therefore goes
  silent on every phone that is on the other side of that change: old builds if
  you move forward, new builds if the fallback still names the retired one.
- So the id is not hardcoded. Each install reports the channel it created —
  `offerChannelId`, sent with the FCM token at login, on token refresh, and on
  **every app launch** (the launch case is the one that matters: an app update
  is exactly when the channel changes, and a driver who stays logged in never
  hits the other two). It is stored on the driver, and `sendOfferPushes` groups
  its sends by channel so each phone is pushed on the one it has.
  `DEFAULT_OFFER_CHANNEL_ID` covers installs older than this and must always
  name the id current builds create.
- Belt and braces: the Android manifest sets
  `com.google.firebase.messaging.default_notification_channel_id`, so a push
  naming an unknown channel lands there instead of vanishing. It needs
  `tools:replace="android:value"` — react-native-firebase declares the same
  meta-data with an empty value and the manifest merger fails without it.
- `priority: 'high'` is not optional. Without it, Doze can hold the push past
  the 30-second window.

### Race result

```js
{ data: { type: 'job_taken', jobId: '652f…' } }       // to the losers
{ data: { type: 'job_cancelled', jobId: '652f…' } }   // order withdrawn
```

Data-only, no notification block — these dismiss a card, they should not buzz.

---

## Winning the race

Everything else in this document is plumbing. This is the part that is either
correct or produces two drivers at the same pickup.

**Do not** read the job, check `acceptedBy`, then write. Two requests will both
read `null` and both write. The gap between the read and the write is exactly
where the bug lives, and it is a very small gap that will be hit — every driver
gets the siren at the same instant, so accepts arrive within milliseconds of
each other.

Use one conditional update. MongoDB guarantees single-document atomicity, so the
filter is evaluated and the write applied without interruption. Exactly one
caller matches; every other gets `null`.

```js
async function acceptJob(jobId, driverId) {
  const now = new Date();

  const job = await Job.findOneAndUpdate(
    {
      _id: jobId,
      status: 'broadcasting',
      acceptedBy: null,          // ← the whole race, in one line
      expiresAt: { $gt: now },
      offeredTo: driverId,       // never offered to them → cannot win it
    },
    { $set: { status: 'assigned', acceptedBy: driverId, acceptedAt: now } },
    { new: true },
  );

  if (!job) return { won: false, ...await explainFailure(jobId, driverId) };

  // From here on this driver has won and no other request can take it away.
  const trip = await createOrAssignTrip(job, driverId);
  await Job.updateOne({ _id: job._id }, { $set: { tripId: trip._id } });

  io.to('drivers:onduty').emit('job:taken', { jobId: String(job._id), tripId: String(trip._id) });
  await sendDataPushToLosers(job, driverId, 'job_taken');

  io.to(`trip:${trip._id}`).emit('trip:updated', { tripId: String(trip._id) });
  io.to('admins').emit('order:driver-assigned', {
    orderId: String(job.orderId), tripId: String(trip._id), driverId: String(driverId),
  });
  await notifyCustomerDriverAssigned(job, driverId, trip);

  return { won: true, tripId: String(trip._id) };
}

/**
 * Only runs on the losing path, so the extra read costs nothing on the hot one.
 * Order matters: check "taken" before "expired", because a job accepted at
 * 29.8s is taken, not expired, and the driver should be told the truth.
 */
async function explainFailure(jobId, driverId) {
  const job = await Job.findById(jobId).lean();
  if (!job || job.status === 'cancelled') return { httpStatus: 404, code: 'JOB_CANCELLED' };
  if (job.acceptedBy)                     return { httpStatus: 409, code: 'JOB_ALREADY_TAKEN' };
  if (job.expiresAt <= new Date())        return { httpStatus: 410, code: 'JOB_EXPIRED' };
  if (!job.offeredTo.some((id) => id.equals(driverId)))
                                          return { httpStatus: 403, code: 'JOB_NOT_OFFERED' };
  return { httpStatus: 409, code: 'JOB_ALREADY_TAKEN' };
}
```

If `trips` and `jobs` must move together, wrap `createOrAssignTrip` and the
`tripId` write in a transaction. The `findOneAndUpdate` above still decides the
winner on its own — the transaction only protects the follow-up writes.

**On other databases.** In Postgres the same shape is
`UPDATE jobs SET … WHERE id = $1 AND accepted_by IS NULL AND expires_at > now() RETURNING *`,
and `rowCount === 0` means you lost. In both cases the rule is identical: one
statement, condition and write together. Never `SELECT` then `UPDATE`.

### Broadcasting

```js
async function broadcastOrder(order) {
  const pickup = order.pickupAddress;

  const drivers = await Driver.find({
    dutyStatus: 'on',
    status: 'active',
    lastLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickup.longitude, pickup.latitude] },
        $maxDistance: 15000,           // metres; see Waves
      },
    },
  }).limit(50).lean();

  // Nobody on duty nearby: do not create a job that can only expire. Tell the
  // admin so a human can assign manually, which is the existing flow.
  if (drivers.length === 0) return notifyAdminNoDriversAvailable(order);

  const job = await Job.create({
    orderId: order._id,
    subOrderId: order.subOrderId,
    status: 'broadcasting',
    acceptedBy: null,
    offeredTo: drivers.map((d) => d._id),
    rejectedBy: [],
    wave: 1,
    ttlSeconds: 30,
    expiresAt: new Date(Date.now() + 30_000),
    ...denormalisedOfferFields(order),
  });

  const payload = toOfferPayload(job);
  io.to('drivers:onduty').emit('job:new', payload);
  await sendOfferPushes(drivers, job, payload);
}
```

`$near` sorts by distance, so `limit(50)` gives the nearest 50 — which is also
the right order to compute `pickupDistanceKm` from.

> A driver with no `lastLocation` is invisible to `$near` and will never be
> offered anything. Until location reporting has been live for a while, either
> fall back to "all on-duty drivers" when the geo query returns few results, or
> seed `lastLocation` at duty-on.

### Waves

Expire and re-broadcast rather than giving up. Run a sweeper every few seconds:

```js
// status: broadcasting, expiresAt <= now
for (const job of expiredJobs) {
  if (job.wave >= 3) {
    await Job.updateOne({ _id: job._id }, { $set: { status: 'expired' } });
    io.to('drivers:onduty').emit('job:cancelled', { jobId: String(job._id) });
    await notifyAdminNoDriverAccepted(job);   // falls back to manual assignment
    continue;
  }
  // Wider radius, skipping everyone who already declined.
  await rebroadcast(job, { wave: job.wave + 1, radiusMetres: 15000 * (job.wave + 1) });
}
```

Three waves of 30 s gives 90 seconds before a human is involved — long enough to
find a driver, short enough that a customer is not left wondering.

### Cancelling after accepting

A driver who accepts may still hand the order back — but only until they mark
**Vehicle There**. After that the sub-order has moved to Picked Up and the load
is being confirmed against the trip, so a cancellation would strand a
half-loaded order with no driver.

The window is enforced on the server, in
`trip.service#updateTripStatus`: `rejected` is accepted only from `pending`
(the manual flow's Decline, unchanged) and `accepted`. Anywhere later throws
`CANCEL_TOO_LATE`, which the driver controller returns as a **409** with a
sentence written for the driver rather than a generic 500. The trip status
machine on its own allows `rejected` from every stage — the rule deliberately
does not live there, so the manual truck flow keeps working exactly as it did.

A permitted cancel is the exact inverse of the accept:

| Accepting did | Cancelling undoes |
| --- | --- |
| `driver.onTrip = true`, `tripCount++` | `onTrip = false`, `tripCount--` |
| `vehicleAssignment.driverId = <driver>` | cleared, plus `driverNumber` |
| sub-order → Vehicle Assigned (2) | sub-order → Assign Vehicle (1) |
| — | driver appended to `subOrder.rejectedBy` |

Missing any one of those is silent and severe: before this existed a cancel
wrote nothing but a `rejectedAt` timestamp, so the driver stayed `onTrip` and
was filtered out of every future broadcast, and the sub-order kept their id and
was never re-offered to anyone. Nothing errored — the order just vanished from
the fleet.

The rewind is written straight to the document rather than through
`tempoSubOrderStatusService`: that machine only moves forward, so a
Vehicle Assigned → Assign Vehicle move is by definition invalid there.

Then `dispatch.service#reofferAfterDriverCancel` runs the same broadcast the
order got when it was first confirmed — every on-duty driver's phone sirens
again, minus the one that just cancelled, which `rejectedBy` excludes. It is
called **after** the transaction commits and is not awaited into the response:
it sends pushes and socket emits, and no phone may siren for a cancellation
that then rolls back. It re-checks that the sub-order is genuinely free, so an
admin who assigned someone in the seconds after the cancel wins and nothing is
broadcast.

Verify with `npm run script:verify-cancel-rebroadcast`.

---

## Live location

### Ingest

```js
socket.on('driver:location', async (fix) => {
  const driverId = socket.data.driverId;
  if (!driverId || socket.data.role !== 'driver') return;

  // Never trust the client's claim of which trip this is.
  const trip = await Trip.findOne({ _id: fix.tripId, driverId }).lean();
  if (!trip) return;
  if (!['accepted', 'pickedUp', 'inTransit'].includes(trip.status)) return;

  await TripLocation.create({
    tripId: trip._id,
    driverId,
    location: { type: 'Point', coordinates: [fix.longitude, fix.latitude] },
    heading: fix.heading, speed: fix.speed, accuracy: fix.accuracy,
    recordedAt: new Date(fix.recordedAt),
  });

  await Driver.updateOne({ _id: driverId }, {
    $set: { lastLocation: {
      type: 'Point', coordinates: [fix.longitude, fix.latitude],
      heading: fix.heading, speed: fix.speed, accuracy: fix.accuracy,
      recordedAt: new Date(fix.recordedAt),
    } },
  });

  io.to(`trip:${trip._id}`).emit('trip:driver-location', {
    tripId: String(trip._id),
    latitude: fix.latitude, longitude: fix.longitude,
    heading: fix.heading, speed: fix.speed,
    recordedAt: fix.recordedAt,
  });
});
```

`POST /driver/location` does the same for each fix in the batch, minus the relay
— a replayed backlog is history, and pushing it at a customer's map would drag
the marker back through the route.

### What the app sends, so you can size for it

- One fix per 5 s **or** per 25 m of movement, whichever is later.
- A heartbeat fix at least every 45 s even when parked, so "stationary" is
  distinguishable from "phone died".
- Only while a trip is in `accepted` … `inTransit`. Nothing on duty-only.
- Up to 250 buffered fixes replayed in one batch after a connectivity gap.

Roughly 12 fixes/minute/active driver. 100 concurrent trips ≈ 20 writes/second.

### Customer side

The customer app joins `trip:<tripId>` (authorise: the trip's order must belong
to that customer) and listens for `trip:driver-location`. Seed the initial map
from `GET /orders/:orderId/tracking` rather than waiting for the first socket
event, or the map is blank for up to five seconds.

Stop relaying once the trip is `delivered` — and make the customer app drop the
marker at that point too, so a driver's next job is not exposed to a previous
customer. **This is a privacy boundary, not a nicety.**

---

## Coexistence with manual assignment

The admin panel must keep working exactly as it does. Two rules:

1. **Manual assignment beats a live broadcast.** If an admin assigns a driver to
   an order that is mid-broadcast, cancel the job first — set
   `status: 'cancelled'` and emit `job:cancelled` — then assign. Otherwise a
   driver can accept a job that an admin has already given away.
2. **A manually assigned trip never becomes a job.** Only orders confirmed
   *without* a driver enter the broadcast path. Existing assigned trips continue
   to arrive through `GET /driver/trips` and are accepted with the existing
   `PATCH /driver/trips/:id/accepted` — the driver app still supports that path
   unchanged, and its dashboard "Accept Trip" button still calls it.

The two flows differ in what a driver sees: an assigned trip appears quietly in
the dashboard list, a broadcast offer takes over the screen with a siren.

---

## Configuration the app expects

| Setting | Where | Value |
| --- | --- | --- |
| API base | `EXPO_PUBLIC_API_URL` | `https://api.bstm.in/v2` (default) |
| Socket origin | `EXPO_PUBLIC_SOCKET_URL` | defaults to the API base minus `/v2` |
| Offer channel id | reported by each install as `offerChannelId` | `order_offers_v3` |
| Siren resource | fixed in the app | `new_order_siren` (`res/raw`) |
| Default offer TTL | app fallback | 30 s, overridden per job by `ttlSeconds` |

If the socket is served from a different host or path than the API, set
`EXPO_PUBLIC_SOCKET_URL` explicitly.

---

## Test checklist

The ones that actually catch bugs:

- [ ] **Two drivers accept within 50 ms.** Exactly one 200, one 409. Run it a
      few hundred times in a loop — a read-then-write bug passes a single try.
- [ ] **Winner is not told they lost.** Winner's `job:taken` arrives while their
      accept is in flight; they must still land on the trip screen.
- [ ] **Accept at 29.9 s wins; accept at 30.1 s gets 410**, not 409.
- [ ] **Accept after the order is cancelled** → 404 `JOB_CANCELLED`.
- [ ] **Driver not in `offeredTo`** posts an accept → 403, and does not win.
- [ ] **Airplane mode across an offer.** Turn it on, broadcast, turn it off:
      `GET /driver/jobs/open` returns the offer if still live, nothing if not.
- [ ] **Killed app receives an offer.** Phone rings on the `order_offers_v3`
      channel with the siren, through Do Not Disturb.
- [ ] **Tunnel.** Fixes buffer, then replay in one batch on reconnect with their
      original `recordedAt`; the customer's trail has no backwards jump.
- [ ] **Delivered.** Location relay stops; the customer no longer sees the truck.
- [ ] **Admin assigns mid-broadcast.** The job is cancelled, every offer card
      dismisses, and no driver can accept it afterwards.
- [ ] **Nobody accepts three waves.** Admin is told, manual assignment works.

---

## Where it lives in bst-api

| Piece | File |
| --- | --- |
| Job (offer) model | `src/v2/models/job.model.ts` |
| Breadcrumb trail | `src/v2/models/tripLocation.model.ts` |
| Driver `lastLocation` + 2dsphere | `src/models/driver.model.ts` |
| Socket.IO server, auth, rooms | `src/config/socket.ts` |
| Broadcast, atomic accept, waves | `src/v2/service/dispatch.service.ts` |
| Location ingest, relay, authorisation | `src/v2/service/tracking.service.ts` |
| Driver endpoints | `src/v2/driver/controllers/job.controller.ts` |
| Customer tracking | `src/v2/user/controllers/tracking.controller.ts` |
| Admin tracking + dispatch visibility | `src/v2/admin/controllers/tracking.controller.ts` |
| Race regression test | `scripts/verify-dispatch-race.ts` |

Trigger points, all fire-and-forget so a dispatch failure can never fail the
thing that caused it:

- `v2/admin/controllers/order.controller.ts` — after an order update leaves the
  order In Process.
- `v2/user/controllers/order.controller.ts` — same, on the customer's confirm.
- `v2/admin/controllers/subOrder.controller.ts#assignDriver` — cancels a live
  offer *before* assigning, so manual assignment always wins.
