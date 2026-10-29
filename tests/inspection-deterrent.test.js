import test from 'node:test';
import assert from 'node:assert/strict';
import {installInspectionDeterrent} from '../src/inspectionDeterrent.js';
const fixture=()=>{
 const listeners=new Map();
 const target={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
 const cleanup=installInspectionDeterrent(target);
 const blocked=(type,event={})=>{let prevented=false;listeners.get(type)?.({...event,preventDefault:()=>{prevented=true}});return prevented};
 return {listeners,cleanup,blocked};
};
test('inspection shortcuts and the context menu are deterred site-wide',()=>{
 const {blocked}=fixture();
 assert.equal(blocked('contextmenu'),true);
 for(const event of [{key:'F12'},{key:'I',ctrlKey:true,shiftKey:true},{key:'j',ctrlKey:true,shiftKey:true},{key:'C',ctrlKey:true,shiftKey:true},{key:'i',metaKey:true,altKey:true},{key:'u',ctrlKey:true},{key:'u',metaKey:true,altKey:true}])assert.equal(blocked('keydown',event),true);
});
test('ordinary typing, clipboard shortcuts, selection and browser shortcuts remain available',()=>{
 const {blocked}=fixture();
 for(const event of [{key:'i'},{key:'u'},{key:'c',ctrlKey:true},{key:'v',metaKey:true},{key:'a',ctrlKey:true},{key:'r',ctrlKey:true},{key:'Tab'}])assert.equal(blocked('keydown',event),false);
});
test('cleanup removes the handlers for React Strict Mode re-entry',()=>{
 const {listeners,cleanup}=fixture();cleanup();assert.equal(listeners.size,0);
});
