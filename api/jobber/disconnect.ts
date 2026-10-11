import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    success: true,
    message: "Disconnected from Jobber",
    config: {
      isConnected: false,
      accountName: "Tidyups Cleaning Service Inc (Jobber)",
      clientId: process.env.JOBBER_CLIENT_ID || "27966135-e33e-4c2e-8dc3-ad7ba06dabb8",
      hasSecret: Boolean(process.env.JOBBER_CLIENT_SECRET || "65534ce762fe3ec20a5c1447794dabee0ac03f2caf1048c8686377d4e754a36a"),
      accessToken: "",
      lastSyncedAt: new Date().toISOString(),
      redirectUri: "https://dispatchgeeni.com/api/jobber/oauth/callback",
    },
  });
}
