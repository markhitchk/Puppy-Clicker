import test from 'node:test';
import assert from 'node:assert/strict';
import {PUPPY_SCHEMA_LAYOUT_VERSION,PUPPY_SCHEMA_TABLES,puppyReadFrom,puppyTableLocation} from '../src/dbSchemaLayout.js';

test('all Puppy Clicker public tables have unique grouped read-only destinations', () => {
 assert.equal(PUPPY_SCHEMA_LAYOUT_VERSION,2);
 assert.equal(Object.keys(PUPPY_SCHEMA_TABLES).length,36);
 const names=Object.values(PUPPY_SCHEMA_TABLES).map(v=>v.schema+'.'+v.view);
 assert.equal(new Set(names).size,names.length);
 assert.deepEqual(puppyTableLocation('pup_accounts'),{schema:'puppy_accounts',view:'accounts'});
 assert.deepEqual(puppyTableLocation('pupeye_players'),{schema:'puppy_pupeye',view:'installation_players'});
 assert.deepEqual(puppyTableLocation('pup_web_ip_bans'),{schema:'puppy_pupeye',view:'web_ip_bans'});
 assert.equal(puppyTableLocation('arc_ranked_players'),null);
});

test('legacy routing remains default; grouped routing is explicit and read-only', () => {
 const calls=[];
 const client={
   from(t){calls.push(['public',t]);return 'legacy';},
   schema(s){return {from(t){calls.push([s,t]);return 'grouped';}};}
 };
 assert.equal(puppyReadFrom(client,'pup_accounts'),'legacy');
 assert.equal(puppyReadFrom(client,'pup_accounts',{useGrouped:true}),'grouped');
 assert.equal(puppyReadFrom(client,'arc_ranked_players',{useGrouped:true}),'legacy');
 assert.deepEqual(calls,[['public','pup_accounts'],['puppy_accounts','accounts'],['public','arc_ranked_players']]);
});
