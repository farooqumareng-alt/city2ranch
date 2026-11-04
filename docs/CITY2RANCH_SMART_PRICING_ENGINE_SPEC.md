# CITY2RANCH — SMART PRICING ENGINE SPECIFICATION

**Date:** November 4, 2026
**Direction set by user:** "We need [a] very smart pricing engine that can make pricing its own."
**Status:** Design specification. Nothing here is built or deployed yet. Compensation and vehicle rates are deliberately deferred by the user and are treated throughout as configuration the engine reads — never as values this document invents.

---

## 1. What "smart" means here

The engine generates the price for each request itself — pickup and concierge — from the job's actual distance, time, complexity, route context, and cost structure, instead of looking up a static zone table or waiting for staff to type fee lines.

It is **not** a black box and **not** an LLM setting prices in the transaction path. It is a deterministic, versioned calculation core with:

1. A **cost engine** that knows what the job will cost (labor, vehicle, payment fees, allowances).
2. A **price optimizer** that sets a premium price above a protected margin floor, adjusted for urgency, complexity, scarcity, and route density.
3. A **learning loop** that compares every estimate with what actually happened and recalibrates — through versioned, approved parameter updates, never silent self-modification.
4. An **explanation record** for every price: inputs, components, floor, target, final, model version. Any price can be answered for, reproduced, and audited.

Same inputs + same policy version ⇒ same price. Always.

## 2. What changes versus the current model

| Today | With the engine |
|---|---|
| Pickup: one static rule ($10 + $0.50/mi), no cost side | Pickup: priced per job from estimated time, distance, route context, and cost floor |
| Concierge: staff type fee lines; an advisory suggestion exists only if a zone matches | Concierge: engine generates the full quote; staff review exceptions, not arithmetic |
| Zones are hard gates — no match, no price (e.g. under 20 miles) | Zones become **reference bands** for labor schedules, reporting, and sanity checks. The price itself comes from a continuous distance/time curve, so every in-service request gets a price or an explicit review reason — no silent gaps |
| Every order costed as a solo round trip | Orders on a shared route are costed at their **incremental** miles and minutes |
| Stripe fee invisible to pricing | Payment cost is inside the floor calculation, solved exactly (§4) |
| Quote can change after being sent | Quote is an immutable, versioned snapshot with an expiry; a changed total is a new quote version the customer re-confirms |
| Nothing is learned from completed jobs | Every completed job writes actuals (time, miles, pay, outcome) that recalibrate the estimates |

The user's configured bands (NEAR from 20, EXTENDED from 50, REMOTE from 90, ESTATE_RURAL from 150) remain in the system as the labor-schedule and reporting structure. What they stop being is the *source* of the customer price.

## 3. Inputs

**From the request:** service type (pickup / concierge), pickup store(s) and delivery ZIP, round-trip miles (v1: `zip_mileage` table; later: routing API drive time + distance), requested date and window, lead time, number of stops, number of stores, item count and shopping complexity, heavy/bulky/fragile/cold-chain flags, special handling notes (structured, not free-text parsing), recurring vs one-off, membership tier (once membership mechanics exist).

**From operations:** whether the job inserts into an existing route (and its incremental miles/minutes) or runs dedicated, driver capacity and slot scarcity for the requested window, assigned/expected compensation type (1099 flat vs full-time hourly), route schedule for that day.

**From configuration (versioned policy, set by the business):**
- Labor schedules — 1099 flat amount by service/complexity/band; full-time hourly rate. *(Deferred by user; engine ships with an explicit NOT_CONFIGURED state.)*
- Vehicle cost per mile. *(Deferred.)*
- Allowances: dispatch/support minutes, consumables/cold-chain, expected failure/re-delivery allowance.
- Target contribution margin and **minimum contribution dollars** per service (a 50% margin on a $12 job is $6 — the dollar floor is what protects small jobs).
- Minimum fee, price ceiling for auto-approval, modifier bounds, rounding style.
- Stripe fee parameters (2.9% + $0.30, configurable).

**Explicitly never used:** customer identity, demographics, or any inferred individual willingness-to-pay. Prices vary by job, route, time, and complexity — never by who the customer is.

## 4. The calculation

**Step 1 — Estimate the work.** Predicted drive minutes, shopping minutes, wait/handoff minutes, dedicated vs incremental miles. V1 uses configured per-service/per-ZIP estimates; the learning loop (§6) replaces them with measured values as data accumulates.

**Step 2 — Direct cost.**
```
laborCost      = 1099: flatFor(service, complexity, band)
                 FT:   hourlyRate × estimatedPaidMinutes / 60
vehicleCost    = billableMiles × vehicleRatePerMile     (billableMiles = incremental miles when routed)
otherCost      = supportAllowance + consumables + failureAllowance
directCost C   = laborCost + vehicleCost + otherCost
```

**Step 3 — Floors, with the payment fee solved exactly.** Stripe takes `a·P + b` of the final price `P`, so the floor is solved, not approximated:
```
breakEvenPrice  = (C + b) / (1 − a)                    → contribution $0 after fees
targetPrice     = (C + b) / (1 − a − targetMargin)     → contribution = targetMargin after fees
floorPrice      = max(breakEvenPrice, price that yields minimumContributionDollars, minimumFee)
```

**Step 4 — Context adjustments (bounded, itemized, explainable).** Applied to the target price, each as a named component with a configured cap:
- **Urgency:** short lead time / same-day.
- **Scarcity:** requested window near capacity.
- **Complexity:** extra stores, extra stops, item volume, heavy/bulky, cold-chain.
- **Schedule:** early/late/weekend/holiday windows.
- **Route density credit:** a *reduction* when the job inserts cheaply into a route already traveling — funded by the genuinely lower incremental cost, never below `floorPrice`.
- **Remote access:** known difficult access (long private roads, gates) where operations flags it.

**Step 5 — Final price.** `price = clamp(adjustedTarget, floorPrice, autoApprovalCeiling)`, rounded per policy (internal math stays in exact cents). If the result exceeds the ceiling, confidence is low, or any cost input is unconfigured → **REVIEW_REQUIRED** with the reason attached, and staff see the engine's full working.

**Outputs for every quote:** status (`AUTO_PRICED` / `REVIEW_REQUIRED` / `NOT_CONFIGURED` / `OUT_OF_SERVICE`), itemized components, floor, target, final price, predicted contribution, confidence level, policy + model version, expiry timestamp, and a plain-language explanation staff can show or adapt for the customer.

## 5. Autonomy, in stages

| Stage | Behavior | Gate to advance |
|---|---|---|
| **0 — Shadow** | Engine calculates alongside today's process; nobody sees its prices but us. Daily comparison: engine vs actual/manual price, predicted contribution | Estimates track reality; no unexplained divergences |
| **1 — Recommend** | Staff see the recommended price + explanation for every quote; accept or override (reason required) | Override rate and reasons reviewed; overrides shrinking |
| **2 — Assisted auto** | Engine auto-prices standard pickup and low-risk concierge inside guardrails; exceptions queue for staff | Sustained margin + acceptance performance in shadow/recommend data |
| **3 — Autonomous** | Engine quotes most requests end-to-end; staff manage policy and exceptions. Parameter recalibrations are proposed by the system and approved by a human, on a schedule | A full season of Stage 2 data |

A **kill switch** reverts to current rules/manual quoting instantly, at any stage.

## 6. The learning loop

Every quote stores its full input snapshot and estimates. Every completed order stores actuals: real drive/shop minutes, real miles, labor actually paid, refunds, cancellations, completion outcome, and whether the customer reordered.

On a schedule, the system compares predicted vs actual by service, ZIP cluster, store, and time bucket, and produces a **recalibration proposal**: adjusted time estimates, modifier weights, and confidence ranges — with the evidence (sample sizes, deltas) attached. A human approves it into a new policy version, or rejects it. Small samples change nothing: minimum-sample thresholds are part of the policy.

Price experiments, if ever run, are bounded (small modifier variations on aggregate cohorts, never below floor, never individualized) and reported the same way. Until volume exists, the honest label for the engine is *route-aware, cost-true, self-calibrating* — machine learning enters only when there is data worth learning from, starting with duration/complexity prediction.

## 7. Data model (additions)

- `pricing_policies` — versioned: service, effective window, target margin, minimum contribution $, minimum fee, ceilings, modifier bounds, rounding, autonomy stage, status.
- `pricing_rate_cards` — labor schedules (1099 flat by service/band/complexity; FT hourly), vehicle rate, allowances, Stripe parameters. Effective-dated; a missing rate is NULL = NOT_CONFIGURED, never $0.
- `pricing_quotes` — immutable: request snapshot (JSON), policy + model version, estimated minutes/miles, cost breakdown, floor/target/final, confidence, status, explanation, `expires_at`, supersedes pointer for re-quotes.
- `pricing_quote_components` — one row per named component (base, distance, complexity, urgency, density credit…) with amount and basis.
- `order_actuals` — actual minutes/miles, labor paid, compensation type, vehicle cost, refund/cancellation outcome; written at completion.
- `pricing_overrides` — actor, quote, engine price, final price, reason (required).
- Later: `routes` / `route_stops` linkage for incremental costing (Phase C).

Integration: `submitOrder` and the concierge finalize flow call one pure function, `priceRequest(input, policyVersion) → PricingResult`; Stripe charges only the immutable quote's final total; dispatch shows the explanation and margin state on the order; Business Overview aggregates estimated vs actual contribution.

## 8. Build phases

- **Phase A — Core (deterministic v1):** policy/rate-card tables, the pure pricing function with exact Stripe solving, component breakdown, immutable quote snapshots + expiry, shadow mode, admin explanation view, unit tests (boundaries, floors, rounding, NOT_CONFIGURED paths). *This phase needs no rates to build — it ships dark and reports NOT_CONFIGURED until rates land.*
- **Phase B — Recommend + auto-pickup:** staff recommendation UI with override reasons; pickup auto-pricing once its rate card exists; actuals capture at completion.
- **Phase C — Route-aware:** route/stop linkage, incremental cost for routed jobs, density credit, scarcity from real capacity.
- **Phase D — Calibration:** estimate-vs-actual reporting, recalibration proposals, bounded demand modifiers.
- **Phase E — Autonomy:** Stage 3 rollout for standard requests, exception queue, scheduled policy reviews.

## 9. Acceptance criteria

1. Every in-service request returns a price or an explicit, human-readable review reason — zero silent gaps, including sub-20-mile ZIPs.
2. No auto-generated price is ever below the after-fees break-even floor.
3. Identical inputs + policy version reproduce the identical price, in tests.
4. A sent quote's total cannot change without a new version and customer re-confirmation.
5. Every price in production can be decomposed into named components from its stored record.
6. Actuals are captured for completed orders; shadow/recommend reports show engine-vs-actual deltas before any customer sees an engine price.
7. Kill switch restores today's behavior in one action.

## 10. Still the user's calls (none block Phase A)

- Compensation rates and vehicle rate — deferred, by the user's instruction.
- Target margin and minimum contribution dollars per service.
- Whether sub-20-mile concierge becomes an engine-priced "local" tier (the engine makes it possible; the bands decision made it manual — this spec assumes the engine prices it and flags it LOCAL, and the user can veto).
- Autonomy appetite per service at Stage 2/3.
- Whether drive time comes from a routing API in Phase C or stays table-based.
