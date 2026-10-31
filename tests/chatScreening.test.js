import test from "node:test";
import assert from "node:assert/strict";
import {screenPupEyeChat} from "../api/_lib/chatScreening.js";
test("safe chat publishes without waiting for staff",()=>{
 const r=screenPupEyeChat("Hello, I like puppies!");
 assert.equal(r.state,"published");assert.equal(r.automaticPublication,true);
 assert.deepEqual(r.screeningCodes,[]);
});
test("English, Spanish and mixed content are all screened",()=>{
 assert.ok(screenPupEyeChat("That is mierda").screeningCodes.includes("PROFANITY"));
 assert.ok(screenPupEyeChat("please send pics y no digas a tus padres").screeningCodes.includes("SOLICITATION"));
 assert.ok(screenPupEyeChat("See https://example.com").screeningCodes.includes("CONTACT"));
 assert.ok(screenPupEyeChat("you should die").screeningCodes.includes("THREAT"));
});
test("innocent substrings are not flagged by word boundaries",()=>{
 assert.ok(!screenPupEyeChat("Assistant puppy").screeningCodes.includes("PROFANITY"));
});
test("messages are length and control-character bounded",()=>{
 assert.throws(()=>screenPupEyeChat(""),/CHAT_EMPTY_MESSAGE/);
 assert.throws(()=>screenPupEyeChat("a".repeat(301)),/CHAT_MESSAGE_TOO_LONG/);
 assert.throws(()=>screenPupEyeChat("Hi\u0000"),/CHAT_INVALID_CHARACTERS/);
});
