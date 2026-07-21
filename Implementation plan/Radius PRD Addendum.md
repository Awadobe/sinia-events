# Radius PRD Addendum

## Custom registration forms

Organizers can add up to 25 event-specific questions in addition to the standard name and email fields.

Supported beta field types:

- Short answer
- Long answer
- Phone number
- Number
- Dropdown
- Single choice
- Yes/no checkbox
- Multiple choice

Each field supports a label, optional help text, required/optional status, answer options where relevant, and an organizer-controlled order. Answers are validated by the server, displayed in event guest management, and included in event CSV exports.

Basic custom fields are a free beta feature. Radius Pro may later include conditional logic, file uploads, reusable form templates, response limits, advanced validation, and automated workflows.

## Registration confirmation

A successful registration must always produce an immediate on-screen confirmation and private ticket. Radius attempts to send a confirmation email containing the event, status, ticket, date, location, and calendar action. Registration must remain successful if the email provider fails. Reliable public email delivery depends on a verified sending domain.

## Location discovery

The public homepage retains upcoming and past event sections. Future location discovery will introduce structured country, city, venue, and coordinates. Venue autocomplete should suggest places as an organizer types and place a movable map pin after selection. City filtering precedes precise “Near me” distance sorting.

## Monetization requirements

- Core free event workflows must remain useful without payment.
- Paid ticketing uses Monime and supports payment confirmation through signed webhooks.
- Ticket issuance occurs only after verified payment success for paid events.
- Radius records fees, organizer proceeds, refunds, and settlement references.
- Radius Pro entitlements are organization-scoped and must not be inferred only from client-side UI.
- Pricing and limits remain configurable while the beta validates willingness to pay.
