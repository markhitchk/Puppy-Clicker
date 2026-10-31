export const PRIVACY_RIGHTS=Object.freeze(['access','export','rectify','restrict','object','erase']);
const STATES=new Set(['received','identity_review','awaiting_review','in_progress','ready','completed','denied','cancelled','failed']);
export function normalizePrivacyRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['type','note'].includes(k))||!PRIVACY_RIGHTS.includes(input.type))throw Error('PRIVACY_INVALID_REQUEST');
 const note=input.note==null?'':input.note;
 if(typeof note!=='string'||note.length>500)throw Error('PRIVACY_INVALID_REQUEST');
 return {type:input.type,note:note.trim()};
}
export function publicRequestRows(rows){
 return (rows||[]).map(row=>({requestId:row.id,type:PRIVACY_RIGHTS.includes(row.type)?row.type:'access',
 state:STATES.has(row.state)?row.state:'received',submittedAt:row.submitted_at,deadlineAt:row.deadline_at,updatedAt:row.updated_at??null}));
}
export function privacyRequestsAllowed(count){return Number.isInteger(count)&&count>=0&&count<5;}
