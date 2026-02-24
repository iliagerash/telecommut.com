# Wave 6 Accessibility + Social Checklist

Run this checklist for staging and production before marking W6-5 done.

## Automated Baseline

1. `npm run ci:check`
2. `npm run qa:wave6-baseline`

## Keyboard + Focus

1. Open `/`, press `Tab` once, verify skip link appears and moves focus to main content.
2. Open `/admin/dashboard`, press `Tab` once, verify admin skip link appears and works.
3. Tab through primary actions on `/search/jobs`, `/search/resumes`, `/contact`, `/help`, `/resources`.
4. Confirm visible focus ring is present on links, buttons, and inputs.

## Responsive Layout

1. Test at 390px width:
   - `/`
   - `/search/jobs`
   - `/admin/dashboard`
2. Confirm no clipped primary actions and no horizontal page overflow.
3. Confirm admin nav pills are horizontally scrollable on small screens.

## Social Preview Mapping

1. Verify page-level OG image tags with `curl`:
   - `/` -> `og-home.png`
   - `/search/jobs` -> `og-jobs.png`
   - `/search/resumes` -> `og-resumes.png`
   - `/contact` -> `og-contact.png`
   - `/help` -> `og-help.png`
   - `/resources` -> `og-resources.png`
   - `/privacy-policy` and `/terms-and-conditions` -> `og-legal.png`
2. Confirm `twitter:card=summary_large_image` on public pages.
3. Validate one representative URL in social debuggers:
   - Facebook Sharing Debugger
   - X Card Validator

## Sign-off

- Record date/time and environment.
- Attach screenshots for keyboard focus and mobile layout checks.
- Attach snippet/log proving OG image tag mapping for tested routes.
