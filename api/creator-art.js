import {dbClient} from "./_lib/pupIdentity.js";
const idPattern=/^v[12]_creator_[a-f0-9]{24}$/;
export default async function handler(req,res){
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET"&&req.method!=="HEAD")return res.status(405).end();
 const id=req.query?.id;if(typeof id!=="string"||!idPattern.test(id))return res.status(404).end();
 try{
  const {data,error}=await dbClient().rpc("pup_creator_art",{p_id:id});
  if(error)return res.status(503).end();
  if(typeof data!=="string"||data.length>400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data))return res.status(404).end();
  const bytes=Buffer.from(data.slice(22),"base64");
  if(bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")return res.status(404).end();
  res.setHeader("Content-Type","image/png");res.setHeader("Cache-Control","public, max-age=300");res.setHeader("Content-Length",bytes.length);
  return req.method==="HEAD"?res.status(200).end():res.status(200).end(bytes);
 }catch{return res.status(503).end();}
}
