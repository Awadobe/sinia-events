# Radius venue integration

## Product decision

Venue discovery will be a module inside Radius, not a separate product account
or database. Radius remains responsible for authentication, organizations,
events, notifications and platform administration.

The existing VenueFinder repository is a design and interaction reference.
Its screens will be adapted to Radius rather than merging its Next.js 16 /
React 19 codebase directly into the current Next.js 14 / React 18 application.

## Roles

- Visitors can search published venues, read verified details and submit an
  availability or inspection enquiry without creating an account.
- Radius users can submit a venue for review.
- Venue owners and venue managers can maintain only the venues assigned to
  them, including spaces, facilities, packages, media and availability.
- Organization managers may manage a venue owned by their organization.
- Radius platform administrators can review, publish, suspend or remove
  listings and manage the shared amenities catalogue.
- Event managers do not automatically gain access to a venue account.

## Availability model

Availability is not the same as a confirmed booking.

- `available`: recently confirmed as open, but still reconfirmed when an
  organiser is ready to proceed.
- `confirmation_required`: no sufficiently recent answer is available.
- `held`: temporarily reserved while a decision or payment is pending.
- `booked`: reported as unavailable because a booking exists.
- `blocked`: the venue is unavailable for an operational reason.

Every availability record has a source, verification time and optional expiry
time so Radius does not present old calendar information as guaranteed.

## Initial customer flow

1. Open **Find a venue** from Radius.
2. Search by event type, area, preferred date and number of guests.
3. Compare venue photographs, facilities, capacities, packages and rules.
4. Select a date and send an availability or inspection enquiry.
5. Radius and the venue manager confirm the date outside the website or through
   the venue dashboard.
6. An organizer may attach the confirmed venue and space to a Radius event.

## Build sequence

1. Database foundation and row-level access controls.
2. Radius venue catalogue and venue profile pages using real Supabase data.
3. Guided venue submission and platform review.
4. Venue-manager dashboard for details, photographs and availability.
5. Availability and inspection enquiry notifications.
6. Connect a confirmed venue to an event.
7. Shortlists and group voting.
8. Payments and stronger booking automation only after the operating model has
   been tested with real venues.

## Deliberately deferred

- Instant guaranteed booking
- Customer-to-venue payment collection
- Venue payouts and commission accounting
- Public ratings and reviews
- Automated availability imports
- AI venue recommendations

