import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 normalizeSystemNotifications,mergeSystemNotifications,
 isSystemNotificationId,systemNotificationUuid,systemNotificationMarkAction
} from '../src/native/src/state/systemNotifications.js';
import {readNotificationUiState,saveNotificationUiAction,applyNotificationUiState} from '../src/native/src/state/notificationUiState.js';

const accountId='11111111-1111-4111-8111-111111111111';
const giftId='aaaa1111-2222-4333-8444-555555555555';
const gift={
 id:giftId,kind:'developer',title:'A puppy has joined your collection 🐾',
 body:'v2_rory was granted to your Pup Account by Puppy Clicker staff.',
 createdAt:'2026-11-02T20:14:06.093Z',read:false
};
const local={
 id:'daily:20760',category:'reward',title:'Daily reminder',
 body:'Collect daily reward',createdAt:1790000000000,read:false,action:'daily'
};
const baseGame=()=>({notificationInbox:[{...local}],notificationSeenIds:[]});
const storage=()=>{
 const values=new Map();
 return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
};

test('admin-gift notification becomes an unread Pup item with stable server ID',()=>{
 const rows=normalizeSystemNotifications([gift,gift]);
 assert.equal(rows.length,1);
 assert.deepEqual(rows.map(({id,category,read,action})=>({id,category,read,action})),[
  {id:'system:'+giftId,category:'pup',read:false,action:null}
 ]);
 assert.equal(rows[0].title,gift.title);
 assert.equal(rows[0].body,gift.body);
 assert.equal(rows[0].createdAt,Date.parse(gift.createdAt));
 assert.equal(isSystemNotificationId(rows[0].id),true);
 assert.equal(systemNotificationUuid(rows[0].id),giftId);
});

test('invalid or unexpected server IDs never enter the inbox',()=>{
 const invalid=[{...gift,id:'not-uuid'},{...gift,id:giftId,createdAt:'invalid'}];
 assert.deepEqual(normalizeSystemNotifications(invalid),[]);
 assert.equal(systemNotificationUuid(local.id),null);
});

test('merging server gifts with gameplay notifications remains idempotent after cloud refresh',()=>{
 const giftNotice=normalizeSystemNotifications([gift])[0];
 const once=mergeSystemNotifications(baseGame(),[giftNotice]);
 const again=mergeSystemNotifications(once,[giftNotice]);
 assert.equal(once.notificationInbox.filter(x=>x.id===giftNotice.id).length,1);
 assert.equal(again.notificationInbox.filter(x=>x.id===giftNotice.id).length,1);
 assert.ok(again.notificationInbox.some(x=>x.id===local.id));
 const dismissed=mergeSystemNotifications(again,[]);
 assert.equal(dismissed.notificationInbox.some(x=>x.id===giftNotice.id),false);
 assert.equal(dismissed.notificationInbox.some(x=>x.id===local.id),true);
});

test('mark-read and clear-read use server-confirmed actions, not arbitrary player IDs',()=>{
 assert.deepEqual(systemNotificationMarkAction({type:'openNotification',id:'system:'+giftId}),{
  action:'notifications-mark',mode:'read-one',id:giftId
 });
 assert.deepEqual(systemNotificationMarkAction({type:'markNotificationsRead'}),{
  action:'notifications-mark',mode:'read-all'
 });
 assert.deepEqual(systemNotificationMarkAction({type:'clearReadNotifications'}),{
  action:'notifications-mark',mode:'clear-read'
 });
 assert.equal(systemNotificationMarkAction({type:'openNotification',id:'not-a-server-notice'}),null);
});

test('read/cleared gift state survives cloud rehydrate while keeping unrelated reminders',()=>{
 const cache=storage(),remote=normalizeSystemNotifications([gift]);
 let game=mergeSystemNotifications(baseGame(),remote);
 assert.equal(saveNotificationUiAction(accountId,{type:'openNotification',id:'system:'+giftId},game.notificationInbox,cache),true);
 game=applyNotificationUiState(mergeSystemNotifications(baseGame(),remote),readNotificationUiState(accountId,cache));
 assert.equal(game.notificationInbox.find(x=>x.id==='system:'+giftId).read,true);
 assert.equal(saveNotificationUiAction(accountId,{type:'clearReadNotifications'},game.notificationInbox,cache),true);
 game=applyNotificationUiState(mergeSystemNotifications(baseGame(),remote),readNotificationUiState(accountId,cache));
 assert.equal(game.notificationInbox.some(x=>x.id==='system:'+giftId),false);
 assert.equal(game.notificationInbox.length,1);
});

test('website surfaces server notifications in the bell and keeps actions synced',()=>{
 const hook=readFileSync(new URL('../src/native/src/state/useGame.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/native/App.jsx',import.meta.url),'utf8');
 assert.match(hook,/action:'notifications-read'/);
 assert.match(hook,/systemNotificationMarkAction\(action\)/);
 assert.match(hook,/notificationQueue\.current=notificationQueue\.current/);
 assert.match(hook,/setInterval\(sync,12000\)/);
 assert.match(app,/const inboxGame=\{\.\.\.saved,notificationInbox\}/);
 assert.match(app,/game:inboxGame/);
 assert.match(app,/<NotificationInbox visible=\{inboxOpen\} g=\{inboxGame\}/);
 const server=readFileSync(new URL('../supabase/functions/pup-web-auth/index.ts',import.meta.url),'utf8');
 assert.match(server,/body\.action==="notifications-read"/);
 assert.match(server,/\.eq\("player_uuid",account\.player_uuid\)/);
});
