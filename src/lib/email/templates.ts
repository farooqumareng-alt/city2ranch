// Minimal, dependency-free email bodies for internal concierge-team
// notifications. Not customer-facing marketing emails — just a fast,
// readable way for the team to see what came in.

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
        <h2 style="color:#0B2445;">${title}</h2>
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
  notes?: string;
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
    Notes: fields.notes,
  });
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
