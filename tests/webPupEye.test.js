import test from 'node:test';
import assert from 'node:assert/strict';
import {checkWebPupEye,WebPupEyeError} from '../api/_lib/webPupEye.js';

const ACCOUNT='ce0824b0-e6e3-4d9e-8c6d-d1349b80a9c2';
function fakeDb({banned=false,gate=true,dbError=false}={}){
 const calls=[];
 const db={
  from(table){calls.push(['table',table]);return {
   select(){return this;},eq(){return this;},is(){return this;},or(){return this;},
   async limit(){return {data:banned?[{id:'ban',expires_at:null}]:[],error:dbError?{message:'unavailable'}:null};}
  };},
  async rpc(name,args){calls.push(['rpc',name,args]);return {data:gate,error:dbError?{message:'unavailable'}:null};}
 };
 return {db,calls};
}
test('verified actor is permitted through atomic server-side rate gate',async()=>{
 const {db,calls}=fakeDb();
 assert.equal(await checkWebPupEye(db,ACCOUNT,'gameplay',{}, {vercel:false}),true);
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0],['rpc','pupeye_web_gate',{p_account_uuid:ACCOUNT,p_action:'gameplay'}]);
});
test('server-observed IP ban blocks before any other write',async()=>{
 const {db,calls}=fakeDb({banned:true});
 await assert.rejects(checkWebPupEye(db,ACCOUNT,'gift',{'x-vercel-forwarded-for':'8.8.8.8'},{vercel:true}),
  e=>e instanceof WebPupEyeError&&e.status===403&&e.code==='PUPEYE_WEB_IP_BANNED');
 assert.equal(calls.some(c=>c[0]==='rpc'),false);
});
test('client supplied IP is ignored without trusted proxy',async()=>{
 const {db,calls}=fakeDb({banned:true});
 assert.equal(await checkWebPupEye(db,ACCOUNT,'gift',{'x-forwarded-for':'8.8.8.8'}, {vercel:false}),true);
 assert.equal(calls.some(c=>c[0]==='table'),false);
});
test('rate-limit and enforcement errors fail closed',async()=>{
 await assert.rejects(checkWebPupEye(fakeDb({gate:false}).db,ACCOUNT,'gameplay',{},{}),
  e=>e.code==='PUPEYE_WEB_RATE_LIMIT'&&e.status===429);
 await assert.rejects(checkWebPupEye(fakeDb({dbError:true}).db,ACCOUNT,'gameplay',{},{}),
  e=>e.code==='PUPEYE_WEB_ENFORCEMENT_UNAVAILABLE'&&e.status===503);
});
