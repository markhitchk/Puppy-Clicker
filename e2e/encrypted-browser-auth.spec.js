import {test,expect} from "@playwright/test";

test("browser persists encrypted Supabase-style tokens across reloads without plaintext localStorage",async({page})=>{
 await page.goto("/");
 const first=await page.evaluate(async()=>{
  const {createEncryptedAuthStorage,AUTH_STORAGE_PREFIX}=await import("/src/authStorage.js");
  const vault=createEncryptedAuthStorage();
  const name="puppy-secure-test-auth-token";
  const secret='{"access_token":"VERY_PRIVATE_ACCESS","refresh_token":"VERY_PRIVATE_REFRESH"}';
  localStorage.removeItem(name);
  await vault.setItem(name,secret);
  const onDisk=localStorage.getItem(name);
  return {onDisk,secret,prefix:AUTH_STORAGE_PREFIX,read:await vault.getItem(name)};
 });
 expect(first.onDisk.startsWith(first.prefix)).toBe(true);
 expect(first.onDisk).not.toContain("VERY_PRIVATE_ACCESS");
 expect(first.onDisk).not.toContain("VERY_PRIVATE_REFRESH");
 expect(first.read).toBe(first.secret);
 await page.reload();
 const second=await page.evaluate(async()=>{
  const {createEncryptedAuthStorage}=await import("/src/authStorage.js");
  const vault=createEncryptedAuthStorage();
  const text=await vault.getItem("puppy-secure-test-auth-token");
  await vault.removeItem("puppy-secure-test-auth-token");
  return {text,cleared:localStorage.getItem("puppy-secure-test-auth-token")};
 });
 expect(second.text).toBe(first.secret);
 expect(second.cleared).toBeNull();
});

test("browser upgrades plaintext auth storage to encrypted storage without losing the session",async({page})=>{
 await page.goto("/");
 const result=await page.evaluate(async()=>{
  const key="puppy-secure-test-legacy";
  const old='{"access_token":"OLD_SESSION","refresh_token":"OLD_REFRESH"}';
  localStorage.setItem(key,old);
  const {createEncryptedAuthStorage,AUTH_STORAGE_PREFIX}=await import("/src/authStorage.js");
  const vault=createEncryptedAuthStorage();
  const recovered=await vault.getItem(key);
  const stored=localStorage.getItem(key);
  await vault.removeItem(key);
  return {recovered,old,encrypted:stored.startsWith(AUTH_STORAGE_PREFIX),leaked:stored.includes("OLD_SESSION")};
 });
 expect(result.recovered).toBe(result.old);
 expect(result.encrypted).toBe(true);
 expect(result.leaked).toBe(false);
});
