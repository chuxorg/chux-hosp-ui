# Waypost connected reservation rehearsal

[Story #60](https://github.com/chuxorg/chux-hosp-platform/issues/60) follows the [accepted workflow in #59](https://github.com/chuxorg/chux-hosp-platform/issues/59). The connected build uses the protected Go and PostgreSQL reservation endpoints. The walkthrough uses synthetic fixtures and a privately provisioned operator. The standalone design preview remains available from the normal build.

## Prepare a disposable PostgreSQL instance

Use the [backend checkout and local Auth0 setup](https://github.com/chuxorg/chux-hosp-platform/blob/master/docs/AUTHENTICATION.md). Use a separate Docker Compose project and new PostgreSQL volume for the rehearsal. For example, use project name `hospitality-waypost` consistently for the backend commands and set an unused private `POSTGRES_PORT` in its environment file. Keep real Auth0 configuration in an ignored local environment file. The Vite dev server listens on loopback port 5173 and proxies the same-origin API paths to loopback port 8000. Keep those ports available for this rehearsal. Use the same hostname throughout the browser and Auth0 configuration.

1. Apply backend migrations through version 7. Start one loopback backend instance with `AUTH_ENABLED=false` for catalog seeding only. With Compose you can override a configured environment value for this one start using the shell prefix `AUTH_ENABLED=false`.
2. From the UI checkout, run the seed once against the fresh database.

   ```sh
   node scripts/seed-reservation-demo.mjs --confirm-disposable > .waypost-seed.local
   ```

   The seed creates two properties, one Standard King and one available physical room per property, a THB rate, and explicit pool enrollment. The output is a JSON manifest. If any step fails, inspect the disposable instance and start over with a new disposable instance rather than re-running into partial data.

3. Stop the seeding server. Provision the synthetic operator using `hospitality auth provision-user` as described in the backend guide. In the same disposable database, assign `reservation.read`, `reservation.create`, and `reservation.cancel` in a role and grant only the manifest's `propertyId` through the same group. Use the [backend authorization fixture pattern](https://github.com/chuxorg/chux-hosp-platform/blob/master/internal/platform/postgres_integration_test.go#L200-L226) or the [authorization guide](https://github.com/chuxorg/chux-hosp-platform/blob/master/docs/AUTHENTICATION.md#property-authorization-issue-51). Leave `deniedPropertyId` without a grant.
4. Start the same backend with authentication enabled. For a new Mac rehearsal using `http://localhost:5173`, register `http://localhost:5173/auth/v1/callback` as the local Auth0 callback and set `OIDC_REDIRECT_URL` to that exact value. The loopback HTTP exception belongs only to local development. The callback finishes on the backend's session endpoint through the Vite proxy.
5. Start the connected UI from the UI repository.

   ```sh
   npm ci
   VITE_WAYPOST_LIVE_SEED="$(cat .waypost-seed.local)" npm run dev -- --port 5173 --strictPort
   ```

## Walk through the connected flow

Open the Vite URL. Follow **Sign in with Auth0** in the new tab and then use **Check session** in the Waypost tab. Pick future dates in the property's local time so the pre-arrival cancellation cutoff has not passed. Review the seeded THB estimate, confirm, look up the returned reservation ID at the same property, and cancel. Book the same nights again to verify resale. A second overlapping booking before cancellation should receive the sold-out response. Using the ungranted property ID with the same authenticated session should receive 403. End Waypost session and verify the session endpoint returns 401. This control revokes the local BFF session. The hosted identity provider session is a separate concern.

The seed supplies property and room type IDs and an indicative rate. The protected contract exposes reservation actions only, so this connected screen uses one configured property and does not show an availability calendar. The server owns inventory, the accepted accommodation base subtotal, reservation IDs, and lifecycle status. This rehearsal needs no new backend routes or database migrations. Without an authenticated session the connected screen never exposes reservation actions. A retry after an ambiguous mutation outcome uses the same key and exact payload in the same tab. Leave the tab open until that outcome is resolved.

## Verification

`./scripts/validate.sh` runs formatting, unit tests including the API adapter, the TypeScript production build, and the browser tests for the preserved design preview. The authenticated rehearsal requires a local seeded backend. A local signed OIDC test issuer can cover the Go verification and browser session path without using private Auth0 credentials. Check the actual Auth0 hosted flow and callback configuration separately on the Mac before the demo.
