// Copy the exact official PupEye logo into public assets before the web build.
// Source: https://github.com/markhitchk/pup-clinker/blob/main/assets/logos/PupEye.png
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const SOURCE="https://raw.githubusercontent.com/markhitchk/pup-clinker/main/assets/logos/PupEye.png";
const OUTPUT_DIR=fileURLToPath(new URL("../public/assets/logos/",import.meta.url));
const OUTPUT_FILE=join(OUTPUT_DIR,"PupEye.png");
const SIG=Buffer.from([137,80,78,71,13,10,26,10]);

function validPng(bytes){
 if(!bytes||bytes.length<33||bytes.length>8_000_000)return false;
 if(!bytes.subarray(0,8).equals(SIG)||bytes.toString("ascii",12,16)!=="IHDR")return false;
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 return width>0&&width<=4096&&height>0&&height<=4096;
}

async function syncPupEyeLogo(){
 await mkdir(OUTPUT_DIR,{recursive:true});
 try{
  if(validPng(await readFile(OUTPUT_FILE))){
   console.log("PupEye logo: verified local official PNG.");
   return;
  }
 }catch{/* Download when the output is absent. */}
 const response=await fetch(SOURCE,{signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error("PupEye logo sync failed: HTTP "+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(!validPng(bytes))throw new Error("PupEye logo sync failed: invalid PNG");
 await writeFile(OUTPUT_FILE,bytes);
 console.log("PupEye logo: synced official PNG from pup-clinker.");
}

await syncPupEyeLogo();
