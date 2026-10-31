export function validatePrivacyReview(requestType,previousState,nextState,comment){
 const reason=typeof comment==='string'?comment.trim():'';
 if(!['in_progress','awaiting_review','completed','denied'].includes(nextState)||reason.length<5||reason.length>500)throw Error('PRIVACY_REVIEW_INVALID');
 if(['completed','denied','cancelled'].includes(previousState))throw Error('PRIVACY_REQUEST_CLOSED');
 if(requestType==='erase'&&nextState==='completed')throw Error('PRIVACY_ERASURE_VERIFICATION_REQUIRED');
 return {state:nextState,reason};
}
