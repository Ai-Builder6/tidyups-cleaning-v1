import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadStore, saveStore } from "../../src/services/storeService";

function normalizePhoneDigits(phone: any): string {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.QUO_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "No QUO_API_KEY environment variable found." });
  }

  try {
    const quoRes = await fetch("https://api.openphone.com/v1/contacts?maxResults=50", {
      headers: { Authorization: apiKey },
    });
    const data = await quoRes.json();
    if (!quoRes.ok) {
      return res.status(quoRes.status).json({ error: data.message || "Failed to fetch Quo contacts" });
    }

    const contacts = (data.data || []).map((c: any) => {
      const fn = (c.defaultFields?.firstName || "").trim();
      const ln = (c.defaultFields?.lastName || "").trim();
      const fullName = (fn + " " + ln).trim() || c.defaultFields?.phoneNumbers?.[0]?.value || "Unknown Contact";
      const primaryPhone = c.defaultFields?.phoneNumbers?.[0]?.value || "";
      const email = c.defaultFields?.emails?.[0]?.value || "";
      return {
        id: c.id,
        name: fullName,
        firstName: fn,
        lastName: ln,
        phone: primaryPhone,
        email,
        createdAt: c.createdAt,
      };
    });

    if (req.method === "POST") {
      // Import into store
      const store = loadStore() || {
        version: 1,
        lastSavedAt: new Date().toISOString(),
        tickets: [],
        cleanerOverrides: {},
        scheduledVisits: [],
        quotes: [],
        invoices: [],
        clients: [],
      };
      if (!store.clients) store.clients = [];

      let imported = 0;
      contacts.forEach((c: any) => {
        const digits = normalizePhoneDigits(c.phone);
        if (!digits) return;
        const existing = store.clients.find((cl: any) => normalizePhoneDigits(cl.phone) === digits);
        if (existing) {
          existing.quoContactId = c.id;
          if (c.name && (!existing.name || existing.name.startsWith("+1") || existing.name.includes("Call ["))) {
            existing.name = c.name;
          }
          if (c.email && !existing.email) existing.email = c.email;
        } else {
          store.clients.push({
            id: `cli-quo-${c.id}`,
            quoContactId: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            address: "Edmonton, Alberta",
            city: "Edmonton",
            province: "AB",
            postalCode: "T5J 0A1",
            verdict: "Good lead",
            tags: ["quo-imported"],
            isJobberLinked: false,
            totalJobs: 0,
            latestServiceDate: new Date().toISOString().slice(0, 10),
            source: "Quo",
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          imported++;
        }
      });
      saveStore(store);
      return res.status(200).json({ success: true, count: contacts.length, imported, clients: store.clients });
    }

    return res.status(200).json({ success: true, count: contacts.length, contacts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
