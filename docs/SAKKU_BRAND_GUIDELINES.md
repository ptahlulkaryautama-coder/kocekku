# Sakku — Brand Guidelines

> Translated from the logo into a living design system.

---

## Brand Identity

| Element | Value |
|---------|-------|
| **Name** | Sakku |
| **Tagline** | Money Management, Simplified |
| **Concept** | "Saku" (Indonesian for pocket) — your money lives here |
| **Tone** | Warm, trustworthy, approachable, modern |
| **Audience** | Indonesian families + international English speakers |

---

## Color Palette

Extracted directly from the Sakku logo.

### Primary — Coral

The coral represents warmth, energy, and approachability. It's the dominant brand color.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#FEF5F1` | Lightest background tints |
| `primary-100` | `#FCEADE` | Light backgrounds, hover states |
| `primary-200` | `#F9CEB5` | Soft accents |
| `primary-300` | `#F4A888` | Borders, subtle highlights |
| `primary-400` | `#F08A62` | Interactive elements (dark mode) |
| **`primary-500`** | **`#E8734A`** | **Main brand color — buttons, links, active states** |
| `primary-600` | `#D4623C` | Hover state for primary actions |
| `primary-700` | `#B84D2D` | Pressed state, emphasis |
| `primary-800` | `#8F3B22` | Dark accents |
| `primary-900` | `#6B2C18` | Darkest coral |

### Accent — Teal

The teal represents trust, calm, and analytical clarity. Used for secondary actions and data visualization.

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-50` | `#EFFCFC` | Lightest teal tints |
| `accent-100` | `#D6F5F5` | Light backgrounds |
| `accent-200` | `#B0EAE9` | Soft accents |
| `accent-300` | `#7CD9D9` | Borders |
| `accent-400` | `#45C4C4` | Interactive elements |
| **`accent-500`** | **`#5ABFBF`** | **Secondary brand color — charts, accents** |
| `accent-600` | `#3FA8A8` | Hover state |
| `accent-700` | `#338A8A` | Pressed state |
| `accent-800` | `#2B6F6F` | Dark accents |
| `accent-900` | `#1E5252` | Darkest teal |

### Semantic Colors

| Purpose | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Success** | `#0F766E` | `#10B981` |
| **Danger** | `#BE123C` | `#F43F5E` |
| **Warning** | `#B45309` | `#F59E0B` |
| **Info** | `#0E7490` | `#6DD4D4` |

### Chart Colors

| Series | Light | Dark |
|--------|-------|------|
| Income | `#5ABFBF` (teal) | `#6DD4D4` |
| Expense | `#E8734A` (coral) | `#F08A62` |
| Net flow | `#0F766E` (green) | `#10B981` |

---

## Light Theme

| Token | Value | Description |
|-------|-------|-------------|
| `--color-bg` | `#FAF8F5` | Page background — warm cream |
| `--color-surface` | `#FFFFFF` | Card backgrounds |
| `--color-surface-hover` | `#FEFCFA` | Card hover |
| `--color-text` | `#1C1917` | Primary text — near-black |
| `--color-text-secondary` | `#57534E` | Secondary text |
| `--color-text-muted` | `#A8A29E` | Muted/hint text |
| `--color-border` | `#E8E4DE` | Standard borders |

## Dark Theme

| Token | Value | Description |
|-------|-------|-------------|
| `--color-bg` | `#0F0E0D` | Page background — warm black |
| `--color-surface` | `#1A1917` | Card backgrounds |
| `--color-surface-hover` | `#222120` | Card hover |
| `--color-text` | `#F5F5F4` | Primary text — near-white |
| `--color-text-secondary` | `#A8A29E` | Secondary text |
| `--color-text-muted` | `#78716C` | Muted/hint text |
| `--color-border` | `rgba(240,138,98,0.09)` | Coral-tinted borders |

---

## Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Display | Plus Jakarta Sans | 800 | 48px |
| H1 | Plus Jakarta Sans | 700 | 30px |
| H2 | Plus Jakarta Sans | 600 | 24px |
| H3 | Plus Jakarta Sans | 600 | 18px |
| Body | Plus Jakarta Sans | 400 | 14px |
| Caption | Plus Jakarta Sans | 400 | 12px |

---

## Logo Usage

### Colors to Use

- **On white/light background**: Full coral + teal logo
- **On dark background**: Lighter coral `#F08A62` + teal `#6DD4D4`
- **Single color**: Coral `#E8734A` only
- **Favicon**: Simplified pocket icon (no sphere detail at small sizes)

### Don'ts

- Don't stretch or distort the logo
- Don't change the logo colors
- Don't place the logo on busy backgrounds
- Don't add effects (shadow, glow, rotation)

---

## Spacing & Radius

The logo's rounded-square icon shape informs the app's border radius:

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Small elements |
| `--radius-md` | 12px | Cards, inputs |
| `--radius-lg` | 16px | Modals, large cards |
| `--radius-xl` | 24px | Feature cards |
| `--radius-2xl` | 32px | Logo container |

---

## Voice & Tone

### In-App Copy

| Context | Style | Example |
|---------|-------|---------|
| Page titles | Clear, direct | "Your Transactions" |
| Empty states | Encouraging | "Start by adding your first transaction" |
| Errors | Helpful, not alarming | "Something went wrong. Try again." |
| Confirmations | Specific | "Internet bill paid. Rp 450,000 from BCA." |
| Financial data | Precise, no fluff | "Rp 24,850.00" not "About Rp 25K" |

### Tagline Variations

- **Primary**: "Money Management, Simplified"
- **Portfolio**: "Sakku — Personal Finance by Ahlul Firdaus"
- **App Store**: "Track your money with clarity"

---

## Implementation Notes

### CSS Variables

All colors are defined as CSS custom properties in `src/ui/design-tokens.css`. Components use `var(--color-primary)` etc. — never hardcode hex values.

### Tailwind

Tailwind utility classes (`primary-500`, `accent-500`) are configured in `index.html` via CDN script. They map 1:1 to the CSS variables.

### Dark Mode

Dark mode is handled via `[data-theme="dark"]` selector on `:root`. All semantic tokens are redefined for dark backgrounds — coral is brightened, teal is lightened.

### PWA Theme

- `manifest.json`: `theme_color: #E8734A`
- `meta theme-color`: `#E8734A`
- Browser chrome, status bar, and splash screen use the coral

---

*This document is the single source of truth for Sakku brand and design decisions.*
