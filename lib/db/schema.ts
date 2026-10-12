import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { ELIGIBLE_STATES_SQL } from "../giveaways/constants";
import type { DrawResult, RulesDocument } from "../giveaways/types";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/* ---------------------------------------------------------------------------
   Better Auth tables — field shapes must match what better-auth expects
   (verified against getAuthTables() for the installed version).
--------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: id(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: id(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

/**
 * Better Auth rate limiting (storage: "database") — persistent per-IP
 * counters so throttling holds across serverless instances. Added after
 * bots probed the magic-link endpoint (2026-08); shape is Better Auth's
 * rateLimit model: key, count, lastRequest (ms epoch).
 */
export const rateLimit = pgTable(
  "rate_limit",
  {
    id: id(),
    key: text("key"),
    count: integer("count"),
    lastRequest: bigint("last_request", { mode: "number" }),
  },
  (t) => [index("rate_limit_key_idx").on(t.key)],
);

export const verification = pgTable("verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ---------------------------------------------------------------------------
   Yufora domain tables
--------------------------------------------------------------------------- */

/** A charity's shop. v1: one charity per owner user. */
export const charities = pgTable(
  "charities",
  {
    id: id(),
    name: text("name").notNull(),
    /** URL-safe identity: yufora.com/s/[slug] and the embed code. */
    slug: text("slug").notNull().unique(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id),
    /** Connected Stripe account (acct_...) once Stripe onboarding completes. */
    stripeAccountId: text("stripe_account_id"),
    /**
     * Cached from Stripe's charges_enabled — updated on onboarding return and
     * via the account.updated webhook. Gates public checkout without a
     * Stripe API call per page view.
     */
    stripeChargesEnabled: boolean("stripe_charges_enabled")
      .notNull()
      .default(false),
    /**
     * The page on the charity's own site where the shop is embedded.
     * When set, embed checkouts return the donor there and donor emails
     * link there — keeping the "runs on your website" promise end to end.
     */
    embedPageUrl: text("embed_page_url"),
    /**
     * Standalone donor wall: the charity's own EXISTING Stripe account,
     * connected read-only via OAuth. Separate from stripeAccountId (the
     * shop's account) so the two products never interfere.
     */
    tickerStripeAccountId: text("ticker_stripe_account_id"),
    /**
     * The charity as OUR paying customer (cus_..., on the PLATFORM Stripe
     * account). A charity now has three distinct Stripe identities — do
     * not confuse them:
     *  - stripeAccountId: their Connect account that RECEIVES donations
     *  - tickerStripeAccountId: read-only OAuth to their existing account
     *  - stripeCustomerId: them PAYING Yufora for the subscription
     */
    stripeCustomerId: text("stripe_customer_id"),
    /**
     * Staff comp lever: fully entitled without a subscription. Used for
     * founding/early-access organizations.
     */
    billingExempt: boolean("billing_exempt").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("charities_owner_idx").on(t.ownerUserId)],
);

export type ProductStatus = "draft" | "published" | "archived";

export const products = pgTable(
  "products",
  {
    id: id(),
    charityId: text("charity_id")
      .notNull()
      .references(() => charities.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** The item's full price — what "funded" means, in cents. */
    goalCents: integer("goal_cents").notNull(),
    /**
     * Cached progress in cents, updated when a contribution succeeds.
     * `contributions` is the source of truth; this avoids summing per render.
     */
    fundedCents: integer("funded_cents").notNull().default(0),
    /** YouTube or Vimeo URL (v1 is link-based video, not uploads). */
    videoUrl: text("video_url"),
    status: text("status").$type<ProductStatus>().notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("products_charity_idx").on(t.charityId)],
);

export const productPhotos = pgTable(
  "product_photos",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_photos_product_idx").on(t.productId)],
);

/**
 * Charity-curated "recognized supporters" for the standalone donor wall.
 * Names here are added by the charity, which attests it has the donor's
 * permission — the traditional donor-recognition-list model. We never
 * derive public names from payment data.
 */
export const wallEntries = pgTable(
  "wall_entries",
  {
    id: id(),
    charityId: text("charity_id")
      .notNull()
      .references(() => charities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amountCents: integer("amount_cents"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("wall_entries_charity_idx").on(t.charityId)],
);

export type ContributionStatus = "pending" | "succeeded" | "refunded";

/** What the donor agreed to show on the public donor wall. */
export type ContributionDisplay = "name" | "name_amount" | "anonymous";

export const contributions = pgTable(
  "contributions",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    charityId: text("charity_id")
      .notNull()
      .references(() => charities.id),
    amountCents: integer("amount_cents").notNull(),
    donorName: text("donor_name"),
    donorEmail: text("donor_email"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    status: text("status")
      .$type<ContributionStatus>()
      .notNull()
      .default("pending"),
    /**
     * Chosen by the donor at checkout (Stripe custom field). Nothing is ever
     * shown publicly beyond what this permits; the safe default is anonymous.
     */
    displayPreference: text("display_preference")
      .$type<ContributionDisplay>()
      .notNull()
      .default("anonymous"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("contributions_product_idx").on(t.productId),
    index("contributions_charity_idx").on(t.charityId),
  ],
);

/* ---------------------------------------------------------------------------
   Billing — the charity's subscription to Yufora itself (PLATFORM Stripe
   account; entirely separate from the donation rails above).
--------------------------------------------------------------------------- */

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/**
 * One row per Stripe Subscription, keyed by the Stripe id — NOT columns on
 * charities. A charity that cancels and later resubscribes gets a new
 * sub_... id, and Stripe delivers webhooks unordered and retried: a late
 * event for the old, canceled subscription must never clobber the new
 * one's status. Each Stripe subscription upserts its own row; entitlement
 * reads "does any entitled row exist" (see lib/billing.ts).
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    charityId: text("charity_id")
      .notNull()
      .references(() => charities.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    /** Upsert key: webhook replays and out-of-order deliveries collapse here. */
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    /** Resolved to a plan at READ time via the env map — never stored as a name. */
    stripePriceId: text("stripe_price_id").notNull(),
    status: text("status").$type<SubscriptionStatus>().notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    trialEnd: timestamp("trial_end"),
    /** Unix seconds of the newest Stripe event applied — stale-event guard. */
    lastEventCreated: integer("last_event_created").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("subscriptions_charity_idx").on(t.charityId)],
);

/* ---------------------------------------------------------------------------
   Newsroom — Yufora-wide, first-party editorial content. Deliberately NOT
   charity-scoped: one global newsroom curated by staff (see requireStaff()).
--------------------------------------------------------------------------- */

/** Original articles written by Yufora staff. Reuses ProductStatus vocabulary
 *  (draft = not visible, published = live, archived = hidden but kept). */
export const articles = pgTable(
  "articles",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt").notNull().default(""),
    /** Markdown, rendered with react-markdown (safe by default). */
    body: text("body").notNull().default(""),
    coverImageUrl: text("cover_image_url"),
    author: text("author").notNull().default("Yufora"),
    status: text("status").$type<ProductStatus>().notNull().default("draft"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("articles_status_idx").on(t.status, t.publishedAt)],
);

export type NewsSourceType = "rss" | "youtube";

/** A feed the newsroom pulls from (blog RSS/Atom, or a YouTube channel feed). */
export const newsSources = pgTable(
  "news_sources",
  {
    id: id(),
    type: text("type").$type<NewsSourceType>().notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(), // editor label + attribution name
    active: boolean("active").notNull().default(true),
    // Fetch health, surfaced in the source manager.
    lastFetchedAt: timestamp("last_fetched_at"),
    lastStatus: text("last_status"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("news_sources_active_idx").on(t.active)],
);

export type NewsItemStatus = "pending" | "approved" | "rejected";
export type NewsItemKind = "article" | "youtube" | "instagram";

/** A single curated item — from a feed or manually added — awaiting or past
 *  editorial review. Nothing is public until status = "approved". */
export const newsItems = pgTable(
  "news_items",
  {
    id: id(),
    // null for manually-added links (no feed source)
    sourceId: text("source_id").references(() => newsSources.id, {
      onDelete: "cascade",
    }),
    kind: text("kind").$type<NewsItemKind>().notNull().default("article"),
    externalId: text("external_id").notNull(), // guid / videoId / normalized link
    // Captured from the source (immutable originals):
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""), // SANITIZED html, char-capped
    rawExcerpt: text("raw_excerpt"), // raw original, for re-sanitize
    link: text("link").notNull(), // canonical source URL
    imageUrl: text("image_url"),
    embedUrl: text("embed_url"), // safe youtube-nocookie embed URL, when a video
    author: text("author"),
    publishedAt: timestamp("published_at"),
    // Editorial overlay (nullable — a re-fetch never clobbers curation):
    editedTitle: text("edited_title"),
    editedExcerpt: text("edited_excerpt"),
    editorNote: text("editor_note"),
    status: text("status").$type<NewsItemStatus>().notNull().default("pending"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("news_items_status_idx").on(t.status, t.publishedAt),
    index("news_items_source_idx").on(t.sourceId),
    // Dedupe feed items. Manual items (sourceId null) don't collide here
    // (Postgres NULLs are distinct) — those are deduped app-side on link.
    uniqueIndex("news_items_source_ext_idx").on(t.sourceId, t.externalId),
  ],
);

/* ---------------------------------------------------------------------------
   Giveaways — charity-run prize sweepstakes. The charity is the legal
   Sponsor; Yufora is the Administrator. Every table here uses timestamptz:
   entry periods, the 24h confirmation grace and the draw time are legally
   significant comparisons, and plain timestamp mixes the Node process
   zone with the database's UTC now().
--------------------------------------------------------------------------- */

const tstz = (name: string) => timestamp(name, { withTimezone: true });

export type GiveawayStatus =
  | "draft"
  | "live"
  | "drawing"
  | "drawn"
  | "completed"
  | "canceled";
export type GiveawayOutcome = "awarded" | "unclaimed" | "no_entries";

export const giveawayCampaigns = pgTable(
  "giveaway_campaigns",
  {
    id: id(),
    charityId: text("charity_id")
      .notNull()
      .references(() => charities.id, { onDelete: "cascade" }),
    status: text("status").$type<GiveawayStatus>().notNull().default("draft"),
    outcome: text("outcome").$type<GiveawayOutcome>(),

    // --- Config: editable ONLY while status = 'draft' (every UPDATE says so).
    prizeName: text("prize_name").notNull(),
    prizeDescription: text("prize_description").notNull().default(""),
    prizeArvCents: integer("prize_arv_cents").notNull(),
    prizePhotoUrl: text("prize_photo_url"),
    timezone: text("timezone").notNull().default("America/New_York"),
    /** Local midnight of the first entry day (snapped to go-live time if later). */
    startsAt: tstz("starts_at").notNull(),
    /** Exclusive: local midnight after the last entry day. */
    endsAt: tstz("ends_at").notNull(),
    /** endsAt + the confirmation grace; the earliest the draw may run. */
    drawAt: tstz("draw_at").notNull(),
    perPersonCap: integer("per_person_cap").notNull().default(30),
    freeEntriesPerDay: integer("free_entries_per_day").notNull().default(1),
    donationsEnabled: boolean("donations_enabled").notNull().default(false),
    /** Whole-dollar rate, in cents: one bonus entry per this much given. */
    centsPerEntry: integer("cents_per_entry"),
    claimDeadlineDays: integer("claim_deadline_days").notNull().default(7),
    sponsorLegalName: text("sponsor_legal_name").notNull().default(""),
    sponsorStreet: text("sponsor_street").notNull().default(""),
    sponsorCity: text("sponsor_city").notNull().default(""),
    sponsorState: text("sponsor_state").notNull().default(""),
    sponsorZip: text("sponsor_zip").notNull().default(""),
    sponsorPrivacyUrl: text("sponsor_privacy_url"),
    /** Comma-separated domains whose addresses can't enter (staff, board). */
    excludedEmailDomains: text("excluded_email_domains").notNull().default(""),
    /** Where the charity embeds it — only used for "Back to …" links. */
    sitePageUrl: text("site_page_url"),

    // --- Written once at go-live.
    liveAt: tstz("live_at"),
    liveByUserId: text("live_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    /** siteConfig.url captured at go-live; every email link is built from it. */
    publicOrigin: text("public_origin"),
    rulesVersion: text("rules_version"),
    rulesDocument: jsonb("rules_document").$type<RulesDocument>(),
    rulesText: text("rules_text"),
    /** sha256 hex of rulesText. */
    rulesHash: text("rules_hash"),
    seedCommit: text("seed_commit"),
    /** SECRET until the draw completes. Never in a public select. */
    serverSeed: text("server_seed"),

    canceledAt: tstz("canceled_at"),
    cancelReason: text("cancel_reason"),
    completedAt: tstz("completed_at"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("giveaway_campaigns_charity_idx").on(t.charityId),
    check(
      "giveaway_campaigns_status_chk",
      sql`${t.status} in ('draft','live','drawing','drawn','completed','canceled')`,
    ),
    check(
      "giveaway_campaigns_arv_chk",
      sql`${t.prizeArvCents} > 0 and ${t.prizeArvCents} < 500000`,
    ),
    // Loose net (DST, go-live snapping); lib/giveaways enforces 90 days exactly.
    check(
      "giveaway_campaigns_window_chk",
      sql`${t.endsAt} > ${t.startsAt} and ${t.endsAt} <= ${t.startsAt} + interval '92 days'`,
    ),
    check(
      "giveaway_campaigns_draw_at_chk",
      sql`${t.drawAt} >= ${t.endsAt} + interval '1 day'`,
    ),
    check(
      "giveaway_campaigns_limits_chk",
      sql`${t.perPersonCap} between 1 and 1000 and ${t.freeEntriesPerDay} between 1 and 10 and ${t.claimDeadlineDays} between 3 and 30`,
    ),
    // Loose parity net only — never stricter than the exact tz-aware check
    // in lib/giveaways/parity.ts.
    check(
      "giveaway_campaigns_parity_net_chk",
      sql`${t.freeEntriesPerDay} * (ceil(extract(epoch from (${t.endsAt} - ${t.startsAt})) / 86400.0) + 1) >= ${t.perPersonCap}`,
    ),
    check(
      "giveaway_campaigns_donation_chk",
      sql`(not ${t.donationsEnabled}) or (${t.centsPerEntry} between 500 and 100000 and ${t.centsPerEntry} % 100 = 0)`,
    ),
    check(
      "giveaway_campaigns_frozen_chk",
      sql`${t.status} = 'draft' or (${t.liveAt} is not null and ${t.rulesHash} is not null and ${t.rulesText} is not null and ${t.rulesDocument} is not null and ${t.seedCommit} is not null and ${t.serverSeed} is not null and ${t.publicOrigin} is not null)`,
    ),
  ],
);

export type GiveawayEntrantStatus = "active" | "disqualified";

export const giveawayEntrants = pgTable(
  "giveaway_entrants",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => giveawayCampaigns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    /** Dedupe key: lowercased, +tag stripped, gmail dots removed. */
    emailNormalized: text("email_normalized").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    state: text("state").notNull(),
    ageAttestedAt: tstz("age_attested_at").notNull(),
    rulesAcceptedAt: tstz("rules_accepted_at").notNull(),
    /** The exact Rules they agreed to (server-supplied, not from the form). */
    rulesHash: text("rules_hash").notNull(),
    publicDisplayOptIn: boolean("public_display_opt_in")
      .notNull()
      .default(false),
    charityMarketingOptIn: boolean("charity_marketing_opt_in")
      .notNull()
      .default(false),
    status: text("status")
      .$type<GiveawayEntrantStatus>()
      .notNull()
      .default("active"),
    disqualifiedAt: tstz("disqualified_at"),
    disqualifiedReason: text("disqualified_reason"),
    confirmedAt: tstz("confirmed_at"),
    lastConfirmEmailAt: tstz("last_confirm_email_at"),
    /** HMAC of the IP — never the raw address. Review signal only. */
    ipHash: text("ip_hash"),
    ipCountry: text("ip_country"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("giveaway_entrants_campaign_email_idx").on(
      t.campaignId,
      t.emailNormalized,
    ),
    index("giveaway_entrants_campaign_confirmed_idx").on(
      t.campaignId,
      t.confirmedAt,
    ),
    check(
      "giveaway_entrants_status_chk",
      sql`${t.status} in ('active','disqualified')`,
    ),
    check(
      "giveaway_entrants_state_chk",
      sql`${t.state} in (${sql.raw(ELIGIBLE_STATES_SQL)})`,
    ),
  ],
);

export type GiveawayDonationStatus =
  | "pending"
  | "succeeded"
  | "refunded"
  | "expired";
export type GiveawayRefundEffect = "voided" | "post_lock_logged";

/**
 * Financial record: NO cascade (mirrors contributions). The row is written
 * BEFORE the Stripe session exists, so the webhook only ever credits
 * sessions Yufora created — a charity can't mint entries by crafting its
 * own Checkout Session with giveaway metadata.
 */
export const giveawayDonations = pgTable(
  "giveaway_donations",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => giveawayCampaigns.id),
    charityId: text("charity_id")
      .notNull()
      .references(() => charities.id),
    entrantId: text("entrant_id")
      .notNull()
      .references(() => giveawayEntrants.id),
    amountCents: integer("amount_cents").notNull(),
    centsPerEntry: integer("cents_per_entry").notNull(),
    /** The Connect account the session was created on. */
    stripeAccountId: text("stripe_account_id").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    status: text("status")
      .$type<GiveawayDonationStatus>()
      .notNull()
      .default("pending"),
    entriesCredited: integer("entries_credited").notNull().default(0),
    /** Why fewer entries than the amount implies: cap_reached | not_open | entrant_ineligible. */
    creditNote: text("credit_note"),
    donorName: text("donor_name"),
    donorEmail: text("donor_email"),
    paidAt: tstz("paid_at"),
    refundedAt: tstz("refunded_at"),
    refundEffect: text("refund_effect").$type<GiveawayRefundEffect>(),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("giveaway_donations_campaign_idx").on(t.campaignId, t.status),
    index("giveaway_donations_entrant_idx").on(t.entrantId),
    index("giveaway_donations_charity_idx").on(t.charityId),
    check(
      "giveaway_donations_status_chk",
      sql`${t.status} in ('pending','succeeded','refunded','expired')`,
    ),
    check(
      "giveaway_donations_amount_chk",
      sql`${t.amountCents} >= 500 and ${t.centsPerEntry} > 0 and ${t.entriesCredited} >= 0`,
    ),
  ],
);

export type GiveawayEntryMethod = "free" | "donation";
export type GiveawayEntryStatus = "active" | "void";

/** One row = one equal-weight ticket. `method` is audit only — the draw
 *  never reads it. */
export const giveawayEntries = pgTable(
  "giveaway_entries",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => giveawayCampaigns.id, { onDelete: "cascade" }),
    entrantId: text("entrant_id")
      .notNull()
      .references(() => giveawayEntrants.id, { onDelete: "cascade" }),
    method: text("method").$type<GiveawayEntryMethod>().notNull(),
    status: text("status")
      .$type<GiveawayEntryStatus>()
      .notNull()
      .default("active"),
    /** Campaign-local day index; 0 = the first local entry day. */
    entryDay: integer("entry_day").notNull(),
    /** free: 0..k-1 within the day · donation: 0..n-1 within the donation. */
    slot: integer("slot").notNull(),
    donationId: text("donation_id").references(() => giveawayDonations.id),
    /** Set once at pool lock; rows with a draw_id are immutable. No FK: it
     *  is written in the same transaction, before the draw row. */
    drawId: text("draw_id"),
    voidedAt: tstz("voided_at"),
    voidReason: text("void_reason"),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("giveaway_entries_entrant_idx").on(t.entrantId, t.status),
    index("giveaway_entries_campaign_idx").on(t.campaignId, t.status),
    index("giveaway_entries_draw_idx").on(t.drawId),
    index("giveaway_entries_donation_idx").on(t.donationId),
    uniqueIndex("giveaway_entries_free_slot_idx")
      .on(t.entrantId, t.entryDay, t.slot)
      .where(sql`${t.method} = 'free'`),
    uniqueIndex("giveaway_entries_donation_slot_idx")
      .on(t.donationId, t.slot)
      .where(sql`${t.method} = 'donation'`),
    check(
      "giveaway_entries_method_chk",
      sql`${t.method} in ('free','donation')`,
    ),
    check(
      "giveaway_entries_status_chk",
      sql`${t.status} in ('active','void')`,
    ),
    check(
      "giveaway_entries_donation_link_chk",
      sql`(${t.method} = 'donation') = (${t.donationId} is not null)`,
    ),
    check(
      "giveaway_entries_nonneg_chk",
      sql`${t.entryDay} >= 0 and ${t.slot} >= 0`,
    ),
    check(
      "giveaway_entries_void_chk",
      sql`(${t.status} = 'void') = (${t.voidedAt} is not null)`,
    ),
  ],
);

/**
 * Append-only, one per campaign — the UNIQUE is the no-re-roll guarantee.
 * Lock columns are written when entries lock; result columns exactly once
 * (WHERE completed_at IS NULL). The target drand round is fixed at lock,
 * so a retried completion always produces the same result.
 */
export const giveawayDraws = pgTable(
  "giveaway_draws",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .unique()
      .references(() => giveawayCampaigns.id),
    algorithm: text("algorithm").notNull(),
    lockedAt: tstz("locked_at").notNull(),
    lockedByUserId: text("locked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    poolSize: integer("pool_size").notNull(),
    entrantCount: integer("entrant_count").notNull(),
    poolHash: text("pool_hash").notNull(),
    seedCommit: text("seed_commit").notNull(),
    chainHash: text("chain_hash").notNull(),
    latestRoundAtLock: integer("latest_round_at_lock").notNull(),
    targetRound: integer("target_round").notNull(),
    targetRoundAt: tstz("target_round_at").notNull(),
    beaconRandomness: text("beacon_randomness"),
    beaconSignature: text("beacon_signature"),
    finalSeed: text("final_seed"),
    /** The reveal — only ever set in the completion transaction. */
    serverSeed: text("server_seed"),
    results: jsonb("results").$type<DrawResult[]>(),
    completedAt: tstz("completed_at"),
  },
  (t) => [
    check(
      "giveaway_draws_future_round_chk",
      sql`${t.targetRound} > ${t.latestRoundAtLock}`,
    ),
    check(
      "giveaway_draws_pool_chk",
      sql`${t.poolSize} > 0 and ${t.entrantCount} between 1 and ${t.poolSize}`,
    ),
    check(
      "giveaway_draws_completion_chk",
      sql`(${t.completedAt} is null and ${t.finalSeed} is null and ${t.serverSeed} is null and ${t.results} is null and ${t.beaconRandomness} is null and ${t.beaconSignature} is null) or (${t.completedAt} is not null and ${t.finalSeed} is not null and ${t.serverSeed} is not null and ${t.results} is not null and ${t.beaconRandomness} is not null and ${t.beaconSignature} is not null)`,
    ),
  ],
);

export type GiveawayClaimStatus =
  | "notified"
  | "accepted"
  | "declined"
  | "expired"
  | "disqualified";

export const giveawayClaims = pgTable(
  "giveaway_claims",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => giveawayCampaigns.id),
    drawId: text("draw_id")
      .notNull()
      .references(() => giveawayDraws.id),
    entrantId: text("entrant_id")
      .notNull()
      .references(() => giveawayEntrants.id),
    /** 0 = winner, 1..3 = alternates. */
    rank: integer("rank").notNull(),
    status: text("status")
      .$type<GiveawayClaimStatus>()
      .notNull()
      .default("notified"),
    notifiedAt: tstz("notified_at").notNull().defaultNow(),
    emailSentAt: tstz("email_sent_at"),
    deadlineAt: tstz("deadline_at").notNull(),
    respondedAt: tstz("responded_at"),
    claimantLegalName: text("claimant_legal_name"),
    claimantPhone: text("claimant_phone"),
    responseIpHash: text("response_ip_hash"),
    closedReason: text("closed_reason"),
    prizeAwardedAt: tstz("prize_awarded_at"),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("giveaway_claims_draw_rank_idx").on(t.drawId, t.rank),
    // At most one live claim per giveaway.
    uniqueIndex("giveaway_claims_active_idx")
      .on(t.campaignId)
      .where(sql`${t.status} in ('notified','accepted')`),
    index("giveaway_claims_campaign_idx").on(t.campaignId),
    check(
      "giveaway_claims_status_chk",
      sql`${t.status} in ('notified','accepted','declined','expired','disqualified')`,
    ),
    check("giveaway_claims_rank_chk", sql`${t.rank} between 0 and 3`),
  ],
);

/**
 * Atomic fixed-window counters for lib/throttle.ts. PK = key (a deliberate
 * exception to id()) because it is the upsert target — unlike rate_limit,
 * whose non-unique key index can't support ON CONFLICT.
 */
export const throttleBuckets = pgTable(
  "throttle_buckets",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    windowStartedAt: tstz("window_started_at").notNull(),
    expiresAt: tstz("expires_at").notNull(),
  },
  (t) => [index("throttle_buckets_expires_idx").on(t.expiresAt)],
);
