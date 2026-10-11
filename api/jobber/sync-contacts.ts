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
  const store = loadStore();
  if (!store) return res.status(500).json({ error: "Store not loaded" });
  if (!store.clients) store.clients = [];

  let jobberSyncedCount = 0;

  // Harvest client names and phone numbers from scheduled visits
  (store.scheduledVisits || []).forEach((v: any) => {
    const vDigits = normalizePhoneDigits(v.clientPhone);
    if (!vDigits) return;
    const existing = store.clients.find((c: any) => normalizePhoneDigits(c.phone) === vDigits);
    if (existing) {
      existing.isJobberLinked = true;
      if (v.clientName && (!existing.name || existing.name.startsWith("+1"))) {
        existing.name = v.clientName;
      }
    } else {
      store.clients.push({
        id: `cli-visit-${v.id}`,
        name: v.clientName,
        phone: v.clientPhone,
        address: v.serviceAddress,
        city: "Edmonton",
        province: "AB",
        postalCode: "T5J 0A1",
        verdict: "Client",
        tags: ["jobber-visit"],
        isJobberLinked: true,
        totalJobs: 1,
        latestServiceDate: (v.startAt || "").slice(0, 10),
        notes: `Customer for visit ${v.visitNumber || v.title}`,
        source: "Jobber",
        createdAt: new Date().toISOString(),
      });
      jobberSyncedCount++;
    }
  });

  saveStore(store);

  return res.status(200).json({
    success: true,
    message: `All contacts synchronized! ${store.clients.length} contacts saved and aligned with Jobber.`,
    totalContacts: store.clients.length,
    jobberLinkedCount: store.clients.filter((c: any) => c.isJobberLinked).length,
    clients: store.clients,
  });
}
