import {createClient} from "@supabase/supabase-js";
import {detectNetworkRisk, getClientIp} from "./_lib/networkRisk.js";

function respond(res, status, body) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(body);
}

function databaseClient() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {auth:{persistSession:false,autoRefreshToken:false}});
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return respond(res, 405, {ok:false});
  }
  // Only accept same-origin app requests; no cross-site write API.
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return respond(res,403,{ok:false});
    } catch { return respond(res,403,{ok:false}); }
  }

  const ip = getClientIp(req.headers, process.env.VERCEL === "1");
  const userAgent = String(req.headers["user-agent"] ?? "").slice(0, 2048);
  const result = await detectNetworkRisk(ip, {key:process.env.PROXYCHECK_API_KEY});
  let recorded = false;
  const db = databaseClient();

  if (db && ip) {
    // Only the server can associate an authenticated identity with the record.
    // A valid Supabase session alone isn't enough: the user must also be linked to Pup Account.
    let authUserId = null;
    let accountUuid = null;
    const auth = String(req.headers.authorization ?? "");
    if (auth.startsWith("Bearer ") && auth.length < 5000) {
      const {data, error} = await db.auth.getUser(auth.slice(7));
      if (!error && data?.user?.id) {
        const link = await db.from("pup_web_auth_links")
          .select("account_uuid").eq("auth_user_id", data.user.id).maybeSingle();
        if (!link.error && link.data?.account_uuid) {
          authUserId = data.user.id;
          accountUuid = link.data.account_uuid;
        }
      }
    }

    const {error} = await db.from("pup_web_network_checks").insert({
      ip_address:ip, user_agent:userAgent, auth_user_id:authUserId,
      account_uuid:accountUuid, detection_status:result.status,
      vpn:result.vpn, proxy:result.proxy, tor:result.tor,
      hosting:result.hosting, anonymous:result.anonymous,
      risk_score:result.riskScore, confidence:result.confidence,
      provider:result.provider,
    });
    if (error) console.error("Pup network audit persistence unavailable");
    else recorded = true;
  }

  // Do not send the IP, risk findings, or account details to the browser.
  // Detection is informational; it must not auto-ban, block auth, or interfere with gameplay.
  return respond(res, 200, {ok:true, recorded});
}
