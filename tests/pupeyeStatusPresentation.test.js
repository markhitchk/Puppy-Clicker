import test from "node:test";
import assert from "node:assert/strict";
import {fairplayPresentation,accountStandingPresentation,gameplayPresentation,androidConnectionPresentation} from "../src/pupeyeStatusPresentation.js";

test("clear is strictly a no-active-warning statement, not a permanent clean bill",()=>{
 const result=fairplayPresentation({status:"clear",riskScore:200,secret:"keep-private"});
 assert.equal(result.status,"clear");
 assert.match(result.detail,/Routine server-side checks still apply/);
 assert.doesNotMatch(JSON.stringify(result),/riskScore|keep-private/);
});
test("warning and temporary tap holds are distinct from permanent bans",()=>{
 assert.equal(fairplayPresentation({status:"warning"}).status,"warning");
 assert.match(fairplayPresentation({status:"restricted"}).detail,/limited time/);
 assert.equal(accountStandingPresentation({status:"BANNED"}).tone,"danger");
});
test("unknown data never appears as a verified clear result",()=>{
 assert.equal(fairplayPresentation(undefined).status,"unavailable");
 assert.equal(fairplayPresentation({status:"abc"}).status,"unavailable");
 assert.equal(gameplayPresentation({status:"VERIFIED"}).title,"Not confirmed");
});
test("website origin and Android attestation are explicitly distinct",()=>{
 assert.match(androidConnectionPresentation({webOnly:true}).detail,/not Android device attestation/);
 assert.equal(androidConnectionPresentation({linkedFromPlay:true}).title,"Android-linked");
 assert.equal(gameplayPresentation({status:"BANNED",gameplayWritable:true}).tone,"danger");
});
