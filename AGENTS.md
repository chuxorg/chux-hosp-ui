# Hospitality UI

Waypost is the frontend of the modular Hospitality Platform. PMS is one independent module. Follow the shared [Hospitality SDLC](https://github.com/chuxorg/chux-hosp-platform/blob/master/docs/SDLC.md) and [Project #14](https://github.com/orgs/chuxorg/projects/14). See `docs/UI_DELIVERY_PLAN.md` for current design and planned delivery.

Use a Ready or explicitly authorized issue, a short-lived branch off `master`, Conventional Commits with `Refs #N`, and a draft PR with `Closes #N`. Validate using `./scripts/validate.sh` before committing or marking ready. Map acceptance criteria and approved requirements to tests, keep Project status current, and require the owner's authorization before merge.

Approved Dropbox specifications and the decision log govern business behavior. Repository ADRs govern engineering decisions subject to that scope. Keep unapproved business behavior in a spike or an explicitly labelled synthetic design preview. Apply the backend's SDLC change control when a decision moves scope. Link approved source versions, avoid copying real guest data or legacy archives, and keep each module independent.

Fixture-based route checks demonstrate UX states. For integrated stories derive access from the approved server contracts and exercise tenant, subscription, property and operation denial scenarios. Never add credentials or enable real transactions in a design review.
