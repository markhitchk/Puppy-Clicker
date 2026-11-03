import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestUsername,suggestPuppyName,suggestDisplayName,generateStrongPassword} from '../src/nameSuggestions.js';

const random=()=>{
 let n=13;
 return {getRandomValues(array){array[0]=(n*1664525+1013904223)>>>0;n=array[0];return array;}};
};
test('random Pup usernames meet server policy, avoid unchanged values and never contain spaces',()=>{
 const rng=random();
 for(let i=0;i<200;i++){
  const name=suggestUsername('',rng);
  assert.match(name,/^[A-Za-z0-9_-]{3,20}$/);
  const next=suggestUsername(name,rng);
  assert.notEqual(next.toLowerCase(),name.toLowerCase());
 }
});
test('random puppy nicknames and display names respect existing save constraints',()=>{
 const rng=random();
 for(let i=0;i<200;i++){
  const pup=suggestPuppyName('',rng),next=suggestPuppyName(pup,rng);
  assert.ok(pup.length>=1&&pup.length<=18);
  assert.notEqual(pup.toLowerCase(),next.toLowerCase());
  assert.match(pup,/^[A-Za-z ]+$/);
  const display=suggestDisplayName('',rng);
  assert.ok(display.length>=2&&display.length<=24);
  assert.match(display,/^[A-Za-z ]+$/);
 }
});
test('generated password always satisfies server validation, uses crypto and includes each category',()=>{
 const rng=random();
 for(let i=0;i<100;i++){
  const pwd=generateStrongPassword(rng);
  assert.equal(pwd.length,24);
  assert.match(pwd,/[A-Z]/);assert.match(pwd,/[a-z]/);
  assert.match(pwd,/[0-9]/);assert.match(pwd,/[!@#$%*_?\-]/);
 }
});
test('password generation never silently falls back to Math.random',()=>{
 assert.throws(()=>generateStrongPassword({}),/SECURE_RANDOM_UNAVAILABLE/);
 assert.throws(()=>suggestUsername('',{}),/SECURE_RANDOM_UNAVAILABLE/);
});
test('signup and sign-in expose password manager autocomplete and correct native form values',()=>{
 const register=readFileSync(new URL('../src/WebRegister.jsx',import.meta.url),'utf8');
 const login=readFileSync(new URL('../src/native/web/AccountGate.jsx',import.meta.url),'utf8');
 const profile=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(register,/name="new-password" autoComplete="new-password"/);
 assert.match(register,/name="confirm-password" autoComplete="new-password"/);
 assert.match(register,/new FormData\(event\.currentTarget\)/);
 assert.match(register,/Generate username/);
 assert.match(register,/Generate strong password/);
 assert.match(login,/name="username" autoComplete="username"/);
 assert.match(login,/name="password" autoComplete="current-password"/);
 assert.match(login,/loginPup\(new FormData\(event\.currentTarget\)\)/);
 assert.match(profile,/name="new-password"/);
 assert.match(profile,/name="confirm-password"/);
 assert.match(profile,/Generate username/);
 assert.match(profile,/Generate strong password/);
});
test('all user-facing puppy-name editors provide a random name control',()=>{
 const a=readFileSync(new URL('../src/native/web/WebsiteDesign.jsx',import.meta.url),'utf8');
 const b=readFileSync(new URL('../src/native/src/components/PuppyDetailsDialog.jsx',import.meta.url),'utf8');
 const c=readFileSync(new URL('../src/native/App.jsx',import.meta.url),'utf8');
 for(const content of [a,b,c])assert.match(content,/Generate puppy name/);
});
