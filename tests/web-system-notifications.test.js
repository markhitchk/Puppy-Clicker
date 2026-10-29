import test from "node:test";
import assert from "node:assert/strict";
import {mapSystemNotifications,combineNotificationInbox} from "../src/native/web/systemNotificationInbox.js";
const notice={id:"7a46c35b-2c79-4956-a7c1-e81adf1119b7",kind:"developer",
 title:"A puppy has joined your collection 🐾",
 body:"v2_rory was granted by staff.",createdAt:"2026-10-29T19:32:48.068Z",read:false};
test("staff puppy gifts appear as unread System notifications",()=>{
 const rows=mapSystemNotifications([notice,notice]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].category,"system");
 assert.equal(rows[0].read,false);
 assert.equal(rows[0].createdAt,Date.parse(notice.createdAt));
 assert.equal(rows[0].id,"staff:"+notice.id);
});
test("only current authenticated account notifications are merged",()=>{
 const rows=mapSystemNotifications([notice]);
 const game={notificationInbox:[{id:"test:1",category:"system"}],treats:88};
 assert.deepEqual(combineNotificationInbox(game,{accountId:"A",rows},"B").notificationInbox,game.notificationInbox);
 const merged=combineNotificationInbox(game,{accountId:"A",rows},"A");
 assert.deepEqual(merged.notificationInbox.map(n=>n.id),["staff:"+notice.id,"test:1"]);
 assert.equal(merged.treats,88);
 assert.equal(game.notificationInbox.length,1);
});
test("invalid notices cannot inject actions or duplicate IDs",()=>{
 assert.deepEqual(mapSystemNotifications([{}, {...notice,id:"not-a-uuid"}, {...notice,createdAt:"bad"}]),[]);
 assert.equal(mapSystemNotifications([{...notice,action:"afkClaim"}])[0].action,null);
});
