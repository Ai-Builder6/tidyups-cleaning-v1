import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadStore, saveStore } from "../../src/services/storeService";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const store = loadStore();
  const calls = store?.quoCallLogs || [];

  if (req.method === "POST") {
    const { callId, jobId } = req.body || {};
    if (!callId || !jobId) {
      return res.status(400).json({ error: "callId and jobId required" });
    }
    const call = calls.find((c: any) => c.id === callId || c.callId === callId);
    const job = (store?.scheduledVisits || []).find((v: any) => v.id === jobId) ||
                (store?.unscheduledJobs || []).find((v: any) => v.id === jobId);

    if (!call || !job) {
      return res.status(404).json({ error: "Call or job not found" });
    }

    call.matchedJobId = job.id;
    call.matchedJobTitle = job.title;
    call.status = "MATCHED_TO_JOB";
    if (!job.callTranscripts) job.callTranscripts = [];
    job.callTranscripts.unshift(call);
    saveStore(store);
    return res.status(200).json({ success: true, call, job });
  }

  return res.status(200).json({
    success: true,
    count: calls.length,
    calls,
  });
}
