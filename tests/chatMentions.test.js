import test from "node:test";
import assert from "node:assert/strict";
import {extractChatMentions,activeMentionQuery,splitChatText} from "../src/chatMentions.js";
import {screenPupEyeChat} from "../api/_lib/chatScreening.js";
test("mention suggestions only open for valid @username input",()=>{
 assert.equal(activeMentionQuery("Hi @dar"),"dar");
 assert.equal(activeMentionQuery("@max_puppy4"),"max_puppy4");
 assert.equal(activeMentionQuery("my email is hello@example.com"),null);
 assert.equal(activeMentionQuery("plain text"),null);
});
test("mention scanner ignores email addresses and limits unique mentions",()=>{
 assert.deepEqual(extractChatMentions("Hey @Buddy, @max_puppy4 and @buddy"),["buddy","max_puppy4"]);
 assert.deepEqual(extractChatMentions("contact me@domain.com"),[]);
 assert.equal(extractChatMentions("Hi @billy").length,1);
});
test("approved server-member mentions can publish, unknown handles remain held",()=>{
 const approved=screenPupEyeChat("Hello @buddy!",{allowedMentions:["buddy"]});
 assert.equal(approved.automaticPublication,true);
 assert.deepEqual(approved.screeningCodes,[]);
 assert.equal(screenPupEyeChat("Hello @stranger").automaticPublication,false);
 assert.equal(screenPupEyeChat("Message me at user@example.com",{allowedMentions:["example"]}).automaticPublication,false);
 assert.equal(screenPupEyeChat("Find me on discord @buddy",{allowedMentions:["buddy"]}).automaticPublication,false);
});
test("mention presentation identifies mention tokens without HTML injection",()=>{
 const parts=splitChatText("Hi @buddy <script>!");
 assert.deepEqual(parts.map(p=>p.type),["text","mention","text"]);
 assert.equal(parts[1].username,"buddy");
 assert.equal(parts[2].value," <script>!");
});
