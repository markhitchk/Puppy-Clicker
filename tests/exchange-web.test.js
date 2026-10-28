import test from "node:test";
import assert from "node:assert/strict";
import {requestWebPuppyExchange} from "../src/native/web/exchangeClient.js";

test("web Exchange invokes protected function using Pup Account client",async()=>{
 let invocation;
 const client={functions:{invoke:async(name,options)=>{
  invocation={name,options};return {data:{profile:{friendCode:"PUP-HARLEYTG-DEV"}},error:null};
 }}};
 const result=await requestWebPuppyExchange(client,"profile");
 assert.deepEqual(invocation,{name:"pup-exchange",options:{body:{operation:"profile"}}});
 assert.equal(result.profile.friendCode,"PUP-HARLEYTG-DEV");
});

test("web Exchange forwards only intended operation and fields",async()=>{
 let request;
 const client={functions:{invoke:async(name,options)=>{
  request=options.body;return {data:{ok:true},error:null};
 }}};
 await requestWebPuppyExchange(client,"offer",{friendCode:"PUP-AAAA-BBBB-CCCC",kind:"gift",offered:["v2_puppy"]});
 assert.deepEqual(request,{friendCode:"PUP-AAAA-BBBB-CCCC",kind:"gift",offered:["v2_puppy"],operation:"offer"});
});

test("web Exchange maps server authentication and policy errors",async()=>{
 const client={functions:{invoke:async()=>({data:null,error:{context:{json:async()=>({code:"EXCHANGE_ACCOUNT_UNAVAILABLE"})}}})}};
 await assert.rejects(requestWebPuppyExchange(client,"profile"),e=>e.code==="EXCHANGE_ACCOUNT_UNAVAILABLE");
});

test("web Exchange cannot invent arbitrary server operations",async()=>{
 const client={functions:{invoke:async()=>{throw Error("Should not call server");}}};
 await assert.rejects(requestWebPuppyExchange(client,"admin"),e=>e.code==="EXCHANGE_ACTION_INVALID");
});
