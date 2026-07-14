# Realistic Demo Data Mode Design

## Purpose

Add a deterministic presentation mode to the existing VESD application so a
course demonstration can show realistic Vietnamese users, projects, jobs, and
revenue without writing synthetic records to the production MongoDB database.
Every synthetic record and every aggregate influenced by synthetic records must
be visibly identified as simulated course-project data.

## Scope

The demo mode will provide:

- realistic but fictional Vietnamese client and designer accounts;
- completed demo projects and matching demo transactions dated from
  30 June 2026 through 14 July 2026;
- exactly VND 8,000,000 of clearly labelled simulated platform revenue;
- 20 open demo projects with no assigned designer;
- consistent display across the admin overview, admin user/project views, and
  the designer job-search view;
- a persistent label reading `Dữ liệu mô phỏng phục vụ đồ án` wherever demo
  data or a demo-influenced aggregate is displayed.

The work will not connect to, seed, update, delete, or otherwise mutate the
`vesd1` production database. It will not use the MongoDB URI posted in chat.

## Selected Approach

Use a client-side demo overlay controlled by `VITE_DEMO_MODE=true`. A focused
fixture module will generate deterministic demo entities. A focused overlay
module will merge those entities into selected API responses only while demo
mode is enabled. With the flag absent or false, all API behavior and displayed
production data remain unchanged.

This approach was selected over seeding MongoDB or building a standalone report
because it preserves the current application's full presentation flow while
keeping synthetic and production data physically separate.

## Data Model

All simulated entities will include:

```ts
{
  isDemo: true,
  demoLabel: 'Dữ liệu mô phỏng phục vụ đồ án'
}
```

Identifiers will use a reserved, recognizable prefix such as `demo-user-` and
`demo-project-`. Email addresses will use the reserved `example.com` domain.
Names will sound natural in Vietnamese but will be fictional combinations and
will never include a claim that they represent an actual customer.

The deterministic dataset will contain:

- 12 fictional clients;
- 10 fictional designers;
- 8 completed projects with corresponding successful transactions;
- 20 open projects in `pending_designer` state with `designerId: null`;
- successful transaction dates distributed across 30 June 2026 to 14 July
  2026;
- transaction `platformFee` values summing to exactly VND 8,000,000.

Project budgets, categories, descriptions, deadlines, skills, and company names
will vary to avoid repetitive placeholder content. The fixture generator will
not use randomness, ensuring screenshots and tests are reproducible.

## Application Behavior

### Feature flag

`VITE_DEMO_MODE=true` enables the overlay. Any other value disables it. The
client environment example and README will document the flag and state that it
must only be used for coursework/demo presentations.

### Admin overview

When demo mode is enabled:

- the page shows a persistent demo-data banner;
- the revenue card is titled `DOANH THU MÔ PHỎNG` and displays
  `8.000.000đ`;
- user and project counts that include fixtures are visually marked as
  containing simulated data;
- real API values are not overwritten in storage or sent back to the server.

### Admin lists

Admin user and project lists will append the deterministic fixtures to the real
API response for presentation. Each demo row or card will show a `Mô phỏng`
badge. Actions that would mutate a demo record will be disabled.

### Designer job search

The 20 open demo projects will be appended to the open-project API response.
Each card will show a `Mô phỏng` badge. Claiming a demo project will be disabled
with an explanation that simulated projects cannot create real agreements or
payments.

### Production behavior

When demo mode is disabled, no fixtures are imported into response data, no
demo banner or badges appear, and existing API calls behave as before.

## Boundaries and Failure Handling

- Demo-mode code must never send an identifier beginning with `demo-` to a
  mutation endpoint.
- The overlay must tolerate missing or differently shaped optional list data
  and retain the server response's pagination metadata.
- A malformed or unavailable real API response remains an API error; demo data
  must not conceal backend failure.
- The UI must not imply that simulated accounts are verified customers or that
  simulated revenue was collected.

## Testing Strategy

Implementation will follow test-driven development.

Unit tests will verify:

- fixture counts are 12 clients, 10 designers, 8 completed projects, and 20
  open projects;
- all fixtures carry `isDemo: true` and reserved identifiers;
- open projects have no designer and use `pending_designer`;
- completed demo transaction dates fall within the required date range;
- simulated `platformFee` values total exactly VND 8,000,000;
- overlay helpers append fixtures only when demo mode is enabled;
- overlay helpers retain existing API data and pagination metadata;
- demo identifiers are rejected by mutation guards.

Component tests will verify:

- the admin overview shows the banner and labelled VND 8,000,000 value in demo
  mode;
- demo badges appear on fixture rows/cards;
- demo project claim and mutation controls are disabled;
- normal mode does not show or append demo content.

The final verification will run the complete client test suite and production
client build. Server tests may also be run as a regression check even though the
design does not modify server code.

## Security and Privacy

The exposed MongoDB password must be rotated separately. No database credential
will be added to source, logs, documentation, tests, or commands. Demo emails
will use non-deliverable reserved domains, and avatars will use existing generic
assets or deterministic placeholder URLs.

## Acceptance Criteria

The feature is accepted when enabling `VITE_DEMO_MODE=true` produces a
repeatable, visibly labelled coursework dataset across the required pages,
shows exactly VND 8,000,000 simulated revenue for the specified date range,
shows 20 unclaimed demo jobs, prevents all demo-record mutations, and leaves
MongoDB and normal-mode behavior unchanged.
