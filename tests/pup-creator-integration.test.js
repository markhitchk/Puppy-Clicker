import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import sharp from "sharp";
import {sanitizeCreatorPackage} from "../api/_lib/creatorPackage.js";
import {sendCreatorDiscord} from "../api/_lib/creatorDiscord.js";
import {normalizeCreatorRoster,mergeCreatorRoster} from "../src/creatorRoster.js";
const source=await readFile(new URL("../public/assets/test/v1_test_crash_dummy.png",import.meta.url));
const fixture={format:"puppy-clicker.pup",version:2,generation:"v1",sourceTemplateId:"test_v1_crash_dummy",templateVersion:1,width:256,height:256,name:"Fixture puppy",description:"Integration fixture",layers:[{id:"paint",name:"Paint",visible:true,opacity:1,artwork:"data:image/png;base64,"+source.toString("base64")}]};
test("server reconstructs actual 256px PNG and sends Discord attachments without exposing credentials or mentions",async()=>{
 const project=await sanitizeCreatorPackage(fixture,sharp,source);
 const meta=await sharp(Buffer.from(project.artwork.slice(22),"base64")).metadata();
 assert.equal(meta.width,256);assert.equal(meta.height,256);
 const id="00000000-0000-4000-8000-000000000001";
 const result=await sendCreatorDiscord({id,project,name:"@everyone",username:"@here",generation:"v1"},"https://discord.com/api/webhooks/example",{transport:async(url,request)=>{
  assert.equal(request.method,"POST");assert.equal(request.redirect,"error");
  const payload=JSON.parse(request.body.get("payload_json"));
  assert.deepEqual(payload.allowed_mentions,{parse:[]});
  assert.equal(payload.embeds[0].image.url,"attachment://preview.png");
  const png=request.body.get("files[0]"),pup=request.body.get("files[1]");
  assert.equal(png.name,"preview.png");assert.equal(pup.name,"creation.pup");
  assert.equal(JSON.parse(await pup.text()).submissionId,id);
  assert.ok((await png.arrayBuffer()).byteLength>0);
  return new Response(JSON.stringify({id:"123456789012345678"}),{status:200});
 }});
 assert.deepEqual(result,{delivery:"delivered",messageId:"123456789012345678"});
});
test("Discord errors never count as delivered",async()=>{
 const row={id:"test",project:{...fixture,artwork:fixture.layers[0].artwork},name:"Test",username:"Test",generation:"v1"};
 for(const [status,expected] of [[429,"failed"],[401,"failed"],[500,"unknown"]]){
  const result=await sendCreatorDiscord(row,"https://discord.com/api/webhooks/example",{transport:async()=>new Response("",{status})});
  assert.equal(result.delivery,expected);assert.equal(result.messageId,null);
 }
});
test("published roster accepts only valid unique creator IDs and uses controlled artwork URL without ownership grants",()=>{
 const id="v2_creator_"+"a".repeat(24),valid={id,name:"Creator Pup",description:"Example",generation:"v2",image:"https://example.com/tracker",free:true};
 const rows=normalizeCreatorRoster([valid,valid,{...valid,id:"classic"},{...valid,id:"v1_creator_"+"b".repeat(24)}]);
 assert.equal(rows.length,1);assert.equal(rows[0].image,"/api/creator-art?id="+id);assert.equal(rows[0].free,false);assert.equal(rows[0].redeemOnly,true);
 assert.equal(mergeCreatorRoster([{id}],rows).length,1);
});
