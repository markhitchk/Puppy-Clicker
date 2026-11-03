import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyNotificationUiState,readNotificationUiState,saveNotificationUiAction} from '../src/native/src/state/notificationUiState.js';
import {checkInbox,visibleInboxItems,DEVELOPER_SUPPORT_MESSAGE} from '../src/native/src/engine/inbox.js';

const accountA='11111111-1111-4111-8111-111111111111';
const accountB='22222222-2222-4222-8222-222222222222';
function storage(){
 const map=new Map();
 return {
  getItem(k){return map.get(k)||null;},
  setItem(k,v){map.set(k,v);}
 };
}
const notices=[
 {id:'daily:20760',title:'Daily',body:'Ready',createdAt:1790000000000,category:'reward',read:false,action:'daily'},
 {id:'afk:1790000000000:1790000000001',title:'AFK Treats',body:'Claim Treats',createdAt:1790000000001,category:'pup',read:false,action:'afkClaim'},
 {id:'test:1790000000002',title:'Test',body:'Test',createdAt:1790000000002,category:'system',read:false,action:null}
];
const snapshot=()=>({notificationInbox:structuredClone(notices),notificationSeenIds:[],
 dailyRewardNotifications:false,gameEventNotifications:false,
 lastDailyClaimDay:null,parkActive:false,parkReadyAtMs:0});

test('marking notifications read survives a new authoritative cloud snapshot',()=>{
 const cache=storage();
 assert.equal(saveNotificationUiAction(accountA,{type:'markNotificationsRead'},notices,cache),true);
 const refreshed=applyNotificationUiState(snapshot(),readNotificationUiState(accountA,cache));
 assert.equal(refreshed.notificationInbox.length,3);
 assert.ok(refreshed.notificationInbox.every(n=>n.read));
});

test('clear read after rapid mark-all persists deletions even before React re-renders',()=>{
 const cache=storage();
 saveNotificationUiAction(accountA,{type:'markNotificationsRead'},notices,cache);
 // Simulates the user pressing Clear Read in the same React render frame.
 saveNotificationUiAction(accountA,{type:'clearReadNotifications'},notices,cache);
 const refreshed=applyNotificationUiState(snapshot(),readNotificationUiState(accountA,cache));
 assert.deepEqual(refreshed.notificationInbox.map(n=>n.id),[notices[1].id]);
 assert.equal(refreshed.notificationInbox[0].read,true);
 assert.ok(refreshed.notificationSeenIds.includes(notices[0].id));
 assert.ok(refreshed.notificationSeenIds.includes(notices[2].id));
});

test('cleared reminders do not regenerate at next check or refresh',()=>{
 const cache=storage();
 const readNotices=[{...notices[0],read:true}];
 saveNotificationUiAction(accountA,{type:'clearReadNotifications'},readNotices,cache);
 const game=applyNotificationUiState({...snapshot(),notificationInbox:readNotices},
  readNotificationUiState(accountA,cache));
 game.dailyRewardNotifications=true;
 checkInbox(game,Date.now());
 assert.ok(!game.notificationInbox.some(n=>n.id===notices[0].id));
});

test('hidden notifications do not leak across Pup Account identities',()=>{
 const cache=storage();
 saveNotificationUiAction(accountA,{type:'clearReadNotifications'},[{...notices[0],read:true}],cache);
 assert.equal(applyNotificationUiState(snapshot(),readNotificationUiState(accountB,cache)).notificationInbox.length,3);
});

test('opened notice read status remains stored and claimable AFK rewards stay visible',()=>{
 const cache=storage();
 saveNotificationUiAction(accountA,{type:'openNotification',id:notices[0].id},notices,cache);
 saveNotificationUiAction(accountA,{type:'clearReadNotifications'},notices,cache);
 const refreshed=applyNotificationUiState(snapshot(),readNotificationUiState(accountA,cache));
 assert.ok(!refreshed.notificationInbox.some(n=>n.id===notices[0].id));
 assert.ok(refreshed.notificationInbox.some(n=>n.action==='afkClaim'));
});

test('permanent developer support message stays pinned outside removable inbox data',()=>{
 const cache=storage();
 saveNotificationUiAction(accountA,{type:'markNotificationsRead'},notices,cache);
 saveNotificationUiAction(accountA,{type:'clearReadNotifications'},notices,cache);
 const shown=visibleInboxItems(applyNotificationUiState(snapshot(),readNotificationUiState(accountA,cache)).notificationInbox,'all');
 assert.equal(shown[0].id,DEVELOPER_SUPPORT_MESSAGE.id);
 assert.equal(shown[0].pinned,true);
});

test('the website toolbar renders Puppy Clicker logo rather than the Game controls label',()=>{
 const app=readFileSync(new URL('../src/native/App.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(app,/>Game controls<\/Txt>/);
 assert.match(app,/accessibilityLabel="Puppy Clicker" style=\{\{width:42,height:42\}\}/);
});
