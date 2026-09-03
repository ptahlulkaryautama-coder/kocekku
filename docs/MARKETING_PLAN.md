# SAKKU — Marketing & Growth Plan

> **Version:** 1.0 (September 2026)
> **Product:** Sakku — "Money Management, Simplified"
> **Current Live:** https://sakku-2-0.vercel.app/
> **Author perspective:** Senior promotion director / go-to-market advisor

---

## PART A — GO-TO-MARKET PLAN (Indonesia-first, near-zero budget)

### 0. The Cold Diagnosis

**Sakku doesn't have a marketing problem yet — it has a distribution problem.**

You cannot advertise your way to trust for a finance app living on a free `*.vercel.app` subdomain. Fix distribution first, or every rupiah (and every hour) spent on content is wasted.

Three uncomfortable truths:

1. **Indonesia is an Android + Play Store market.** A PWA that isn't discoverable in the Play Store is invisible to the average user's habits. This costs more than any other single decision.
2. **You are not competing with Money Lover's ads — you're competing with people's laziness.** Manual expense tracking dies after 3 days. The only sustainable wedge is making entry faster than anyone else.
3. **The best features (OCR receipt scan, debt installments, family) are also the best content.** Don't treat them as features — treat them as video scripts.

### 1. Positioning — Don't Be "Indonesian YNAB"

Never say "like YNAB / Money Lover" — that comparison is lost (they have bank sync, Sakku doesn't). Own what they can't copy easily:

> **"Aplikasi keuangan keluarga yang mengerti struk Indonesia."**
> (The finance app that understands Indonesian receipts.)

| Pillar | Proof | Demo |
|---|---|---|
| **10× faster entry** | OCR scan of Indomaret/Alfamart receipts + NLP text input | "Foto struk → langsung tercatat" — nobody in the Indonesian market demos this exact everyday moment |
| **Built for families** | Family module, shared budgets, debt & installment tracking | "Satu aplikasi untuk uang satu keluarga" |
| **Private & safe** | Zero-knowledge encrypted backup, offline-first, no account required | "Data kamu, hanya kamu yang bisa baca" |

### 2. Phase 1 — The Distribution Gate (Week 1, ~Rp 300–500rb total, do BEFORE any promotion)

1. **Custom domain** (`sakku.id` / `sakku.app` style). A finance app on a free subdomain is a trust killer. Point it at Vercel. ~Rp 200rb/yr.
2. **Social share meta (Open Graph + 1200×630 preview image)** — repurpose the marketing mockup already made. WhatsApp link previews are the #1 unpaid channel in Indonesia.
3. **Analytics** (Plausible free tier or GA4) — before launch, not after. Never promote blind.
4. **Google Search Console + sitemap.xml** — free SEO foundation.
5. **Play Store listing via TWA/PWABuilder wrapper** ($25 one-time). Huawei AppGallery is free. Highest-ROI hour of the entire plan.
6. **Default-language detection** — serve the Indonesian locale (`id.js`) to Indonesian visitors automatically. Zero English friction.
7. **About / landing page** — one page: problem → 10-second demo video → features → privacy → install CTA. No feature dump.

### 3. Phase 2 — The Content Engine (Weeks 2–4, Rp 0 budget, 3–5 hours/week)

The product IS the ad. One recurring format, mastered:

**"Before vs After" 30-second clips:**
- 📸 Receipt → auto-categorized transaction (the money shot)
- 🗣️ "kopi 5 ribu dari kas" → instantly saved (NLP)
- 💸 Debt installment → progress bar + due reminders
- 👨👩👧 Family shared budget → "siapa paling boros bulan ini?"

Distribution: TikTok, YouTube Shorts, Instagram Reels — same clip, 3 platforms. Hashtag: `#aplikasikeuangan #catatankeuangan #keuangan #budgeting #finansial`.

**The WhatsApp loop:** every demo clip ends with "share ke grup keluarga" — family finance is a group decision in Indonesia. Group chat = free viral loop.

### 4. Phase 3 — Launch & Communities (Week 5)

- **r/finansial** (Reddit Indonesia): "Aku bikin app keuangan yang bisa foto struk Indomaret langsung ke catatan — gratis, tanpa akun. Roast aku." Honest, humble, useful. Not a sales post.
- **Facebook groups** (Keuangan, Ibu-Ibu Keuangan, UKM): demo clip + "coba gratis, feedback dikit ya".
- **Product Hunt / indie communities**: only after the Indonesia loop is proven, and only as a secondary play.

### 5. Measurement (KPI)

| Metric | Target (first 90 days) | Why |
|---|---|---|
| Installs | 500–1,000 | Real traction, not vanity |
| D7 retention (users active day 7) | ≥ 20% | Manual trackers die fast; this proves the wedge |
| Transactions per active user / week | ≥ 5 | Proves the speed-of-entry story |
| WhatsApp shares of demo clips | Track per clip | Free distribution channel health |

One content experiment per week. Scale only what drives installs. Kill everything else.

### 6. Budget Summary

| Item | Cost |
|---|---|
| Custom domain | ~Rp 200rb/yr |
| Play Store listing | $25 one-time |
| Analytics (Plausible) | Free tier / ~$9/mo |
| Ads | **Rp 0** — content first, ads only after retention is proven |
| **Total year one** | **~Rp 300–500rb + $25** |

### 7. The Don'ts

- ❌ Don't buy ads before the Distribution Gate is done (wasted spend).
- ❌ Don't scale content until one video type proves it drives installs.
- ❌ Don't spam communities — Indonesian groups ban self-promo fast and remember.
- ❌ Don't focus primarily on Product Hunt — buyers aren't there for an Indonesian finance app.

### 8. One-Line Summary

> Fix distribution this week (domain + OG + analytics + Play Store), then let TikTok + WhatsApp + r/finansial do the launch for free, selling the "foto struk Indomaret" moment nobody else owns.

---

## PART B — PORTFOLIO STRATEGY (My POV)

**Short answer: put Sakku in your portfolio as a CASE STUDY, not as a product listing. They are two different jobs.**

Your portfolio has one buyer: the person hiring you (client, agency, or employer). That buyer is not looking for a finance app to use — they're looking for **proof of craft**: how you think, how you build, how you ship.

### What to put in the portfolio

| Element | What to show |
|---|---|
| **The story** | "Users were entering transactions manually and quitting after 3 days. I built a receipt-scanning + NLP entry flow to make it 10× faster." |
| **The architecture** | Data-safety migration system, localStorage schema, financial invariants (net worth = assets − liabilities), 986+ tests |
| **The numbers** | Test count, build status, PWA offline, zero-knowledge encryption |
| **The visuals** | Before/after UI, the thumbnail, live link |

A portfolio case study positions you as a **senior product-minded engineer**. That raises your freelance/professional value far more than a Gumroad sale would.

### What NOT to do

- ❌ Don't make the portfolio *the* place people "buy" Sakku. Portfolio visitors are potential clients, not app users. Mixing the two confuses both.
- ❌ Don't lead with "you can buy this." Lead with "here's how I solved a hard problem."

### If you genuinely want to SELL the product

Three different sales, three different channels:

| Goal | Channel | How |
|---|---|---|
| Sell the **business/codebase** | Flippa / Acquire.com | Full asset sale — users, code, domain |
| **White-label / license** | Direct B2B outreach | Sell "your own branded finance app" to agencies/companies |
| **SaaS revenue** | Own product page + app stores | Portfolio is just one entry point in a bigger funnel |

**My recommendation:** use the portfolio for the case study (builds your professional brand), and only consider selling the product itself if/when the Indonesia launch shows real traction — a product with 500+ active users sells for multiples of an unlaunched codebase.

---

## PART C — ABROAD MARKET STRATEGY (My POV)

**Honest take: the abroad market is bigger, but the current product is built for Indonesia. Before going abroad, you must decide which wedge travels.**

### What does NOT travel

- OCR trained on Indomaret/Alfamart/Indonesian merchants (abroad receipts are different stores)
- Indonesian-language positioning and community strategy
- Rupiah-first flows and Indonesian finance habits

### What DOES travel

- The universal wedge: **"No account. No cloud. No subscription. Your data encrypted on your device. Entry faster than any tracker."**
- Offline-first PWA, zero-knowledge encrypted backup, family sharing, debt installments
- English UI already exists (`en.js` is the default)

Globally you're competing with YNAB, Monarch, Copilot, Money Lover, Wallet by BudgetBanks — big, funded, established. You cannot out-feature them. You CAN out-position them on **privacy + simplicity + price**.

### The one positioning that could win abroad

> **"The privacy-first money tracker. No account, no cloud, no subscription. Pay once, own your data forever."**

That exact message is underserved in a market where every competitor forces an account and a monthly subscription.

### Gumroad — right or wrong fit?

**Gumroad is the wrong storefront for a finance app — mostly.**

- ✅ Gumroad is great for: digital downloads, courses, templates, lifetime software licenses
- ❌ Gumroad is weak for: subscription SaaS, live data sync, refunds at scale, app-store presence, trust for financial software

**If you go Gumroad anyway**, sell it as a **lifetime license download** ($19–29 one-time): "Download Sakku, install on any device, data stays yours." That works within Gumroad's model. But for recurring revenue or app-store presence you still need Stripe/Paddle/Lemon Squeezy + your own site, or the app stores.

### The realistic abroad playbook (indie-hacker route)

1. **Custom domain + landing page** (non-negotiable for trust — nobody pays for finance software on `*.vercel.app`)
2. **Lifetime license at $19–29** via Gumroad/Lemon Squeezy — one-time price is your differentiator against subscription competitors
3. **Product Hunt + Indie Hackers + Hacker News launch** — these communities reward "no account, no cloud, pay once" stories
4. **Build in public on X/Twitter** — weekly screenshots of the product + honest revenue numbers
5. **App stores later** — Play Store first (cheaper, broader), iOS when revenue justifies the $99/yr

### The decision you must make

**Pick ONE market. Do not run both at once.**

| Option | Wedge | Channel | Revenue |
|---|---|---|---|
| **A. Indonesia-first** | Receipt OCR for Indonesian stores | TikTok + WhatsApp + Play Store | Free → ads → premium tier |
| **B. Abroad indie** | Privacy-first, pay-once | Product Hunt + X + Gumroad | $19–29 lifetime / subscription |

Option A has a defensible wedge but smaller revenue per user. Option B has bigger total market but brutal competition — you win only on the privacy/price message, and only if the app feels globally polished (generic receipt OCR, currency-first UX, no Indonesian assumptions).

**If I had to choose today:** keep the Indonesia launch as the momentum play (it's almost free to run and the OCR demo is genuinely unique there), and treat the abroad push as a **separate product variant** — same codebase, rebranded wedge, English-first, universal receipt OCR — launched only after Indonesia retention proves the product is sticky.

---

## Action Summary

| # | Action | When | Owner |
|---|---|---|---|
| 1 | Custom domain (`sakku.id` or similar) | Week 1 | You |
| 2 | Open Graph meta + preview image | Week 1 | Dev (Buffy) |
| 3 | Analytics (Plausible/GA4) | Week 1 | Dev (Buffy) |
| 4 | sitemap.xml + Search Console | Week 1 | Dev (Buffy) |
| 5 | Auto language detection (ID/EN) | Week 1 | Dev (Buffy) |
| 6 | Play Store via PWABuilder/TWA | Week 2 | You |
| 7 | Landing page + 10-sec demo video | Week 2 | You + Dev |
| 8 | TikTok/Reels/Shorts demo clips | Weeks 2–4 | You |
| 9 | r/finansial + FB groups launch | Week 5 | You |
| 10 | Portfolio case study write-up | Week 1 | You |
| 11 | Abroad decision (A or B) | After 90-day data | You + Dev |

---

*This document is the working marketing strategy for Sakku. Update it as decisions are made.*