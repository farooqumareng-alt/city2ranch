/**
 * One shared, professional HTML shell for every email this app sends —
 * internal concierge-team notifications ("New X" leads) and customer-
 * facing transactional emails alike. Table-based layout with every
 * style inlined, on purpose: email clients don't share a rendering
 * engine the way browsers do, and Outlook desktop in particular
 * (Word's engine, not a browser engine) drops flexbox/grid, most
 * shorthand CSS, and external/`<style>` stylesheets entirely. Tables +
 * inline styles are the only layout approach that survives across
 * Outlook, Gmail, Apple Mail, and Yahoo without silently breaking.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Every email in this file is a hand-assembled HTML string (a
 * deliberate choice — see the file's own doc comment on why Outlook
 * needs tables + inline styles, not React's JSX escaping). That means
 * nothing here gets React's automatic escaping either, and several of
 * these templates interpolate genuinely free-text values straight from
 * public, unauthenticated forms (Contact, Service Request, Waitlist,
 * Founding Member). Escape every interpolated value with no exceptions
 * — simpler and safer than trying to classify which fields are "safe."
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Email clients load images from a real URL, not the local /public
// folder. public/logo-email.png is a flattened PNG rasterized from
// public/logo.svg — email-client SVG support is inconsistent-to-
// nonexistent (Outlook especially), so the raster export is the only
// version safe to reference here.
const LOGO_URL = `${SITE_URL}/logo-email.png`;
// Matches the source SVG's aspect ratio (1272.42 x 464.74) — width/height
// attributes are set explicitly so email clients reserve the right
// space before the image itself loads.
const LOGO_IMG = `<img src="${LOGO_URL}" width="160" height="58" alt="City2Ranch" style="display:inline-block;border:0;max-width:160px;height:auto;">`;

const COLORS = {
  navy: "#0B2445",
  gold: "#C9A45C",
  ivory: "#F4EFE6",
  hairline: "#EFE9DC",
  body: "#333333",
  muted: "#8A8377",
  text: "#171717",
};

/**
 * The chrome every email shares: logo header, serif title, sans-serif
 * body, and a consistent footer with a real way back to the site and
 * to support — the difference between "an automated message" and a
 * business a customer can actually reach. `bodyHtml` is the only part
 * that varies per email.
 */
function renderShell(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.ivory};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.ivory};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid ${COLORS.hairline};border-radius:6px;">
            <tr>
              <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid ${COLORS.hairline};">
                ${LOGO_IMG}
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;font-family:Georgia,'Times New Roman',serif;color:${COLORS.text};">
                <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${COLORS.navy};font-weight:normal;">${safeTitle}</h1>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${COLORS.body};">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 32px;border-top:1px solid ${COLORS.hairline};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.muted};text-align:center;">
                <p style="margin:0 0 6px;color:${COLORS.navy};font-weight:bold;letter-spacing:0.04em;">CITY2RANCH</p>
                <p style="margin:0 0 10px;">Rural shopping, delivery &amp; concierge service.</p>
                <p style="margin:0;">
                  <a href="${SITE_URL}" style="color:${COLORS.gold};text-decoration:none;">city2ranch.com</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${SITE_URL}/contact" style="color:${COLORS.gold};text-decoration:none;">Contact Us</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A real button, not a plain colored link — the primary action in any
 *  transactional email (approve a quote, accept an invite, review an
 *  order) deserves to look like the one thing to click, matching this
 *  site's own gold primary-button styling. */
function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
    <tr>
      <td style="border-radius:4px;background-color:${COLORS.gold};">
        <a href="${href}" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${COLORS.navy};text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function renderFields(fields: Record<string, string | null | undefined>): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `<tr>
        <td style="padding:10px 16px 10px 0;border-bottom:1px solid ${COLORS.hairline};font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.hairline};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${COLORS.text};">${escapeHtml(value as string)}</td>
      </tr>`
    )
    .join("");
}

/** Internal concierge-team notifications ("New X" leads) — a fast,
 *  readable fact sheet, not a customer-facing marketing email, but
 *  still built on the same professional shell as everything else this
 *  app sends. */
// extraHtml (a ctaButton(), normally) is appended after the fields
// table — optional so every existing internal-notification caller
// (waitlist, founding member, contact) is unaffected. Added
// 2026-09-01 (lifecycle audit issue #3) specifically so
// serviceRequestEmail can link straight back to the request instead
// of being a plain, unactionable data dump.
function wrap(title: string, fields: Record<string, string | null | undefined>, extraHtml = "") {
  const bodyHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    ${renderFields(fields)}
  </table>
  ${extraHtml}`;
  return {
    subject: `${title} — City2Ranch`,
    html: renderShell(title, bodyHtml),
  };
}

export function waitlistLeadEmail(fields: {
  name: string;
  email: string;
  phone: string;
  zip: string;
  city: string;
  preferredFrequency: string;
}) {
  return wrap("New Route Waitlist Signup", {
    Name: fields.name,
    Email: fields.email,
    Phone: fields.phone,
    ZIP: fields.zip,
    City: fields.city,
    "Preferred frequency": fields.preferredFrequency,
  });
}

export function foundingMemberEmail(fields: {
  name: string;
  email: string;
  phone: string;
  zip: string;
  propertyLocation: string;
  preferredStores?: string;
  shoppingFrequency: string;
  servicesNeeded?: string;
  preferredDays?: string;
}) {
  return wrap("New Founding Member Request", {
    Name: fields.name,
    Email: fields.email,
    Phone: fields.phone,
    ZIP: fields.zip,
    "Property location": fields.propertyLocation,
    "Preferred stores": fields.preferredStores,
    "Shopping frequency": fields.shoppingFrequency,
    "Services needed": fields.servicesNeeded,
    "Preferred days": fields.preferredDays,
  });
}

export function serviceRequestEmail(fields: {
  // Added 2026-09-01 (lifecycle audit issue #3) so this email can link
  // straight to the "Start Quote" action for this specific request,
  // instead of being a plain data dump with nowhere to click.
  id: string;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  serviceType: string;
  preferredStore?: string;
  shoppingList?: string;
  estimatedOrderValue?: string;
  timingPreference: string;
  requestedDeliveryDate?: string;
  notes?: string;
  referralSource?: string;
}) {
  return wrap(
    "New Private Service Request",
    {
      Name: fields.name,
      Email: fields.email,
      Phone: fields.phone,
      Address: [fields.addressLine1, fields.addressLine2, `${fields.city}, ${fields.state} ${fields.zip}`]
        .filter(Boolean)
        .join(", "),
      "Service type": fields.serviceType,
      "Preferred store": fields.preferredStore,
      "Shopping list": fields.shoppingList,
      "Estimated order value": fields.estimatedOrderValue,
      Timing: fields.timingPreference,
      "Requested delivery date": fields.requestedDeliveryDate,
      Notes: fields.notes,
      "Referred by": fields.referralSource,
    },
    ctaButton("Open Request", `${SITE_URL}/internal/dispatch/concierge/new?fromRequest=${fields.id}`)
  );
}

// Added 2026-09-01 (lifecycle audit issue #2) — submitServiceRequest()
// previously sent zero customer-facing email at all; this is that
// transactional confirmation. customerWrap() (defined further down)
// is used by orderPaymentConfirmedEmail/quoteReadyEmail below, all
// three sharing the same signed shell — declared up here since
// service_request submission is the earliest event in the lifecycle.
export function requestReceivedEmail(fields: {
  serviceType: string;
  shoppingList?: string;
  signInUrl: string;
}) {
  return customerWrap(
    "We've Received Your Request",
    `
      <p style="margin:0 0 20px;">Thank you — we've received your ${escapeHtml(fields.serviceType)} request.</p>
      ${
        fields.shoppingList
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${COLORS.hairline};border-radius:4px;background-color:${COLORS.ivory};width:100%;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Your list</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${COLORS.text};white-space:pre-wrap;">${escapeHtml(fields.shoppingList)}</p>
          </td>
        </tr>
      </table>`
          : ""
      }
      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Status</p>
      <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${COLORS.navy};">Request Received</p>
      <p style="margin:0 0 20px;">Our concierge team will review it and follow up with availability and pricing. You don't need to do anything right now.</p>
      ${ctaButton("Sign In to Check Status", fields.signInUrl)}
    `
  );
}

// A closing sign-off, not a contact channel — this site publishes no
// phone number and no specific support address anywhere (not even its
// own footer or /contact page, which is a form, not a listed email),
// so a signature here stays to a team name rather than inventing
// contact details nothing actually monitors. The real way back to the
// business is the "Contact Us" link the shell's footer already has.
const SIGNATURE = `
  <div style="margin-top:28px;padding-top:20px;border-top:1px solid ${COLORS.hairline};">
    <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${COLORS.text};">Warm regards,</p>
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${COLORS.navy};font-weight:bold;">The City2Ranch Concierge Team</p>
  </div>
`;

/** Customer-facing transactional emails — same shell as the internal
 *  notifications above, just addressed to the customer instead of the
 *  team (and signed accordingly — see SIGNATURE). `bodyHtml` is plain
 *  paragraphs/ctaButton() output; the shell supplies the logo, heading,
 *  and footer around it. */
function customerWrap(title: string, bodyHtml: string) {
  return {
    subject: `${title} — City2Ranch`,
    html: renderShell(title, bodyHtml + SIGNATURE),
  };
}

export function orderPaymentConfirmedEmail(fields: {
  // Null for a Concierge order — it may have no single associated store.
  storeName: string | null;
  totalCents: number;
  deliveryPin: string;
  orderUrl: string;
}) {
  const total = (fields.totalCents / 100).toFixed(2);
  const orderLine = fields.storeName
    ? `Your City Pickup order from <strong>${escapeHtml(fields.storeName)}</strong> is confirmed.`
    : `Your City2Ranch Concierge order is confirmed.`;
  return customerWrap(
    "Payment Confirmed",
    `
      <p style="margin:0 0 20px;">${orderLine} Total charged: <strong>$${total}</strong>.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${COLORS.hairline};border-radius:4px;background-color:${COLORS.ivory};">
        <tr>
          <td style="padding:18px 28px;text-align:center;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Delivery PIN</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:0.2em;color:${COLORS.navy};font-weight:bold;">${fields.deliveryPin}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 20px;color:${COLORS.muted};font-size:13px;">Give this to your driver at delivery to confirm it's you.</p>
      ${ctaButton("Track Your Order", fields.orderUrl)}
    `
  );
}

export function quoteReadyEmail(fields: { totalCents: number; signInUrl: string }) {
  const total = (fields.totalCents / 100).toFixed(2);
  return customerWrap(
    "Your Quote Is Ready",
    `
      <p style="margin:0 0 20px;">Your City2Ranch concierge has finished your quote — total: <strong>$${total}</strong>.</p>
      <p style="margin:0 0 20px;">Sign in to review the details and approve it before anything is charged.</p>
      ${ctaButton("Review Your Quote", fields.signInUrl)}
    `
  );
}

export function recurringOrderCreatedEmail(fields: { orderUrl: string }) {
  return customerWrap(
    "Your Recurring Order Is Ready",
    `
      <p style="margin:0 0 20px;">A new order was just created from your recurring City2Ranch request.</p>
      <p style="margin:0 0 20px;">Sign in to review your shopping list and approve it before anything is
      charged — recurring requests never charge you automatically.</p>
      ${ctaButton("Review Your Order", fields.orderUrl)}
    `
  );
}

export function householdInviteEmail(fields: { ownerEmail: string; signInUrl: string }) {
  return customerWrap(
    "You've Been Invited",
    `
      <p style="margin:0 0 20px;"><strong>${escapeHtml(fields.ownerEmail)}</strong> has invited you to access their
      City2Ranch account — you'll be able to see and manage their requests,
      orders, and saved places.</p>
      ${ctaButton("Sign In to Accept", fields.signInUrl)}
      <p style="margin:20px 0 0;color:${COLORS.muted};font-size:13px;">If you weren't expecting this, you can safely ignore this email.</p>
    `
  );
}

export function contactMessageEmail(fields: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  return wrap(`New Contact Message: ${fields.subject}`, {
    Name: fields.name,
    Email: fields.email,
    Phone: fields.phone,
    Message: fields.message,
  });
}

// Added 2026-09-01 (lifecycle audit issue #8) — assigning a driver used
// to send them nothing at all; they'd only find out by opening the app
// and checking "Awaiting Response" themselves. Uses renderShell()
// directly rather than wrap()/customerWrap() — this is an operational
// notice to a driver, not an internal-staff data dump or a
// customer-facing confirmation, so neither existing shape quite fits.
export function driverJobOfferedEmail(fields: {
  driverName: string;
  storeName: string | null;
  deliveryCity: string;
  deliveryState: string;
  jobUrl: string;
}) {
  const title = "New Job Offered";
  const what = fields.storeName ? `a City Pickup from ${escapeHtml(fields.storeName)}` : "a Concierge order";
  return {
    subject: `${title} — City2Ranch`,
    html: renderShell(
      title,
      `
        <p style="margin:0 0 20px;">Hi ${escapeHtml(fields.driverName)}, you've been offered ${what}, delivering to
        ${escapeHtml(fields.deliveryCity)}, ${escapeHtml(fields.deliveryState)}.</p>
        <p style="margin:0 0 20px;">Open the job to accept or decline.</p>
        ${ctaButton("Open Job", fields.jobUrl)}
      `
    ),
  };
}
