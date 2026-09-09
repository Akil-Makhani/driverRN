/**
 * Android notification channel ids.
 *
 * Their own module because two things need the offer channel — the manager
 * that creates it, and the repository that reports it to the server — and
 * importing one from the other closed a cycle between them.
 *
 * Android pins a channel's sound at creation and will not change it
 * afterwards, so a new siren means a NEW id here. Add the old one to
 * RETIRED_CHANNEL_IDS when you do; the server is told which id this install
 * created, so phones still on the previous build keep ringing on theirs.
 */
export const OFFER_CHANNEL_ID = 'order_offers_v3';

/** Superseded offer channels, deleted at startup. */
export const RETIRED_CHANNEL_IDS = ['order_offers', 'order_offers_v2'];
