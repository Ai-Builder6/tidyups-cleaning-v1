/**
 * Google Sheets Lead-to-Sheet Processor & Synchronizer
 * Ported from Day-3 Codebase (leadSheetWriter.ts, leadSheetConfig.ts, & Tidyups Lead Processor)
 *
 * Configured specifically for Tidyups Cleaning Service Inc (Edmonton, AB)
 */

export const LEADS_SPREADSHEET_ID =
  process.env.LEADS_SPREADSHEET_ID ??
  "1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA";

export const SECONDARY_LEADS_SPREADSHEET_ID =
  process.env.LEADS_SECONDARY_SPREADSHEET_ID ??
  "1-1palHco2hOEKDh8ivnLYX6-PuzeQtHhLQGkaD_Dp4I";

export const APP_LEADS_TAB = "ScrubbyBuilder Leads";

/**
 * The exact 20-column schema defined in Tidyups Lead Processor & leadSheetWriter.ts
 */
export const APP_LEAD_HEADERS = [
  "id",
  "created_time",
  "source",
  "source_tab",
  "first_name",
  "last_name",
  "phone_number",
  "email",
  "street_address",
  "city",
  "province",
  "post_code",
  "service",
  "bedrooms",
  "bathrooms",
  "date_of_service_requested",
  "heard_about",
  "message",
  "inbox_url",
  "lead_status",
] as const;

export interface SheetLeadRecord {
  id: string;
  created_time: string;
  source: string;
  source_tab: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  street_address: string;
  city: string;
  province: string;
  post_code: string;
  service: string;
  bedrooms: string;
  bathrooms: string;
  date_of_service_requested: string;
  heard_about: string;
  message: string;
  inbox_url: string;
  lead_status: string;
}

/**
 * Normalizes phone numbers to standard 780-XXX-XXXX or clean format
 */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim();
}

/**
 * Splits customer full name into first and last name safely
 */
export function splitCustomerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Converts a ServiceTicket into the exact 20-column Day-3 Google Sheets row
 */
export function ticketToSheetRow(ticket: any): SheetLeadRecord {
  const { firstName, lastName } = splitCustomerName(ticket.customerName || "");
  const phone = normalizePhoneNumber(ticket.customerPhone || "");

  // Detect bedrooms and bathrooms from equipmentModel or issueDescription if present
  let bedrooms = "";
  let bathrooms = "";
  const modelText = `${ticket.equipmentModel || ""} ${ticket.issueDescription || ""}`.toLowerCase();
  
  const bedMatch = modelText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  if (bedMatch) bedrooms = bedMatch[1];
  else if (modelText.includes("studio")) bedrooms = "studio apartment";

  const bathMatch = modelText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
  if (bathMatch) bathrooms = bathMatch[1];

  const dateRequested = ticket.slaDeadline || "Today";

  return {
    id: ticket.id,
    created_time: ticket.createdAt || new Date().toISOString(),
    source: "dispatch_voice_app",
    source_tab: APP_LEADS_TAB,
    first_name: firstName,
    last_name: lastName,
    phone_number: phone,
    email: ticket.customerEmail || "",
    street_address: ticket.location?.address || "",
    city: ticket.location?.city || "Edmonton",
    province: "AB",
    post_code: ticket.location?.address?.match(/[A-Z]\d[A-Z]\s*\d[A-Z]\d/i)?.[0]?.toUpperCase() || "",
    service: ticket.equipmentType || "Standard Cleaning",
    bedrooms: bedrooms || "Residential",
    bathrooms: bathrooms || "Standard",
    date_of_service_requested: dateRequested,
    heard_about: "Dispatch AI Intake",
    message: ticket.issueDescription || "",
    inbox_url: `https://bookcleaning.app/tickets/${ticket.id}`,
    lead_status: ticket.status === "COMPLETED" ? "completed" : ticket.status === "ASSIGNED" ? "booked" : "new",
  };
}

/**
 * Returns a tab-separated value (TSV) string ready for direct pasting into Google Sheets
 */
export function generateTsvRows(records: SheetLeadRecord[]): string {
  const headerLine = APP_LEAD_HEADERS.join("\t");
  const dataLines = records.map((rec) =>
    APP_LEAD_HEADERS.map((header) => {
      const val = rec[header as keyof SheetLeadRecord] || "";
      return String(val).replace(/[\t\r\n]+/g, " ").trim();
    }).join("\t")
  );
  return [headerLine, ...dataLines].join("\n");
}
