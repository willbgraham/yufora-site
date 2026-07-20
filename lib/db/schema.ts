import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
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

export type ContributionStatus = "pending" | "succeeded" | "refunded";

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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("contributions_product_idx").on(t.productId),
    index("contributions_charity_idx").on(t.charityId),
  ],
);
