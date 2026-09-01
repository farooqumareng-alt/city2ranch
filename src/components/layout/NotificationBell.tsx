"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";

type NotificationItem = {
  id: string;
  type: "payment_confirmed" | "recurring_order_created";
  title: string;
  body: string | null;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
};

type Summary = { unreadCount: number; items: NotificationItem[] };

/**
 * Independent of NavAuthControl — mirrors its exact client-side
 * sign-in check (own supabase.auth.getUser()/onAuthStateChange, same
 * reasoning: keeps marketing pages statically prerenderable) rather
 * than sharing code, since the two render in different places and
 * don't need to coordinate. Mounted directly in Nav.tsx next to the
 * logo, not inside NavAuthControl — NavAuthControl hides itself
 * entirely on account panel routes (AccountSidebar/etc. already cover
 * account nav there), but a customer checking notifications is just as
 * likely to be on /home as on a marketing page, so the bell needs to
 * show up everywhere a customer is actually signed in, panel route or
 * not.
 */
export function NotificationBell() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<Summary>({ unreadCount: 0, items: [] });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Also called directly from the bell button's onClick (re-fetching on
  // open) and isn't itself the effect-body call the lint rule below is
  // about — only the mount-time effect needs the inline .then() form.
  function fetchSummary() {
    return fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch((error) => console.error("[NotificationBell] fetch failed", error));
  }

  useEffect(() => {
    // Inlined (not a call to fetchSummary) to match NavAuthControl's own
    // pattern above — react-hooks/set-state-in-effect flags a named
    // function reference invoked from an effect body even when its own
    // setState call happens after an await, but a .then() chained
    // directly on the effect's own promise is the accepted shape.
    if (!signedIn) return;
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch((error) => console.error("[NotificationBell] fetch failed", error));
  }, [signedIn]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!signedIn) return null;

  async function handleItemClick(item: NotificationItem) {
    if (item.readAt) return;
    // Optimistic local update — no need to wait on the round trip to
    // close the unread dot the user just acted on.
    setSummary((prev) => ({
      unreadCount: Math.max(0, prev.unreadCount - 1),
      items: prev.items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)),
    }));
    await markNotificationRead(item.id);
  }

  async function handleMarkAllRead() {
    setSummary((prev) => ({
      unreadCount: 0,
      items: prev.items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })),
    }));
    await markAllNotificationsRead();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) fetchSummary();
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal/75 transition-colors hover:bg-ivory hover:text-gold"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3a5 5 0 0 0-5 5v2.6c0 .5-.15 1-.44 1.4L5 15h14l-1.56-3c-.29-.4-.44-.9-.44-1.4V8a5 5 0 0 0-5-5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {summary.unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[90vw] rounded-sm border border-navy/10 bg-white py-2 shadow-lg"
        >
          <div className="flex items-center justify-between px-4 py-1.5">
            <p className="font-sans text-xs font-semibold uppercase tracking-wide text-charcoal/50">Notifications</p>
            {summary.unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="font-sans text-xs text-gold hover:text-gold-light"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {summary.items.length === 0 ? (
            <p className="px-4 py-3 font-sans text-sm text-charcoal/60">Nothing yet.</p>
          ) : (
            <ul className="flex max-h-80 flex-col overflow-y-auto">
              {summary.items.map((item) => {
                const content = (
                  <div className={`flex flex-col gap-0.5 px-4 py-2.5 ${!item.readAt ? "bg-ivory/60" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-sans text-sm font-medium text-navy-deep">{item.title}</p>
                      {!item.readAt ? (
                        <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-gold" aria-hidden="true" />
                      ) : null}
                    </div>
                    {item.body ? <p className="font-sans text-xs text-charcoal/60">{item.body}</p> : null}
                    <p className="font-sans text-[11px] text-charcoal/40">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
                return (
                  <li key={item.id} role="menuitem">
                    {item.orderId ? (
                      <Link
                        href={`/my-services/${item.orderId}`}
                        onClick={() => {
                          handleItemClick(item);
                          setOpen(false);
                        }}
                        className="block hover:bg-ivory/80"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
