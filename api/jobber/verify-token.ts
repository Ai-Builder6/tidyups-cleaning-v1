import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let token = (req.body?.accessToken || req.query.accessToken || "").trim();
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, "").trim();
  }
  if (!token) {
    token = (process.env.JOBBER_ACCESS_TOKEN || process.env.JOBBER_BEARER_TOKEN || "").trim().replace(/^Bearer\s+/i, "");
  }

  if (!token || token.length < 20) {
    return res.status(200).json({
      isValid: false,
      error: "No active access token provided. Please connect via OAuth or paste your token.",
    });
  }

  try {
    const jobberRes = await fetch("https://api.getjobber.com/api/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
      },
      body: JSON.stringify({
        query: `query VerifyJobberAccount { account { name id } }`,
      }),
    });

    const data = (await jobberRes.json()) as any;
    if (data?.data?.account?.name) {
      return res.status(200).json({
        isValid: true,
        accountName: data.data.account.name,
        accountId: data.data.account.id,
        environment: "Jobber GraphQL API (v2025-04-16)",
      });
    }

    const errDetail = data?.errors?.[0]?.message || "Account not returned by Jobber GraphQL API";
    return res.status(200).json({
      isValid: false,
      error: `Jobber API rejected token: ${errDetail}`,
    });
  } catch (err: any) {
    return res.status(200).json({
      isValid: false,
      error: `Network error verifying with Jobber: ${err.message}`,
    });
  }
}
