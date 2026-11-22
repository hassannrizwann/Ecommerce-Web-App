const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const base = process.env.TEST_BASE_URL || 'http://localhost:4174';
async function get(path) {
  const response = await fetch(new URL(path, base), { redirect: 'manual', headers: { connection: 'close' } });
  const text = await response.text();
  return { response, text, json: () => JSON.parse(text) };
}

test('health endpoint reports the actual service and database adapter state', async () => {
  const { response, json } = await get('/healthz');
  const body = json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(['healthy', 'degraded'].includes(body.status));
  assert.ok(['connected-atlas', 'not-configured-local-json-adapter', 'configured-unavailable'].includes(body.integrations.mongodb));
  assert.equal(body.integrations.mongodb === 'connected-atlas', body.integrations.controlDatabase !== 'local-json');
  assert.equal(body.integrations.mongodb === 'configured-unavailable', body.status === 'degraded');
  assert.equal(body.integrations.mongodb === 'configured-unavailable', Boolean(body.integrations.mongodbError));
  assert.equal(typeof body.integrations.mongodbHint, 'string');
  if (body.integrations.mongodb === 'configured-unavailable') assert.equal(body.integrations.tenantDatabases, 0);
  assert.equal(typeof body.integrations.adminTwoFactor, 'boolean');
});

test('feature catalog has all 168 stable sequential IDs and required metadata', async () => {
  const { response, json } = await get('/api/bootstrap');
  const catalog = json().catalog;
  assert.equal(response.status, 200);
  assert.equal(catalog.length, 168);
  assert.deepEqual(catalog.map(row => row.id), Array.from({ length: 168 }, (_, i) => `F-${String(i + 1).padStart(3, '0')}`));
  for (const row of catalog) {
    assert.ok(row.name && row.name.trim());
    assert.ok(row.group && row.group.trim());
    assert.equal(typeof row.defaultOn, 'boolean');
    assert.ok(Array.isArray(row.requires), `${row.id} must publish a prerequisite list`);
    for (const prerequisite of row.requires) assert.ok(catalog.some(item => item.id === prerequisite), `${row.id} references unknown ${prerequisite}`);
  }
});

test('toggle engine respects every catalog default, prerequisite, plan, owner choice, override, and lock', async () => {
  const { json } = await get('/api/bootstrap');
  const catalog = json().catalog;
  const source = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function featureById');
  const end = source.indexOf('function publicFeatures', start);
  assert.ok(start >= 0 && end > start, 'the production toggle engine must be registered');
  const control={plans:[{id:'all',features:catalog.map(f=>f.id)}]};
  const run = require('node:vm').runInNewContext(
    'const CATALOG=catalog; '+source.slice(start, end)+'; effectiveToggle',
    { catalog, control }
  );
  const instance={planId:'all'};
  const state={settings:{toggles:{locks:{},overrides:{},owner:{}}}};
  const expected=new Map();
  const defaultState=id=>{if(expected.has(id))return expected.get(id);const feature=catalog.find(row=>row.id===id);const value=!!feature&&feature.defaultOn&&feature.requires.every(defaultState);expected.set(id,value);return value};
  for(const feature of catalog)assert.equal(run(instance,state,feature.id),defaultState(feature.id),feature.id+' default/prerequisite result');
  assert.equal(run(instance,state,'F-999'),false,'unknown toggles stay off');
  const row=catalog.find(f=>f.requires.length===0);
  state.settings.toggles.owner[row.id]=!row.defaultOn;
  assert.equal(run(instance,state,row.id),!row.defaultOn,'owner setting overrides the default');
  state.settings.toggles.overrides[row.id]=row.defaultOn;
  assert.equal(run(instance,state,row.id),row.defaultOn,'platform override takes priority over owner');
  state.settings.toggles.locks[row.id]={value:!row.defaultOn};
  assert.equal(run(instance,state,row.id),!row.defaultOn,'platform lock takes priority over override');
  control.plans[0].features=control.plans[0].features.filter(id=>id!==row.id);
  assert.equal(run(instance,state,row.id),false,'plan exclusion takes priority over lock');
});

test('industry pack toggles include their available prerequisite closure', async () => {
  const { json }=await get('/api/bootstrap');
  const { catalog,packs }=json();
  const prerequisites=Object.fromEntries(catalog.map(row=>[row.id,row.requires]));
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=source.indexOf('function packToggleDefaults');
  const end=source.indexOf('function normalizeHomepageSections',start);
  assert.ok(start>=0&&end>start);
  const packDefaults=require('node:vm').runInNewContext('const PREREQS=prerequisites; '+source.slice(start,end)+'; packToggleDefaults',{prerequisites});
  const allIds=catalog.map(row=>row.id);
  for(const pack of packs){
    const enabled=new Set(packDefaults(pack.features,allIds));
    for(const id of pack.features){assert.ok(enabled.has(id),pack.id+' enables '+id);for(const dep of prerequisites[id])assert.ok(enabled.has(dep),pack.id+' enables prerequisite '+dep+' for '+id)}
  }
  const restricted=new Set(packDefaults(['F-021'],['F-021'],prerequisites));
  assert.equal(restricted.has('F-021'),false,'do not seed a feature whose prerequisite is unavailable on the plan');
});

test('audit hash chain detects entry edits, removals, reordering, and legacy tampering', () => {
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const hashStart=source.indexOf('function auditHash');
  const hashEnd=source.indexOf('function ensureAuditCheckpoint',hashStart);
  const verifyStart=source.indexOf('function verifyAuditChain');
  const verifyEnd=source.indexOf('function tenantPath',verifyStart);
  assert.ok(hashStart>=0&&hashEnd>hashStart&&verifyStart>hashEnd&&verifyEnd>verifyStart);
  const audit=require('node:vm').runInNewContext('const crypto=require("node:crypto");'+source.slice(hashStart,hashEnd)+source.slice(verifyStart,verifyEnd)+';({auditHash,verifyAuditChain})',{require});
  const legacy=[{id:'legacy-1',actor:'System',action:'Old event'}];
  const checkpoint=audit.auditHash({version:1,legacy});
  const first={id:'event-1',actor:'owner@example.test',action:'Updated settings',instance:'Demo',at:'2026-01-01T00:00:00.000Z',before:{color:'blue'},after:{color:'green'},meta:{},previousHash:checkpoint};
  first.hash=audit.auditHash(first);
  const second={id:'event-2',actor:'owner@example.test',action:'Updated settings',instance:'Demo',at:'2026-01-02T00:00:00.000Z',before:{color:'green'},after:{color:'red'},meta:{},previousHash:first.hash};
  second.hash=audit.auditHash(second);
  const state={audit:[second,first,...legacy],auditCheckpoint:checkpoint,auditHeadHash:second.hash};
  assert.equal(audit.verifyAuditChain(state).valid,true);
  assert.equal(audit.verifyAuditChain({...state,audit:[{...second,action:'tampered'},first,...legacy]}).valid,false);
  assert.equal(audit.verifyAuditChain({...state,audit:[first,...legacy]}).valid,false);
  assert.equal(audit.verifyAuditChain({...state,audit:[first,second,...legacy]}).valid,false);
  assert.equal(audit.verifyAuditChain({...state,audit:[second,first,{...legacy[0],action:'altered'}]}).valid,false);
});

test('industry packs have stable unique IDs and sample products', async () => {
  const { response, json } = await get('/api/bootstrap');
  const packs = json().packs;
  assert.equal(response.status, 200);
  assert.ok(packs.length >= 6);
  assert.equal(new Set(packs.map(row => row.id)).size, packs.length);
  for (const pack of packs) {
    assert.ok(Array.isArray(pack.categories) && pack.categories.length > 0);
    assert.ok(Array.isArray(pack.sampleProducts) && pack.sampleProducts.length > 0);
  }
  const api = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  const ui = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  assert.match(api, /function ensureControlDefaultsAfterHydration\(\)/);
  assert.match(api, /control=storedControl;ensureControlDefaultsAfterHydration\(\)/);
  assert.match(api, /if\(p==='\/api\/admin\/packs'&&method==='POST'\)/);
  assert.match(api, /An industry pack with that ID or name already exists/);
  assert.match(api, /Starter product \$\{index\+1\} needs a name/);
  assert.match(ui, /id="industry-pack-form"/);
  assert.match(ui, /request\('\/api\/admin\/packs','POST',payload\)/);
  const packSubmitStart = ui.indexOf("const form=e.target.closest?.('#industry-pack-form')");
  const packSubmitEnd = ui.indexOf('},true);', packSubmitStart);
  assert.ok(packSubmitStart >= 0 && packSubmitEnd > packSubmitStart);
  assert.doesNotMatch(ui.slice(packSubmitStart, packSubmitEnd), /await refresh\(\)/);
});

test('the app document serves the single-file frontend and React entry point', async () => {
  const { response, text } = await get('/');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/i);
  assert.match(text, /id=["']app["']/i);
  assert.match(text, /ReactDOM|react-dom/i);
});

test('blank-screen fallback renders a working Super Admin login that routes to Website Builder', () => {
  const source = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  assert.match(source, /id="boot-login-form"/);
  assert.match(source, /location\.protocol==='file:'\)\{location\.replace\('http:\/\/localhost:4174\//);
  assert.match(source, /fetch\('\/api\/auth\/login'/);
  assert.match(source, /location\.assign\('\/\?page=Website%20builder'\)/);
  assert.match(source, /northstar-runtime-error/);
  assert.match(source, /get\('page'\)\|\|\(\{overview:'Website builder'\}/);
});

test('opening index.html directly redirects without running React bundles under file://', () => {
  const source = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  assert.equal((source.match(/if\(location\.protocol!=='file:'\)\{/g) || []).length, 1,
    'all React-dependent inline scripts must share one file:// guard and lexical scope');
  const redirects = [];
  const context = { location: { protocol: 'file:', replace: value => redirects.push(value) }, window: { addEventListener() {} } };
  for (const [, script] of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    if (script.trim()) require('node:vm').runInNewContext(script, context);
  }
  assert.deepEqual(redirects, ['http://localhost:4174/?page=Website%20builder']);
});

test('unauthenticated React render mounts the login page instead of leaving a blank root', () => {
  const source = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  assert.match(source, /if\s*\(!user\)\s*\{\s*legacyMount\.innerHTML\s*=\s*authView\(\);\s*return;/);
  assert.doesNotMatch(source, /\bmountLegacy\s*=/);
  const legacyRender = source.match(/function render\(\)\{([^\n]*)/);
  assert.ok(legacyRender, 'legacy shell renderer should remain defined');
  assert.doesNotMatch(legacyRender[1], /\buser\b/, 'global legacy renderer must not read the auth closure variable');
});

test('real Chrome startup renders the sign-in page without a runtime error overlay', t => {
  const candidates = process.platform === 'win32'
    ? [process.env.CHROME_BIN, 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
    : process.platform === 'darwin'
      ? [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : [process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/chromium'];
  const chrome = candidates.find(file => file && fs.existsSync(file));
  if (!chrome) return t.skip('Chrome or Chromium is not installed on this machine');
  const tempRoot = path.resolve(os.tmpdir());
  const profile = fs.mkdtempSync(path.join(tempRoot, 'northstar-browser-smoke-'));
  try {
    const result = spawnSync(chrome, [
      '--headless=new', '--disable-gpu', '--disable-software-rasterizer', '--disable-gpu-compositing',
      '--disable-features=VizDisplayCompositor', '--no-sandbox', '--no-first-run', '--disable-extensions',
      `--user-data-dir=${profile}`, '--dump-dom', new URL('/?page=Website%20builder', base).toString()
    ], { encoding: 'utf8', timeout: 25000, windowsHide: true });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr?.slice(-1000));
    assert.match(result.stdout, /Welcome back/);
    assert.doesNotMatch(result.stdout, /id="northstar-runtime-error"[^>]*display:\s*block/);
    const diagnostic = result.stdout.match(/id="boot-diagnostic"[^>]*>([\s\S]*?)<\//)?.[1] || '';
    assert.equal(diagnostic.trim(), '', 'boot diagnostics must stay empty after a successful React render');
  } finally {
    const resolved = path.resolve(profile);
    if (resolved.startsWith(tempRoot + path.sep) && path.basename(resolved).startsWith('northstar-browser-smoke-')) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
});

test('modal action buttons bubble to the application handler and start guided setup', () => {
  const source = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  assert.doesNotMatch(source, /onclick=["']event\.stopPropagation\(\)["']/i);
  assert.match(source, /app\.addEventListener\('click',onClick,true\)/);
  assert.match(source, /action==='support-start'\|\|action==='support-end'/);
  assert.match(source, /data-action="modal-close"/);
  assert.match(source, /data-action="go-provision"/);
  assert.match(source, /case'go-provision':view\.modal=null;view\.page='Provisioning';view\.step=1;view\.signup=\{\};render\(\)/);
});

test('website builder uploads a logo, samples its palette, and saves it to the generated store', () => {
  const ui = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  const api = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  assert.match(ui, /id:'generator-logo',name:'logo',type:'file'/);
  assert.match(ui, /form\.dataset\.brandColor=primary/);
  assert.match(ui, /data\.logoBase64=dataUrl\.split\(','\)\[1\]/);
  assert.match(ui, /data\.brandColor=form\.dataset\.brandColor/);
  assert.match(api, /logoMimeType==='image\/png'/);
  assert.match(api, /tenant\.settings\.brand\.logoUrl=savedLogo\.url/);
  assert.match(api, /tenant\.settings\.brand\.accentColor=accentColor\|\|inst\.color/);
  assert.match(ui, /setProperty\('--store-primary',primary\)/);
});

test('platform dashboard renders live health values and updates the 7/30 day chart', () => {
  const source = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  const api = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  assert.match(source, /Live integration status/);
  assert.match(source, /services\.mongodb===\s*'connected-atlas'/);
  assert.match(source, /Healthy':state\.platformHealth\?'Read-only':'Checking'/);
  assert.match(source, /MongoDB Atlas is unreachable; changes cannot be saved\./);
  assert.match(api, /mongodbHint:mongoStatusHint\(\)/);
  assert.match(source, /integrations\.mongodbHint\|\|/);
  assert.match(api, /current IP is allowed/);
  assert.match(api, /outbound TCP 27017/);
  assert.match(source, /id = 'activity-range'/);
  assert.match(source, /activityRange=Number\(e\.target\.value\)===7\?7:30/);
  assert.doesNotMatch(source, /128 ms|Database capacity.{0,20}64%|Storage used.{0,20}38%/);
});

test('Super Admin plans use stored plan data and create/edit forms call the API', () => {
  const ui = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  const api = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  assert.match(ui, /function plansPage\(\)\{const rows=Array\.isArray\(state\.plans\)\?state\.plans\.filter\(p=>p&&typeof p==='object'\):\[\]/);
  assert.match(ui, /state\.plans = plans;/);
  assert.match(ui, /if\(m\.type==='plan-edit'\)\{const p=\(Array\.isArray\(state\.plans\)\?state\.plans:\[\]\)\.find\(x=>x\.id===m\.planId\)/);
  assert.match(ui, /id="instance-plan" aria-label="Plan for \$\{esc\(x\.name\)\}"/);
  assert.match(ui, /Array\.isArray\(state\.plans\)\?state\.plans:\[\]\)\.map\(p=>/);
  assert.match(ui, /view\.modal\?\.selectedPlan\|\|\$\('instance-plan'\)\?\.value,plan=\(Array\.isArray\(state\.plans\)\?state\.plans:\[\]\)\.find\(p=>p\.name===selected\)/);
  assert.match(ui, /view\.modal\.selectedPlan=e\.target\.value;render\(\)/);
  assert.match(ui, /await refresh\(\);view\.modal=null;render\(\);toast\('Plan updated\.'\)/);
  assert.match(ui, /plansData\.plans\) \? plansData\.plans\.filter\(p => p && typeof p === 'object'\)\.map\(p => \(\{ \.\.\.p, features: Array\.isArray\(p\.features\) \? p\.features : \[\] \}\)\)/);
  assert.match(ui, /id="new-plan-form"/);
  assert.match(ui, /id="edit-plan-form"/);
  assert.match(ui, /request\('\/api\/admin\/plans','POST',payload\)/);
  assert.match(ui, /request\('\/api\/admin\/plans\/'.*'PATCH',payload\)/);
  assert.match(api, /if\(p==='\/api\/admin\/plans'&&method==='POST'\)/);
  assert.match(api, /method==='PATCH'\).*Plan name must be 2/);
});

test('Super Admin settings save platform identity and reserved names through validated APIs', () => {
  const ui = require('node:fs').readFileSync(require.resolve('../index.html'), 'utf8');
  const api = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  assert.match(ui, /id="platform-name"/);
  assert.match(ui, /id="default-store-url"/);
  assert.match(ui, /id="support-email"/);
  assert.match(ui, /adminTwoFactor\?'Required':'Not configured'/);
  assert.match(ui, /request\('\/api\/admin\/settings','PATCH',\{platform,settings:/);
  assert.match(ui, /request\('\/api\/admin\/settings','PATCH',\{reserved:/);
  assert.match(api, /Default store domain must be a hostname/);
  assert.match(api, /Reserved subdomain names must be unique/);
  assert.match(api, /nextReserved=\[\.\.\.new Set\(\[\.\.\.RESERVED_BASE/);
});

test('public instance summaries use the configured base domain without exposing the database id', () => {
  const source = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function publicInst');
  const end = source.indexOf('\n', start);
  assert.ok(start >= 0 && end > start);
  const build = require('node:vm').runInNewContext('const control={settings:{defaultStoreUrl:"stores.example.com"}};'+source.slice(start,end)+'; publicInst');
  const result = build({id:'i-1',slug:'olive-oak',dbId:'private-db',name:'Olive & Oak'});
  assert.equal(result.defaultDomain, 'olive-oak.stores.example.com');
  assert.equal('dbId' in result, false);
});

test('robots and sitemap are public, well-formed, and keep API paths out of indexing', async () => {
  const robots = await get('/robots.txt');
  assert.equal(robots.response.status, 200);
  assert.match(robots.text, /Disallow:\s*\/api\//);
  assert.match(robots.text, /Sitemap:\s*https?:\/\//);
  const sitemap = await get('/sitemap.xml');
  assert.equal(sitemap.response.status, 200);
  assert.match(sitemap.response.headers.get('content-type') || '', /application\/xml/i);
  assert.match(sitemap.text, /^<\?xml/);
  assert.match(sitemap.text, /<urlset[\s>]/);
  assert.doesNotMatch(sitemap.text, /\/api\//i);
});

test('tenant control routes reject unauthenticated writes and unknown tenants', async () => {
  const health = (await get('/healthz')).json();
  const protectedRoute = await fetch(new URL('/api/tenant/olive-oak/settings', base), {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ maintenanceMode: true })
  });
  assert.ok([401, 403, ...(health.integrations.mongodb === 'configured-unavailable' ? [503] : [])].includes(protectedRoute.status));
  const unknownTenant = await get('/api/tenant/tenant-that-does-not-exist/store');
  assert.equal(unknownTenant.response.status, 404);
});


test('local table QR encoder returns a real PNG image', async () => {
  const qr = require('qrcode');
  const png = await qr.toBuffer('http://localhost:4174/?store=olive-oak&table=table-1', { type: 'png', errorCorrectionLevel: 'M' });
  assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
});

test('CSS sanitizer scopes valid styles and rejects executable or external content', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function sanitizeStorefrontCss');
  const end = source.indexOf('const MONGODB_URI', start);
  assert.ok(start >= 0 && end > start, 'CSS sanitizer must be registered in the backend');
  const sanitize = require('node:vm').runInNewContext(source.slice(start, end) + '; sanitizeStorefrontCss');
  assert.equal(sanitize('.product-card { border-radius: 12px; color: #fff; }'), 'body[data-storefront="true"] .product-card{border-radius:12px;color:#fff}');
  assert.throws(() => sanitize('.product-card { background-image: url(https://example.com/a.png); }'), /disallowed|property|value/i);
  assert.throws(() => sanitize('.evil { display: none; }'), /selector/i);
});


test('hero image URL validation accepts HTTPS and rejects unsafe or oversized lists', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function normalizeHeroImages');
  const end = source.indexOf('const MONGODB_URI', start);
  assert.ok(start >= 0 && end > start);
  const normalize = require('node:vm').runInNewContext('const effectiveToggle=()=>true;'+source.slice(start, end)+'; normalizeHeroImages', { URL });
  assert.deepEqual(Array.from(normalize(['https://images.example/hero.jpg'], {}, {})), ['https://images.example/hero.jpg']);
  assert.throws(() => normalize(['http://images.example/hero.jpg'], {}, {}), /HTTPS/);
  assert.throws(() => normalize(Array.from({length:9}, (_,i)=>'https://images.example/'+i+'.jpg'), {}, {}), /8 hero/);
});

test('homepage section ordering accepts only unique known sections', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function normalizeHomepageSections');
  const end = source.indexOf('function normalizeHeroImages', start);
  assert.ok(start >= 0 && end > start);
  const normalize = require('node:vm').runInNewContext('const effectiveToggle=()=>true;'+source.slice(start, end)+'; normalizeHomepageSections');
  assert.deepEqual(Array.from(normalize(['products','hero'], {}, {})), ['products','hero']);
  assert.throws(() => normalize(['hero','hero'], {}, {}), /unique/i);
  assert.throws(() => normalize(['remote-site'], {}, {}), /unique/i);
});

test('storefront section wrappers include a defined product grid', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const start = html.indexOf('function customerStorefront');
  const end = html.indexOf('function customerPagesPanel', start);
  const view = html.slice(start, end);
  assert.match(view, /store=[^;]*data-store-grid/);
  assert.match(view, /\$\{store\}\$\{products\.map/);
  for (const section of ['hero','announcement','welcome','hours','products']) assert.ok(view.includes('data-home-section="'+section+'"'));
  assert.ok(html.includes('applyHomeSectionOrder()'));
});

test('F-165 chat alert settings expose create, test, disable, and delivery controls', () => {
  const html=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
  assert.match(html,/function ownerChatAlertsPanel\(\)/);
  assert.match(html,/owner-api-key-form/);
  assert.match(html,/owner-chat-alert-form/);
  assert.match(html,/data-chat-test/);
  assert.match(html,/data-chat-disable/);
  assert.match(html,/Send test/);
});

test('automation connectors are owner-facing, provider-labeled, and gated independently', () => {
  const backend=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8'),html=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
  assert.match(backend,/'automation-connectors':'F-167'/);
  assert.match(backend,/hook\.platform==='automation'\?'F-167'/);
  assert.match(backend,/route==='automation-connectors'&&method==='POST'/);
  assert.match(html,/function ownerAutomationPanel\(\)/);
  assert.match(html,/Zapier/);assert.match(html,/Make/);assert.match(html,/n8n/);
  assert.match(html,/data-automation-test/);assert.match(html,/data-automation-disable/);
});

test('spreadsheet sync panel builds a scoped Apps Script pull workflow', () => {
  const html=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
  const start=html.indexOf('function ownerSpreadsheetSyncPanel');
  const end=html.indexOf('function ownerAutomationPanel',start);
  assert.ok(start>=0&&end>start);
  const context={ownerData:{features:[{id:'F-166',effective:true}]},user:{instanceSlug:'olive-oak'},location:{origin:'https://shop.example.test',hostname:'shop.example.test'},esc:value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
  const panel=require('node:vm').runInNewContext('const ownerData=globalThis.ownerData,user=globalThis.user,location=globalThis.location,esc=globalThis.esc;'+html.slice(start,end)+'; ownerSpreadsheetSyncPanel()',context);
  assert.match(panel,/spreadsheet-export\/products/);assert.match(panel,/spreadsheet-export\/orders/);
  assert.match(panel,/NORTHSTAR_API_KEY/);assert.match(panel,/syncNorthstarProducts/);assert.match(panel,/syncNorthstarOrders/);
  assert.match(panel,/time-driven trigger/);assert.match(panel,/data-spreadsheet-sync-copy/);
  const encoded=panel.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)?.[1]||'';const script=encoded.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');assert.doesNotThrow(()=>new Function(script));
});

test('spreadsheet CSV export escapes cells and neutralizes formula injection', () => {
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=source.indexOf('function spreadsheetCsv');
  const end=source.indexOf('function buildMarketplaceFeed',start);
  assert.ok(start>=0&&end>start);
  const csv=require('node:vm').runInNewContext(source.slice(start,end)+'; spreadsheetCsv');
  const output=csv([['name','value'],['=IMPORTDATA("x")','a, b'],['@SUM(1)','quoted "text"']]);
  assert.ok(output.startsWith('"name","value"'));
  assert.ok(output.includes(String.fromCharCode(39)+'=IMPORTDATA'));
  assert.ok(output.includes(String.fromCharCode(39)+'@SUM'));
  assert.ok(output.includes('"a, b"'));
  assert.ok(output.includes('"quoted ""text"""'));
});

test('Slack and Discord alert URLs are provider-restricted and F-165 queues its own events', () => {
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=source.indexOf('function validateChatAlertUrl');
  const end=source.indexOf('function enqueueWebhookEvent',start);
  assert.ok(start>=0&&end>start);
  const validate=require('node:vm').runInNewContext('const net=require("node:net");'+source.slice(start,end)+'; validateChatAlertUrl',{require,URL});
  assert.equal(validate('https://hooks.slack.com/services/T000/B000/abc123','slack').hostname,'hooks.slack.com');
  assert.equal(validate('https://discord.com/api/webhooks/123456/abc123','discord').hostname,'discord.com');
  assert.throws(()=>validate('https://hooks.slack.com/evil/path','slack'),/Slack incoming-webhook/i);
  assert.throws(()=>validate('https://attacker.example.com/api/webhooks/123/token','discord'),/Discord webhook/i);
  const qStart=source.indexOf('function enqueueWebhookEvent'),qEnd=source.indexOf('async function sendWebhookRequest',qStart);
  const queue=require('node:vm').runInNewContext('const crypto=require("node:crypto");const webhookOrderPayload=o=>({id:o.id,number:o.number,total:o.total,items:o.items||[]});const effectiveToggle=(_i,_t,id)=>id==="F-165";'+source.slice(qStart,qEnd)+'; enqueueWebhookEvent',{require});
  const tenant={webhooks:[{id:'chat-1',platform:'slack',active:true,events:['order.created']},{id:'generic-1',active:true,events:['order.created']}],webhookDeliveries:[]};
  const deliveries=queue({slug:'shop'},tenant,'order.created',{id:'o1',number:'NS-1',total:7,items:[]});
  assert.deepEqual(Array.from(deliveries.map(x=>x.webhookId)),['chat-1']);
});

test('outgoing webhooks validate public HTTPS and queue signed-event payloads without customer PII', () => {
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=source.indexOf('function webhookPublicAddress');
  const end=source.indexOf('function normalizeAnalyticsMeasurementId',start);
  assert.ok(start>=0&&end>start);
  const helpers=require('node:vm').runInNewContext('const net=require("node:net"),crypto=require("node:crypto");const effectiveToggle=()=>true;'+source.slice(start,end)+';({webhookPublicAddress,validateWebhookUrl,enqueueWebhookEvent})',{require,URL});
  assert.equal(helpers.webhookPublicAddress('8.8.8.8'),true);
  assert.equal(helpers.webhookPublicAddress('127.0.0.1'),false);
  assert.equal(helpers.webhookPublicAddress('10.0.0.1'),false);
  assert.equal(helpers.validateWebhookUrl('https://hooks.example.com/orders').hostname,'hooks.example.com');
  assert.throws(()=>helpers.validateWebhookUrl('http://hooks.example.com/orders'),/HTTPS/);
  assert.throws(()=>helpers.validateWebhookUrl('https://127.0.0.1/hook'),/HTTPS/);
  const tenant={webhooks:[{id:'hook-1',active:true,events:['order.created']},{id:'hook-2',active:false,events:['order.created']}],webhookDeliveries:[]};
  const rows=helpers.enqueueWebhookEvent({slug:'olive-oak'},tenant,'order.created',{id:'ord-1',number:'NS-1',status:'received',total:25,customer:{email:'private@example.test',address:'private'},trackingToken:'private',items:[{productId:'p1',name:'Tea',quantity:1,price:25}]});
  assert.equal(rows.length,1);assert.equal(rows[0].payload.id,rows[0].id);
  assert.equal(rows[0].payload.data.id,'ord-1');
  assert.doesNotMatch(JSON.stringify(rows[0].payload),/private@example|trackingToken|private"/);
});

test('store analytics stays unloaded without consent and omits tracking tokens from page views', () => {
  const html=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
  const start=html.indexOf('function analyticsConsentKey');
  const end=html.indexOf('function customerStorefront',start);
  assert.ok(start>=0&&end>start);
  const calls=[],scripts=[],storage={decision:'',getItem(){return this.decision},setItem(_key,value){this.decision=value}};
  const context={shopData:{store:{analytics:{measurementId:'G-ABCD1234'}}},publicShopSlug:'olive-oak',localStorage:storage,window:{gtag:(...args)=>calls.push(args)},document:{createElement:()=>({}),head:{appendChild:script=>scripts.push(script)},title:'Store'},location:{origin:'https://shop.example.test',pathname:'/',search:'?track=private-token'}};
  const helpers=require('node:vm').runInNewContext('const shopData=globalThis.shopData,publicShopSlug=globalThis.publicShopSlug,localStorage=globalThis.localStorage,window=globalThis.window,document=globalThis.document,location=globalThis.location;'+html.slice(start,end)+';({analyticsConsentBanner,loadStoreAnalytics})',context);
  assert.match(helpers.analyticsConsentBanner(),/Accept analytics/);
  helpers.loadStoreAnalytics();
  assert.equal(scripts.length,0,'must not load analytics before consent');
  storage.decision='accepted';helpers.loadStoreAnalytics();
  assert.equal(scripts.length,1);
  assert.match(scripts[0].src,/G-ABCD1234/);
  const pageView=calls.find(args=>args[0]==='event'&&args[1]==='page_view');
  assert.ok(pageView);assert.equal(pageView[2].page_location,'https://shop.example.test/');
  assert.doesNotMatch(pageView[2].page_location,/track|private-token/);
});

test('Google Analytics measurement IDs are constrained to GA4 identifiers', () => {
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=source.indexOf('function normalizeAnalyticsMeasurementId');
  const end=source.indexOf('function authenticateTenantApiKey',start);
  assert.ok(start>=0&&end>start);
  const normalize=require('node:vm').runInNewContext(source.slice(start,end)+'; normalizeAnalyticsMeasurementId');
  assert.equal(normalize(' g-ab12CD34 '),'G-AB12CD34');
  assert.equal(normalize(''), '');
  assert.throws(()=>normalize('https://tracker.example/script.js'),/measurement ID/i);
});

test('scoped API keys grant only explicit read routes and gated external POS writes', () => {
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=source.indexOf('function apiKeyScopeForRoute');
  const end=source.indexOf('function authenticateTenantApiKey',start);
  assert.ok(start>=0&&end>start);
  let posEnabled=false;const resolve=require('node:vm').runInNewContext('const effectiveToggle=(_i,_t,id)=>id==="F-164"&&globalThis.posEnabled;'+source.slice(start,end)+'; apiKeyScopeForRoute',{posEnabled});
  const inst={},tenant={};
  assert.equal(resolve('products','GET',inst,tenant),'products:read');
  assert.equal(resolve('orders','GET',inst,tenant),'orders:read');
  assert.equal(resolve('orders','PATCH',inst,tenant),null);
  assert.equal(resolve('external-pos/sale','POST',inst,tenant),null);
  posEnabled=true;
  const enabledResolve=require('node:vm').runInNewContext('const effectiveToggle=()=>true;'+source.slice(start,end)+'; apiKeyScopeForRoute');
  assert.equal(enabledResolve('external-pos/products','GET',inst,tenant),'products:read');
  assert.equal(enabledResolve('external-pos/sale','POST',inst,tenant),'pos:write');
  assert.equal(enabledResolve('external-pos/sale','GET',inst,tenant),null);
  assert.equal(enabledResolve('spreadsheet-export/products','GET',inst,tenant),'products:read');
  assert.equal(enabledResolve('spreadsheet-export/orders','GET',inst,tenant),'orders:read');
  assert.equal(enabledResolve('spreadsheet-export/orders','POST',inst,tenant),null);
  assert.equal(enabledResolve('webhooks','GET',inst,tenant),null);
});

test('tenant REST API keys authenticate by hash and honor expiry and revocation', () => {
  const source = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function authenticateTenantApiKey');
  const end = source.indexOf('function send(', start);
  assert.ok(start >= 0 && end > start);
  const auth = require('node:vm').runInNewContext('const crypto=require("node:crypto");const effectiveToggle=()=>true;'+source.slice(start, end)+'; authenticateTenantApiKey', {require});
  const secret='nsk_'+Buffer.from('test-api-key-material-012345678901234567890123456789').toString('base64url');
  const hash=require('node:crypto').createHash('sha256').update(secret).digest('hex');
  const tenant={apiKeys:[{id:'key-1',name:'Reports',hash,scopes:['products:read'],createdAt:new Date().toISOString()}]};
  const instance={id:'tenant-1'};
  const req={headers:{authorization:'Bearer '+secret}};
  assert.equal(auth(req,instance,tenant).role,'api_key');
  assert.deepEqual(Array.from(auth(req,instance,tenant).permissions),['products:read']);
  assert.equal(auth({headers:{authorization:'Bearer nsk_wrong'}},instance,tenant),null);
  tenant.apiKeys[0].revokedAt=new Date().toISOString();
  assert.equal(auth(req,instance,tenant),null);
});

test('F-005 bundles validate physical component references and expose their contents in the storefront', () => {
  const backend=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=backend.indexOf('function normalizeBundleItems'),end=backend.indexOf('function normalizeMinimumOrderSetting',start);
  assert.ok(start>=0&&end>start);
  const normalize=require('node:vm').runInNewContext('const effectiveToggle=(i,t,id)=>t.bundleEnabled===true;'+backend.slice(start,end)+';normalizeBundleItems');
  const tenant={bundleEnabled:true,products:[{id:'bun',active:true},{id:'tea',name:'Tea',active:true},{id:'bad',name:'Nested',active:true,bundleItems:[{productId:'tea',quantity:1}]},{id:'file',active:true,digitalProduct:true},{id:'off',active:false}]};
  assert.deepEqual(JSON.parse(JSON.stringify(normalize([{productId:'tea',quantity:2}],{},tenant,'bun'))),[{productId:'tea',quantity:2}]);
  assert.throws(()=>normalize([{productId:'bun',quantity:1}],{},tenant,'bun'),/different product/);
  assert.throws(()=>normalize([{productId:'bad',quantity:1}],{},tenant,'bun'),/active physical products/);
  assert.throws(()=>normalize([{productId:'file',quantity:1}],{},tenant,'bun'),/active physical products/);
  assert.throws(()=>normalize([{productId:'tea',quantity:0}],{},tenant,'bun'),/whole numbers/);
  assert.throws(()=>normalize([{productId:'tea',quantity:1}],{}, {...tenant,bundleEnabled:false},'bun'),/disabled for this store/);
  const ui=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
  assert.match(ui,/Bundle contents/);
  assert.match(ui,/data-bundle-product/);
  assert.match(ui,/Bundle includes/);
});

test('minimum order setting is configurable and enforced only while F-063 is effective', () => {
  const backend=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=backend.indexOf('function normalizeMinimumOrderSetting'),end=backend.indexOf('function menuScheduleIsOpen',start);
  assert.ok(start>=0&&end>start);
  const checks=require('node:vm').runInNewContext('const effectiveToggle=(i,t,id)=>t.minimumEnabled===true;'+backend.slice(start,end)+';({minimumOrderError,normalizeMinimumOrderSetting})');
  const enabled={minimumEnabled:true,settings:{minimumOrder:25}};
  assert.equal(checks.minimumOrderError(24.99,{},enabled),'Minimum order amount is 25.');
  assert.equal(checks.minimumOrderError(25,{},enabled),null);
  assert.equal(checks.minimumOrderError(1,{}, {...enabled,minimumEnabled:false}),null);
  assert.equal(checks.normalizeMinimumOrderSetting(25,25,{}, {...enabled,minimumEnabled:false}),null);
  assert.throws(()=>checks.normalizeMinimumOrderSetting(30,25,{}, {...enabled,minimumEnabled:false}),/not enabled/);
  assert.equal(checks.normalizeMinimumOrderSetting('32.5',0,{},enabled),32.5);
  assert.throws(()=>checks.normalizeMinimumOrderSetting(-1,0,{},enabled),/from 0 to 100,000/);
  const ui=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
  assert.match(ui,/name="minimumOrder" type="number"/);
  assert.match(ui,/minimumOrder:Number\(d\.minimumOrder\)/);
});

test('owner toggle action resolves prerequisites in dependency order and explains blocked plans', () => {
  const source=require('node:fs').readFileSync(require.resolve('../index.html'),'utf8');
  const start=source.indexOf('function getFeaturePrerequisitesToEnable'),end=source.indexOf('async function request',start);
  assert.ok(start>=0&&end>start);
  const resolve=require('node:vm').runInNewContext(source.slice(start,end)+';getFeaturePrerequisitesToEnable');
  const rows=[{id:'F-006',name:'Categories',prerequisites:[],available:true,effective:false},{id:'F-020',name:'Time-based availability',prerequisites:['F-006'],available:true,effective:false},{id:'F-021',name:'Time-based menus',prerequisites:['F-020'],available:true,effective:false}];
  assert.deepEqual(Array.from(resolve(rows[2],rows),x=>x.id),['F-006','F-020']);
  assert.throws(()=>resolve(rows[2],rows.map(x=>x.id==='F-006'?{...x,available:false}:x)),/not included in this store plan/);
  assert.throws(()=>resolve(rows[2],rows.map(x=>x.id==='F-006'?{...x,locked:true}:x)),/locked off by the platform owner/);
});

test('time-based menu schedules filter every product in the category by local hours', () => {
  const source=require('node:fs').readFileSync(require.resolve('../backend.js'),'utf8');
  const start=source.indexOf('function menuScheduleIsOpen'),end=source.indexOf('function normalizeScheduledAt',start);
  assert.ok(start>=0&&end>start);
  const helpers=require('node:vm').runInNewContext('const effectiveToggle=(inst,t,id)=>t.menuEnabled===true;'+source.slice(start,end)+';({scheduledProductIsPublic,normalizeMenuSchedule})');
  const lunch={id:'lunch',name:'Lunch',menuSchedule:{enabled:true,start:'11:00',end:'16:00',timeZone:'UTC',days:[1,2,3,4,5,6,0]}};
  const product={active:true,category:'Lunch'};
  const tenant={menuEnabled:true,categories:[lunch]};
  assert.equal(helpers.scheduledProductIsPublic(product,{},tenant,Date.parse('2026-11-23T15:59:00Z')),true);
  assert.equal(helpers.scheduledProductIsPublic(product,{},tenant,Date.parse('2026-11-23T16:00:00Z')),false);
  assert.equal(helpers.scheduledProductIsPublic({...product,category:'Dinner'}, {},tenant,Date.parse('2026-11-23T20:00:00Z')),true);
  assert.equal(helpers.scheduledProductIsPublic(product,{}, {...tenant,menuEnabled:false},Date.parse('2026-11-23T20:00:00Z')),true);
  const saved=helpers.normalizeMenuSchedule({menuScheduleEnabled:'true',menuScheduleStart:'11:00',menuScheduleEnd:'16:00',menuScheduleTimezone:'Asia/Karachi'},{},{menuEnabled:true},null);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)),{enabled:true,start:'11:00',end:'16:00',timeZone:'Asia/Karachi',days:[0,1,2,3,4,5,6]});
  assert.throws(()=>helpers.normalizeMenuSchedule({menuScheduleEnabled:'true',menuScheduleStart:'16:00',menuScheduleEnd:'11:00',menuScheduleTimezone:'Asia/Karachi'},{},{menuEnabled:true},null),/end time must be later/);
  assert.throws(()=>helpers.normalizeMenuSchedule({menuScheduleEnabled:'true',menuScheduleStart:'11:00',menuScheduleEnd:'16:00',menuScheduleTimezone:'Not/AZone'},{},{menuEnabled:true},null),/valid IANA time zone/);
});

test('marketplace feed includes only public active products and emits safe Google RSS fields', () => {
  const source = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function buildMarketplaceFeed');
  const end = source.indexOf('function buildAccountingLedger', start);
  assert.ok(start >= 0 && end > start);
  const build = require('node:vm').runInNewContext('const scheduledProductIsPublic=(p)=>p.active;'+source.slice(start, end)+'; buildMarketplaceFeed');
  const xml = build({slug:'olive-oak',name:'Olive & Oak'}, {settings:{brand:{name:'Olive & Oak'}},products:[{id:'p1',sku:'SKU-1',name:'Tea & Cake',description:'Warm <tea>',price:10.25,stock:4,active:true,category:'Tea',images:['https://cdn.example.test/tea.jpg']},{id:'p2',name:'Hidden',price:1,stock:0,active:false}]}, {headers:{host:'shop.example.test','x-forwarded-proto':'https'},socket:{}});
  assert.match(xml, /^<\?xml/);
  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /Tea &amp; Cake/);
  assert.match(xml, /Warm &lt;tea&gt;/);
  assert.match(xml, /10\.25 USD/);
  assert.match(xml, /https:\/\/cdn\.example\.test\/tea\.jpg/);
  assert.match(xml, /shop-product-p1/);
  assert.doesNotMatch(xml, /Hidden/);
});

test('accounting ledger balances refunds and filters each event by its own date', () => {
  const source = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function buildAccountingLedger');
  const end = source.indexOf('\n', start);
  assert.ok(start >= 0 && end > start);
  const build = require('node:vm').runInNewContext(source.slice(start, end) + '; buildAccountingLedger');
  const orders = [{id:'o1',number:'N-1',createdAt:'2026-01-01T10:00:00Z',total:110,shipping:10,tax:10,tip:0,currency:'EUR',status:'paid',paymentStatus:'partially_refunded',refunds:[{amount:25,at:'2026-01-03T10:00:00Z',reason:'Returned item'}]}];
  const refundOnly = build(orders, '2026-01-03', '2026-01-03');
  assert.equal(refundOnly.length, 3);
  assert.ok(refundOnly.slice(1).every(row => row[0] === '2026-01-03'));
  const totals = refundOnly.slice(1).reduce((acc, row) => ({debit:acc.debit+Number(row[3]),credit:acc.credit+Number(row[4])}), {debit:0,credit:0});
  assert.equal(totals.debit, 25);
  assert.equal(totals.credit, 25);
  const all = build(orders);
  assert.equal(all[1][5], 'EUR');
  const allTotals = all.slice(1).reduce((acc, row) => ({debit:acc.debit+Number(row[3]),credit:acc.credit+Number(row[4])}), {debit:0,credit:0});
  assert.equal(allTotals.debit, allTotals.credit);
  assert.throws(() => build(orders, '2026-02-30'), /valid YYYY-MM-DD/);
});

test('refund amounts are cent-accurate and capped at the order total', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function normalizeRefund');
  const end = source.indexOf('function normalizeHomepageSections', start);
  assert.ok(start >= 0 && end > start);
  const normalize = require('node:vm').runInNewContext('const effectiveToggle=()=>true;const crypto=require("node:crypto");'+source.slice(start, end)+'; normalizeRefund', {require});
  const partial = normalize({total:10,paymentStatus:'paid'}, {amount:3.33,reason:'Item unavailable'}, 'owner@test.local', {}, {});
  assert.equal(partial.paymentStatus, 'partially_refunded');
  assert.equal(partial.refunds[0].amount, 3.33);
  const full = normalize({total:10,paymentStatus:partial.paymentStatus,refunds:partial.refunds}, {amount:6.67,reason:'Remaining balance'}, 'owner@test.local', {}, {});
  assert.equal(full.paymentStatus, 'refunded');
  assert.throws(() => normalize({total:10,paymentStatus:partial.paymentStatus,refunds:partial.refunds}, {amount:6.68,reason:'Too much'}, 'owner@test.local', {}, {}), /exceed/);
});

test('currency rates require supported codes, positive values, and a base rate of one', () => {
  const source = require('node:fs').readFileSync(require.resolve('../backend.js'), 'utf8');
  const start = source.indexOf('function normalizeCurrencyRates');
  const end = source.indexOf('function normalizeHomepageSections', start);
  assert.ok(start >= 0 && end > start);
  const normalize = require('node:vm').runInNewContext(source.slice(start, end) + '; normalizeCurrencyRates');
  assert.deepEqual({ ...normalize('USD', { USD: 1, PKR: 280 }) }, { USD: 1, PKR: 280 });
  assert.throws(() => normalize('USD', { USD: 2, PKR: 280 }), /base currency rate must equal 1/);
  assert.throws(() => normalize('USD', { USD: 1, BTC: 10 }), /supported currencies/);
  assert.throws(() => normalize('USD', { USD: 1, PKR: 0 }), /positive rates/);
});
