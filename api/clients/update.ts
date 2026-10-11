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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, name, phone, email, address, notes, tags, verdict } = req.body || {};
  if (!id && !phone) {
    return res.status(400).json({ error: "Client ID or phone is required." });
  }

  const store = loadStore();
  if (!store) return res.status(500).json({ error: "Store not loaded" });
  if (!store.clients) store.clients = [];

  const targetDigits = normalizePhoneDigits(phone);
  let client = store.clients.find((c: any) => c.id === id || (targetDigits && normalizePhoneDigits(c.phone) === targetDigits));

  if (!client) {
    client = {
      id: id || `cli-${Date.now()}`,
      name: name || "New Client",
      phone: phone || "",
      email: email || "",
      address: address || "Edmonton, Alberta",
      city: "Edmonton",
      province: "AB",
      verdict: verdict || "Client",
      tags: tags || ["manual"],
      isJobberLinked: false,
      totalJobs: 0,
      createdAt: new Date().toISOString(),
    };
    store.clients.unshift(client);
  }

  if (name) client.name = name;
  if (phone) client.phone = phone;
  if (email !== undefined) client.email = email;
  if (address !== undefined) client.address = address;
  if (notes !== undefined) client.notes = notes;
  if (tags) client.tags = tags;
  if (verdict) client.verdict = verdict;
  client.updatedAt = new Date().toISOString();

  // Propagate name across matching scheduled visits
  let updatedVisitsCount = 0;
  if (client.phone && name) {
    const cDigits = normalizePhoneDigits(client.phone);
    (store.scheduledVisits || []).forEach((v: any) => {
      const vDigits = normalizePhoneDigits(v.clientPhone || v.secondaryPhone);
      if (vDigits && (vDigits === cDigits || vDigits.endsWith(cDigits) || cDigits.endsWith(vDigits))) {
        v.clientName = name;
        updatedVisitsCount++;
      }
    });

    (store.quotes || []).forEach((q: any) => {
      if (normalizePhoneDigits(q.clientPhone) === cDigits) {
        q.clientName = name;
      }
    });

    (store.invoices || []).forEach((i: any) => {
      if (normalizePhoneDigits(i.clientPhone) === cDigits) {
        i.clientName = name;
      }
    });
  }

  // Update in Quo if quoContactId is present and QUO_API_KEY is available
  const quoKey = process.env.QUO_API_KEY;
  if (client.quoContactId && quoKey) {
    try {
      const [firstName, ...lastParts] = (name || "").split(" ");
      const lastName = lastParts.join(" ");
      fetch(`https://api.openphone.com/v1/contacts/${client.quoContactId}`, {
        method: "PATCH",
        headers: {
          Authorization: quoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          defaultFields: {
            firstName: firstName || name,
            lastName: lastName || "",
          },
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  saveStore(store);

  return res.status(200).json({
    success: true,
    message: `Contact "${client.name}" saved! Propagated to ${updatedVisitsCount} scheduled visits.`,
    client,
    updatedVisitsCount,
  });
}
