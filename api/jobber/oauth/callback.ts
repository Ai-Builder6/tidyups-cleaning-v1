import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept GET requests for OAuth callback
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  const code = (req.query.code as string) || "";
  const error = (req.query.error as string) || "";
  const errorDescription = (req.query.error_description as string) || "";
  const stateParam = (req.query.state as string) || "";

  // Derive redirectUri: priority to state payload, fallback to custom domain
  let redirectUri = "https://dispatchgeeni.com/api/jobber/oauth/callback";
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8"));
      if (decoded?.redirectUri && typeof decoded.redirectUri === "string") {
        redirectUri = decoded.redirectUri;
      }
    } catch {
      // If state is plain string (e.g. 'tidyups_auth'), keep default
    }
  }

  if (error) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Jobber Authorization Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #0f172a; }
            .card { background: white; padding: 36px 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; max-width: 440px; border: 1px solid #fee2e2; }
            .badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #fef2f2; color: #dc2626; border-radius: 50%; margin-bottom: 16px; font-size: 28px; }
            h2 { color: #dc2626; margin: 0 0 8px 0; font-size: 20px; font-weight: 700; }
            p { color: #64748b; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
            .btn { display: inline-block; background: #dc2626; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✕</div>
            <h2>Jobber Authorization Cancelled</h2>
            <p>${error}: ${errorDescription || "Access was cancelled or denied in Jobber."}</p>
            <a href="/" class="btn">Return to Dispatch Board</a>
          </div>
        </body>
      </html>
    `);
  }

  if (!code) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Missing Authorization Code</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="color:#b91c1c;">Missing Authorization Code</h2>
            <p>Jobber did not return an authorization code.</p>
            <a href="/" style="color:#0284c7;font-weight:600;">Return to Dispatch Board</a>
          </div>
        </body>
      </html>
    `);
  }

  const clientId = process.env.JOBBER_CLIENT_ID || "27966135-e33e-4c2e-8dc3-ad7ba06dabb8";
  const clientSecret = process.env.JOBBER_CLIENT_SECRET || "65534ce762fe3ec20a5c1447794dabee0ac03f2caf1048c8686377d4e754a36a";

  try {
    const tokenRes = await fetch("https://api.getjobber.com/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenText = await tokenRes.text();
    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      tokenData = { raw: tokenText };
    }

    if (!tokenRes.ok || !tokenData.access_token) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Jobber Token Exchange Failed</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; padding: 20px; box-sizing: border-box; }
              .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; max-width: 520px; border: 1px solid #fee2e2; }
              pre { text-align: left; background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto; }
              .btn { display: inline-block; background: #0284c7; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2 style="color: #dc2626;">Jobber Token Exchange Failed</h2>
              <p>Jobber returned status code ${tokenRes.status}.</p>
              <pre>${JSON.stringify(tokenData, null, 2)}</pre>
              <p style="font-size:12px;color:#64748b;">Ensure your Jobber app Redirect URI matches: <code>${redirectUri}</code></p>
              <a href="/" class="btn">Return to Dispatch Board</a>
            </div>
          </body>
        </html>
      `);
    }

    // Attempt to fetch company name from Jobber GraphQL API
    let accountName = "Tidyups Cleaning Service Inc";
    try {
      const accountRes = await fetch("https://api.getjobber.com/api/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
          "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
        },
        body: JSON.stringify({
          query: `query VerifyJobberAccount { account { name } }`,
        }),
      });
      const accountJson = (await accountRes.json()) as any;
      if (accountJson?.data?.account?.name) {
        accountName = accountJson.data.account.name;
      }
    } catch {
      // Non-critical
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Jobber Connected Successfully</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #0f172a; }
            .card { background: white; padding: 36px 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; max-width: 440px; border: 1px solid #e2e8f0; }
            .badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #ecfdf5; color: #059669; border-radius: 50%; margin-bottom: 16px; font-size: 28px; }
            h2 { color: #059669; margin: 0 0 8px 0; font-size: 20px; font-weight: 700; }
            p { color: #64748b; font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
            .account { display: inline-block; background: #f1f5f9; padding: 6px 14px; border-radius: 8px; font-weight: 600; color: #334155; font-size: 13px; margin-bottom: 20px; }
            .btn { display: inline-block; background: #059669; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✓</div>
            <h2>Connected to Jobber!</h2>
            <div class="account">${accountName}</div>
            <p>Your Jobber account is authorized. Returning to the Dispatch Board...</p>
            <a href="/" class="btn" id="return-btn">Return to Dispatch Board</a>
          </div>
          <script>
            try {
              localStorage.setItem('tidyups_jobber_token', ${JSON.stringify(tokenData.access_token)});
              if (${JSON.stringify(tokenData.refresh_token || "")}) {
                localStorage.setItem('tidyups_jobber_refresh_token', ${JSON.stringify(tokenData.refresh_token || "")});
              }
              localStorage.setItem('tidyups_jobber_connected', 'true');
              localStorage.setItem('tidyups_jobber_account', ${JSON.stringify(accountName)});
            } catch (e) {
              console.warn('Storage note:', e);
            }

            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'JOBBER_CONNECTED',
                  accessToken: ${JSON.stringify(tokenData.access_token)},
                  refreshToken: ${JSON.stringify(tokenData.refresh_token || "")},
                  accountName: ${JSON.stringify(accountName)}
                }, '*');
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                setTimeout(function() {
                  try { window.close(); } catch (_) {}
                }, 1200);
              }
            } catch (e) {
              console.warn('Opener note:', e);
            }

            setTimeout(function() {
              window.location.href = '/';
            }, 1800);
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(`Server error during Jobber token exchange: ${err.message}`);
  }
}
