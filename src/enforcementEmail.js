const SITE='https://puppy-clicker.vercel.app';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel=value=>{
 if(!value)return 'Until lifted by staff';
 const d=new Date(value);
 return Number.isFinite(d.getTime())?d.toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC'):'Not available';
};
export function noticeFromHistory(ban,users,now=Date.now()){
 if(ban.status!=='active'||ban.revoked_at||(ban.expires_at&&!(Date.parse(ban.expires_at)>now)))return null;
 if(!['WEB_ADMIN','WEB_ADMIN_SUSPENSION'].includes(ban.reason_code))return null;
 const ids=[...new Set((ban.targets||[]).map(t=>t.playerId).filter(Boolean))];
 if(ids.length!==1)return null;
 const u=users.find(u=>u.id===ids[0]);
 if(!u)return null;
 return {type:ban.reason_code==='WEB_ADMIN_SUSPENSION'?'suspension':'ban',banId:ban.id,
  displayName:u.displayName||u.username,username:u.username,accountId:u.friendCode||u.playerId,
  contactEmail:u.contactEmail||null,reason:ban.public_reason,expiresAt:ban.expires_at};
}
export function buildEnforcementEmail(notice){
 const suspension=notice.type==='suspension',status=suspension?'Suspended':'Banned';
 const subject='Puppy Clicker | Pup Account '+(suspension?'Suspension':'Ban')+' Notice';
 const name=notice.displayName||notice.username||'Player';
 const rows=[['Display name',name],['Username','@'+String(notice.username||'').replace(/^@/, '')],
  ['Pup Account ID',notice.accountId||'Not available'],['Recorded reason',notice.reason||'Not provided'],
  ['Restriction ends',dateLabel(notice.expiresAt)]];
 const intro='Your Puppy Clicker account has been '+status.toLowerCase()+'.';
 const review='If you would like your account restored, you may reply to request a review. Reinstatement is not guaranteed.';
 const deletion='If you would like your account deleted, you may reply to request deletion. Account ownership may need to be verified.';
 const optional='You are not required to respond. Silence is not consent to delete your account.';
 const text=['Hello '+name+',',intro,'Account status: '+status,...rows.map(([k,v])=>k+': '+v),
  review,deletion,optional,"Puppy Clicker Administration | Harley's Studios",SITE].join('\n\n');
 const image=(file,alt,width)=>'<img src="'+SITE+'/assets/logos/'+file+'" alt="'+escapeHtml(alt)+'" width="'+width+'" style="display:block;width:'+width+'px;height:auto;max-width:100%;border:0;margin:0 auto">';
 const rowHtml=rows.map(([k,v])=>'<tr><td style="padding:10px 0;border-bottom:1px solid #315466;color:#b5d0df;font-size:13px">'+escapeHtml(k)+'<br><strong style="color:#effbff;font-size:15px;overflow-wrap:anywhere">'+escapeHtml(v)+'</strong></td></tr>').join('');
 const card=(title,body)=>'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:10px;background:#152f3e;border:1px solid #315466;border-radius:12px"><tr><td style="padding:15px"><strong style="color:#00e5ff">'+escapeHtml(title)+'</strong><p style="margin:8px 0 0;line-height:1.6;color:#effbff">'+escapeHtml(body)+'</p></td></tr></table>';
 const footer=[['harleys_studios.png',"Harley's Studios"],['puppy_clicker.png','Puppy Clicker'],['PupEye.png','PupEye']].map(([f,n])=>'<td width="33%" align="center" valign="top">'+image(f,n,36)+'<p style="font-size:11px;color:#b5d0df">'+escapeHtml(n)+'</p></td>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+subject+'</title></head><body style="margin:0;background:#0b1a24;color:#effbff;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0b1a24"><tr><td align="center" style="padding:20px 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#102735;border:1px solid #315466;border-radius:18px"><tr><td align="center" style="padding:24px;border-top:4px solid #00e5ff;border-bottom:1px solid #315466">'+image('puppy_clicker.png','Puppy Clicker',84)+'<h2 style="margin:10px 0;color:#effbff">Puppy Clicker</h2><p style="color:#00e5ff;font-size:12px">PUP ACCOUNT · ADMINISTRATION</p></td></tr><tr><td style="padding:20px;font-size:15px;line-height:1.5;color:#effbff"><h1 style="font-size:26px;margin:0 0 15px;color:#effbff">Account '+status.toLowerCase()+'</h1><p>Hello '+escapeHtml(name)+',</p><p>'+intro+'</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#152f3e;border:1px solid #315466;border-radius:14px"><tr><td style="padding:16px"><strong style="color:#00e5ff;font-size:12px">PUP ACCOUNT DETAILS</strong><p style="padding:10px;border-radius:8px;background:'+(suspension?'#40351d;color:#ffd166':'#482630;color:#ffd1d6')+';font-weight:bold">'+status.toUpperCase()+'</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">'+rowHtml+'</table></td></tr></table><h2 style="font-size:19px;color:#effbff">Account options</h2>'+card('Request account review',review)+card('Request account deletion',deletion)+'<p style="color:#b5d0df;font-size:13px">'+optional+'</p><p>Regards,<br><strong>Puppy Clicker Administration</strong><br>Harley&#39;s Studios</p><a href="'+SITE+'" style="display:inline-block;background:#00e5ff;color:#07141b;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Visit Puppy Clicker</a></td></tr><tr><td align="center" style="background:#0a0c12;padding:20px 10px;border-top:1px solid #315466"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>'+footer+'</tr></table><p style="color:#b5d0df;font-size:11px">© '+new Date().getUTCFullYear()+' Harley&#39;s Studios. All rights reserved.</p></td></tr></table></td></tr></table></body></html>';
 return {subject,text,html};
}
