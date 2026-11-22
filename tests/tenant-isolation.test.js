const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs/promises');

const root = path.resolve(__dirname, '..');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('tenant A cannot read, write, search, or export tenant B data, including on a changed host', async t => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDir = path.join(root, 'tmp', `isolation-${process.pid}-${Date.now()}`);
  const server = spawn(process.execPath, ['backend.js'], {
    cwd: root,
    env: {
      ...process.env,
      MONGODB_URI: '',
      PORT: String(port),
      NORTHSTAR_DATA_DIR: dataDir,
      ADMIN_EMAIL: 'isolation-admin@example.test',
      ADMIN_PASSWORD: 'Isolation-Admin-2026!'
    },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let stderr = '';
  server.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) server.kill();
    if (server.exitCode === null && server.signalCode === null) {
      await Promise.race([new Promise(resolve => server.once('close', resolve)), new Promise(resolve => setTimeout(resolve, 3000))]);
    }
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(`${base}/healthz`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, `isolated test backend did not start${stderr ? `: ${stderr}` : ''}`);

  async function call(route, { method = 'GET', body, cookie, host } = {}) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    if (host) headers.host = host;
    const response = await fetch(`${base}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual'
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    return { response, text, data, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
  }

  const adminLogin = await call('/api/auth/login', {
    method: 'POST',
    body: { email: 'isolation-admin@example.test', password: 'Isolation-Admin-2026!', totp: '000000' }
  });
  assert.equal(adminLogin.response.status, 200, adminLogin.text);
  const adminCookie = adminLogin.cookie;
  assert.ok(adminCookie.startsWith('northstar_session='));
  const adminOverview = await call('/api/admin/overview', { cookie: adminCookie });
  assert.equal(adminOverview.response.status, 200, adminOverview.text);
  assert.equal(adminOverview.data.health.status, 'healthy');
  assert.equal(adminOverview.data.health.mongodb, 'not-configured-local-json-adapter');

  await t.test('signed-in Chrome opens the builder and generates a two-color logo storefront', async browserTest => {
    const chrome = process.env.CHROME_BIN || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
    try { await fs.access(chrome); } catch { return browserTest.skip('Set CHROME_BIN to run the browser test'); }
    const http = require('node:http');
    const fixture = http.createServer(async (req, res) => {
      if (req.url === '/fixture') {
        res.setHeader('Content-Type', 'text/html');
        return res.end(`<output id="result">waiting</output><iframe src="/?page=Website%20builder"></iframe><script>
          (async () => {
            const pause = () => new Promise(done => setTimeout(done, 50));
            const frame = document.querySelector('iframe');
            const find = async selector => { for(let i=0;i<150;i++){const el=frame.contentDocument.querySelector(selector);if(el)return el;await pause()}throw Error(selector) };
            await find('#website-generator');
            (await find('[data-page="Instances"]')).click();
            for (const selector of ['.modal-head .close','.modal-actions [data-action="modal-close"]']) {
              (await find('[data-action="new-instance"]')).click();
              (await find(selector)).click();
              if (frame.contentDocument.querySelector('.modal-backdrop')) throw Error('Create dialog stayed open');
            }
            (await find('[data-action="new-instance"]')).click();
            (await find('[data-action="go-provision"]')).click();
            (await find('[data-action="wizard-back"]')).click();
            await find('[data-action="new-instance"]');
            (await find('[data-page="Website builder"]')).click();
            const form = await find('#website-generator');
            form.elements.name.value='Palette Kitchen';
            form.elements.description.value='Project Title: High-Conversion QSR Website & Ordering Platform Overview: Build a modern restaurant site with a bold hero, menu categories, delivery and pickup, appetizing food photography, deals, and mobile checkout.';
            const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
            const ctx=canvas.getContext('2d');ctx.fillStyle='#cc2244';ctx.fillRect(0,0,20,32);ctx.fillStyle='#2277cc';ctx.fillRect(20,0,12,32);
            const blob=await new Promise(done=>canvas.toBlob(done));
            const files=new DataTransfer();files.items.add(new File([blob],'logo.png',{type:'image/png'}));
            form.elements.logo.files=files.files;form.elements.logo.dispatchEvent(new Event('change',{bubbles:true}));
            for(let i=0;i<100&&!form.dataset.brandColor;i++)await pause();
            if (!form.dataset.brandColor || !form.dataset.accentColor) throw Error('missing palette');
            form.requestSubmit();
            await find('.modal-backdrop');
            const data=await fetch('/api/tenant/palette-kitchen/store').then(r=>r.json());
            if(!data.store.brand.logoUrl || data.store.brand.color!==form.dataset.brandColor || data.store.brand.accentColor!==form.dataset.accentColor)throw Error('stored brand mismatch');
            if(data.store.content?.description.includes('Project Title') || data.store.content?.generatedFromDescription!==true)throw Error('website brief was not converted into short storefront copy');
            const preview=await find('.modal-actions a[href^="/?store="]');
            preview.target='_self';preview.click();
            const logo=await find('header img');
            await logo.decode();
            if(logo.getAttribute('src')!==data.store.brand.logoUrl || logo.naturalWidth!==32)throw Error('preview logo mismatch');
            const foodHero=await find('.generated-qsr-hero');
            if(!foodHero.textContent.includes('Golden crunch'))throw Error('generated restaurant hero missing');
            const menuAnchor=await find('.generated-qsr-actions a[href="#shop-menu"]');
            if(!menuAnchor.textContent.includes('Order now'))throw Error('working menu call-to-action missing');
            await find('.generated-qsr-categories [data-mega-category]');
            const theme=frame.contentDocument.documentElement.style;
            if(theme.getPropertyValue('--store-primary')!==data.store.brand.color || theme.getPropertyValue('--store-accent')!==data.store.brand.accentColor)throw Error('preview palette mismatch');
            (await find('[data-shop-add]')).click();
            const checkout=await find('#shop-checkout');
            Object.assign(checkout.elements.name,{value:'Demo Customer'});
            checkout.elements.email.value='shopper@example.test';
            checkout.elements.phone.value='03123456789';
            checkout.elements.address.value='12 Market Street';
            checkout.requestSubmit();
            await find('a[href*="track="]');
            document.querySelector('output').textContent='generated';
          })().catch(e=>document.querySelector('output').textContent=e.message);
        </script>`);
      }
      try {
        const guestRequest=req.url.startsWith('/api/tenant/') || req.headers.referer?.includes('?store=');
        const upstream=http.request(base+req.url,{method:req.method,headers:{...req.headers,host:new URL(base).host,cookie:guestRequest?'':adminCookie}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)});
        upstream.on('error',()=>{res.writeHead(502);res.end()});req.pipe(upstream);
      } catch { res.writeHead(500);res.end(); }
    });
    await new Promise(done=>fixture.listen(0,'127.0.0.1',done));
    try {
      const args=['--headless=new','--disable-gpu','--disable-software-rasterizer','--disable-gpu-compositing','--no-sandbox','--no-first-run','--disable-extensions','--user-data-dir='+path.join(dataDir,'chrome'),'--virtual-time-budget=18000','--dump-dom','http://127.0.0.1:'+fixture.address().port+'/fixture'];
      const {stdout}=await require('node:util').promisify(require('node:child_process').execFile)(chrome,args,{timeout:35000,windowsHide:true,maxBuffer:4000000});
      assert.equal(stdout.match(/<output id="result">([^<]*)/i)?.[1],'generated');
    } finally {fixture.closeAllConnections();await new Promise(done=>fixture.close(done));}
  });

  async function createOwner(suffix) {
    const email = `${suffix}@example.test`;
    const created = await call('/api/admin/generate-website', {
      method: 'POST', cookie: adminCookie,
      body: {
        name: `Isolation ${suffix} ${Date.now()}`,
        description: `A generated test store for tenant isolation checks for ${suffix}.`,
        ownerEmail: email,
        contactEmail: email,
        industry: 'Restaurant & food service'
      }
    });
    assert.equal(created.response.status, 201, created.text);
    const instance = created.data.instance;
    const token = new URL(created.data.setupUrl, base).searchParams.get('setup');
    assert.ok(instance.slug && token, 'website creation must return the tenant and one-time owner setup link');
    const password = `Isolation-${suffix}-Pass-2026!`;
    const accepted = await call('/api/auth/accept-setup', { method: 'POST', body: { token, password } });
    assert.equal(accepted.response.status, 200, accepted.text);
    const reusedSetup = await call('/api/auth/accept-setup', {
      method: 'POST', body: { token, password: `Different-${suffix}-Password-2026!` }
    });
    assert.equal(reusedSetup.response.status, 400, 'owner setup token must be single-use');
    const login = await call('/api/auth/login', { method: 'POST', body: { email, password, totp: '000000' } });
    assert.equal(login.response.status, 200, login.text);
    assert.equal(login.data.user.role, 'owner');
    return { instance, cookie: login.cookie };
  }

  const alpha = await createOwner('alpha');
  const beta = await createOwner('beta');
  assert.notEqual(alpha.instance.slug, beta.instance.slug);

  const ownProducts = await call(`/api/tenant/${alpha.instance.slug}/products`, { cookie: alpha.cookie });
  assert.equal(ownProducts.response.status, 200, ownProducts.text);
  assert.ok(Array.isArray(ownProducts.data.products) && ownProducts.data.products.length > 0);
  const betaProducts = await call(`/api/tenant/${beta.instance.slug}/products`, { cookie: beta.cookie });
  assert.equal(betaProducts.response.status, 200, betaProducts.text);
  const betaProduct = betaProducts.data.products[0];
  assert.ok(betaProduct?.id);

  for (const [index, industry] of [
    'Restaurant & food service', 'Fashion & apparel', 'Grocery', 'Electronics',
    'Services with bookings', 'Digital goods'
  ].entries()) {
    const suffix = 'pack-' + index + '-' + Date.now();
    const email = suffix + '@example.test';
    const generated = await call('/api/admin/generate-website', {
      method: 'POST', cookie: adminCookie,
      body: {
        name: 'Pack flow ' + industry + ' ' + index,
        description: 'Integration checkout test for ' + industry + ' pack.',
        ownerEmail: email, contactEmail: email, industry
      }
    });
    assert.equal(generated.response.status, 201, industry + ': ' + generated.text);
    const packSlug = generated.data.instance.slug;
    const packStore = await call('/api/tenant/' + packSlug + '/store');
    assert.equal(packStore.response.status, 200, industry + ': ' + packStore.text);
    assert.ok(packStore.data.products.length > 0, industry + ' must seed a starter product');
    const sample = packStore.data.products[0];
    const order = await call('/api/tenant/' + packSlug + '/checkout', {
      method: 'POST',
      body: {
        items: [{ productId: sample.id, quantity: 1 }], paymentMethod: 'cod',
        customer: { name: 'Pack Buyer', email: suffix + '-buyer@example.test', address: '89 Sample Lane' }
      }
    });
    assert.equal(order.response.status, 201, industry + ': ' + order.text);
    const tracked = await call('/api/tenant/' + packSlug + '/order-tracking?token=' + encodeURIComponent(order.data.order.trackingToken));
    assert.equal(tracked.response.status, 200, industry + ': order tracking: ' + tracked.text);
    assert.equal(tracked.data.order.id, order.data.order.id);
  }

  const crossTenantRequests = [
    ['catalog read', 'GET', `/api/tenant/${beta.instance.slug}/products`],
    ['product search', 'GET', `/api/tenant/${beta.instance.slug}/products?q=${encodeURIComponent(betaProduct.name)}`],
    ['tenant report', 'GET', `/api/tenant/${beta.instance.slug}/analytics`],
    ['customer export', 'GET', `/api/tenant/${beta.instance.slug}/customers/export`],
    ['resource ID read', 'GET', `/api/tenant/${beta.instance.slug}/products/${betaProduct.id}`],
    ['settings write', 'PATCH', `/api/tenant/${beta.instance.slug}/settings`, { maintenanceMode: true }],
    ['product write', 'PATCH', `/api/tenant/${beta.instance.slug}/products/${betaProduct.id}`, { name: 'Must not be visible' }]
  ];
  for (const [label, method, route, body] of crossTenantRequests) {
    const result = await call(route, { method, body, cookie: alpha.cookie });
    assert.equal(result.response.status, 404, `${label} must be hidden across tenants: ${result.text}`);
    assert.equal(result.data?.error, 'Not found.', `${label} must return the same not-found response`);
    assert.doesNotMatch(result.text, new RegExp(betaProduct.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${label} response must contain no tenant B product data`);
  }

  const alteredHost = await call(`/api/tenant/${beta.instance.slug}/products/${betaProduct.id}`, {
    cookie: alpha.cookie,
    host: `${beta.instance.slug}.localhost:${port}`
  });
  assert.equal(alteredHost.response.status, 404, `changed tenant host must not disclose tenant B data: ${alteredHost.text}`);
  assert.equal(alteredHost.data?.error, 'Not found.');

  const disabledGuestCheckout = await call('/api/admin/instances/' + alpha.instance.id + '/toggles/F-055', {
    method: 'PATCH', cookie: adminCookie, body: { value: false }
  });
  assert.equal(disabledGuestCheckout.response.status, 200, disabledGuestCheckout.text);
  const guestCheckoutDenied = await call('/api/tenant/' + alpha.instance.slug + '/checkout', {
    method: 'POST', body: { items: [{ productId: ownProducts.data.products[0].id, quantity: 1 }], customer: {} }
  });
  assert.equal(guestCheckoutDenied.response.status, 401, 'F-055 off must still require a signed-in customer');
  const customerRegistration = await call('/api/tenant/' + alpha.instance.slug + '/account/register', {
    method: 'POST', body: { name: 'Returning Shopper', email: 'returning@example.test', password: 'Customer-Pass-2026!' }
  });
  assert.equal(customerRegistration.response.status, 201, customerRegistration.text);
  const customerCheckout = await call('/api/tenant/' + alpha.instance.slug + '/checkout', {
    method: 'POST', cookie: customerRegistration.cookie,
    body: { items: [{ productId: ownProducts.data.products[0].id, quantity: 1 }], paymentMethod: 'cod',
      customer: { name: 'Returning Shopper', email: 'returning@example.test', phone: '03123456789', address: '12 Market Street' } }
  });
  assert.equal(customerCheckout.response.status, 201, 'Signed-in checkout must work with guest checkout off: ' + customerCheckout.text);
  const customerHistory = await call('/api/tenant/' + alpha.instance.slug + '/account/orders', {
    cookie: customerRegistration.cookie
  });
  assert.equal(customerHistory.response.status, 200, customerHistory.text);
  assert.ok(customerHistory.text.includes(customerCheckout.data.order.id));
  for (const route of ['/api/admin/overview', '/api/tenant/' + beta.instance.slug + '/account/profile']) {
    const forbidden = await call(route, { cookie: customerRegistration.cookie });
    assert.ok([403, 404].includes(forbidden.response.status), forbidden.text);
  }
  const enabledGuestCheckout = await call('/api/admin/instances/' + alpha.instance.id + '/toggles/F-055', {
    method: 'PATCH', cookie: adminCookie, body: { value: true }
  });
  assert.equal(enabledGuestCheckout.response.status, 200, enabledGuestCheckout.text);
  const elevatedPlan = await call(`/api/admin/instances/${alpha.instance.id}/plan`, {
    method: 'PATCH', cookie: adminCookie, body: { planId: 'pro' }
  });
  assert.equal(elevatedPlan.response.status, 200, elevatedPlan.text);
  for (const feature of ['F-089', 'F-094']) {
    const enabled = await call(`/api/admin/instances/${alpha.instance.id}/toggles/${feature}`, {
      method: 'PATCH', cookie: adminCookie, body: { value: true }
    });
    assert.equal(enabled.response.status, 200, enabled.text);
  }
  const tenantPath = '/api/tenant/' + alpha.instance.slug;
  const sameEmailGuestOrder = await call(tenantPath + '/checkout', {
    method: 'POST',
    body: { items: [{ productId: ownProducts.data.products[0].id, quantity: 1 }], paymentMethod: 'cod',
      customer: { name: 'Guest Shopper', email: 'returning@example.test', phone: '03123456789', address: '14 Market Street' } }
  });
  assert.equal(sameEmailGuestOrder.response.status, 201, sameEmailGuestOrder.text);
  const customerExport = await call(tenantPath + '/account/export', { cookie: customerRegistration.cookie });
  assert.equal(customerExport.response.status, 200, customerExport.text);
  assert.deepEqual(customerExport.data.orders.map(order => order.id), [customerCheckout.data.order.id]);
  assert.ok(!customerExport.text.includes(sameEmailGuestOrder.data.order.id));
  const privateHistory = await call(tenantPath + '/account/orders', { cookie: customerRegistration.cookie });
  assert.equal(privateHistory.response.status, 200, privateHistory.text);
  assert.deepEqual(privateHistory.data.orders.map(order => order.id), [customerCheckout.data.order.id]);
  const ownInvoice = await call(tenantPath + '/orders/' + customerCheckout.data.order.id + '/invoice', { cookie: customerRegistration.cookie });
  assert.equal(ownInvoice.response.status, 200, ownInvoice.text);
  assert.match(ownInvoice.response.headers.get('content-type'), /^application\/pdf/);
  const guestInvoicePath = tenantPath + '/orders/' + sameEmailGuestOrder.data.order.id + '/invoice';
  const restrictedInvoice = await call(guestInvoicePath, { cookie: customerRegistration.cookie });
  assert.equal(restrictedInvoice.response.status, 401, restrictedInvoice.text);
  const privateInvoice = await call(guestInvoicePath + '?token=' + sameEmailGuestOrder.data.order.trackingToken);
  assert.equal(privateInvoice.response.status, 200, privateInvoice.text);
  const enabledGiftCards = await call(`/api/admin/instances/${alpha.instance.id}/toggles/F-075`, {
    method: 'PATCH', cookie: adminCookie, body: { value: true }
  });
  assert.equal(enabledGiftCards.response.status, 200, enabledGiftCards.text);
  const issuedCard = await call(tenantPath + '/gift-cards', {
    method: 'POST', cookie: alpha.cookie, body: { amount: 5 }
  });
  assert.equal(issuedCard.response.status, 201, issuedCard.text);
  assert.match(issuedCard.data.giftCard.code, /^NSG-[A-F0-9]{24}$/);
  const giftOrderBody = { items: [{ productId: ownProducts.data.products[0].id, quantity: 1 }],
    paymentMethod: 'cod', giftCard: issuedCard.data.giftCard.code,
    customer: { name: 'Gift Shopper', email: 'gift@example.test', phone: '03123456789', address: '16 Market Street' } };
  const redeemedGiftCard = await call(tenantPath + '/checkout', { method: 'POST', body: giftOrderBody });
  assert.equal(redeemedGiftCard.response.status, 201, redeemedGiftCard.text);
  assert.equal(redeemedGiftCard.data.order.baseGiftCardApplied, 5);
  const reusedGiftCard = await call(tenantPath + '/checkout', { method: 'POST', body: giftOrderBody });
  assert.equal(reusedGiftCard.response.status, 400, reusedGiftCard.text);
  const giftCardList = await call(tenantPath + '/gift-cards', { cookie: alpha.cookie });
  assert.equal(giftCardList.response.status, 200, giftCardList.text);
  assert.equal(giftCardList.data.giftCards[0].balanceCents, 0);
  assert.equal(giftCardList.data.giftCards[0].codeHash, undefined);
  for (const feature of ['F-125', 'F-074']) {
    const enabled = await call(`/api/admin/instances/${alpha.instance.id}/toggles/${feature}`, {
      method: 'PATCH', cookie: adminCookie, body: { value: true }
    });
    assert.equal(enabled.response.status, 200, enabled.text);
  }
  const creditGrant = await call(tenantPath + '/store-credit', {
    method: 'POST', cookie: alpha.cookie, body: { customerId: customerRegistration.data.account.id, amount: 4 }
  });
  assert.equal(creditGrant.response.status, 200, creditGrant.text);
  assert.equal(creditGrant.data.balanceCents, 400);
  const creditCheckout = await call(tenantPath + '/checkout', {
    method: 'POST', cookie: customerRegistration.cookie,
    body: { items: [{ productId: ownProducts.data.products[0].id, quantity: 1 }],
      paymentMethod: 'cod', useStoreCredit: true,
      customer: { name: 'Returning Shopper', email: 'returning@example.test',
        phone: '03123456789', address: '12 Market Street' } }
  });
  assert.equal(creditCheckout.response.status, 201, creditCheckout.text);
  assert.equal(creditCheckout.data.order.baseStoreCreditApplied, 4);
  const refundCreditGrant = await call(tenantPath + '/store-credit', {
    method: 'POST', cookie: alpha.cookie,
    body: { customerId: customerRegistration.data.account.id, amount: 4 }
  });
  assert.equal(refundCreditGrant.response.status, 200, refundCreditGrant.text);
  const paidCreditOrder = await call(tenantPath + '/checkout', {
    method: 'POST', cookie: customerRegistration.cookie,
    body: { items: [{ productId: ownProducts.data.products[0].id, quantity: 1 }],
      paymentMethod: 'cod', useStoreCredit: true,
      customer: { name: 'Returning Shopper', email: 'returning@example.test',
        phone: '03123456789', address: '12 Market Street' } }
  });
  assert.equal(paidCreditOrder.response.status, 201, paidCreditOrder.text);
  const paidStatus = await call(tenantPath + '/orders/' + paidCreditOrder.data.order.id, {
    method: 'PATCH', cookie: alpha.cookie, body: { paymentStatus: 'paid' }
  });
  assert.equal(paidStatus.response.status, 200, paidStatus.text);
  const refundAmount = Number((Number(paidCreditOrder.data.order.total) / 2).toFixed(2));
  const halfRefund = await call(tenantPath + '/orders/' + paidCreditOrder.data.order.id, {
    method: 'PATCH', cookie: alpha.cookie,
    body: { refund: { amount: refundAmount, reason: 'Partial test refund' } }
  });
  assert.equal(halfRefund.response.status, 200, halfRefund.text);
  const profileAfterHalfRefund = await call(tenantPath + '/account/profile', { cookie: customerRegistration.cookie });
  assert.equal(profileAfterHalfRefund.data.account.storeCreditCents, 200);
  const restRefund = Number((Number(paidCreditOrder.data.order.total) - refundAmount).toFixed(2));
  const finalRefund = await call(tenantPath + '/orders/' + paidCreditOrder.data.order.id, {
    method: 'PATCH', cookie: alpha.cookie,
    body: { refund: { amount: restRefund, reason: 'Remaining test refund' } }
  });
  assert.equal(finalRefund.response.status, 200, finalRefund.text);
  const profileAfterFullRefund = await call(tenantPath + '/account/profile', { cookie: customerRegistration.cookie });
  assert.equal(profileAfterFullRefund.data.account.storeCreditCents, 400);
  const creditProfile = await call(tenantPath + '/account/profile', { cookie: customerRegistration.cookie });
  assert.equal(creditProfile.data.account.storeCreditCents, 400);
  const guestCreditAttempt = await call(tenantPath + '/checkout', {
    method: 'POST', body: { ...giftOrderBody, giftCard: '', useStoreCredit: true }
  });
  assert.equal(guestCreditAttempt.response.status, 401, guestCreditAttempt.text);
  const verifiedReviews = await call(`/api/admin/instances/${alpha.instance.id}/toggles/F-015`, {
    method: 'PATCH', cookie: adminCookie, body: { value: true }
  });
  assert.equal(verifiedReviews.response.status, 200, verifiedReviews.text);
  const reviewBody = { productId: ownProducts.data.products[0].id, name: 'Returning Shopper',
    email: 'returning@example.test', rating: 5, body: 'Good product and quick service.' };
  const forgedReview = await call(tenantPath + '/reviews', { method: 'POST', body: reviewBody });
  assert.equal(forgedReview.response.status, 403, forgedReview.text);
  const ownReview = await call(tenantPath + '/reviews', {
    method: 'POST', cookie: customerRegistration.cookie, body: reviewBody
  });
  assert.equal(ownReview.response.status, 201, ownReview.text);
  assert.equal(ownReview.data.review.verified, true);
  const inventoryHistoryBefore = await call(tenantPath + '/inventory', { cookie: adminCookie });
  if (inventoryHistoryBefore.response.status === 200) {
    assert.equal(inventoryHistoryBefore.data.history, null);
    assert.deepEqual(inventoryHistoryBefore.data.lowStockNotifications, []);
  }
  for (const feature of ['F-024', 'F-034', 'F-025']) {
    const enabled = await call(`/api/admin/instances/${alpha.instance.id}/toggles/${feature}`, {
      method: 'PATCH', cookie: adminCookie, body: { value: true }
    });
    assert.equal(enabled.response.status, 200, enabled.text);
  }
  const inventoryHistory = await call(tenantPath + '/inventory', { cookie: alpha.cookie });
  assert.equal(inventoryHistory.response.status, 200, inventoryHistory.text);
  assert.ok(Array.isArray(inventoryHistory.data.history));
  assert.ok(inventoryHistory.data.history.some(row => row.reason === 'Online sale' &&
    row.productId === ownProducts.data.products[0].id && row.delta === -1), inventoryHistory.text);
  const thresholdSaved = await call(tenantPath + '/settings', {
    method: 'PATCH', cookie: alpha.cookie, body: { inventory: { lowStockThreshold: 5 } }
  });
  assert.equal(thresholdSaved.response.status, 200, thresholdSaved.text);
  for (const stock of [7, 5]) {
    const adjustment = await call(tenantPath + '/inventory', {
      method: 'PATCH', cookie: alpha.cookie,
      body: { productId: ownProducts.data.products[0].id, stock, reason: 'Low-stock alert test' }
    });
    assert.equal(adjustment.response.status, 200, adjustment.text);
  }
  let lowStockEvents = await call(tenantPath + '/inventory', { cookie: alpha.cookie });
  assert.equal(lowStockEvents.response.status, 200, lowStockEvents.text);
  assert.equal(lowStockEvents.data.lowStockNotifications.length, 1, lowStockEvents.text);
  assert.equal(lowStockEvents.data.lowStockNotifications[0].stock, 5);
  const furtherLowStock = await call(tenantPath + '/inventory', {
    method: 'PATCH', cookie: alpha.cookie,
    body: { productId: ownProducts.data.products[0].id, stock: 4, reason: 'Below threshold' }
  });
  assert.equal(furtherLowStock.response.status, 200, furtherLowStock.text);
  lowStockEvents = await call(tenantPath + '/inventory', { cookie: alpha.cookie });
  assert.equal(lowStockEvents.data.lowStockNotifications.length, 1,
    'remaining below threshold must not create duplicate notices');
  for (const stock of [7, 5]) {
    const adjustment = await call(tenantPath + '/inventory', {
      method: 'PATCH', cookie: alpha.cookie,
      body: { productId: ownProducts.data.products[0].id, stock, reason: 'Restock and cross threshold' }
    });
    assert.equal(adjustment.response.status, 200, adjustment.text);
  }
  lowStockEvents = await call(tenantPath + '/inventory', { cookie: alpha.cookie });
  assert.equal(lowStockEvents.data.lowStockNotifications.length, 2,
    'a new downward crossing after replenishment must create another notice');
  for (const feature of ['F-002', 'F-027']) {
    const enabled = await call(`/api/admin/instances/${alpha.instance.id}/toggles/${feature}`, {
      method: 'PATCH', cookie: adminCookie, body: { value: true }
    });
    assert.equal(enabled.response.status, 200, enabled.text);
  }
  const variantProduct = await call(tenantPath + '/products', {
    method: 'POST', cookie: alpha.cookie,
    body: { name: 'Variant alert test', price: 12, stock: 7,
      variants: [{ name: 'Limited option', sku: `VAR-${Date.now()}`, price: 12, stock: 7 }] }
  });
  assert.equal(variantProduct.response.status, 201, variantProduct.text);
  const variantSale = await call(tenantPath + '/checkout', {
    method: 'POST', body: { items: [{ productId: variantProduct.data.product.id,
      variantId: variantProduct.data.product.variants[0].id, quantity: 2 }], paymentMethod: 'cod',
      customer: { name: 'Variant Buyer', email: 'variant-buyer@example.test',
        phone: '03123456789', address: '17 Market Street' } }
  });
  assert.equal(variantSale.response.status, 201, variantSale.text);
  lowStockEvents = await call(tenantPath + '/inventory', { cookie: alpha.cookie });
  assert.ok(lowStockEvents.data.lowStockNotifications.some(row =>
    row.variantId === variantProduct.data.product.variants[0].id && row.stock === 5), lowStockEvents.text);
  const enabledBundles = await call('/api/admin/instances/' + alpha.instance.id + '/toggles/F-005', {
    method: 'PATCH', cookie: adminCookie, body: { value: true }
  });
  assert.equal(enabledBundles.response.status, 200, enabledBundles.text);
  const bundleCreated = await call('/api/tenant/' + alpha.instance.slug + '/products', {
    method: 'POST', cookie: alpha.cookie,
    body: { name: 'Isolation combo', price: 19, stock: 8, bundleItems: [{ productId: ownProducts.data.products[0].id, quantity: 2 }] }
  });
  assert.equal(bundleCreated.response.status, 201, bundleCreated.text);
  assert.deepEqual(bundleCreated.data.product.bundleItems, [{ productId: ownProducts.data.products[0].id, quantity: 2 }]);
  const bundleStore = await call('/api/tenant/' + alpha.instance.slug + '/store');
  const publicBundle = bundleStore.data.products.find(product => product.id === bundleCreated.data.product.id);
  assert.equal(publicBundle.bundleItems[0].name, ownProducts.data.products[0].name);
  const bundleOrder = await call('/api/tenant/' + alpha.instance.slug + '/checkout', {
    method: 'POST',
    body: {
      items: [{ productId: bundleCreated.data.product.id, quantity: 1 }], paymentMethod: 'cod',
      customer: { name: 'Bundle Buyer', email: 'bundle-buyer@example.test', address: '55 Test Road' }
    }
  });
  assert.equal(bundleOrder.response.status, 201, bundleOrder.text);
  const disabledBundles = await call('/api/admin/instances/' + alpha.instance.id + '/toggles/F-005', {
    method: 'PATCH', cookie: adminCookie, body: { value: false }
  });
  assert.equal(disabledBundles.response.status, 200, disabledBundles.text);
  const storeWithoutBundles = await call('/api/tenant/' + alpha.instance.slug + '/store');
  assert.equal(storeWithoutBundles.data.products.some(product => product.id === bundleCreated.data.product.id), false,
    'turning F-005 off must hide bundle products while preserving their data');
  const editDisabledBundle = await call('/api/tenant/' + alpha.instance.slug + '/products/' + bundleCreated.data.product.id, {
    method: 'PATCH', cookie: alpha.cookie, body: { bundleItems: [{ productId: ownProducts.data.products[0].id, quantity: 1 }] }
  });
  assert.equal(editDisabledBundle.response.status, 403, 'disabled F-005 must block bundle writes');

  const revisionBeforeSearch = await call('/api/tenant/' + alpha.instance.slug + '/settings', { cookie: alpha.cookie });
  const disabledSearch = await call(`/api/admin/instances/${alpha.instance.id}/toggles/F-036`, {
    method: 'PATCH', cookie: adminCookie, body: { value: false }
  });
  assert.equal(disabledSearch.response.status, 200, disabledSearch.text);
  const publicStoreWithoutSearch = await call(`/api/tenant/${alpha.instance.slug}/store`);
  assert.equal(publicStoreWithoutSearch.response.status, 200, publicStoreWithoutSearch.text);
  assert.equal(publicStoreWithoutSearch.data.features.some(feature => feature.id === 'F-036'), false,
    'a toggle change must reach the public storefront response immediately');
  const revisionAfterSearch = await call('/api/tenant/' + alpha.instance.slug + '/settings', { cookie: alpha.cookie });
  assert.ok(revisionAfterSearch.data.settings.version > revisionBeforeSearch.data.settings.version,
    'toggle changes must advance the tenant settings revision');
  const enabledSearch = await call(`/api/admin/instances/${alpha.instance.id}/toggles/F-036`, {
    method: 'PATCH', cookie: adminCookie, body: { value: true }
  });
  assert.equal(enabledSearch.response.status, 200, enabledSearch.text);
  const publicStoreWithSearch = await call(`/api/tenant/${alpha.instance.slug}/store`);
  assert.equal(publicStoreWithSearch.response.status, 200, publicStoreWithSearch.text);
  assert.equal(publicStoreWithSearch.data.features.some(feature => feature.id === 'F-036'), true,
    'turning a supported toggle back on must reach the storefront immediately');
  const guestOrder = await call(`/api/tenant/${alpha.instance.slug}/checkout`, {
    method: 'POST',
    body: {
      items: [{ productId: ownProducts.data.products[0].id, quantity: 1 }],
      paymentMethod: 'cod',
      customer: {
        name: 'Guest Buyer',
        email: 'guest-buyer@example.test',
        phone: '+15555550123',
        address: '123 Test Street, Sample City'
      }
    }
  });
  assert.equal(guestOrder.response.status, 201, guestOrder.text);
  assert.equal(guestOrder.data.order.paymentMethod, 'cod');
  assert.equal(guestOrder.data.order.status, 'received');
  const trackedOrder = await call(`/api/tenant/${alpha.instance.slug}/order-tracking?token=${guestOrder.data.order.trackingToken}`);
  assert.equal(trackedOrder.response.status, 200, trackedOrder.text);
  assert.equal(trackedOrder.data.order.id, guestOrder.data.order.id);
  for (const feature of ['F-147', 'F-150']) {
    const enabled = await call(`/api/admin/instances/${alpha.instance.id}/toggles/${feature}`, {
      method: 'PATCH', cookie: adminCookie, body: { value: true }
    });
    assert.equal(enabled.response.status, 200, enabled.text);
  }
  const revisionBeforeSettings = await call('/api/tenant/' + alpha.instance.slug + '/settings', { cookie: alpha.cookie });
  const settingsChanged = await call(`/api/tenant/${alpha.instance.slug}/settings`, {
    method: 'PATCH', cookie: alpha.cookie, body: { maintenanceMode: true }
  });
  assert.equal(settingsChanged.response.status, 200, settingsChanged.text);
  assert.equal(settingsChanged.data.settings.maintenanceMode, true);
  assert.ok(settingsChanged.data.settings.version > revisionBeforeSettings.data.settings.version, 'settings writes must advance the tenant settings revision');
  const undone = await call(`/api/tenant/${alpha.instance.slug}/undo`, {
    method: 'POST', cookie: alpha.cookie, body: {}
  });
  assert.equal(undone.response.status, 200, undone.text);
  const settingsAfterUndo = await call(`/api/tenant/${alpha.instance.slug}/settings`, { cookie: alpha.cookie });
  assert.equal(settingsAfterUndo.response.status, 200, settingsAfterUndo.text);
  assert.equal(settingsAfterUndo.data.settings.maintenanceMode, false, 'settings undo should restore the previous value');
  assert.ok(settingsAfterUndo.data.settings.version > settingsChanged.data.settings.version, 'undo must also advance, not roll back, the settings revision');
  const invite = await call(`/api/tenant/${alpha.instance.slug}/staff`, {
    method: 'POST', cookie: alpha.cookie,
    body: { name: 'Test cashier', email: 'cashier@example.test', role: 'cashier' }
  });
  assert.equal(invite.response.status, 201, invite.text);
  const staffToken = new URL(invite.data.staff.setupLink, base).searchParams.get('staff');
  assert.ok(staffToken, 'staff invite must provide a one-time setup link');
  const staffPassword = 'Isolation-Cashier-2026!';
  const staffAccept = await call('/api/auth/accept-staff', {
    method: 'POST', body: { token: staffToken, password: staffPassword }
  });
  assert.equal(staffAccept.response.status, 200, staffAccept.text);
  const reusedInvite = await call('/api/auth/accept-staff', {
    method: 'POST', body: { token: staffToken, password: 'Different-Cashier-2026!' }
  });
  assert.equal(reusedInvite.response.status, 400, 'staff setup token must be single-use');
  const cashierLogin = await call('/api/auth/login', {
    method: 'POST', body: { email: 'cashier@example.test', password: staffPassword, totp: '000000' }
  });
  assert.equal(cashierLogin.response.status, 200, cashierLogin.text);
  assert.equal(cashierLogin.data.user.role, 'cashier');
  for (const [label, method, route, body] of [
    ['staff administration', 'GET', 'staff'],
    ['owner analytics', 'GET', 'analytics'],
    ['owner settings', 'PATCH', 'settings', { maintenanceMode: true }],
    ['owner backup', 'POST', 'backup', {}]
  ]) {
    const result = await call(`/api/tenant/${alpha.instance.slug}/${route}`, {
      method, body, cookie: cashierLogin.cookie
    });
    assert.equal(result.response.status, 403, `${label} must be forbidden to a cashier: ${result.text}`);
  }
  const customerDeletion = await call(`/api/admin/instances/${alpha.instance.id}/toggles/F-131`, {
    method: 'PATCH', cookie: adminCookie, body: { value: true }
  });
  assert.equal(customerDeletion.response.status, 200, customerDeletion.text);
  const deleteAccount = await call(tenantPath + '/account/delete', {
    method: 'POST', cookie: customerRegistration.cookie,
    body: { password: 'Customer-Pass-2026!' }
  });
  assert.equal(deleteAccount.response.status, 200, deleteAccount.text);
  const guestOrderStillTrackable = await call(tenantPath + '/order-tracking?token=' + sameEmailGuestOrder.data.order.trackingToken);
  assert.equal(guestOrderStillTrackable.response.status, 200, guestOrderStillTrackable.text);
  assert.equal(guestOrderStillTrackable.data.order.id, sameEmailGuestOrder.data.order.id);
});
