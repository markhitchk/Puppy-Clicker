import test from "node:test";
import assert from "node:assert/strict";
import {getClientIp, parseProxycheckV3, detectNetworkRisk} from "../api/_lib/networkRisk.js";

test("IP is accepted only from trusted Vercel headers, not arbitrary browser input",()=>{
  const headers={"x-vercel-forwarded-for":"203.0.113.10","x-forwarded-for":"198.51.100.8"};
  assert.equal(getClientIp(headers,false),null);
  assert.equal(getClientIp(headers,true),"203.0.113.10");
  assert.equal(getClientIp({"x-forwarded-for":"127.0.0.1"},true),null);
  assert.equal(getClientIp({"x-forwarded-for":"foo"},true),null);
});

test("separate VPN and hosting, instead of auto-flagging cloud IPs as VPN",()=>{
  const ip="203.0.113.10";
  const hosting=parseProxycheckV3({status:"ok",[ip]:{detections:{
    vpn:false,proxy:false,tor:false,hosting:true,anonymous:false,confidence:88
  }}},ip);
  assert.equal(hosting.hosting,true);
  assert.equal(hosting.vpn,false);
  assert.equal(hosting.status,"detected");

  const vpn=parseProxycheckV3({status:"ok",[ip]:{detections:{
    vpn:true,proxy:false,tor:false,hosting:true,anonymous:true,confidence:93
  }}},ip);
  assert.equal(vpn.vpn,true);
  assert.equal(vpn.confidence,93);
});

test("provider failure or malformed response remains unknown",async()=>{
  const ip="203.0.113.12";
  assert.equal(parseProxycheckV3({status:"denied"},ip).status,"unknown");
  assert.equal(parseProxycheckV3({status:"ok",[ip]:{detections:{}}},ip).status,"unknown");
  assert.equal((await detectNetworkRisk(ip,{fetcher:async()=>{throw Error("simulated outage")}})).status,"unknown");
});

test("provider url is fixed HTTPS endpoint and response classifications are parsed",async()=>{
  const ip="198.51.100.25";
  const result=await detectNetworkRisk(ip,{key:"test-key",fetcher:async(url)=>{
    const parsed=new URL(url);
    assert.equal(parsed.origin,"https://proxycheck.io");
    assert.equal(parsed.pathname,"/v3/"+ip);
    assert.equal(parsed.searchParams.get("tag"),"0");
    return {ok:true,json:async()=>({status:"ok",[ip]:{detections:{
      vpn:false,proxy:true,tor:false,hosting:false,anonymous:true,confidence:90
    }}})};
  }});
  assert.equal(result.proxy,true);
  assert.equal(result.vpn,false);
});

test("keyless VPN check works on free anonymous proxycheck.io tier", async () => {
  const ip = "192.0.2.170";
  let called = 0;
  const result = await detectNetworkRisk(ip, {
    fetcher: async (url) => {
      called += 1;
      const u = new URL(url);
      assert.equal(u.origin, "https://proxycheck.io");
      assert.equal(u.pathname, "/v3/" + ip);
      assert.equal(u.searchParams.has("key"), false);
      return {ok:true,json:async()=>({status:"ok",[ip]:{detections:{
        vpn:true,proxy:false,tor:false,hosting:false,anonymous:true,confidence:92
      }}})};
    },
  });
  assert.equal(called, 1);
  assert.equal(result.vpn, true);
  assert.equal(result.provider, "proxycheck-v3");
});
