# ADR-010 — Support 5 National Languages

**Status:** Accepted **Date:** 2026-06 **Deciders:** GovSphere Engineering Team, DRC Government IT
Authority

---

## Context

The Democratic Republic of Congo is linguistically diverse. French is the official administrative
language, but it is not the first language of the majority of government employees. Four national
languages are co-official or widely spoken across different regions:

| Language  | Code  | Region / Context                                                                       |
| --------- | ----- | -------------------------------------------------------------------------------------- |
| Français  | `fr`  | Official language; all formal documents, legislation, and inter-ministry communication |
| English   | `en`  | International communications; donor relations; technical documentation                 |
| Lingala   | `ln`  | Kinshasa and the western DRC; widely spoken by security services                       |
| Kiswahili | `sw`  | Eastern DRC (Kivu, Maniema, Katanga)                                                   |
| Tshiluba  | `lua` | Kasai region (one of the most densely populated areas)                                 |

A digital government platform that is only available in French excludes a large portion of its
target users. Requiring all UI interactions in French also creates accessibility barriers and
reduces adoption.

## Decision

GovSphere will support **5 languages**: French (default), English, Lingala, Kiswahili, and Tshiluba.

**Implementation:**

- `packages/i18n/` provides typed translation keys and locale JSON files for all 5 languages
- The web app uses `next-intl` for server-side rendering with locale routing (`/fr/`, `/en/`,
  `/ln/`, `/sw/`, `/lua/`)
- Language preference is stored on the `User` model and applied across all sessions
- French is the default and fallback — if a key is not translated in another language, French is
  used
- All 5 locale files must be updated in the same PR when a new translation key is added
- No hardcoded UI strings are permitted in any component

## Alternatives Considered

**French only:**

- Rejected. Excludes the majority of the DRC population. Government's own digitalization mandate
  requires accessibility in national languages.

**French and English only:**

- Rejected. English is not widely spoken outside formal government settings. Does not address the
  field-level employees in eastern and central DRC.

**Browser-based translation (Google Translate):**

- Rejected. Requires internet access at all times. Sends government UI content to a third-party
  service. Translations are inconsistent for government terminology. Not suitable for a sovereign
  government platform.

**Community translation crowdsourcing:**

- Considered for initial translation. Rejected for the core UI — government terminology in national
  languages must be reviewed by the Ministry of Communications and official language authorities.
  Crowdsourcing would produce inconsistent terminology.

## Consequences

**Positive:**

- Higher adoption among employees who are not fluent French speakers
- Aligns with the DRC government's inclusion mandate
- `next-intl` handles server-side locale routing — no hydration mismatch, no client-side waterfall
- Typed translation keys (`t('auth.login.title')`) catch missing keys at compile time
- The `packages/i18n/` package is shared across web, desktop, and mobile — translations are written
  once

**Negative:**

- All 5 locale files must be maintained — a PR with a new UI string requires translations in all 5
  languages before merge
- Lingala, Kiswahili, and Tshiluba translators must be embedded in the team or available on short
  notice
- Some technical concepts (e.g., "two-factor authentication") do not have established equivalents in
  all 4 national languages — terminology must be standardized with the Ministry of Communications

## Translation Governance

1. French translations are written by the engineering team (technical French)
2. English translations are written by the engineering team
3. Lingala, Kiswahili, and Tshiluba translations are reviewed by designated government language
   officers before merge
4. A translation glossary (`packages/i18n/glossary.md`) maintains approved terminology for each
   language
5. Machine translation (DeepL, Google Translate) is permitted for initial drafts only — all
   translations must be reviewed by a human speaker before production

## Language Detection

1. User's stored language preference (`User.preferredLanguage`)
2. Browser `Accept-Language` header (for unauthenticated pages)
3. Fallback: `fr`
