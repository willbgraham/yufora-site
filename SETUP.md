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

- [ ] Confirm the project exists at vercel.com and is linked to
      `github.com/willbgraham/yufora-site` (if not: **Add New → Project → Import**)
- [ ] Confirm `yufora.com` is attached under **Settings → Domains**
      (production = `main` branch = the coming-soon page)
- [ ] Confirm the `dev` branch produces preview deployments — under
      **Deployments** you should see builds for `dev`. Your stable staging URL
      looks like `https://yufora-site-git-dev-<your-scope>.vercel.app`
- [ ] **Settings → Deployment Protection → Vercel Authentication → enabled for
      Preview deployments.** Preview URLs are public by default — this step is
      what makes staging private. Verify: open the staging URL in a private
      browser window → it must demand a Vercel login.
- [ ] Billing: Vercel's Hobby plan is for non-commercial use. Switch to
      **Pro** (~$20/mo) before real donations flow.

### A2. Core environment variables

**Settings → Environment Variables.** Add for **Preview** (and Production where
noted):

- [ ] `BETTER_AUTH_SECRET` — any long random string. Generate one in your
      terminal:

      openssl rand -base64 32

      Without it, sessions are signed with an insecure dev fallback.
- [ ] `NEXT_PUBLIC_SITE_URL` — set to your **stable staging URL** for Preview
      (e.g. `https://yufora-site-git-dev-<scope>.vercel.app`). Magic-link
      emails, Stripe return URLs, and the embed snippet are all built from
      this. At launch, the Production value becomes `https://yufora.com`.

### A3. Database (Neon Postgres)

- [ ] Vercel → **Storage → Create Database → Neon (Postgres)**, free tier,
      connect it to the project (all environments)
- [ ] Check a `DATABASE_URL` env var now exists on the project. If the
      integration named it something else (e.g. `POSTGRES_URL`), copy its
      value into a new var named exactly `DATABASE_URL`.
- [ ] Create the tables — from the repo, with the Neon URL:

      DATABASE_URL="<paste the pooled connection string>" npm run db:push

      (Or paste the URL to Claude and ask it to run the push.)
- [ ] Verify: open `<staging-url>/signin`, request a link. With email not yet
      configured the link is printed in the **Vercel function logs**
      (Deployments → latest → Logs, look for `[auth] magic link`). Open the
      logged URL → you should land in `/admin` and be able to create your shop.

### A4. Photo storage (Vercel Blob)

- [ ] Vercel → **Storage → Create → Blob**, connect to the project —
      `BLOB_READ_WRITE_TOKEN` is added automatically
- [ ] Redeploy, then verify: admin → Products → add a product → upload a photo

---

## Part B — Email (Resend)

- [ ] Create a free account at **resend.com** (3,000 emails/month free)
- [ ] **Domains → Add Domain** → `yufora.com` → add the DNS records Resend
      shows you at your domain registrar → wait for **Verified** (minutes to
      hours depending on DNS)
- [ ] **API Keys → Create** → scope *Sending access* → copy the `re_…` value
      (shown only once)
- [ ] Add env vars (Preview + Production):
  - [ ] `RESEND_API_KEY` — the `re_…` key
  - [ ] `LEAD_NOTIFY_TO` — `willg1@gmail.com` (where marketing-site leads land)
  - [ ] `LEAD_NOTIFY_FROM` — e.g. `hello@yufora.com` (must be on the verified
        domain). Sign-in links and donor emails also send from this address
        unless you later set `AUTH_EMAIL_FROM` / `DONOR_EMAIL_FROM` separately.
- [ ] Redeploy, then verify: request a sign-in link → it arrives by email
      (no more digging in logs); submit the marketing-site form → the lead
      lands in your inbox with reply-to set to the submitter

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
