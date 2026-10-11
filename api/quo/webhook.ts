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

function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function detectServiceTypeFromText(text: string): "Standard Cleaning" | "Deep Cleaning" | "Move-Out Cleaning" {
  const lower = (text || "").toLowerCase();
  if (lower.includes("move-out") || lower.includes("move out") || lower.includes("turnover") || lower.includes("tenancy")) {
    return "Move-Out Cleaning";
  }
  if (lower.includes("deep") || lower.includes("oven") || lower.includes("fridge") || lower.includes("baseboard")) {
    return "Deep Cleaning";
  }
  return "Standard Cleaning";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = req.body || {};
  const dataObj = event.data?.object || event.call || event.data || event;

  const callId = dataObj.id || dataObj.callId || `call_${Date.now()}`;
  const direction = dataObj.direction || "inbound";
  const rawFrom = dataObj.from || dataObj.participants?.[0]?.phoneNumber || "";
  const rawTo = dataObj.to || "";
  const duration = Number(dataObj.duration || dataObj.durationSeconds || 0);

  const callerRaw = direction === "inbound" ? rawFrom : rawTo;
  const callerDigits = normalizePhoneDigits(callerRaw);
  const cleanCallerPhone = formatPhoneDisplay(callerRaw || "Unknown");

  const transcriptText = (
    dataObj.transcript?.text ||
    dataObj.transcript ||
    dataObj.text ||
    (Array.isArray(dataObj.dialogue) ? dataObj.dialogue.map((d: any) => `${d.speaker || 'Caller'}: ${d.text}`).join('\n') : '') ||
    ""
  ).trim();

  const summary = (
    dataObj.summary?.text ||
    dataObj.summary ||
    (transcriptText ? transcriptText.slice(0, 180) + (transcriptText.length > 180 ? '...' : '') : 'Inbound call completed')
  ).trim();

  const mediaRecording = dataObj.media?.find((m: any) => m.type === "recording")?.url || dataObj.recordingUrl || "";
  const callerNameFromPayload = dataObj.callerName || dataObj.participants?.[0]?.name || "";
  const timestamp = dataObj.createdAt || dataObj.completedAt || new Date().toISOString();

  const store = loadStore() || {
    version: 1,
    lastSavedAt: new Date().toISOString(),
    tickets: [],
    cleanerOverrides: {},
    scheduledVisits: [],
    unscheduledJobs: [],
    quotes: [],
    invoices: [],
    clients: [],
    quoCallLogs: [],
  };

  if (!store.quoCallLogs) store.quoCallLogs = [];
  if (!store.clients) store.clients = [];
  if (!store.scheduledVisits) store.scheduledVisits = [];
  if (!store.unscheduledJobs) store.unscheduledJobs = [];

  let matchedJob: any = null;
  if (callerDigits) {
    matchedJob = store.scheduledVisits.find((v: any) => {
      const vDigits = normalizePhoneDigits(v.clientPhone || v.secondaryPhone);
      return vDigits && (vDigits === callerDigits || vDigits.endsWith(callerDigits) || callerDigits.endsWith(vDigits));
    });
  }

  const effectiveCallerName = callerNameFromPayload || (matchedJob ? matchedJob.clientName : cleanCallerPhone);

  const callLogEntry: any = {
    id: callId,
    callId,
    direction,
    callerPhone: cleanCallerPhone,
    callerName: effectiveCallerName,
    duration,
    recordingUrl: mediaRecording,
    transcriptText,
    summary,
    lineName: "Primary Dispatch",
    timestamp,
    matchedJobId: matchedJob ? matchedJob.id : null,
    matchedJobTitle: matchedJob ? matchedJob.title : null,
    status: matchedJob ? "MATCHED_TO_JOB" : "NEW_LEAD",
  };

  if (matchedJob) {
    if (!matchedJob.callTranscripts) matchedJob.callTranscripts = [];
    matchedJob.callTranscripts.unshift(callLogEntry);
    matchedJob.notes = matchedJob.notes ? `${matchedJob.notes}\n[Quo Call Log]: ${summary}` : `[Quo Call Log]: ${summary}`;
  } else {
    const newLeadTicket = {
      id: `lead-quo-${Date.now()}`,
      ticketNumber: `LEAD-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `Inbound Call: ${effectiveCallerName}`,
      clientName: effectiveCallerName,
      clientPhone: cleanCallerPhone,
      serviceType: detectServiceTypeFromText(`${summary} ${transcriptText}`),
      serviceAddress: "Edmonton, Alberta",
      status: "UNSCHEDULED",
      notes: `[Inbound Phone Lead]: ${summary}\nFull Transcript: ${transcriptText}`,
      createdAt: timestamp,
      callTranscripts: [callLogEntry],
      source: "Quo Call Intake",
    };
    store.unscheduledJobs.unshift(newLeadTicket);
    callLogEntry.matchedJobId = newLeadTicket.id;
    callLogEntry.matchedJobTitle = newLeadTicket.title;
  }

  store.quoCallLogs.unshift(callLogEntry);
  if (store.quoCallLogs.length > 200) store.quoCallLogs = store.quoCallLogs.slice(0, 200);

  saveStore(store);

  return res.status(200).json({
    received: true,
    matchedJob: matchedJob ? { id: matchedJob.id, title: matchedJob.title } : null,
    callLog: callLogEntry,
  });
}
