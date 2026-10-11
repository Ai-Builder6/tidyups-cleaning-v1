import type { VercelRequest, VercelResponse } from "@vercel/node";
import { syncJobberInvoices } from "../../src/services/jobberSyncModules";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let token = (req.body?.accessToken || req.query?.accessToken || "").trim();
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, "").trim();
  }
  if (!token) {
    token = (process.env.JOBBER_ACCESS_TOKEN || process.env.JOBBER_BEARER_TOKEN || "").trim().replace(/^Bearer\s+/i, "");
  }

  const clientId = process.env.JOBBER_CLIENT_ID || "27966135-e33e-4c2e-8dc3-ad7ba06dabb8";
  const clientSecret = process.env.JOBBER_CLIENT_SECRET || "65534ce762fe3ec20a5c1447794dabee0ac03f2caf1048c8686377d4e754a36a";
  const refreshToken = (req.body?.refreshToken as string) || process.env.JOBBER_REFRESH_TOKEN || "";

  try {
    const creds = { clientId, clientSecret, refreshToken };
    const data = await syncJobberInvoices(token, creds);
    return res.status(200).json({
      success: true,
      isLiveJobber: Boolean(token && token.length > 20),
      ...data,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(200).json({
      success: false,
      error: error.message || "Failed to sync invoices",
      invoices: [],
    });
  }
}
