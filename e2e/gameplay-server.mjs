// Loaded only by the explicitly enabled Vite dev fixture, never a production route.
import {crossPlay} from '../supabase/functions/pup-web-auth/crossPlay.ts';
import {crossplayDb} from '../tests/helpers/crossplay-db.js';
const fixtureSecret='e2e-only-secret-no-production-authority-123456';
export function gameplayFixtureServer(){return {
 name:'isolated-gameplay-fixture',
 configureServer(server){
  const handle=async(req,res)=>{
   res.setHeader('Content-Type','application/json');
   try{
    let input='';for await(const chunk of req)input+=chunk;
    const {record,body}=JSON.parse(input);
    // This process has no production credentials and never makes database calls.
    globalThis.Deno={env:{get:()=>fixtureSecret}};
    const db=crossplayDb(record.saveData);
    // Preserve the fixture's browser-local revision across requests.
    const row=db.row();
    const admin={from(table){
     const query=db.admin.from(table);
     if(table==='pup_account_saves'){
      const original=query.maybeSingle;
      query.maybeSingle=async()=>{
       const result=await original();
       if(result.data)result.data.revision+=record.revision-1;
       return result;
      };
      const eq=query.eq;
      query.eq=(key,value)=>eq(key,key==='revision'?value-record.revision+1:value);
     }
     return query;
    }};
    const receipt=await crossPlay(admin,db.account,body);
    const next=db.row();next.revision=receipt.cloud.revision;
    res.end(JSON.stringify({receipt,record:{revision:next.revision,saveData:next.save_data,updatedAt:next.updated_at}}));
   }catch(error){res.statusCode=error.status||409;res.end(JSON.stringify({error:error.code||error.message}));}
  };
  server.middlewares.use('/__e2e/gameplay',handle);
  server.middlewares.use('/__e2e/snapshot',handle);
 }
}};
