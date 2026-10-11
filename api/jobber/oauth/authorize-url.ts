import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host as string) || "dispatchgeeni.com";
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";

  let redirectUri = `${proto}://${host}/api/jobber/oauth/callback`;
  if (req.query.redirectUri && typeof req.query.redirectUri === "string") {
    redirectUri = req.query.redirectUri;
  } else if (host.includes("dispatchgeeni.com") || host.includes("dispatchgenie.com") || host.includes("distpatchgeeni.com")) {
    redirectUri = "https://dispatchgeeni.com/api/jobber/oauth/callback";
  } else if (host.includes("tidyupscleaning.com")) {
    redirectUri = "https://app.tidyupscleaning.com/api/jobber/oauth/callback";
  }

  const clientId = process.env.JOBBER_CLIENT_ID || "27966135-e33e-4c2e-8dc3-ad7ba06dabb8";

  const statePayload = {
    redirectUri,
    nonce: Math.random().toString(36).substring(2, 12),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const authUrl = new URL("https://api.getjobber.com/api/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return res.status(200).json({
    authUrl: authUrl.toString(),
    redirectUri,
    clientId,
    state,
  });
}
