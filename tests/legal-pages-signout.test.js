import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("website sign-out buttons show the same confirmation dialog",()=>{
 const dialog=read("src/ConfirmSignOut.jsx");
 assert.match(dialog,/Sign out of Puppy Clicker\?/);
 assert.match(dialog,/Stay signed in/);
 assert.match(dialog,/Yes, sign out/);
 assert.match(dialog,/onCancel=\{/);
 for(const path of [
  "src/SiteAccountMenu.jsx",
  "src/App.jsx",
  "src/native/web/WebSettings.jsx",
  "src/PupAccountBanned.jsx"
 ]){
  const source=read(path);
  assert.match(source,/import ConfirmSignOut from/);
  assert.match(source,/<ConfirmSignOut open=\{confirmSignOut\}/);
 }
});
test("legal policies are bundled into styled website pages, not fetched as Markdown URLs",()=>{
 const reader=read("src/LegalReader.jsx");
 assert.match(reader,/privacy-policy\.md\?raw/);
 assert.match(reader,/terms-of-use\.md\?raw/);
 assert.doesNotMatch(reader,/fetch\(doc\.path/);
 for(const document of ["privacy-policy.md","terms-of-use.md"]){
  assert.equal(existsSync(new URL("../public/assets/legal/"+document,import.meta.url)),false);
  assert.ok(read("src/legal/"+document).length>100);
 }
 const config=JSON.parse(read("vercel.json"));
 for(const [source,destination] of [
  ["/assets/legal/privacy-policy.md","/legal/privacy"],
  ["/assets/legal/terms-of-use.md","/legal/terms"]
 ]){
  assert.ok(config.redirects.some(route=>route.source===source&&route.destination===destination&&route.permanent===true));
 }
 for(const path of ["src/WebRegister.jsx","src/DiscordSignupForm.jsx","src/native/web/WebSettings.jsx"]){
  const source=read(path);
  assert.match(source,/\/legal\/privacy/);
  assert.match(source,/\/legal\/terms/);
 }
});
