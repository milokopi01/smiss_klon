const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup() {
  const c = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../code.gs'),'utf8'), c);
  vm.runInContext(`
    let testDB = {};
    Object.keys(SHEET_SCHEMAS).forEach(s => testDB[s] = []);
    testDB.Pasukan = [{KodPasukan:'A',NamaPasukan:'ALPHA'}, {KodPasukan:'B',NamaPasukan:'BETA'}];
    testDB.Acara = [{NoAcara:'101',Kategori:'BPL15',HadPesertaPasukan:'2'}, {NoAcara:'102',Kategori:'BPL15',HadPesertaPasukan:'UNLIMITED'}];
    withLock = fn => fn();
    readSheetObjects = (ss,s) => ({ headers: SHEET_SCHEMAS[s].slice(), rows: testDB[s].map(r => Object.assign({},r)) });
    getHeaders = (ss,s) => SHEET_SCHEMAS[s].slice();
    writeSheetData = (ss,s,h,rows) => { testDB[s] = rows.map(r => Object.assign({},r)); };
    function data() { return testDB; }
  `, c);
  return c;
}
const user = {Peranan:'Pengurus',KodPasukan:'A'};
function registration(bib, event='101', team='A') {
  const a = {NoPeserta:bib,NamaPeserta:'ATLET',KodPasukan:team,Kategori:'BPL15'};
  const r = {...a,NoAcara:event,Jenis:'Individu'};
  return [{sheet:'Atlet',upserts:[a]},{sheet:'Pendaftaran',upserts:[{...r,IDPendaftaran:'REG-'+bib}]},{sheet:'Keputusan',upserts:[{...r,IDKeputusan:'RES-'+bib,Catatan:'',Kedudukan:'',CatatanRekod:''}]}];
}
test('Master Admin and Sub Admin can edit registered athletes; Pengurus and Hakim cannot',()=>{
 const c=setup(),old={NoPeserta:'A1',KodPasukan:'A',NamaPeserta:'OLD'},updated={...old,NamaPeserta:'NEW'};
 for (const Peranan of ['Admin','SubAdmin']) assert.equal(c.canWriteRow({Peranan},'Atlet',old,updated),true);
 for (const Peranan of ['Pengurus','Hakim']) assert.equal(c.canWriteRow({Peranan,KodPasukan:'A'},'Atlet',old,updated),false);
 assert.equal(c.canWriteRow(user,'Atlet',old,null),false);
});
test('event cap 2 blocks third participant and saves no partial athlete/result',()=>{
 const c=setup();
 assert.equal(c.applyChanges(null,user,registration('A1'),[]).rejected.length,0);
 assert.equal(c.applyChanges(null,user,registration('A2'),[]).rejected.length,0);
 const result=c.applyChanges(null,user,registration('A3'),[]);
 assert.equal(result.rejected.length,1);
 assert.match(result.rejected[0].reason,/terhad kepada 2/);
 assert.equal(c.data().Atlet.length,2); assert.equal(c.data().Keputusan.length,2);
});
test('global team cap 1 blocks second unique athlete even on unlimited event',()=>{
 const c=setup(); c.data().Tetapan=[{Kunci:'maxParticipantsPerTeam',Nilai:'1'}];
 assert.equal(c.applyChanges(null,user,registration('A1','102'),[]).rejected.length,0);
 assert.equal(c.applyChanges(null,user,registration('A2','102'),[]).rejected.length,1);
 assert.equal(c.data().Atlet.length,1);
});
test('unlimited event and team allow participants beyond finite event cap',()=>{
 const c=setup(); for(let n=1;n<=5;n++) assert.equal(c.applyChanges(null,user,registration('A'+n,'102'),[]).rejected.length,0);
 assert.equal(c.data().Atlet.length,5);
});
test('quota is independent per team',()=>{
 const c=setup(); c.applyChanges(null,user,registration('A1'),[]); c.applyChanges(null,user,registration('A2'),[]);
 assert.equal(c.applyChanges(null,{Peranan:'Pengurus',KodPasukan:'B'},registration('B1','101','B'),[]).rejected.length,0);
});
test('direct result inserts cannot bypass per-event cap',()=>{
 const c=setup(); c.applyChanges(null,user,registration('A1'),[]); c.applyChanges(null,user,registration('A2'),[]);
 c.applyChanges(null,user,registration('A3','102'),[]);
 const r={...c.data().Keputusan[2],NoAcara:'101',IDKeputusan:'RES-BYPASS'};
 assert.equal(c.applyChanges(null,{Peranan:'Admin'},[{sheet:'Keputusan',upserts:[r]}],[]).rejected.length,1);
});
test('same participant in registration and results counts once',()=>{
 const c=setup(); c.applyChanges(null,user,registration('A1'),[]);
 assert.equal(c.participantSets(c.data(),'101','A').length,1);
});
test('invalid finite cap and zero cap reject new registration',()=>{
 const c=setup(); c.data().Acara[0].HadPesertaPasukan='-1';
 assert.equal(c.applyChanges(null,user,registration('A1'),[]).rejected.length,1);
 c.data().Acara[0].HadPesertaPasukan='0';
 assert.equal(c.applyChanges(null,user,registration('A1'),[]).rejected.length,1);
});
test('existing records are preserved when admin lowers cap, but additions blocked',()=>{
 const c=setup(); c.applyChanges(null,user,registration('A1'),[]); c.applyChanges(null,user,registration('A2'),[]);
 const e={...c.data().Acara[0],HadPesertaPasukan:'1'};
 assert.equal(c.applyChanges(null,{Peranan:'SubAdmin'},[{sheet:'Acara',upserts:[e]}],[]).rejected.length,0);
 assert.equal(c.applyChanges(null,user,registration('A3'),[]).rejected.length,1);
});
test('schedule order editable only by admins and persists',()=>{
 const c=setup(); const e={...c.data().Acara[0],SusunanJadual:'2'};
 assert.equal(c.applyChanges(null,user,[{sheet:'Acara',upserts:[e]}],[]).rejected.length,1);
 assert.equal(c.applyChanges(null,{Peranan:'SubAdmin'},[{sheet:'Acara',upserts:[e]}],[]).rejected.length,0);
 assert.equal(c.data().Acara[0].SusunanJadual,'2');
});
test('Hakim may edit performance but not registered participant identity',()=>{
 const c=setup(),r={IDKeputusan:'R1',NoPeserta:'A1',KodPasukan:'A',Catatan:''};
 assert.equal(c.canWriteRow({Peranan:'Hakim'},'Keputusan',r,{...r,Catatan:'12.10'}),true);
 assert.equal(c.canWriteRow({Peranan:'Hakim'},'Keputusan',r,{...r,NoPeserta:'A2'}),false);
});
