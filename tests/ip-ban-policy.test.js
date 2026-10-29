import test from "node:test";
import assert from "node:assert/strict";
import {validatePublicIp} from "../api/_lib/adminPolicy.js";
import {findActiveIpBan} from "../api/_lib/ipBan.js";
test("admin IP bans only accept public IPv4/IPv6",()=>{
 assert.equal(validatePublicIp("8.8.8.8"),"8.8.8.8");
 assert.equal(validatePublicIp("2606:4700:4700::1111"),"2606:4700:4700::1111");
 for(const ip of ["127.0.0.1","10.0.0.1","::1","invalid"])assert.throws(()=>validatePublicIp(ip));
});
test("IP ban expires without deleting its audit record",async()=>{
 const original=process.env.VERCEL;process.env.VERCEL="1";
 const row={id:"b",expires_at:null};
 const db={from:()=>({select:()=>({eq:()=>({is:()=>({maybeSingle:async()=>({data:row,error:null})})})})})};
 try{
  assert.equal((await findActiveIpBan(db,{"x-vercel-forwarded-for":"8.8.8.8"}))?.id,"b");
  row.expires_at=new Date(Date.now()-1000).toISOString();
  assert.equal(await findActiveIpBan(db,{"x-vercel-forwarded-for":"8.8.8.8"}),null);
 }finally{if(original===undefined)delete process.env.VERCEL;else process.env.VERCEL=original;}
});
