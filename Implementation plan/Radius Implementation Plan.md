# Radius Implementation Plan

## Phase 1 — Flexible registration forms

- Add event-level registration field definitions.
- Add registration-level custom answers.
- Build organizer question editor for event creation and editing.
- Render and validate questions during public registration.
- Display answers in guest management.
- Include answers in event CSV export.

## Phase 2 — Communication reliability

- Preserve immediate on-screen tickets when email fails.
- Purchase and verify a sending domain.
- Configure production email delivery and monitor failures.
- Add confirmation, reminder, approval, cancellation, and update templates.
- Introduce paid message credits only after SMS or WhatsApp costs are confirmed.

## Phase 3 — Structured locations and discovery

- Replace the single free-text location with venue, city, country, and coordinates while retaining a display label.
- Add venue autocomplete and a movable map pin.
- Add city and online-event filters.
- Add opt-in “Near me” sorting after enough events contain reliable coordinates.

## Phase 4 — Organizer intelligence and Radius Pro

- Add registration and check-in conversion analytics.
- Add organization-wide performance reporting.
- Add scheduled reports, more seats, advanced form logic, form templates, certificates, recurring events, and custom branding.
- Implement server-side plan entitlements and an auditable subscription state.

## Phase 5 — Paid ticketing with Monime

- Confirm Monime API access, supported payment methods, settlement behavior, fees, refunds, and webhook signing.
- Connect the existing Monime space to a non-production environment.
- Add paid ticket configuration, checkout, payment records, idempotent webhook handling, receipts, refunds, reconciliation, and organizer reporting.
- Pilot with one organizer before general release.

## Launch principle

Do not charge for basic custom questions during beta. Monetize when Radius directly helps an organizer earn revenue, reduce communication costs, or eliminate substantial reporting and operational work.
