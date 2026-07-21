import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
