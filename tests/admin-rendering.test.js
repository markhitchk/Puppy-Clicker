import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false},logLevel:'silent'});
test.after(()=>server.close());
const {default:Activity}=await server.ssrLoadModule('/src/AdminActivity.jsx');
const {default:Dialog}=await server.ssrLoadModule('/src/AdminRestrictionDialog.jsx');
test('activity display renders friendly accounts, devices, and error explanations without JSON',()=>{
 const html=renderToStaticMarkup(React.createElement(Activity,{filter:'all',onFilter(){},activity:{
  sessions:[{id:'s',account_uuid:'a',accountName:'Test Pup',user_agent:'Windows NT 10.0 Chrome/156.0',path:'/play',last_seen_at:new Date().toISOString()}],
  events:[{id:1,event_code:'login_failed',outcome:'failure',source:'server',login_hint:'NewPup',error_code:'PUP_SIGNIN_INVALID',provider:'password',path:'/account'}],
  androidDevices:[{id:'d',device_model:'Samsung A17',accountName:'Test Pup',platform:'Android',active:true}]
 }}));
 assert.match(html,/Website connections/);assert.match(html,/Test Pup/);assert.match(html,/Windows computer/);
 assert.match(html,/Sign-in failed/);assert.match(html,/Username or password was not accepted/);
 assert.match(html,/Verified by account server/);assert.match(html,/Samsung A17/);assert.doesNotMatch(html,/<code>|\{&quot;/);
});
test('suspension dialog has duration controls and no permanent suspension option',()=>{
 const html=renderToStaticMarkup(React.createElement(Dialog,{user:{username:'TestPup'},type:'suspension',busy:false,onClose(){},onSubmit(){}}));
 assert.match(html,/<dialog/);assert.match(html,/Public reason/);assert.match(html,/24 hours/);
 assert.match(html,/Custom end time/);assert.match(html,/Confirm suspension/);assert.doesNotMatch(html,/value="permanent"/);
});
test('ban dialog explicitly allows a permanent ban',()=>{
 const html=renderToStaticMarkup(React.createElement(Dialog,{user:{username:'TestPup'},type:'ban',busy:false,onClose(){},onSubmit(){}}));
 assert.match(html,/value="permanent"/);assert.match(html,/Confirm ban/);
});
