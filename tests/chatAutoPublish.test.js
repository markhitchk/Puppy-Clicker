import test from "node:test";
import assert from "node:assert/strict";
import {screenPupEyeChat,SCREENING_VERSION} from "../api/_lib/chatScreening.js";
test("PupEye v2 automatically permits ordinary unflagged English and Spanish chat",()=>{
 assert.equal(SCREENING_VERSION,2);
 for(const body of ["Hello everybody!","Hola, ¿cómo están?","Nice puppy 🐶"]){
  const result=screenPupEyeChat(body);
  assert.equal(result.state,"published",body);
  assert.equal(result.automaticPublication,true,body);
  assert.deepEqual(result.screeningCodes,[],body);
 }
});
test("PupEye never auto-publishes flagged harassment, threats, sexual content or contact details",()=>{
 for(const body of ["You are an idiot","you should die","send me pics","https://example.com","My email is test@example.com","Phone 123-456-7890","Look on instagram","Find @someone","f.u.c.k"]){
  const result=screenPupEyeChat(body);
  assert.equal(result.state,"pending",body);
  assert.equal(result.automaticPublication,false,body);
  assert.ok(result.screeningCodes.length,body);
 }
});
test("PupEye rejects invalid text before database submission",()=>{
 for(const bad of ["","   ","A".repeat(301),"Hello\u0000"])assert.throws(()=>screenPupEyeChat(bad));
});
