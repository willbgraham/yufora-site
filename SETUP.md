# Yufora — Setup & Launch Checklist

Every integration in this codebase degrades gracefully: the site builds, deploys,
and runs with **zero** of the steps below completed. Each step you finish switches
one capability on. Do them in any order — this order is just the sensible one.

**Env var changes only take effect after a redeploy** (Vercel → Deployments →
⋯ → Redeploy). Locally, mirror values into `.env.local` (gitignored — never
commit it).

---

## Part A — Private staging

### A1. Vercel project basics

- [x] Confirm the project exists at vercel.com and is linked to
      `github.com/willbgraham/yufora-site` ✓ (project `yufora-site`, CLI-linked)
- [x] Confirm `yufora.com` is attached under **Settings → Domains**
      ✓ (`yufora.com` + `www.yufora.com` verified; `www` is canonical)
- [x] Confirm the `dev` branch produces preview deployments ✓ — staging URL:
      `https://yufora-site-git-dev-willbgrahams-projects.vercel.app`
- [x] **Deployment Protection** ✓ — Vercel Authentication active for all
      non-custom-domain URLs; verified the staging URL demands login while
      yufora.com stays public
- [ ] Billing: Vercel's Hobby plan is for non-commercial use. Switch to
      **Pro** (~$20/mo) before real donations flow.

### A2. Core environment variables

**Settings → Environment Variables.** Add for **Preview** (and Production where
noted):

- [x] `BETTER_AUTH_SECRET` ✓ — generated and set for Production, Preview,
      and Development
- [x] `NEXT_PUBLIC_SITE_URL` ✓ — Preview = the staging URL; Production =
      `https://www.yufora.com` (the canonical host)

### A3. Database (Neon Postgres)

- [x] Neon database created and connected to yufora-site ✓
- [x] `DATABASE_URL` exists on the project ✓ (plus Neon's extra aliases,
      which are harmless)
- [x] Tables created on Neon ✓ — all 8 (auth ×4 + charities, products,
      product_photos, contributions)
- [x] Verified end-to-end on staging ✓ — magic link requested, followed,
      session created, `/admin` onboarding rendered
- Note: the Neon integration creates **a fresh database branch per preview
  deployment** (verified). Upside: staging experiments can never pollute
  production. Downside: **staging test data resets on every push to dev** —
  any test shop/products you create on staging disappear at the next
  deployment. If that gets annoying while testing, change it in Vercel →
  Storage → the Neon store → Settings (deployments/branching configuration)
  to reuse one branch for previews. Production always uses the main branch.

### A4. Photo storage (Vercel Blob)

- [x] Blob store `yufora-site-blob` created and connected ✓ (production +
      preview). Note: new-style connections use OIDC auth (`BLOB_STORE_ID`),
      not the classic `BLOB_READ_WRITE_TOKEN` — the app supports both.
- [x] Verified on staging ✓ — upload → public fetch → delete round-trip
      succeeded on the deployed preview

---

## Part B — Email (Resend)

- [x] Resend account created ✓
- [x] Domain verified ✓ — **`send.yufora.com`** (subdomain, deliberately:
      isolates sending reputation from the root domain, which carries the
      Google Workspace mailboxes)
- [x] `RESEND_API_KEY` set in Vercel (Preview + Production) ✓
- [x] `LEAD_NOTIFY_TO` = `william@yufora.com`,
      `LEAD_NOTIFY_FROM` = `Yufora <hello@send.yufora.com>` ✓
- [x] Verified on staging ✓ — sign-in email and lead-form submission both
      accepted by Resend and delivered to william@yufora.com
- Later (pre-launch): add `hello@yufora.com` as an alias/group in Google
  Workspace so the site's public contact address actually receives mail

---

## Part C — Stripe (test mode first)

### C1. Platform account

- [ ] Create a free account at **stripe.com** (this is *Yufora's* platform
      account — it never holds donation money, but Stripe requires the
      platform to be registered)
- [ ] Enable Connect: Dashboard → **Connect → Get started** → choose
      **Platform or marketplace**
- [ ] Stay in **Test mode** (toggle top-right) for everything below
- [ ] **Developers → API keys** → copy the test **Secret key** (`sk_test_…`)
- [ ] Add env var `STRIPE_SECRET_KEY` = the `sk_test_…` key (Preview; and
      `.env.local` for local testing)

### C2. Webhooks — local testing (the simple path)

Stripe can't POST to a login-protected preview URL, so test the webhook loop
locally with the Stripe CLI:

- [ ] `brew install stripe/stripe-cli/stripe` then `stripe login`
- [ ] Run the forwarder while `npm run dev` is running:

      stripe listen \
        --forward-to localhost:3000/api/webhooks/stripe \
        --forward-connect-to localhost:3000/api/webhooks/stripe

- [ ] It prints a `whsec_…` signing secret → put it in `.env.local` as
      `STRIPE_WEBHOOK_SECRET`

> **Preview-URL webhooks (optional):** if you want the webhook working on
> staging too, Vercel → Settings → Deployment Protection → **Protection Bypass
> for Automation** → generate a secret, then create the Stripe endpoint as
> `https://<staging-url>/api/webhooks/stripe?x-vercel-protection-bypass=<secret>`.
> Otherwise skip this — the production endpoint gets created at launch.

### C3. Stripe dashboard webhook (for staging/production URLs)

When creating a dashboard webhook endpoint (launch, or the bypass URL above):

- [ ] **Developers → Webhooks → Add endpoint**
- [ ] URL: `https://<url>/api/webhooks/stripe`
- [ ] Tick **“Listen to events on Connected accounts”** — required; direct
      charges emit events on the charity's account, not yours
- [ ] Events: `checkout.session.completed`, `charge.refunded`, `account.updated`
- [ ] Copy the endpoint's signing secret → env var `STRIPE_WEBHOOK_SECRET`

---

## Part D — The full test-mode rehearsal

With A–C done, run the whole loop as if you were a charity, locally
(`npm run dev` + `stripe listen` both running):

- [ ] Sign in at `/signin` → create your shop
- [ ] Add a product with photos and a price → **Publish**
- [ ] Dashboard → **Connect Stripe** → Stripe's test-mode onboarding accepts
      fictional details (use the "use test data" prompts; phone
      `000-000-0000`, etc.) → land back on "Stripe is connected"
- [ ] Open your shop page → the product → **Fund this** (or Chip in)
- [ ] Pay with Stripe's test card: `4242 4242 4242 4242`, any future expiry,
      any CVC, any ZIP
- [ ] You're returned to the item with a thank-you banner
- [ ] The progress bar updates within a few seconds (webhook via `stripe listen`)
- [ ] Admin → **Contributions** shows the gift; **Download CSV** works
- [ ] Donor confirmation email arrives (or is logged if Resend isn't set up)
- [ ] Embed test: paste the snippet from the dashboard into any test page —
      the shop renders inside it and resizes itself

---

## Part E — Launch day

- [ ] Legal copy reviewed (the marketing site's compliance claims — see the
      open item in the project plan)
- [ ] Real company details in the site footer; founder bio on `/about`
- [ ] Merge `dev` → `main` (this single merge is the go-live; revertable)
- [ ] Production env vars:
  - [ ] `NEXT_PUBLIC_SITE_URL` = `https://yufora.com`
  - [ ] `NEXT_PUBLIC_ALLOW_INDEXING` = `true` (until this is set, robots.txt
        tells search engines to stay out)
  - [ ] All Part A–C vars present in the Production environment
- [ ] Stripe: toggle to **Live mode** → new live `sk_live_…` key into
      Production `STRIPE_SECRET_KEY` → create the live webhook endpoint at
      `https://yufora.com/api/webhooks/stripe` (connected accounts + same 3
      events) → its `whsec_…` into Production `STRIPE_WEBHOOK_SECRET`
- [ ] Complete Stripe's live-mode platform activation (business details —
      Stripe walks you through it)
- [ ] One real small donation end-to-end as a smoke test, then refund it from
      the charity's Stripe dashboard (the refund webhook will correctly roll
      back the progress bar)

---

## Env var reference

| Variable | Enables | Without it |
|---|---|---|
| `DATABASE_URL` | Everything under `/admin`, shops, checkout | Marketing site still works; admin errors clearly |
| `BETTER_AUTH_SECRET` | Secure session signing | Insecure dev fallback + loud log warning |
| `NEXT_PUBLIC_SITE_URL` | Correct absolute URLs (magic links, Stripe returns, embed snippet, OG) | Defaults to `http://localhost:3000` |
| `BLOB_READ_WRITE_TOKEN` | Photo uploads in production | Uploads fail with a clear message |
| `RESEND_API_KEY` | All email | Links/leads/donor emails logged to console instead |
| `LEAD_NOTIFY_TO` / `LEAD_NOTIFY_FROM` | Lead + default from address | Email falls back to logging |
| `AUTH_EMAIL_FROM` / `DONOR_EMAIL_FROM` | Optional per-purpose from addresses | Fall back to `LEAD_NOTIFY_FROM` |
| `STRIPE_SECRET_KEY` | Connect onboarding + checkout | Fund buttons disabled, "Donations open soon" |
| `STRIPE_WEBHOOK_SECRET` | Recording donations, refunds, account sync | Webhook returns 503 and refuses unsigned events |
| `NEXT_PUBLIC_ALLOW_INDEXING` | Search engines may index | robots.txt disallows everything (correct for staging) |
