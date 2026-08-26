-- TEST DATA — placeholder pilot-corridor seed, NOT real business numbers.
--
-- Real ZIPs, measured mileage, base/per-mile rates, and store address are
-- a founder decision (see the approved operating-model doc, §18) — this
-- file exists only so the order flow has *something* to compute against
-- during development/verification. Replace every value here before real
-- launch. Not part of the versioned drizzle/ migration history on
-- purpose (business data, not schema) — run manually via the Supabase
-- SQL editor or psql. Written to be safe to re-run.

insert into pricing_rules (service_label, base_fee_cents, per_mile_cents, min_fee_cents, is_active, note)
select 'Rural Route Service', 1500, 150, 2500, true, 'PLACEHOLDER — replace with real pilot pricing before launch'
where not exists (select 1 from pricing_rules where is_active);

insert into stores (name, address_line1, city, state, zip, phone, is_active)
select 'Placeholder Test Store', '100 Main St', 'Fort Worth', 'TX', '76102', null, true
where not exists (select 1 from stores where name = 'Placeholder Test Store');

insert into zip_mileage (zip, round_trip_miles, label)
values ('76024', 25.0, 'PLACEHOLDER — test ZIP, replace with real pilot corridor')
on conflict (zip) do nothing;
