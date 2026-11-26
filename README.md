# Waypost · Hospitality UI

Waypost is the working name for the Hospitality platform. This local design review uses synthetic tenants, staff, property inventory and grants. The landing page simulates staff sign-in. Experiences, Operations and Loyalty show module-entry previews.

## Open the mockup

Open `review.html` from the review ZIP in a desktop browser. It is a standalone copy of the review build. For development, use Node 24 LTS or Node 22.18+ on the 22 release line.

```sh
npm ci
npm run dev
```

### Review route

1. Enter as **Maya Chen**. Coast & Canopy has PMS, Experiences and Operations. Open PMS and compare portfolio and individual-property inventory.
2. Drill into iCove Suites and open Availability or Front desk. Try pinning a property view from **Customize** on the platform or PMS overview.
3. Return to the platform and switch to **Northern Collection**. Observe the change in module cards, properties and quick access.
4. Sign in as **Alex Reyes** to review limited Coast & Canopy access, or as **Nora Tan** to review an Experiences-only tenant.
5. Use the appearance and language controls to review light, dark and Thai layouts.

### Front-desk reservation walkthrough

1. Enter as **Alex Reyes** and open **iCove Suites · Availability** under **Quick access**. The equivalent route is **Property management → iCove Suites → Availability**.
2. Choose **25–27 November 2026**, keep **Standard King**, review the THB total, and confirm. The first two nights on the calendar each drop by one room. Copy the sample reference.
3. Leave Availability and come back through either path. Choose **Find by reference**, enter the reference, and cancel. The two nights return to their original counts. Use **Keep reservation** to leave it confirmed.
4. For the last-room scenario in a fresh preview, choose **28–29 November 2026** and **Standard King**. It is sold out. Choose the suggested **Deluxe Twin**, review, expand **Preview a last-room conflict**, then simulate the other agent taking the last room. Confirm to see the recovery state with the dates preserved.
5. **Maya Chen** can book River House under Coast & Canopy. When signed in as Alex, the River House deep link is denied and a River House reference returns no match in iCove.

Sample reservations and simulated sales stay in memory across navigation and reset on reload. The Availability calendar reflects the simulated ledger. Portfolio and property KPIs remain fixed snapshots. See [review story #59](https://github.com/chuxorg/chux-hosp-platform/issues/59).

Dashboard preferences are stored per sample profile, tenant and dashboard on the current browser. The sign-in session exists in memory and resets on reload. The PMS snapshots use 25 November 2026 fixed sample values. The sign-in photograph is generated artwork.

## Development validation

```sh
npm ci
npx playwright install chromium
./scripts/validate.sh
```

GitHub Actions runs the same validator on pull requests. `npm run build` writes static files to `dist/`; the operational mockup is independent of the API and database.

See [the UI delivery plan](docs/UI_DELIVERY_PLAN.md) and [the Hospitality SDLC](https://github.com/chuxorg/chux-hosp-platform/blob/master/docs/SDLC.md).
