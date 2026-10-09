import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBackup} from '../src/backup.js';
import {newActivity,DEFAULT_PROFILE} from '../src/core.js';
const backup=()=>({app:'ck-promptmaker',version:1,activities:[newActivity()],subjects:[],files:[],settings:[{...DEFAULT_PROFILE,id:'profile'}]});
test('valid and incomplete drafts can be backed up and restored',()=>{const d=backup();d.activities[0].groupSize='';assert.equal(validateBackup(d),d);});
test('backup rejects dangerous identifiers and unsupported file owners',()=>{const d=backup();d.activities[0].id='bad"><img>';assert.throws(()=>validateBackup(d));const other=backup();other.files=[{id:'file1',name:'x',mime:'text/plain',kind:'base',ownerType:'activity',ownerId:'missing',data:'data:text/plain;base64,QQ=='}];assert.throws(()=>validateBackup(other));});
test('backup rejects malformed profile and website data before replacement',()=>{const d=backup();d.settings[0].name={bad:true};assert.throws(()=>validateBackup(d));const e=backup();e.activities[0].website=null;assert.throws(()=>validateBackup(e));});
test('backup rejects unrecognized delivery variants and duplicate IDs',()=>{const d=backup();d.activities[0].deliveries=[{category:'unknown',format:'NOPE'}];assert.throws(()=>validateBackup(d));const e=backup();e.activities.push(e.activities[0]);assert.throws(()=>validateBackup(e));});
test('backup validates attachment encoding and preserves metadata',()=>{const d=backup();d.files=[{id:'file1',name:'enunciado.txt',mime:'text/plain',kind:'base',ownerType:'activity',ownerId:d.activities[0].id,data:'data:text/plain;base64,QQ==',period:''}];assert.equal(validateBackup(d).files[0].name,'enunciado.txt');d.files[0].data='not-a-data-url';assert.throws(()=>validateBackup(d));});

