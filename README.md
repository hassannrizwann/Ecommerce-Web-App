# Northstar Commerce
- Manual bank transfer (F-071) can be configured under Store Admin → Settings. Customers receive the bank details on the order tracking page and can submit one PNG, JPEG, or PDF receipt (up to 650 KB); authorized store staff can view it from Orders and mark payment paid only after proof exists. This records a manual review and does not connect to a payment processor.

Northstar is a local multi-tenant commerce platform prototype. The app uses React 18 for its browser render root. The Super Admin navigation shell and website builder are native React components; the larger existing single-file storefront and admin workflows are mounted through a React compatibility component while they are migrated. Frontend code stays in `index.html` and backend/API code stays in `backend.js`; the backend serves the app and API from the same address. React and React DOM are installed locally and served only through the app backend.

## Start and open the app

1. Install Node.js 20 or newer.
2. Open PowerShell in this folder. Run `npm install` once.
3. Run `npm test` to execute the local platform smoke checks (including a headless Chrome startup check when Chrome is installed) plus an isolated two-owner integration test for one-time setup links, test-order checkout/tracking, live toggle changes, 24-hour undo, cross-tenant reads/writes/searches/exports, altered host headers, and cashier owner-only access.
4. Start the app with `npm start` and leave that terminal open.
5. Open the platform at [http://localhost:4174](http://localhost:4174), or go straight to [Website Builder](http://localhost:4174/?page=Website%20builder).
   Opening `index.html` directly also redirects to the server URL; keep the backend running in its terminal. This local development server uses HTTP; HTTPS needs a trusted certificate and deployment/domain configuration.
6. Sign in with the Super Admin account configured for this local installation. On a fresh install, the terminal prints the initial credentials and demo two-factor code.

In the Super Admin sidebar, choose **Website builder**, enter a business name and description, and choose **Generate website**. The new instance appears under **Instances**. Its storefront preview opens at `http://localhost:4174/?store=<subdomain>`. The owner opens the one-time setup link shown in the creation dialog, chooses a password, and completes the saved setup wizard. The local demo signup also shows its 24-hour setup link after provisioning. Store owners, managers, and cashiers have separate sign-in experiences.

The backend health endpoint is [http://localhost:4174/healthz](http://localhost:4174/healthz). Its `integrations.mongodb` field says `connected-atlas` when Atlas is connected, `configured-unavailable` when a URI is set but the running backend cannot reach Atlas, and `not-configured-local-json-adapter` when only local JSON persistence is active. Check the live endpoint instead of assuming a previous connection is still active. The Super Admin sidebar **View system status** action also fetches this endpoint live and displays MongoDB, tenant database count, payments, mail, messaging, storage, background queue, domains/SSL, and TLS status; **Check again** refreshes the values.

## MongoDB Atlas

The backend loads `MONGODB_URI` and `MONGODB_CONTROL_DB` from the private `.env` file. Keep `.env` private; do not paste the URI or database password into chat or commit it. If setting up another machine, copy `.env.example` to `.env`, add the Atlas connection URI, ensure the Atlas database user has access, and allow the machine's IP under Atlas Network Access. When Atlas is unavailable, the app keeps serving read-only pages, still allows sign-in, rejects data changes, and retries the connection every 15 seconds. In Atlas open **Security → Network Access → Add IP Address → Add Current IP Address**, save it, and wait for the rule to become active; check `/healthz` again for `connected-atlas`. A firewall or network policy that blocks outbound MongoDB traffic can cause the same timeout. Avoid `0.0.0.0/0` for a normal setup. Never paste the connection URI or database password into chat.

The platform control database is `northstar_control`. Each tenant has its own database named with its immutable instance ID. Tenant state is currently stored as a snapshot document per tenant database. Daily snapshots are also retained locally and in the control database with a 30-day expiry. This keeps the prototype easy to run; it is not yet the production collection/index and database-user-per-tenant architecture in the SRS.

## Current implementation
- Super Admin → Settings saves platform identity and reserved subdomains to the control database. Fixed platform-reserved names are protected; domain values are validated as hostnames, and the page shows the actual authenticator-configuration state from `/healthz`.
- Super Admin → Plans & billing now reads the saved control-database plans. Owners can create plans and edit their name, price, currency, approval requirement, and included features; plan billing itself still needs a subscription provider.
- Super Admin → Industry packs → Create pack saves custom business packs with validated categories, starter products, and feature IDs. Saved packs are available in the website builder and are stored with the platform control data.
- Guest checkout (F-055) creates a COD order without a customer session only when the store’s plan and feature toggle allow it; authenticated checkout remains available when guest checkout is off. F-048 is persistent cart. The order’s public tracking token is tested end to end.
- Store Admin settings (F-110, F-113) accept up to 30 custom plain-text pages and 20 internal/HTTPS navigation links; the server validates slugs, duplicate pages, sizes, and link schemes, and the storefront escapes all page content.
- Storefront font selection (F-105) is guarded by the plan and an allowlist. F-121 exposes owner-managed title and description metadata in the storefront head. F-122 serves per-store-aware `/sitemap.xml` and a `robots.txt`; the sitemap includes only active, approved stores whose plan enables the feature. Checkout uses browser street-address autofill when F-058 is enabled.
- Bank transfer proof files are tenant-scoped, counted in storage usage, included in local and Atlas backup snapshots, restored with the tenant, and removed after the deletion-recovery window.

- Related products (F-043) are matched by catalog category. Recommended for you (F-044) prioritizes categories from recent browsing, saved items, and available account order history.
- Cart upsells (F-062) suggest in-stock, simple products related to the current bag; customers can add a suggestion without leaving checkout.
- Scheduled delivery slots (F-065) let customers select half-hour times within saved store hours; the backend revalidates the date, weekday hours, and time before accepting checkout. Weight and destination-based shipping (F-079) lets owners define country/postal-prefix zones with a base fee and per-kilogram rate, set product weights, preview a destination quote at checkout, and have checkout recalculate the authoritative fee after discounts. Missing zone coverage blocks delivery instead of silently charging the wrong rate.
- Tipping (F-064) offers optional 5%, 10%, 15%, or 20% checkout tips; the server validates the choice and records the tip separately while adding it to the order total.
- Promotion rules include buy X, get Y free (F-052), scheduled start/end times for flash offers (F-053), and per-customer redemption limits (F-054); checkout validates them and stores the applied code on each order.
- Quick view (F-040) opens a product detail dialog with a working close button. Wishlist (F-041) and recently viewed (F-042) lists are scoped by store and saved in the customer browser.
- Multiple inventory locations (F-030) support per-branch stock counts; branch transfers (F-031) preserve aggregate stock and add an audit entry.
- Backorders (F-028), pre-orders (F-029), and supplier purchase orders (F-033) are supported; receiving a purchase order increases stock and records the adjustment.
- Stock availability badges (F-026) show in stock, low quantity, sold out, or digital file availability on enabled storefronts. Barcode scanning (F-032) stores unique product barcodes and lets the cashier scan/search them in POS; pressing Enter adds a unique match. Product variants (name, SKU, optional price override, and optional per-variant stock) are editable as JSON in the owner Products screen when F-002 is enabled. Storefront customers and POS cashiers select variants; checkout and POS validate the selected variant, total at its override price, and deduct variant stock when F-027 is enabled.
- Digital products (F-012) accept private PDF, ZIP, TXT, EPUB, MP3, or MP4 files up to 650 KB. Files are stored under the local data directory, hidden from public product responses, and served only from paid order tracking links with a 30-day expiry and five-download limit. Owners can record payment status from the order list. Backups and object-storage hosting for these files still need a production adapter.
- Custom staff roles (F-140) can be created with granular product, inventory, order, customer, promotion, analytics, POS, branding, and inbox permissions. Owners can invite or reassign staff into a custom role, change a staff account between invited, active, and disabled (activation requires accepted credentials), and edit or delete unused roles. The backend resolves permissions from the tenant role definition on each request.
- Self-signup captures owner name, email, business name, type, and description; it checks the requested subdomain while typing. Local demo signup returns a one-time owner setup link that expires after 24 hours.
- Product Q&A (F-016) lets shoppers submit questions on active product cards. Store owners and managers can answer, approve, or reject them; only approved questions and answers are public.
- Quote requests (F-153) collect a contact-consented service inquiry, details, optional budget/date, and contact information; owners and managers can review requests and update status, quote amount, and internal note.
- Appointment booking (F-152) lets customers request half-hour slots within store hours; owners/managers can confirm, decline, complete, or cancel requests, with duplicate confirmed slots rejected.

- Order notes (F-059) are optional at checkout, limited to 500 characters, saved with the order, and shown in the owner order list.
- Gift wrap and messages (F-060) are an optional complimentary checkout choice; the request and message are validated, saved with the order, and shown in the owner order list.
- Staff activity (F-144) shows recent audited actions for the selected store to owners and managers.
- Store branding saves the storefront name and colour; F-103 owners can upload a JPEG, PNG, WebP, or GIF logo (650 KB maximum) that renders in the storefront and is stored, counted, backed up, and cleaned up with tenant media. The storefront announcement bar (F-045) is editable from Store branding, limited to 180 characters, and only renders when the feature is effective.
- Product categories (F-006) can be created, renamed, and deleted from the owner Products page. Product assignment uses the managed category list; categories in use must be reassigned before deletion.
- Product tags (F-007) can be edited as comma-separated labels and appear on storefront cards. Size guides (F-019) can be edited per product and displayed in a storefront disclosure panel. Scheduled publishing (F-018) and time-based availability (F-020) support owner-set local times converted to UTC. Products outside their active windows are hidden from public store/product APIs and POS and rejected by checkout and POS.
- Custom product attributes are owner-managed JSON text/number/boolean values when F-013 is enabled and appear on storefront cards.
- Product image galleries accept up to 20 HTTP(S) image URLs or JPEG, PNG, WebP, and GIF uploads (650 KB each) per product when F-008 is enabled. Uploaded images are type-checked, stored under tenant-scoped `runtime-data/media`, served through a constrained `/media/` route, included in local and deletion-recovery backups, counted in tenant storage usage, and removed when a product or expired tenant is deleted. Storefront galleries open full-size images; F-009 enables hover zoom. Production-managed object storage and CDN delivery still require an external adapter.
- 360-degree product views (F-010) use 8–72 HTTPS image frames entered from the owner product editor and an accessible range control on the storefront.

- Product videos (F-011) accept validated YouTube, Vimeo, or HTTPS MP4 links and render responsively on storefront cards when enabled. The platform stores links rather than hosting video files.
- Product add-on/modifier groups can be defined in the owner editor when F-003 is enabled. Required groups are enforced at checkout and POS when F-004 is enabled; server-side totals include selected add-on prices and saved orders keep the selection snapshot.
- Bulk product editing is available when F-022 is enabled: select products and apply a price, stock, category, SKU, or visibility update. The server validates the entire selection before writing any changes.
- If Atlas is configured but its connection is unavailable, the backend still serves the local app and health endpoint, reports `configured-unavailable`, allows cached GET reads, and rejects API writes until Atlas reconnects. It retries the connection in the background rather than presenting local JSON writes as Atlas saves.
- Product CSV import/export is available when F-017 is enabled. Imports validate the complete file and report row-level errors without partially adding products.

- Super Admin sign-in, instance list and status/plan controls, audit log, support sessions, plans, the 168-entry feature catalog, industry packs, and business name/description website generation. Deleting an instance requires typing its exact name, saves a recovery backup, hides the store, and allows Super Admin restore for 30 days; a daily cleanup removes its tenant database and local files after the recovery window. Per-instance Super Admin exports are queued in the local backend, saved as JSON archives, polled for completion, audited, and expire after seven days. For production, the in-process export queue must be replaced with the durable job queue described in the SRS. Super Admins can issue one-time owner password reset links from an instance; the owner sets a new password within 24 hours. The local mail adapter prints the link to the backend terminal; set `PUBLIC_BASE_URL` when links must point to a deployed host. A support session now opens the selected Store Owner workspace with a visible reason/expiry banner; each Store Admin page visit and tenant API route is audited under the Super Admin identity, and ending support restores the Super Admin session. Password and authenticator changes are blocked during support access. Owner email notification is logged by the local console adapter until a mail provider is configured.
- Website Builder treats instruction-like descriptions as generation briefs instead of printing them as storefront copy. Restaurant briefs generate short customer-facing copy, a food-led hero with working menu link, clickable menu-category chips, and distinct starter menu descriptions and categories. Uploaded logos still provide the storefront primary and accent colors.
- Storefront uses an accessible slide-out cart drawer when F-047 is enabled.
- Storefront search, typo tolerance, autocomplete, facets (category, price, rating, custom attributes), and sort controls follow F-035 through F-039 in all storefront renderers.
- Checkout and POS aggregate repeated product lines before validating and decrementing inventory, preventing duplicate cart rows from overselling a product within the running app process.
- Tenant storefront with active products, a persistent cart when enabled, cash-on-delivery checkout, discount codes, order tracking links, downloadable PDF invoices with tax breakdowns, customer return requests, moderated product reviews, customer accounts with saved addresses/order history/data export/deletion, a tenant-scoped contact inbox, and consent-based newsletter sign-up/unsubscribe.
- Store Owner admin with setup progress, product create/edit/activate/delete, configurable low-stock threshold and dashboard alerts, inventory adjustments and history, orders, customers, analytics, discount codes, returns, contact inbox, newsletter subscriber export, branding, store settings, plan-available feature switches, staff invitations, review moderation, and backup download when included in the plan.
- F-142 shift reports summarize period sales, expected cash, recorded closing cash, and variances by cashier; closing a shift reconciles against sales.
- Manager access is permission-limited. Cashiers get a POS screen with product search, cash sales, shift opening/closing, and printable receipts when F-143 is enabled. Store Owners can export customer account/address data or erase a customer's personal data; retained orders are anonymized.
- Store analytics include selectable 7-, 30-, and 90-day sales activity; product performance, customer reports, and analytics CSV export follow their catalog feature switches.
- Store Owners can configure a tax rate/region and tax-inclusive pricing when enabled. Checkout and POS apply the tax on the server, show the tax breakdown, and provide a date-filtered tax report.
- Store Owners can configure seven-day opening hours; the F-114 storefront panel displays each day and its hours.
- Maintenance mode (F-147) is available to owners when enabled in the store plan: it pauses the public storefront with a maintenance message and blocks public product and checkout API access until reopened. Staff can continue to sign in.
- Storefront customers can switch between enabled English and Urdu; the choice is saved per store and Urdu applies right-to-left layout.
- English and Urdu language settings, including right-to-left direction, and a protected API for tenant data.
- Atlas and local persistence, daily backup snapshots, 30-day retention, backup restore for Super Admins, and CSV exports.

- When F-087 is enabled, Store Admin → Orders includes a print-friendly packing slip with recipient, shipping address, and item quantities. F-100 adds a separate print-friendly order ticket for kitchen or fulfillment use.

- Store Admin → Orders offers print-friendly documents when enabled: F-087 packing slips show the recipient, shipping address, and item quantities; F-100 order tickets show fulfillment type, customer, item quantities, and total.

- F-099 scheduled orders share the half-hour date/time selector and saved store hours with F-065; both storefront input and server checkout validate the selected delivery slot.

- F-090 partial fulfillment is available in Store Admin → Orders when enabled. Staff record shipped quantities per line; the backend prevents reducing shipped counts or shipping more than the customer ordered and records unfulfilled, partially fulfilled, or fulfilled state.

- F-098 adds separate restaurant kitchen tickets from Store Admin → Orders when enabled. They show order type and item quantities without customer email or payment totals.

- F-095 enables owner edits to customer contact and delivery details on pending or processing orders. The backend validates emails, limits field lengths, blocks edits after fulfillment begins, and records the change in the order timeline.

- F-087 provides both a print-friendly packing slip and a recipient shipping label in Store Admin → Orders. The label is a blank printable address label; paid postage and carrier-specific barcode labels require a courier provider.

- F-086 lets order staff assign or clear an active staff member as delivery driver. The validated assignment appears on the customer tracking response when the feature is enabled; courier tracking and live GPS still need a courier integration.

- F-093 adds exchange requests to the customer return portal: customers describe the replacement they want, and authorized staff can approve, reject, or mark the exchange complete. Exchanges do not move inventory automatically; staff must fulfill the replacement order through their normal workflow.

- F-097 table ordering lets owners maintain a table ID/name list and download locally generated QR codes. Scanning a code opens that store with the table selected, forces dine-in checkout for the configured table, validates the table again on the server, and includes the table name on the customer tracking response.

- F-119 provides a per-store redirects list, validates unique local source and target paths, and returns permanent redirects only when the matching active store and feature are enabled. It does not allow redirects to external websites.

- F-109 allows owner-managed custom CSS for a small allowlist of storefront selectors and visual properties. The backend rejects URLs, at-rules, scripts, unsupported selectors/properties, and unsafe values, then scopes the saved rules to the public storefront.

- F-108 allows owners to configure up to eight HTTPS hero images. Storefront visitors can move through them with labeled previous/next controls; image URLs are validated server-side.

- F-106 provides a per-store light/dark theme preference: owners set the default in Branding, and storefront visitors can toggle and retain their choice for that store in their browser. The dark palette is scoped to the storefront.
- F-111 blog publishing is available in Store Admin → Settings as validated JSON posts (slug, title, excerpt, plain-text body, published state); only posts explicitly marked published appear in the storefront journal.
- F-116 exposes a Store Admin domain health check that reports configured base-domain/host mapping, custom-domain mapping, TLS state, and local-preview limitations; it does not claim to verify DNS propagation or issue certificates.
- F-120 lets an eligible store owner explicitly hide the storefront platform attribution from Branding; the footer stays visible until the owner opts out.
- F-128 groups owner-visible customers into New, Repeat, and Loyal segments based on their completed order count; the segment is calculated dynamically and only shown when the feature is enabled.
- F-129 awards one point per whole US dollar of net paid spend, exposes the signed-in customer balance, and permits only that authenticated customer to redeem points at 100 points per $1.00 checkout discount. Pending/rejected/refunded orders do not earn points; refunds reduce earned value.
- F-130 issues account referral codes, accepts them only from a signed-in customer on that account’s first order, blocks self-referrals, and awards 500 points to the referrer plus 250 to the referred customer after an eligible $1+ order is paid. Rewards feed the F-129 balance.
- F-107 lets owners choose the order of featured images, announcement, welcome content, opening hours, and the product section. Settings are validated and applied to the storefront without changing admin layout.

- F-092 lets authorized order staff record manual partial or full refunds for paid orders. Refunds use cent-accurate arithmetic, cannot exceed the captured order total, retain a reason and actor in the order timeline, and never claim to transfer money through a gateway.

- F-128 groups owner-visible customers into New, Repeat, and Loyal segments based on their order count; the segment is calculated dynamically and only shown when the feature is enabled.

- F-057 gives signed-in returning customers a validated three-step checkout (contact, delivery, payment/review), prefilled with their account contact details and default saved delivery address when available.

- F-150 now exposes an owner undo control for the latest settings, branding, or feature-toggle change within 24 hours. Undo restores dependent feature toggles together and advances the settings version.

- F-046 adds an accessible keyboard and pointer category mega-menu to eligible storefronts; selecting a category updates the existing product filter.

- F-151 provides contextual owner help for every feature toggle, with a plain-language description, example, prerequisite names, and a link that opens the matching help panel.

- The audit log now hash-links new records and anchors pre-existing entries to a migration checkpoint; Super Admin → Audit log → Verify integrity checks entry hashes, chain order, current head, and the legacy checkpoint. This is application-level tamper evidence; production-grade immutable storage still requires a separately permissioned append-only audit sink.

- Industry-pack provisioning now computes the transitive prerequisite closure and enables only pack features whose prerequisites are included in the selected plan; ineligible features remain off instead of being seeded into an ineffective state.

- F-163 adds an owner-only accounting ledger CSV export with optional inclusive date filters. Each refund is dated independently, and range filters include refunds on their own date even if the original order is outside the range. Sale, payment, and refund rows balance in the order's recorded currency; this report does not initiate payments or replace accounting review.

- F-168 adds a public Google-style RSS/XML product feed at `/api/tenant/{storeSlug}/marketplace-feed`. It includes active, currently publishable products only and is available only when the feature is effective for that store.

- F-162 adds owner-managed, read-only REST API keys. Keys are shown once, stored as SHA-256 hashes, scoped to product/order-summary/analytics reads, expire by default, and can be revoked immediately.

- F-160 adds an owner-configured GA4 measurement ID and visitor consent controls. The script stays unloaded unless the visitor accepts, page-view URLs omit query strings, and analytics consent can be changed later.

- F-161 lets owners register signed HTTPS webhook endpoints for `order.created` and `order.updated` events, queue manual test events, view recent delivery statuses, disable endpoints, and retry failures up to five times. Outbound targets are restricted to public IPv4 HTTPS hosts; payloads omit customer contact and tracking details.

- F-164 external POS access can use a tenant-scoped API key: `external-pos/products` reads the permitted catalog and `external-pos/sale` records sales only while F-164 is active.

- F-165 supports Slack and Discord incoming webhook alerts for new and updated orders, with private endpoint URLs, manual test alerts, status history, retries, and immediate disable.

- F-166 provides owner downloads, API-key-protected product/order CSV feeds, and a copyable Google Apps Script refresh template; values are formula-escaped and order exports omit customer contact details.

- F-167 adds owner-managed Zapier, Make, n8n, and custom catch-hook connectors using the signed, retried F-161 delivery queue.

- F-034 shows the latest 100 recorded stock changes in Store Admin → Inventory. The history includes manual adjustments, transfers, purchase order receipts, online checkout, and POS sales from the time each operation began recording changes.

- F-025 now creates a tenant-scoped low-stock alert when stock crosses from above the configured threshold to at or below it through manual adjustments, online checkout, or POS sales; tracked variant stock is included. The owner dashboard shows current low-stock products and recent crossing events; a product staying below threshold does not create duplicate notices, while restocking above and crossing again creates a new event. The event queue is local-only until an email provider is configured.

- F-015 verified-buyer reviews require a signed-in customer account with an order for that product. Entering a buyer's email as a guest does not grant verified status.

- F-075 lets the Store Owner issue a gift card from Discounts, copy its one-time code, and see its remaining balance. Customers can apply that code at checkout. The balance is reduced by the order amount up to the available credit and cannot be spent again after depletion. These are owner-issued prepaid codes; online gift-card purchase and payment collection need a gateway.

- F-074 lets the Store Owner add or remove a registered customer's store credit from Customers. The signed-in customer sees the balance and may apply it at checkout. Credit is stored in cents per tenant and deducted when the order is created. Partial and full recorded refunds restore the matching prepaid credit once, up to the amount used on that order.

## Requirements still needing work or external setup

Customer order history and loyalty balances use the account recorded at signed-in checkout. Older orders without an account ID and guest orders stay separate from account history. Customers can use the original private tracking link when one exists.

This build does **not** implement every requirement in the supplied SRS yet. It is a local prototype, not a production deployment. Remaining work includes feature-specific handlers and screens for many of the 168 toggles; real subscription checkout and storefront card payments; real email, SMS, and WhatsApp delivery (including customer account verification, low-stock alerts, and notifications); verified custom-domain DNS and SSL; production object storage and CDN delivery; richer variant management; live carrier rates, courier integrations, and fulfilment-provider services; production-grade staff-role and authenticator-reset operations; and accessibility, performance, security, load, restore, and cross-tenant reviews. Staff TOTP enrollment and recovery codes are implemented by F-145; Super Admin TOTP is verified when `ADMIN_TOTP_SECRET` is configured.

Those integrations need provider choices, credentials, and hosting/DNS access. Card data must stay with a payment gateway and must never be stored by this app. Do not expose the local development server to the public internet.



