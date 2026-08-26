CREATE TYPE "public"."order_item_status" AS ENUM('requested', 'found', 'substituted', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."order_service_type" AS ENUM('pickup', 'concierge');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'quote_pending' BEFORE 'priced';