// Minimal, dependency-free email bodies for internal concierge-team
// notifications. Not customer-facing marketing emails — just a fast,
// readable way for the team to see what came in.

// Email clients load images from a real URL, not the local /public
// folder — same NEXT_PUBLIC_SITE_URL + localhost fallback every other
// email-embedded link in this file already uses (signInUrl, orderUrl,
// etc.), just read once here instead of threaded through every call
// site. public/logo-email.png is a flattened PNG rasterized from
// public/logo.svg — email clients (Outlook especially) have
// inconsistent-to-nonexistent SVG support, so the raster export is the
// only version safe to reference in HTML email.
const LOGO_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/logo-email.png`;
// Matches the source SVG's aspect ratio (1272.42 x 464.74) — width/height
// attributes are set explicitly so email clients reserve the right
// space before the image itself loads.
const LOGO_IMG = `<img src="${LOGO_URL}" width="140" height="51" alt="City2Ranch" style="display:block;border:0;">`;

function renderFields(fields: Record<string, string | null | undefined>) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;">${label}</td><td>${value}</td></tr>`)
    .join("");
}

function wrap(title: string, fields: Record<string, string | null | undefined>) {
  return {
    subject: `${title} — City2Ranch`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#171717;">
        ${LOGO_IMG}
        <h2 style="color:#0B2445;margin-top:16px;">${title}</h2>
        <table style="border-collapse:collapse;">${renderFields(fields)}</table>
      </div>
    `,
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
  return wrap("New Private Service Request", {
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
  });
}

// Customer-facing transactional emails get slightly more considered
// framing than the internal "New X" notifications above — this is the
// customer's own receipt/confirmation, not an internal alert.
function customerWrap(title: string, bodyHtml: string) {
  return {
    subject: `${title} — City2Ranch`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#171717;max-width:480px;">
        ${LOGO_IMG}
        <h2 style="color:#0B2445;margin-top:16px;">${title}</h2>
        ${bodyHtml}
      </div>
    `,
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
    ? `Your City Pickup order from <strong>${fields.storeName}</strong> is confirmed.`
    : `Your City2Ranch Concierge order is confirmed.`;
  return customerWrap(
    "Payment Confirmed",
    `
      <p>${orderLine} Total charged: <strong>$${total}</strong>.</p>
      <p>Your delivery PIN:</p>
      <p style="font-size:28px;letter-spacing:0.2em;color:#C9A45C;font-weight:bold;">${fields.deliveryPin}</p>
      <p style="color:#666;font-size:13px;">Give this to your driver at delivery to confirm it's you.</p>
      <p><a href="${fields.orderUrl}" style="color:#0B2445;">Track your order</a></p>
    `
  );
}

export function quoteReadyEmail(fields: { totalCents: number; signInUrl: string }) {
  const total = (fields.totalCents / 100).toFixed(2);
  return customerWrap(
    "Your Quote Is Ready",
    `
      <p>Your City2Ranch concierge has finished your quote — total: <strong>$${total}</strong>.</p>
      <p>Sign in to review the details and approve it before anything is charged.</p>
      <p><a href="${fields.signInUrl}" style="color:#0B2445;">Sign in to review your quote</a></p>
    `
  );
}

export function householdInviteEmail(fields: { ownerEmail: string; signInUrl: string }) {
  return customerWrap(
    "You've Been Invited",
    `
      <p><strong>${fields.ownerEmail}</strong> has invited you to access their
      City2Ranch account — you'll be able to see and manage their requests,
      orders, and saved places.</p>
      <p><a href="${fields.signInUrl}" style="color:#0B2445;">Sign in to accept</a></p>
      <p style="color:#666;font-size:13px;">If you weren't expecting this, you can ignore this email.</p>
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
