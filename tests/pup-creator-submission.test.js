import test from "node:test";
import assert from "node:assert/strict";
import {validateCreatorPackage} from "../api/_lib/creatorPackage.js";
const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAAAA";
const sample=()=>({format:"puppy-clicker.pup",version:2,generation:"v1",sourceTemplateId:"test_v1_crash_dummy",templateVersion:1,width:256,height:256,name:"Example",description:"Original art",layers:[{id:"one",name:"Paint",visible:true,opacity:1,artwork:png}],artwork:png});
test("rejects invalid generation, template and duplicate layers",()=>{for(const patch of [{generation:"bad"},{sourceTemplateId:"v2"},{width:1},{layers:[sample().layers[0],sample().layers[0]]}])assert.throws(()=>validateCreatorPackage({...sample(),...patch}));});
test("rejects remote or non-PNG assets and out of bounds opacity",()=>{for(const patch of [{artwork:"https://example.com/pup.png"},{artwork:"data:image/svg+xml;base64,AAAA"},{opacity:2}])assert.throws(()=>validateCreatorPackage({...sample(),layers:[{...sample().layers[0],...patch}]}));});
test("client supplied creator identity and unlock metadata are discarded",()=>{const out=validateCreatorPackage({...sample(),author:"owner",rarity:"legendary",published:true});assert.equal(out.author,undefined);assert.equal(out.rarity,undefined);assert.equal(out.published,undefined);assert.equal(out.name,"Example");});
