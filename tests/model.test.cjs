'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the actual application functions, stopping before UI event registration.
const context = vm.createContext({ console, setTimeout, clearTimeout });
vm.runInContext(script.slice(0, script.indexOf("$('add').addEventListener")), context);
const evaluate = source => vm.runInContext(source, context);
function configure(mode = 'full', rho = 0) {
  evaluate(`schools=[newCollege('Never',0,'ED',['ED']),newCollege('Always',100,'ED II',['ED II'])];params={seed:1,trials:10000,mode:${JSON.stringify(mode)},rho:${rho}};schools.forEach(s=>s.threshold=s.p===0?-Infinity:s.p===100?Infinity:invNorm(s.p/100));`);
}
test('JavaScript syntax and public source contain no personalized defaults or external assets', () => {
  new vm.Script(script);
  assert.doesNotMatch(html, /ryan|gong|columbia|2026–27/i);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|fetch\(/i);
});
test('exact 0% and 100% endpoints across all decision modes and correlation settings', () => {
  for (const mode of ['full', 'waitlist', 'binary']) for (const rho of [0, .4]) {
    configure(mode, rho);
    assert.equal(evaluate(`(()=>{const r=rngFromSeed(7);for(let i=0;i<10000;i++){const d=draw(r);if(d[0].success||!d[1].success)return false;}return true;})()`), true);
  }
});
test('empirical admission marginals match the inputs under shared correlation', () => {
  for (const rho of [0, .4]) {
    const rates = evaluate(`(()=>{schools=[newCollege('A',5,'ED',['ED']),newCollege('B',50,'ED II',['ED II']),newCollege('C',95,'RD',['RD'])];params={mode:'full',rho:${rho}};schools.forEach(s=>s.threshold=invNorm(s.p/100));const r=rngFromSeed(123),tot=[0,0,0];for(let i=0;i<100000;i++)draw(r).forEach((d,j)=>tot[j]+=d.success);return tot.map(n=>n/100000);})()`);
    rates.forEach((x, i) => assert.ok(Math.abs(x - [.05, .5, .95][i]) < .006, `Observed ${x}`));
  }
});
test('waitlist offer and conversion assumptions produce calibrated routes', () => {
  const stats = evaluate(`(()=>{schools=[{...newCollege('Test',40,'RD',['RD']),wl:30,wlAdmit:25}];params={mode:'full',rho:0};const r=rngFromSeed(456);let wl=0,converted=0,admit=0;for(let i=0;i<100000;i++){const d=draw(r)[0];wl+=d.waitlisted;converted+=d.waitlisted&&d.success;admit+=d.success;}return {wl:wl/100000,q:converted/wl,p:admit/100000};})()`);
  assert.ok(Math.abs(stats.p-.4)<.006);
  assert.ok(Math.abs(stats.q-.25)<.012);
  const direct=(.4-.3*.25)/(1-.3*.25);
  assert.ok(Math.abs(stats.wl-(1-direct)*.3)<.006);
});
test('waitlists-only has no deferrals; binary and rolling have neither pathway', () => {
  for(const mode of ['waitlist','binary']) {
    configure(mode);
    assert.equal(evaluate(`(()=>{schools=[newCollege('Test',50,'EA',['EA'])];const r=rngFromSeed(8);for(let i=0;i<5000;i++){const d=draw(r)[0];if(d.deferred||d.notification==='Deferred'||(params.mode==='binary'&&d.waitlisted))return false;}return true;})()`),true);
  }
  configure();
  assert.equal(evaluate(`(()=>{schools=[newCollege('Test',50,'Rolling',['Rolling'])];const r=rngFromSeed(8);for(let i=0;i<5000;i++){const d=draw(r)[0];if(d.deferred||d.waitlisted)return false;}return true;})()`),true);
});
test('rounds control early visibility and support all advertised labels', () => {
  configure('binary');
  const states=evaluate(`ROUNDS.map(round=>{schools=[newCollege(round,100,round,[round])];return [round,draw(rngFromSeed(3))[0].initial];})`);
  for(const [round,state] of states) assert.equal(state,['RD','ED II'].includes(round)?'Pending':'Admitted');
});
test('the same seed reproduces a decision cycle', () => {
  configure('full', .25);
  evaluate("schools=[newCollege('A',30,'EA',['EA']),newCollege('B',70,'RD',['RD'])];schools.forEach(s=>s.threshold=invNorm(s.p/100));");
  assert.equal(evaluate('JSON.stringify(draw(rngFromSeed(444)))'), evaluate('JSON.stringify(draw(rngFromSeed(444)))'));
});
test('settings validate and round-trip; invalid values are rejected', () => {
  configure();
  assert.equal(evaluate('validate(JSON.parse(JSON.stringify(snapshot()))).colleges.length'),2);
  for(const change of ["d.version=2", "d.colleges[0].p=101", "d.colleges[0].p=null", "d.colleges[0].name=''", "d.colleges[0].offered=['UNKNOWN']", "d.colleges[0].offered=['RD']", "d.settings.seed=-1", "d.settings.trials=9", "d.settings.rho=1"])
    assert.throws(()=>evaluate(`(()=>{const d=JSON.parse(JSON.stringify(snapshot()));${change};return validate(d);})()`));
});
