# Northstar Commerce local application specification

## Scope and acceptance additions

This edition includes the supplied master specification below. The following requirements record the owner's subsequent decisions for the local delivery. The original PDF retains the authoritative layout for tables.

| ID | Requirement | Acceptance |
| --- | --- | --- |
| LOCAL-01 | Serve the React interface and Node API from one local address. Maintain one frontend source and one backend source. | The browser loads the admin sign-in page from localhost on port 4174. Opening the HTML file redirects to the server. |
| LOCAL-02 | Let a Super Admin generate a website from a business name and description. Business type, logo and contact details are optional. | Selecting a pack overrides inference. Without a selection, a restaurant description produces a restaurant storefront. |
| LOCAL-03 | Preview and save the uploaded company logo and its colors. | A two-color logo produces primary and accent swatches. The generated storefront uses the saved logo and palette. A single-color logo may use a lighter accent. |
| LOCAL-04 | Provide working instance creation, guided setup and storefront navigation. | Close and Cancel dismiss the creation dialog. Start guided setup opens step one. Cancel on step one returns to Instances. The generated website opens from its instance. |
| LOCAL-05 | Give the admin dashboard a coherent palette, responsive controls and visible keyboard focus. Keep generated sites branded for their business. | Inspect dashboard, builder and storefront at desktop and mobile widths. Changing the retailer logo affects its storefront palette. |
| LOCAL-06 | Use MongoDB Atlas for persistent application data. Keep delivery local pending the owner's deployment decision. | Health reports the connected control database. A generated site remains accessible after a backend restart. |

## Verification status

The automated suite currently passes 44 tests. Its Chrome builder regression uses a signed-in session on an isolated local backend, creates a website with a two-color logo, and compares its saved branding with the preview. Tenant integration coverage includes cross-tenant access controls, Atlas/local adapter health behavior, customer data export/deletion, checkout/refunds, inventory history, and low-stock alerts for manual stock changes and variant checkout threshold crossings. The local running service reports MongoDB Atlas connected. The production provider checks, full accessibility review, load targets, restore exercise, and other acceptance gates below still require independent verification. See README.md for operating instructions and known gaps.

## Local implementation decisions

The owner's later instructions take precedence over the draft technology and release choices in the supplied PDF. The local delivery uses React in a single `index.html` frontend, a single Node `backend.js` API, and the owner's MongoDB Atlas cluster. The local server is the review URL. GitHub and Vercel deployment are deferred by the owner.

The builder accepts a business name and a website brief describing the type of site to build, its content, audience, features, and visual direction. Instruction-like briefs guide the generated layout and are converted to concise customer-facing copy instead of being printed verbatim. Industry is inferred when no pack is selected. A logo upload is optional. When supplied, its sampled colors inform the storefront palette. Generated sites remain separate tenant instances that the Super Admin can open from the dashboard.

The 168 feature IDs describe the target product catalog. A feature's presence in the catalog does not, by itself, prove its screen, server workflow, provider integration, and acceptance tests are complete. The current implementation and provider gaps are tracked in README.md. Owner-issued gift cards and owner-granted customer store credit work at local checkout. Online gift-card purchase, production payment collection, real message delivery, domain certificates, and hosted storage still need implementation or external setup.

For local acceptance, the sign-in page, Website Builder, instance creation dialog, guided setup controls, logo upload, generated storefront, checkout, tenant isolation, and MongoDB health must work from the served localhost URL. The automated browser and API checks cover important paths, while the full PDF's accessibility, load, security, restore, and deployment gates remain separate acceptance work.

## Supplied master specification


## Source page 1

Master Software Requirements
Specification
Multi-Tenant Website and Ecommerce Platform
A web application that generates a branded, fully working store or business website
for each client on request, governed from a single owner-only Admin Portal.
Version 1.0 (master, consolidated draft for review)
Date 18 November 2026
Prepared for Hassan Rizwan, platform owner and sole Super Admin
Built from Reference 1: the original project brief (prompt). Reference 2: SRS text version 1.0. Reference 3: SRS PDF
(owner @Saad).
Status Draft for review. Business decisions are listed in section 14.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 1


## Source page 2

Contents
1. Introduction 4
1.1 Purpose . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
1.2 What "clone" means in this product . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
1.3 Product type . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
1.4 Scope . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
1.5 Definitions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
1.6 References . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
2. Overall Description 5
2.1 The two parts . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
2.2 Instance lifecycle . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
2.3 Operating environment . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
2.4 Constraints and assumptions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
2.5 Relationship to the existing prototype . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
3. Roles and Permissions 6
4. Functional Requirements 6
4.1 Admin Portal (Super Admin) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
4.2 Self-signup and provisioning . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
4.3 Site generation (business name to branded site) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8
4.4 Setup wizard . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8
4.5 Toggle engine behaviour . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8
4.6 Storefront . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
4.7 Store Admin . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
4.8 POS cashier . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
4.9 Branding . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
4.10 Domains . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10
4.11 Language . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10
5. Toggle Engine 10
5.1 Evaluation order . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10
5.2 Rules . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10
5.3 Tests . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
6. Feature Toggle Catalog 11
6.1 Catalog and products . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
6.2 Inventory . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
6.3 Storefront discovery . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
6.4 Cart, checkout and promotions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
6.5 Payments . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13
6.6 Shipping and fulfilment . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 2


## Source page 3

6.7 Orders, returns and tax . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13
6.8 Brand, domain, content and language . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14
6.9 Customers and marketing . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14
6.10 Staff, POS and operations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 15
6.11 Analytics and integrations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 15
7. Industry Packs and Business-Type Adaptation 16
7.1 Industry packs . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
7.2 Worked example: a chain restaurant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
7.3 Handling a new business type . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
8. Multi-Tenancy and Data Isolation 16
8.1 Tenant resolution . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
8.2 Subdomain rules . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
8.3 Custom domains . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17
8.4 Decision record: database per instance . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17
8.5 Cross-tenant tests . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17
8.6 Backups . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17
9. Architecture and Stack 17
9.1 Components . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 18
9.2 Risks and mitigations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 18
9.3 Payments and PCI scope . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 18
10. Non-Functional Requirements 18
11. Usability Requirements 19
12. External Interfaces 19
13. Acceptance Criteria 19
14. Decisions, Open Issues and Risks 20
14.1 Decisions needed . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
14.2 Open issues and risks . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
Appendix A. Source Traceability and Conflicts Resolved 20
Appendix B. Glossary of Requirement ID Prefixes 21
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 3


## Source page 4

1. Introduction
1.1 Purpose
This document is the single master specification for a multi-tenant web platform. The platform owner (Super
Admin) runs an Admin Portal that only the owner can access. Clients ask for a website for their business, for
example a restaurant, and the platform builds a complete, branded, working store from one shared template. Each
client store is called an instance. The build team implements and tests against this document.
It merges three references. Where they agreed, the requirement appears once. Where they differed, the master
decision is recorded in Appendix A. Nothing was dropped silently.
1.2 What "clone" means in this product
The product builds a new site for a client from a shared template and an industry pack (restaurant, fashion, grocery
and so on), filled with the client's own business name, logo and content. It does not copy the pages, images, text,
brand marks or code of any existing third-party website. Layout patterns such as a Shopify-style store come from
the platform's own template. This boundary is requirement GN-07.
1.3 Product type
A web application that runs in the browser on desktop and mobile. Native iOS and Android apps are out of scope.
1.4 Scope
• In scope: the owner-only Admin Portal, public self-signup and provisioning, the site generation flow, the
feature-toggle engine and catalog, industry packs, the per-instance storefront and Store Admin, a cashier (POS)
screen, branding, subdomains and custom domains, English and Urdu with right-to-left layout.
• Out of scope: native mobile apps; building payment gateways (the platform integrates with them); marketplace
features where one shopper buys from many instances in one cart; scraping or copying third-party sites.
1.5 Definitions
Term Meaning
Instance One store with its own subdomain, database, branding, plan, toggles, staff and customers.
Super Admin The platform owner. Holds every permission on every instance. Every use is logged.
Store Owner The client who buys a plan and runs an instance.
Manager, Cashier Store staff with limited permissions.
Customer A shopper on an instance.
Plan A named bundle of toggles and limits (for example Starter, Growth, Pro) that decides which toggles an
instance may use.
Toggle A feature switch with an ID (F-###), a default state and prerequisites.
Template The shared storefront and admin code used by every instance. Branding changes data, not code.
Industry pack A data file that presets toggles, starter categories, sample copy and recommended settings for a business
type.
Impersonation A Super Admin session that acts as a Store Owner for support.
Control database The platform database: instances, plans, toggle catalog, toggle settings, billing, platform users, audit log.
Tenant database The MongoDB database of one instance, named by instance ID.
1.6 References
Reference 1: project brief (prompt). Reference 2: Software Requirements Specification, text version 1.0, 18
November 2026. Reference 3: Software Requirements Specification, PDF, owner @Saad, 18 November 2026.
Technical: Next.js, Node.js, Vercel, MongoDB Atlas and MongoDB Compass documentation; PCI DSS SAQ
guidance; WCAG 2.1 AA.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 4


## Source page 5

2. Overall Description
2.1 The two parts
Part 1, Admin Portal (Super Admin only). Creates and approves instances, sets each instance's plan and
toggles, overrides any setting, locks toggles, signs in as a store owner for support (visible banner and audit entry),
resets owner passwords, exports data, suspends instances, and sees usage and billing. Only the platform owner
can reach it. Every action is logged.
Part 2, Storefront and Store Admin (per instance). Buyers create their own instance on the public website by
entering a business name, choosing a plan and paying. Each instance is its own store for the buyer's customers.
All instances use the same template and components.
2.2 Instance lifecycle
• A buyer enters a business name and business type on the platform website and creates an account.
• The system proposes a subdomain, picks the matching industry pack and generates a logo from the name. The
buyer chooses a plan and pays.
• After payment is confirmed, the system provisions the instance: control record, tenant database with indexes,
default toggles for the plan, seed content from the pack, and the Store Owner account.
• If manual approval is required for the plan, the Super Admin reviews the generated site. Until approved, only the
owner and Super Admin can view it.
• The setup wizard guides the owner to a published product.
• The owner runs the store. Toggles, branding, staff and domains are managed from the Store Admin.
• The Super Admin can suspend, export or delete the instance. Billing failure moves it to suspended after a grace
period.
2.3 Operating environment
Next.js (App Router) frontend and Node.js backend (route handlers and server actions) on one Vercel deployment
that serves every instance. MongoDB Atlas for data. Developers inspect data with MongoDB Compass under
read-only Atlas roles, logged.
2.4 Constraints and assumptions
• One codebase serves all instances. A separate Vercel project per client is not used.
• Data for each instance lives in its own MongoDB database.
• Server code runs as short-lived functions, so connections are reused and no long-running process is assumed.
• Card data never touches platform servers; the payment gateway handles it.
• Plan prices, billing provider and commission rates are business decisions entered as configuration, never
hard-coded.
• Clients supply their logo, store name and catalog, or enter them in the setup wizard. Owners have basic
computer literacy and no developer help.
• The payment gateway is chosen per plan and is available in the buyer's country.
2.5 Relationship to the existing prototype
A prototype exists (Express API, Next.js, MongoDB) with Super Admin, Admin and User roles, a shared database
separated by an admin ID, and a business-name restaurant website flow (generated logo, menu and deals, admin
approval, public page with cash-on-delivery orders). Mapping:
• Super Admin stays Super Admin. Admin becomes Store Owner. User becomes Customer. Manager and
Cashier are new.
• The prototype's Site becomes an Instance. The restaurant layout becomes the restaurant industry pack plus its
toggles.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 5


## Source page 6

• The shared-database model is replaced by database-per-instance (section 8). Express routes are ported to
Next.js route handlers.
• Admin approval of a site becomes optional per plan (SA-17).
3. Roles and Permissions
Capability Super Admin Store Owner Manager Cashier Customer
Create, provision, suspend, delete instances Yes No No No No
Set plans and toggle availability per plan Yes No No No No
Override or lock any setting on an instance Yes No No No No
Sign in as owner for support (banner and Yes No No No No
audit)
Reset owner password Yes No No No No
View platform usage, billing and audit logs Yes Own billing No No No
Turn plan-included toggles on or off Yes Yes No No No
Edit branding and content Yes Yes Yes No No
Domain and store settings Yes Yes View No No
Manage staff accounts and roles Yes Yes Cashiers only No No
Manage products, inventory, collections Yes Yes Yes View No
Process orders, refunds, returns Yes Yes Yes Own shift orders Own orders
Coupons, discounts and promotions Yes Yes Yes Apply only Use
View reports and store analytics Yes Yes Yes Own shift only No
Use POS screen Yes Yes Yes Yes No
Export instance data Yes Yes No No Own data
Browse, buy, review (verified), request Yes Yes Yes Yes Yes
returns, manage own profile and addresses
• Permissions are checked on the server on every request, using the role and account status stored in the
instance database, not only the token. Hiding a button is not enforcement. A suspended account is refused
immediately.
• A Manager or Cashier cannot grant themselves a permission. Only a Store Owner or Super Admin changes
roles.
• A Store Owner cannot enable a toggle that the plan excludes.
• Each role check is covered by an automated test per endpoint.
4. Functional Requirements
4.1 Admin Portal (Super Admin)
The portal uses the same left-sidebar layout as the Store Admin. Every action on it writes an audit log entry.
ID Requirement Acceptance criterion
SA-01 Owner-only access. The portal lives on a reserved host (for example Any non-Super-Admin account, and any
admin.platform-domain) and accepts only Super Admin accounts. There is tenant host, requesting portal pages or
no public signup for it. The platform owner is the sole initial Super Admin; APIs gets not-found or refusal. Verified
further Super Admins can only be added by an existing one. Two-factor by automated test.
sign-in is mandatory, sign-in is rate-limited, sessions expire, and an optional
IP allowlist can be set.
SA-02 Create an instance from a form: name, logo, industry pack, plan, owner Instance record, database, owner
email, subdomain, language. invitation and subdomain exist within 60
seconds, or the failing step is shown.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 6


## Source page 7

ID Requirement Acceptance criterion
SA-03 Check subdomain availability against reserved and taken names. A reserved or taken name is refused with
the reason; the check runs as the owner
types.
SA-04 Assign or change an instance's plan. Toggles outside the new plan switch off
and the owner sees a notice.
SA-05 Edit plans and the toggles each plan includes. A saved plan change applies to all
instances on that plan within 60 seconds.
SA-06 Override any instance setting. A badge shows on the setting; old and
new values are recorded.
SA-07 Force a toggle on or off for one instance and lock it. The owner's control is disabled and
shows a lock icon.
SA-08 Sign in as a Store Owner for support. A reason is entered first. Fixed banner for the whole session
naming the instance; expires after 30
minutes; start, end, reason and every
page visited are logged with the Super
Admin's identity; cannot change the
owner's password, email or two-factor
setting; the owner is emailed with time
and reason.
SA-09 Reset a Store Owner's password. The owner gets a one-time setup link and
must set a new password; no password
is ever shown.
SA-10 Export an instance's data. A per-instance archive generated in the
background and logged with requester
and time.
SA-11 Suspend, resume or delete an instance. Suspended storefront shows a notice
page, data is kept, admin access is
limited to Super Admin and billing.
Deletion requires typing the instance
name and keeps a recoverable copy for
30 days.
SA-12 View usage per instance: orders, products, storage, active staff, API calls. Shown for the selected period.
SA-13 View billing status, invoices and failed payments. A billing failure moves the instance to
suspended after the grace period.
SA-14 Search the audit log by actor, instance, action and date. Entries cannot be edited or deleted by
any role.
SA-15 Manage reserved subdomains and platform-wide settings. Changes are logged with before and after
values.
SA-16 Run a data migration across selected or all instances. Per-instance success or failure is shown;
a failed run can resume.
SA-17 Approval queue: require manual approval per plan before an instance goes Until approved, only the owner and Super
public, and review generated sites. Admin can view the storefront.
SA-18 Manage the toggle catalog and industry packs. A toggle with no registered code handler
cannot be saved; prerequisite cycles are
rejected.
4.2 Self-signup and provisioning
ID Requirement Acceptance criterion
PV-01 A buyer enters business name, business type, email and password. The Proposal appears before payment.
system proposes a subdomain from the name.
PV-02 Subdomains are checked against the reserved list and existing names A taken name returns a suggestion.
before payment (rules in section 8.2).
PV-03 The buyer picks a plan and pays on the public website. Provisioning starts A failed payment creates nothing.
only after payment is confirmed.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 7


## Source page 8

ID Requirement Acceptance criterion
PV-04 Provisioning creates the control record, the tenant database with indexes, If any step fails everything is rolled back
default toggles for the plan, seed data from the industry pack, and the owner and the buyer is told to retry.
account.
PV-05 The owner receives a one-time setup link, not an emailed password. No password appears in email or on
screen.
PV-06 Provisioning completes in normal conditions within 60 seconds. Measured end to end.
4.3 Site generation (business name to branded site)
ID Requirement Acceptance criterion
GN-01 Intake captures business name, business type, language, contact details, Only name and type are mandatory.
and optionally the owner's own logo, description and items.
GN-02 The business type maps to an industry pack. An unknown type falls back to No request ends in an error page.
a general store pack and the request is logged as configuration, extension
or custom work (section 7.3).
GN-03 A logo is generated from the business name (initials on a brand colour). The Logo exists at provisioning.
owner can replace it later.
GN-04 Seed content from the pack: starter categories, sample items and deals, Seed items are marked as samples and
sample copy, opening hours, recommended toggles. are editable and deletable.
GN-05 Theme colours and fonts are derived from the logo and pack. The site uses No per-client code exists.
the shared template; branding changes data, not code.
GN-06 The generated site is public after provisioning, or after approval when the Unapproved site is private.
plan requires it (SA-17).
GN-07 Cloning boundary: the platform reproduces layout patterns through its own No import-from-URL feature exists in
template and packs. It does not copy or scrape another site's content, version 1.
images, brand marks or code. Clients supply their own content.
GN-08 Restaurant example: the restaurant pack sets menu categories, items with A restaurant instance can take a
prices, deals, opening hours and branches; the wizard asks for these cash-on-delivery order after setup.
instead of generic products.
4.4 Setup wizard
ID Requirement Acceptance criterion
SW-01 After first sign-in the owner sees a wizard: store name and logo, colours, Each step has plain-language help.
contact details, industry pack, first product or menu item, shipping, payment
method, publish.
SW-02 A new owner reaches a published product within 30 minutes. Usability test with five non-technical
owners.
SW-03 Progress is saved. The owner can leave and resume. Resume returns to the last step.
SW-04 At least one payment method must be enabled before publish. Publish is blocked with a clear message
otherwise.
4.5 Toggle engine behaviour
ID Requirement Acceptance criterion
TG-01 Effective state follows the evaluation order in section 5.1. Unit test per catalog entry.
TG-02 Effective toggles are cached per instance for at most 30 seconds and Change reaches every instance within 60
refreshed immediately in the process that handled a change. seconds.
TG-03 Every route and UI section checks its toggle. A disabled feature returns a Disabled routes return the defined error.
clear error, never a broken page.
TG-04 The toggle page shows plain-language names, a one-sentence description, Present for all catalog entries.
an example, a help link and prerequisites.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 8


## Source page 9

ID Requirement Acceptance criterion
TG-05 Turning on a toggle with a missing prerequisite shows it with a one-click Owner confirms; undo available 24 hours.
action to enable it. Turning off a prerequisite lists dependents and offers to
turn them off too.
TG-06 Settings changes (toggles and branding) can be undone for 24 hours from a Undo restores the previous value and is
history list. logged.
4.6 Storefront
ID Requirement Acceptance criterion
SF-01 Shopify-style layout: header with search and cart, product grid with filters, Grid loads first 24 items within the load
product page, one-page checkout. target.
SF-02 Product pages show gallery, variants, price, stock indicator and reviews, Toggle off hides the section.
each only if its toggle is on.
SF-03 Search is typo tolerant and shows suggestions as the customer types. Per toggle.
SF-04 Cart drawer, promo codes and free-shipping progress behave as defined by Per toggle.
their toggles.
SF-05 One-page checkout for guests: contact, address, shipping and payment on Completes in one screen.
one screen.
SF-06 Returning customers complete checkout in three steps with saved address Customer confirms in three steps.
and payment.
SF-07 Stock is deducted atomically at order creation so two customers can never Concurrency test.
buy the last unit.
SF-08 Order confirmation, tracking page and email follow the enabled notification Confirmation shows order number, items,
toggles. total and expected time.
4.7 Store Admin
ID Requirement Acceptance criterion
AD-01 Left-sidebar admin with card-based pages: products, inventory, orders, Every page uses the shared component
customers, discounts, analytics, settings, toggles. set.
AD-02 Order status changes and notes update the customer's tracking timeline Notice sent only when the notice toggle is
and trigger notifications. on.
AD-03 Low-stock alerts appear on the dashboard and by email when the toggle is Alert fires at threshold.
on.
AD-04 Returns can be approved, rejected or refunded. Logged.
AD-05 Staff are invited by email and assigned Manager or Cashier. With the role Cashier cannot reach owner-only pages
editor toggle the owner may define custom roles. by URL or API.
AD-06 Bulk CSV import and export. Row-level errors shown; nothing is
imported if any row fails.
AD-07 Clear error messages naming the field, what is wrong and how to fix it. Reviewed per release.
4.8 POS cashier
ID Requirement Acceptance criterion
PS-01 A cashier searches or scans a product, builds a sale and takes cash or Sale creates an order.
card.
PS-02 A shift records opening cash, sales and closing cash; a report shows Report per shift.
differences.
PS-03 A cashier sees only their own shift totals. Verified by test.
4.9 Branding
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 9


## Source page 10

ID Requirement Acceptance criterion
BR-01 Owners change logo, store name, text, colours, fonts and any other Each change previews before publish.
branding setting the template exposes.
BR-02 All instances use the same template and components. Branding changes data, not code.
BR-03 Uploaded images are validated for type and size and served from storage Invalid files are refused with a reason.
with caching.
4.10 Domains
ID Requirement Acceptance criterion
DM-01 Every instance gets a subdomain by default. Live after provisioning.
DM-02 Middleware resolves the host to an instance and then to its tenant database. Tested with changed host headers.
Unknown hosts get a not-found page.
DM-03 With custom domain on, the owner adds a domain, sees the DNS records, Serves only after verification and
and the platform verifies them and issues SSL. certificate.
DM-04 Removing a custom domain stops its traffic and keeps the default Default subdomain unaffected.
subdomain.
4.11 Language
ID Requirement Acceptance criterion
LN-01 Storefront, Store Admin and Admin Portal support English and Urdu. Urdu Visual test of each page in both
uses right-to-left layout. directions.
LN-02 Customers can switch language at any time and the choice is remembered. Persists across visits.
LN-03 Owners can enter product text in either language; the storefront shows the Falls back to the other language if
customer's chosen language. missing.
5. Toggle Engine
The platform adapts to any business by data, not by code branches. A toggle is a record in the catalog, and each
instance stores only its own choices.
5.1 Evaluation order
• If the Super Admin has locked the toggle, use the locked value.
• Otherwise, if the Super Admin has overridden it, use the override.
• Otherwise, if the Store Owner has set it, use the owner's choice, provided the plan includes it.
• Otherwise, use the plan default, then the catalog default. A default applies only if the plan includes the toggle.
• A toggle that is on still evaluates to off if any prerequisite is off. The engine reports which prerequisite blocks it.
5.2 Rules
ID Rule
TG-R1 The Super Admin sets which toggles each plan includes. A toggle outside the plan cannot be turned on by the owner.
TG-R2 The Store Owner may turn on any toggle in their plan. Managers cannot change toggles.
TG-R3 The Super Admin can force a toggle on or off for one instance and lock it.
TG-R4 A change takes effect within 60 seconds with no redeploy. Each instance's settings carry a version number that
increases on every change; servers cache for at most 30 seconds and refetch by version.
TG-R5 Pages that depend on toggles are rendered per request or revalidated at 30 seconds or less, so a static cache cannot
hold an old state.
TG-R6 Turning a toggle off hides its UI and blocks its API routes but never deletes its data. Hidden data returns when it is
turned on again.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 10


## Source page 11

ID Rule
TG-R7 Saving a catalog change runs a cycle check on the prerequisite graph and rejects any cycle.
TG-R8 A toggle with no registered code handler cannot be saved to the catalog.
5.3 Tests
• Every catalog entry has a test for its default state and prerequisite list.
• A test suite runs every industry pack through setup, then checks checkout and order flow on each.
• Toggle changes are tested against the 60-second propagation target.
6. Feature Toggle Catalog
The merged catalog holds 168 toggles (61 default On, 107 default Off), combining Reference 2's 120 and
Reference 3's 120 and removing duplicates. IDs are renumbered F-001 to F-168; older IDs from the references are
retired. Default is the state when an instance is created, applied only if the plan includes the toggle. Which toggles
belong to which plan is a business decision (section 14).
6.1 Catalog and products
ID Feature Default Requires
F-001 Simple products On None
F-002 Product variants (size, colour, SKU) On F-001
F-003 Modifiers and add-ons Off F-001
F-004 Required option groups (e.g. pick one drink) Off F-003
F-005 Bundles and combo products Off F-001
F-006 Categories and collections On None
F-007 Product tags On None
F-008 Multiple product images and gallery On None
F-009 Image zoom On F-008
F-010 360-degree product view Off F-008
F-011 Product videos Off F-008
F-012 Digital products and downloads Off F-001
F-013 Custom product attributes Off F-001
F-014 Product reviews and ratings On None
F-015 Verified-buyer reviews only Off F-014
F-016 Product questions and answers Off None
F-017 Bulk CSV import and export On F-001
F-018 Scheduled publishing Off None
F-019 Size guide Off F-002
F-020 Time-based availability Off F-006
F-021 Time-based menus Off F-020
F-022 Bulk editing Off F-001
F-023 Product creation from photo Off F-001
6.2 Inventory
ID Feature Default Requires
F-024 Stock tracking with real-time deduction On None
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 11


## Source page 12

ID Feature Default Requires
F-025 Low-stock alerts On F-024
F-026 Stock indicator on product page On F-024
F-027 Stock per variant Off F-002, F-024
F-028 Backorders Off F-024
F-029 Pre-orders Off F-028
F-030 Multiple locations and branches Off F-024
F-031 Stock transfers between locations Off F-030
F-032 Barcode scanning Off None
F-033 Suppliers and purchase orders Off F-024
F-034 Inventory audit history Off F-024
6.3 Storefront discovery
ID Feature Default Requires
F-035 Product search On None
F-036 Typo-tolerant search On F-035
F-037 Search autocomplete On F-035
F-038 Faceted filters (price, category, rating, attributes) On None
F-039 Sort options On None
F-040 Quick-view modal On None
F-041 Wishlist Off F-125
F-042 Recently viewed Off None
F-043 Related products On None
F-044 Recommended for you Off F-125
F-045 Announcement bar and banners On None
F-046 Mega-menu navigation Off F-006
6.4 Cart, checkout and promotions
ID Feature Default Requires
F-047 Slide-out cart drawer On None
F-048 Persistent cart On None
F-049 Free-shipping progress bar On F-047, F-080
F-050 Promo and discount codes On None
F-051 Automatic promotions Off F-050
F-052 Advanced discount rules (buy X get Y) Off F-051
F-053 Timed flash sales Off F-051
F-054 Per-customer coupon limits Off F-050, F-125
F-055 Guest checkout On None
F-056 One-page checkout On None
F-057 Three-step checkout for returning customers On F-125
F-058 Address autocomplete Off None
F-059 Order notes Off None
F-060 Gift wrap and message Off None
F-061 Abandoned-cart emails Off F-048, F-132
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 12


## Source page 13

ID Feature Default Requires
F-062 Cart upsells Off F-047
F-063 Minimum order amount Off None
F-064 Tipping Off None
F-065 Scheduled delivery slot Off None
F-066 Multiple currencies Off None
6.5 Payments
ID Feature Default Requires
F-067 Cash on delivery On None
F-068 Card payments through the gateway Off None
F-069 Digital wallets Off F-068
F-070 Buy now, pay later Off F-068
F-071 Manual bank transfer with proof upload Off None
F-072 Local gateway (Easypaisa, JazzCash) Off None
F-073 Deposits and partial payments Off F-068
F-074 Store credit Off F-125
F-075 Gift cards Off None
F-076 Saved payment methods Off F-068, F-125
F-077 Refunds through the gateway Off F-068
6.6 Shipping and fulfilment
ID Feature Default Requires
F-078 Flat-rate shipping On None
F-079 Weight and zone-based shipping Off None
F-080 Free-shipping threshold On None
F-081 Local pickup and store pickup locations Off None
F-082 Live carrier rates Off F-079
F-083 Shipment and order tracking page On None
F-084 Courier integration Off None
F-085 Delivery zones, radius and fees Off None
F-086 Driver assignment Off F-085
F-087 Packing slips and shipping labels Off F-089
F-088 Automated order status updates On None
6.7 Orders, returns and tax
ID Feature Default Requires
F-089 Order management dashboard On None
F-090 Partial fulfilment Off F-089
F-091 Self-service return portal On F-125
F-092 Refund management On F-089
F-093 Exchanges Off F-091
F-094 PDF invoices On F-089
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 13


## Source page 14

ID Feature Default Requires
F-095 Order editing after placement Off F-089
F-096 Order types: dine-in, takeaway, delivery Off None
F-097 Table ordering with QR codes Off F-096
F-098 Kitchen ticket routing Off F-089, F-096
F-099 Scheduled orders Off F-020
F-100 Printed receipts and tickets Off F-089
F-101 Tax rules and calculation On None
F-102 Tax-inclusive pricing Off F-101
6.8 Brand, domain, content and language
ID Feature Default Requires
F-103 Custom logo and store name On None
F-104 Theme colours On None
F-105 Font selection On None
F-106 Light and dark mode Off F-104
F-107 Reorderable homepage sections (page sections editor) On None
F-108 Hero image slider Off F-107
F-109 Custom CSS (sanitised) Off F-104
F-110 Custom pages (about, policies) On None
F-111 Blog and content pages Off F-110
F-112 Contact form On None
F-113 Navigation menus and footer On F-110
F-114 Opening hours On None
F-115 Default subdomain On None
F-116 Domain health check On F-115
F-117 Custom domain Off F-115
F-118 Automatic SSL for custom domain Off F-117
F-119 URL redirects manager Off F-110
F-120 Remove platform branding Off None
F-121 SEO meta tools and per-page SEO fields On None
F-122 Sitemap and robots.txt On F-121
F-123 English interface On None
F-124 Urdu interface with right-to-left layout On None
6.9 Customers and marketing
ID Feature Default Requires
F-125 Customer accounts On None
F-126 Saved addresses On F-125
F-127 Order history and tracking On F-125
F-128 Customer groups and segments Off F-125
F-129 Loyalty points Off F-125
F-130 Referral program Off F-125
F-131 Customer data export and deletion On F-125
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 14


## Source page 15

ID Feature Default Requires
F-132 Email notifications (order status and account) On None
F-133 SMS notifications Off None
F-134 WhatsApp notifications Off None
F-135 Newsletter signup Off F-132
F-136 Email marketing campaigns Off F-128, F-135
F-137 Social login Off F-125
F-138 Push notifications Off None
6.10 Staff, POS and operations
ID Feature Default Requires
F-139 Staff accounts On None
F-140 Custom role and permission editor Off F-139
F-141 POS cashier screen Off F-139
F-142 Shift and cash-drawer reports Off F-141
F-143 Receipt printing at POS Off F-141
F-144 Staff activity log Off F-139
F-145 Two-factor sign-in for staff Off F-139
F-146 One login across several stores Off F-139
F-147 Maintenance mode Off None
F-148 Store backup download Off None
F-149 Setup wizard On None
F-150 24-hour undo for settings On None
F-151 Plain-language help links On None
F-152 Appointment booking Off F-020
F-153 Quote requests Off F-089
F-154 Ticket and event sales Off F-068
6.11 Analytics and integrations
ID Feature Default Requires
F-155 Sales analytics dashboard On F-089
F-156 Product performance report Off F-089
F-157 Customer report Off F-125
F-158 Data and report export (CSV) On None
F-159 Tax report Off F-101
F-160 Web analytics connector Off None
F-161 Outgoing webhooks Off None
F-162 REST API keys Off None
F-163 Accounting ledger export Off F-158
F-164 External point-of-sale connector Off F-024
F-165 Chat app order alerts Off F-089
F-166 Spreadsheet sync Off F-158
F-167 Automation platform connector Off F-161
F-168 Marketplace product feed Off F-001
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 15


## Source page 16

7. Industry Packs and Business-Type Adaptation
7.1 Industry packs
A pack is a data file that sets default toggles, starter categories, sample copy and recommended settings. A pack
changes defaults only; the owner can change any of them later. Packs at launch: restaurant and food service,
fashion and apparel, grocery, electronics, services with bookings, and digital goods. The suggested presets below
are starting points to be confirmed with pilot clients.
Pack Suggested toggles turned on
Restaurant and food service F-003 Modifiers and add-ons, F-004 Required option groups, F-005 Bundles and combo products,
F-021 Time-based menus, F-096 Order types: dine-in, takeaway, delivery, F-097 Table ordering with
QR codes, F-098 Kitchen ticket routing, F-100 Printed receipts and tickets, F-114 Opening hours,
F-067 Cash on delivery
Fashion and apparel F-002 Product variants, F-019 Size guide, F-027 Stock per variant, F-041 Wishlist, F-040 Quick-view
modal, F-014 Product reviews and ratings
Grocery F-025 Low-stock alerts, F-032 Barcode scanning, F-063 Minimum order amount, F-065 Scheduled
delivery slot, F-085 Delivery zones, radius and fees, F-099 Scheduled orders
Electronics F-013 Custom product attributes, F-016 Product questions and answers, F-014 Product reviews and
ratings, F-005 Bundles and combo products, F-029 Pre-orders
Services with bookings F-152 Appointment booking, F-020 Time-based availability, F-153 Quote requests, F-068 Card
payments through the gateway
Digital goods F-012 Digital products and downloads, F-068 Card payments through the gateway, F-075 Gift cards,
F-131 Customer data export and deletion
7.2 Worked example: a chain restaurant
An instance for a fried-chicken chain starts from the restaurant pack. Its owner turns on modifiers, option groups,
bundles, time-based menus, order types and receipts. The owner adds a burger combo with a required drink
choice, a lunch menu that hides after 16:00, and a discount code for a weekday deal. No developer is needed.
7.3 Handling a new business type
• Most needs are combinations of existing capabilities. A new business type is usually a new pack, not new code.
Custom product attributes and option groups let owners describe unusual products.
• A request the catalog cannot meet is logged as one of three kinds. Configuration: existing toggles solve it.
Extension: a new toggle is added and goes through the template release process. Custom work: quoted
separately.
• Template changes reach all instances through one release. Each toggle change is checked against the
prerequisite graph and pack tests before deployment.
8. Multi-Tenancy and Data Isolation
8.1 Tenant resolution
• Next.js middleware reads the request host and resolves it to an instance ID, using a cached lookup in the
control database, before any page or route runs.
• An unknown host returns a not-found page. A suspended instance returns the suspension notice.
• Route handlers and server actions receive the resolved instance ID. They never accept a tenant ID from the
request body.
• Caches include the instance ID in every key. A shared key could show one store's page to another.
8.2 Subdomain rules
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 16


## Source page 17

• 3 to 30 characters: lowercase letters, digits and single hyphens, not starting or ending with a hyphen.
• Reserved names are refused: www, app, api, admin, auth, billing, support, status, mail, static, cdn, login, signup
and the platform brand name.
• The check runs against taken and reserved names and returns a suggestion when a name is taken.
8.3 Custom domains
Off by default. The owner adds a domain, creates the DNS record shown, and the platform verifies it. The domain
serves the store only after verification and an issued certificate. The default subdomain keeps working.
8.4 Decision record: database per instance
Decision: one MongoDB database per instance, named by instance ID and never typed by a user. The alternative
was a shared database with an instance ID on every document (the current prototype).
Factor Database per instance (chosen) Shared database
Isolation Strong. A missing filter cannot leak data across Weak. One missed filter leaks data.
stores.
Backup, restore, export, delete of Simple. Needs filtering and careful scripts.
one store
Heavy store slowing others Easier to contain and move. Shared indexes and collections.
Schema migrations Run once per instance. Run once.
Collection and connection counts Grow with instances. Constant.
Cost at small scale Higher overhead. Lower.
• Each instance database has its own Atlas database user with access to that database only. The control
database holds the instance registry, plans, catalog and audit log.
• The data access layer requires a tenant handle on every query. A query without one fails in code review and in
an automated test.
• Mitigations: a migration runner that tracks a schema version per instance and can resume (SA-16); one
MongoDB client reused per function, selecting the database from it so connections do not grow with instance
count; confirm Atlas limits on databases and collections before reaching 1,000 instances.
8.5 Cross-tenant tests
• For every read, write, export and search endpoint, a test signed in as a user of instance A requests a resource
ID belonging to instance B. The expected result is not-found with no data in the body.
• Tests also cover guessed IDs, changed host headers and reused tokens.
• The suite runs on every release. A failure blocks the release.
8.6 Backups
Each instance database is backed up daily and kept for 30 days. A restore affects only that instance and is tested
monthly.
9. Architecture and Stack
Layer Choice Role
Frontend Next.js (App Router) Storefront, Store Admin and Admin Portal pages
Backend Node.js via route handlers and server Business logic, payments, webhooks, jobs
actions
Hosting Vercel One deployment serves every instance
Data MongoDB Atlas Control database plus one database per instance
Data tools MongoDB Compass Developer access under read-only Atlas roles, logged
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 17


## Source page 18

Layer Choice Role
Files Object storage with a prefix per instance Logos, product photos, exports
Email, SMS, Transactional providers Order and account notices
WhatsApp
Payments One gateway adapter per gateway Card and wallet payments, refunds
Jobs Scheduled functions and a queue Backups, billing checks, abandoned-cart emails, low-stock
digests, exports, bulk imports
9.1 Components
• Control database: instances, plans, toggle catalog and settings, billing, platform users, audit logs.
• Tenant database: products, orders, customers, staff, coupons, reviews and settings of one instance.
• Tenant middleware: host to instance to tenant handle (section 8.1).
• Toggle service: resolves effective toggles per instance (section 5).
• Auth: signed sessions or tokens carry the instance ID and role; role and status are rechecked against the
tenant database on each request. Admin Portal auth is separate (SA-01).
9.2 Risks and mitigations
• Many databases on one cluster: verify Atlas limits on namespaces per cluster and load-test at 1,000
instances before launch.
• Serverless connections: keep one MongoDB client per cluster.
• Long jobs: exports and bulk imports run on a queue, not inside a request, because function time limits are
short.
• Cost: each instance adds storage and index overhead; price plans so the storage limit covers it.
• Developer access: Compass connections expose personal data; use read-only roles by default and log each
access.
• Hosting: a separate Vercel project per client is not recommended (project and domain limits, slow builds, many
deployments).
9.3 Payments and PCI scope
The storefront sends the customer to the gateway's hosted fields or page. The platform stores a gateway token
and the last four digits only. Card numbers never enter platform logs or databases.
10. Non-Functional Requirements
ID Category Requirement Measure
NFR-01 Platform Web application in current desktop and mobile Last two versions of Chrome, Edge, Firefox,
browsers; no native apps Safari; iOS and Android browsers
NFR-02 Accessibility WCAG 2.1 AA on storefront and admin Automated scan plus manual keyboard and
screen-reader test each release
NFR-03 Payments Card data handled only by the gateway; PCI DSS Annual SAQ; no card field on platform pages
scope limited to the gateway
NFR-04 Availability 99.5% monthly uptime About 3.6 hours allowed downtime in a
30-day month
NFR-05 Backup Daily backup per instance, 30-day retention, Restore of a sample instance in under 60
single-instance restore minutes, tested monthly
NFR-06 Scale Supports 1,000 active instances Load test at 1,000 instances with the target
traffic mix
NFR-07 Performance Storefront load of 2.5 s or less on mobile 4G Largest Contentful Paint at or under 2.5 s on
throttled 4G
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 18


## Source page 19

ID Category Requirement Measure
NFR-08 Configuration Toggle and setting changes take effect within 60 Measured from save to first changed
seconds, no redeploy response
NFR-09 Security TLS everywhere; passwords hashed with a slow Security review before launch; penetration
algorithm; sessions expire; rate-limited sign-in; staff test yearly
two-factor; secrets in environment configuration, never
in the database in plain text
NFR-10 Audit Every Super Admin, support and staff action logged Entries cannot be edited or deleted by any
with actor, time, instance and before and after values; role
append-only
NFR-11 Localisation English and Urdu with right-to-left layout on every Visual test of each page in both directions
screen
NFR-12 Usability New owner publishes a product within 30 minutes Usability test with five non-technical owners
NFR-13 Data location Customer data region chosen to suit the target market Atlas region confirmed (decision D-5)
and data-protection rules
11. Usability Requirements
• US-01 The setup wizard gets a new owner to a published product in 30 minutes.
• US-02 Toggles use plain language, show help links and examples, and guide the owner through prerequisites.
• US-03 Settings changes can be undone for 24 hours.
• US-04 Error messages say what went wrong and what to do next.
• US-05 Returning customers check out in three steps.
• US-06 English and Urdu with right-to-left layout are available on every screen.
• US-07 Cards-and-sidebar layout is identical across the Store Admin and the Admin Portal.
12. External Interfaces
• Payment gateways (card, wallets, buy now pay later, local gateways such as Easypaisa and JazzCash). One
adapter per gateway.
• Email provider, plus SMS and WhatsApp providers.
• Courier and carrier APIs.
• DNS and certificate management for custom domains and SSL.
• Platform billing provider for plan subscriptions.
• Object storage for uploads and exports.
13. Acceptance Criteria
• A buyer signs up, pays, and the instance is live with correct default toggles within 60 seconds; a failed payment
creates nothing.
• A site generated from a business name and type (for example a restaurant) can take a test order after setup.
• Only a Super Admin can reach the Admin Portal; every other role and every tenant host is refused.
• Turning a toggle on or off changes the storefront and API within 60 seconds with no redeploy, and a plan
change reaches all instances on the plan within 60 seconds in a load test.
• All 168 toggles have a default, prerequisites and a passing test.
• The cross-tenant test suite passes on every endpoint with zero leaks.
• A Cashier cannot reach owner-only pages by URL or API.
• The support sign-in shows the banner, expires after 30 minutes and writes audit entries.
• A new owner publishes a product within 30 minutes with five non-technical owners.
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 19


## Source page 20

• The storefront and admin pass automated and manual WCAG 2.1 AA checks and the mobile 4G load target.
• Restore of one instance succeeds within 60 minutes and affects no other instance.
• Platform load test passes at 1,000 instances.
• Security review and gateway PCI scope review are signed off.
14. Decisions, Open Issues and Risks
14.1 Decisions needed
# Question Recommendation
D-1 Owner credentials: emailed password or setup link? One-time setup link; the owner sets their own password.
D-2 Does the owner learn when a Super Admin signs in Yes. Email with time and reason.
as them?
D-3 How long is the audit log kept? Two years, then archive; confirm against accounting or legal rules per
market.
D-4 Which payment gateways at launch? One gateway per launch country first; add others as adapters.
D-5 Where is customer data stored? Confirm the Atlas region against the target market and
data-protection rules.
D-6 Who sets plan prices, commission and the billing Business decision outside this SRS; the platform stores the values
provider? only.
D-7 Which toggles go into which plan? Not decided. This SRS sets catalog defaults only.
D-8 Should the Admin Portal have an IP allowlist from Recommended, as the owner is the only user.
day one?
14.2 Open issues and risks
• Atlas limits on databases and collections per cluster tier must be confirmed before choosing a tier for 1,000
instances, and proven by load test.
• Per-instance restore from Atlas snapshots may need a scripted export if snapshot restore is cluster-wide.
• Vercel function limits affect long jobs; a queue is required.
• Industry packs need content from real pilot clients; plan two pilots before packs are final.
• Feature requests needing new code can delay a client; publish a lead time for extension requests.
• Copyright and trademark: clients must own or license the content they publish; the platform must not offer site
copying (GN-07).
Appendix A. Source Traceability and Conflicts Resolved
Topic Ref. 1 (brief) Ref. 2 (text SRS) Ref. 3 (PDF SRS) Master decision
Toggle IDs F-89 for custom F-01 to F-120 F-001 to F-120 One merged list, F-001 to
domain F-168; old IDs retired
Toggle count About 120 120 120 168 after merging and
de-duplicating
Toggle cache Within 60 s Cache at most 60 s Cache at most 30 s, version 30 s cache with version refetch,
number 60 s end-to-end target
Evaluation order Plan and toggle Plan, owner, forced-off Lock, override, owner, plan Reference 3 order, which is the
model default, prerequisites most precise
Support sign-in Banner and audit Banner and audit 30-minute expiry, reason, no Reference 3 rules adopted
credential changes, owner
email
Roles Five roles Five roles, full matrix Five roles, wider matrix Matrices merged (section 3)
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 20


## Source page 21

Topic Ref. 1 (brief) Ref. 2 (text SRS) Ref. 3 (PDF SRS) Master decision
Industry packs Not covered Restaurant template Six launch packs plus Packs as data; restaurant
toggle (F-120) worked example template toggle retired
Industry pack Not covered Not covered Lists six packs but later Six listed; any extra packs to be
count refers to eight added when defined
Database Own database per Decision record and Own DB, own Atlas user per All kept; per-instance Atlas user
isolation instance table instance adopted
Cash on delivery Default On Default On Default Off, needs order Default On (prototype uses it)
types
Card payments Default Off Default Off Default On Default Off until a gateway is
configured
Reviews Default On Default On Default Off Default On
Wishlist, order Wishlist On, notes Wishlist On, notes Off Wishlist Off, notes On Wishlist Off, notes Off
notes Off
Owner Reset by Super Not covered Setup link recommended Setup link (PV-05, SA-09)
credentials Admin
Admin Portal Super Admin does Super Admin panel Super Admin panel Added SA-01: owner-only
access everything access, from the project
owner's statement
Site generation Not covered Business name to Provisioning from industry Section 4.3 added, with cloning
branded site flow pack boundary GN-07
Migrations, Not covered Migration runner Runner, queue, All adopted
queue, cache tenant-keyed caches
keys
Appendix B. Glossary of Requirement ID Prefixes
Prefix Area
SA Admin Portal (Super Admin)
PV Self-signup and provisioning
GN Site generation
SW Setup wizard
TG Toggle engine
SF Storefront
AD Store Admin
PS POS cashier
BR Branding
DM Domains
LN Language
NFR Non-functional
US Usability
D Decisions
F Feature toggle
Master SRS: Multi-Tenant Website and Ecommerce Platform | v1.0 | 18 Nov 2026 Page 21
