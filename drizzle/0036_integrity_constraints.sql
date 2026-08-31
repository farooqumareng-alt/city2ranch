-- Security remediation, P2 findings: two missing uniqueness guards the
-- audit flagged. Verified against production before writing this file
-- that no existing rows would violate either constraint (1 row in
-- membership_settings today; zero duplicate non-null
-- orders.service_request_id groups).

-- membership_settings was documented as "a single settings row" but
-- nothing enforced it — an unordered `.limit(1)` reader/writer pair
-- could silently diverge on the Membership Sales on/off flag if a
-- second row ever appeared. A unique index on a constant expression
-- allows at most one row, full stop.
CREATE UNIQUE INDEX "membership_settings_singleton" ON "membership_settings" ((true));
--> statement-breakpoint

-- Nothing stopped one service_request from being converted into two
-- independently-payable concierge orders on a double-submit. Paired
-- with a pre-check in create-concierge-order.ts.
CREATE UNIQUE INDEX "orders_service_request_id_unique" ON "orders" ("service_request_id") WHERE "service_request_id" IS NOT NULL;
