# Phase 17: Non-Record Data Surfaces

This phase is tagged **Other Data**, the 16% domain. It covers the objective on
*sharing and security outside the standard record model* - platform events, big
objects, files, aggregates, custom metadata, custom settings and the handful of
surfaces where "who can see this" has a genuinely different shape.

The framing: **most of these surfaces do not participate in OWD, sharing rules or
ownership at all.** Each one has to be assessed on its own terms, and the default
assumption - that the record model covers everything - is wrong.

## Learning Objectives

By the end of this phase you will be able to:

- Enumerate the non-record data surfaces at Vantage and state how access is controlled on each.
- Explain why platform events and change data capture need permission design as careful as records.
- Explain how big objects and aggregates have their own retention and access lifecycles.
- Avoid the common errors of treating settings, metadata or files as protected by the record model.

---

## 1. The surface map

| Surface | In the record model? | Access control | Notes |
|---|---|---|---|
| **Platform events** | No | Field permissions on the event object; subscriber permissions | The payload **is** the data |
| **Change Data Capture** | No | Object and field permissions on the change object | Field **changes** are data |
| **Big Objects** | No | Object permissions; **standard sharing does not apply** | Own lifecycle, own retention |
| **Custom Metadata Types** | No | **Viewer** access; no per-record control | Deployed, not created |
| **Custom Settings** | No | Hierarchy-based, generally readable | Rarely sensitive |
| **Platform caches** | No | Cache and entry visibility | Ephemeral |
| **Files and Content** | Attached to records | FLS on the related list; file access levels | A second copy of the data |
| **Reports and dashboards** | No | Folder and report sharing | **A copy, viewable by others** |
| **Lightning bolt, flows, invocable** | No | The underlying object's permissions | Governed elsewhere |
| **External objects** | No | Named credentials, external object permissions | Data lives off-platform |
| **Custom code and settings** | No | Deploy metadata | Rarely sensitive |

> **The single question to ask about each.** *What is the access model here?* For
> records the answer is OWD plus sharing. For every surface in this table the
> answer is different, and in several cases the answer is **"there is no record
> model at all - it is a permission, or nothing"**. A security review that only
> walks standard objects misses every row in this table.

---

## 2. Platform events

A platform event is a **republishable message carrying field values**, with no
relationship to the record it came from.

### Why it needs permission design

| Property | Consequence |
|---|---|
| The payload carries field values | **Data is copied into the event**, outside the record's sharing model |
| The event object has its own field permissions | You can restrict what is publishable |
| Subscribers receive the payload | Subscriber permissions determine who gets the data |
| Events persist between publish and subscribe | **A copy exists in between** |

> **The point to press in a review.** When you publish a `Member_Updated__e` event,
> the subscriber receives the field values **as the running user**. If you publish
> `Clinical_Summary__c` on that event, you have copied clinical data into a surface
> that the member's sharing rules do not govern. **The record's FLS does not travel
> with the payload** - the event object's own field permissions do, and they are a
> separate design.

### The Vantage event inventory

| Event | Payload | Publisher | Subscriber | Access concern |
|---|---|---|---|---|
| `Member_Consent_Changed__e` | Member Id, consent type, effective date, **no evidence payload** | Consent service | Compliance notification service | Minimal payload by design |
| `Claim_Status_Changed__e` | Claim Id, old and new status, member Id | Claims triggers | Workflow subscriber | **No diagnosis or clinical fields** |
| `Access_Request_Raised__e` | Request Id, requester Id, object type | Approval flow | Notification handler | No member data at all |
| `Member_Address_Changed__e` | Member Id, address fields only | Member service | Notification service | Address only; no clinical or identity fields |

| Design decision | Reasoning |
|---|---|
| **No event carries a clinical or identity field** | Events are a copy outside the record model; minimise what is copied |
| `Member_Consent_Changed__e` carries **no evidence payload** | Evidence is binary and large; the event carries the fact and the hash, never the content |
| Subscribers are a named service identity, not users | A subscriber's permissions should be the narrowest that work |
| Event security is set to **restrict read** on subscribers | Subscribers are infrastructure, not audiences |

### Checkpoint

A developer publishes `Claim_Status_Changed__e` with the `Member__r.Name` field
in the payload so subscribers can display the member's name. What is the concern?

**Answer.** **The relationship field copies member data into the event**, where the
member's record-level sharing does not apply, and where any subscriber with read
access to the event receives it.

Two distinct problems. First, a **subscriber may be entitled to claim status data
but not to member identity data** - a monitoring service has no business holding
member names. Second, the payload persists between publish and subscribe, so a
broader set of identities holds the data than the record model would permit.

The fix: do not put the name in the event. Publish the Claim Id, and let the
subscriber look up what it is entitled to look up - with user mode or an explicit
permission check on the member.

---

## 3. Change Data Capture

Change Data Capture records **field-level changes** to records you select, for
selectable objects.

| Property | Behaviour |
|---|---|
| What is captured | Old and new values of changed fields |
| Granularity | Per field, per change |
| Storage | A change object, queryable and reportable |
| Retention | **Its own retention, independent of the source object** |
| Permissions | The change object's field permissions apply |
| Relationship to records | **None** - a separate data set |

> **The permission consequence, which is the same as events.** Changed values are
> data, and they sit in a surface the record's sharing rules do not govern. **If
> `Clinical_Summary__c` changes, that value is now in the change history** - readable
> by anyone with read on the change object. Change Data Capture **duplicates
> sensitive data into a second access domain**, and it does so silently.

### Design rules

1. **Include only fields whose change history you need.** A field not captured is not exposed.
2. **Treat the change object as sensitive as the source.** If `Member__c.Clinical_Summary__c` needs change tracking, the change object inherits that classification.
3. **Set retention explicitly.** Default retention on a change object may exceed or fall short of the source object's policy - **verify rather than assume**, and Phase 16's retention licence question applies if you extend it.
4. **Query it with user mode.** If you surface change history to users, declare user mode.

### Checkpoint

`Member__c.SSN_Last4__c` is changed once, by the integration. Change Data Capture
is enabled on `Member__c` with "all fields". What has happened?

**Answer.** **The old and new SSN values are now stored in the change object**,
readable by anyone with read on it, on its own retention schedule, outside the FLS
and sharing model that protects the field itself.

The integration's correct FLS handling on `Member__c` is irrelevant here. Change
Data Capture copies the values regardless of who made the change.

This is why the design rule is **to capture only the fields you need**: excluding
`SSN_Last4__c` from the capture set prevents the copy entirely. It is the only
control that works, and it is a configuration decision made before the first
change happens.

---

## 4. Big Objects

Big Objects are **high-scale storage outside the standard data model**.

| Property | Detail |
|---|---|
| Designed for | Very large volumes, long retention |
| Async API | **The primary interface** - SOQL is restricted and limited |
| OWD and sharing rules | **Do not apply** |
| Custom sharing | **Not available** in the standard sense |
| Retention | Governed by a **lifecycle policy** on the big object |
| Attachments | Supported, with limits |

> **The architectural fact that matters.** Big Objects have **no record-level
> sharing model.** Access is object-level permission plus your own logic in code.
> This means every design decision about who can see what has to be implemented in
> Apex, which is exactly the trade-off you are making by choosing Big Objects for
> the data in the first place.

### The Vantage Big Object decision

| Data | Where | Why |
|---|---|---|
| Claims **history** - every status change over 7 years | Big Object, not `Claim__c` | Volume and retention; `Claim__c` holds current state |
| `Claim_History__BO` | Big Object, 400k+ rows/year, growing | Standard objects cannot hold this without archive churn |
| Consent evidence **blobs** | Content, not Big Object | Binary storage; Big Objects are for structured data |
| Member lifecycle events | Big Object | Long retention, append-only |

> **The design discipline.** Because there is no sharing model, **the access logic
> is Apex, and it is therefore only as good as the Apex.** The control set is:
> object permission as the outer boundary, user-mode queries inside, and an
> explicit check for every query that is not wrapped. And because Big Objects are
> reached through the **async API**, every query has a cost and a batch limit -
> which makes an unbounded query a design bug rather than a performance annoyance.

### Checkpoint

A compliance audit asks who can read `Claim_History__BO`. What is the honest
answer?

**Answer.** **Object permission only, plus whatever our Apex enforces.** Big
Objects do not support OWD, sharing rules, or standard custom sharing, so there is
no declarative answer.

The controls we do have: the `Claim_History__BO` object permission restricts read
to a named permission set group; the Apex service is declared user mode where a
user context exists; the lifecycle policy governs retention. But a developer who
queries the big object in system mode from a batch class bypasses all of it.

That is an honest answer and it is the correct framing: **Big Objects trade
declarative sharing for code-enforced sharing**, so the review evidence is the code,
not a configuration listing.

---

## 5. Files, Content and the copies problem

Files are the most under-assessed surface in most orgs, because they are attached
to records and therefore *feel* covered by the record's sharing.

| Property | Behaviour |
|---|---|
| Attachment to a record | Inherits the record's visibility **through the related list** |
| Direct URL / ContentVersion | Accessible by anyone with read on the file, **if they can reach it** |
| Files uploaded with no related record | **Not protected by any record's sharing** |
| ContentVersion | The immutable payload; separate from ContentDocument |
| Previewable without download | Yes, for many formats |

> **The failure mode to name.** A file uploaded with **no relationship to a record**
> is visible to anyone with read on the file object. At Vantage, that is a member's
> consent PDF sitting in a library, visible to a broad read population - while the
> `Consent_Record__c` it belongs to is Private. **The record is protected and the
> evidence is not**, and the audit trail that was supposed to prove consent integrity
> is the thing that leaked.

### The rules that prevent it

1. **Every sensitive file has a related record.** Require it. A file library must not be an alternative to a related record for sensitive documents.
2. **Restrict file preview and download** where the format allows.
3. **Check file permissions separately** in any access review - they are a distinct object with distinct permission sets.
4. **Treat `ContentVersion` as the sensitive object.** It holds the payload; `ContentDocument` holds the metadata.

### Checkpoint

A member's consent PDF is uploaded to `Consent_Record__c`. A user with no access
to the consent record but with read on `ContentDocument` requests the file URL.
What happens?

**Answer.** **They may be able to fetch it.** A direct request by ContentVersion Id
is evaluated against file permissions, not against the related record's sharing
rules. The related list in the UI respects the record, but a direct URL is a
different path.

This is why file permissions must be reviewed as their own layer, and why the
design rule is to restrict file read to the same personas as the sensitive record.
**Never rely on the attachment relationship alone to protect a sensitive
document.**

---

## 6. Reports, dashboards and metadata

### Reports and dashboards are a copy

| Property | Consequence |
|---|---|
| A report renders data the viewer may not be entitled to see | Only if FLS or sharing is bypassed - **they are not**, in standard reports |
| A report **can be shared** with others, or **subscribed** | A scheduled report is **a copy delivered by email** |
| Dashboard components honour FLS and sharing | Standard reports respect the running user |
| **Export** produces a file outside the org | The export is a copy with no further controls |

> **The exposure is the delivery, not the rendering.** The report itself is safe -
> it renders per the viewer's permissions. **The subscription is not**: a scheduled
> report is emailed as a file, and that file inherits nothing. If a user subscribes
> to a report on `Claim__c`, Vantage has exported claim data to their mailbox.

That is a real and common finding, and it is why report subscription and export
deserve explicit policy rather than being left to user discretion.

### Custom metadata and custom settings

| Type | Access | Sensitive? |
|---|---|---|
| **Custom Metadata Type** | Viewer access; read-only for users | Rarely - configuration |
| **Custom Metadata Record** | Same | Rarely - but **endpoint URLs and integration config live here** |
| **Hierarchy Custom Setting** | Generally readable; FLS applies | Rarely |
| **List Custom Setting** | Generally readable | Rarely |

> **The item to check.** Custom metadata is where **integration secrets' *config*
> lives** - endpoint URLs, field mappings, feature flags. The secrets themselves
> belong in Named Credentials or Protected Custom Metadata, but the configuration
> describing them is readable by anyone with Viewer access to the type. Treat the
> metadata type as internal-configuration-sensitive, and be aware that "no one edits
> it" is not the same as "no one should see it".

### Checkpoint

A scheduled report on `Claim__c` is emailed daily to 30 regional managers. What is
the access concern?

**Answer.** **The emailed file is a copy outside the access model.** Each recipient
sees the report rendered per their own permissions at generation time - but the
resulting file is then attached to an email, stored in a mail system, forwardable,
and not governed by sharing rules or FLS.

The concerns in order: the file may be forwarded outside the org; it persists in
mail retention well past any Salesforce lifecycle; and the report is generated once,
so it reflects permissions at generation time rather than at read time.

The mitigations are to restrict report subscription to the personas that need it,
prefer a dashboard or an in-org view over email delivery, and confirm the report
itself excludes the fields the recipients should not have - because after the email,
nothing in the org can enforce that.

---

## 7. Design review questions

1. **Does any platform event or change data capture carry a field you would not want copied into a second surface?**
2. **Are subscribers named service identities with the narrowest permissions**, rather than broad read?
3. **Does every sensitive file have a related record**, and are file permissions reviewed as their own layer?
4. **Are report subscriptions and exports policy-governed**, given that both produce copies?
5. **For Big Objects, is the access logic in code - and has that code been reviewed for execution mode?**
6. **Does custom metadata contain configuration that is more sensitive than "internal"?**
7. **Has every row in the surface map been assessed?** A review that only walked standard objects has not covered this phase.

---

## Checkpoint

The security review asks: "is there any Vantage data outside the record model
that we have not assessed?" What is your answer?

**Answer.** **Before the review, I would have had a list. Now, here it is - with
the honest gaps named.**

Assessed and designed:

- **Platform events** - five events, payloads deliberately minimal, no clinical or identity fields, subscribers restricted, event security set to restrict read.
- **Change Data Capture** - enabled only on `Member__c` and `Claim__c`, and only on the fields where change history is genuinely required. **Excluded `SSN_Last4__c` explicitly**, because capturing it would copy identity data into a second access domain.
- **Big Objects** - `Claim_History__BO`, with no declarative sharing model, so access is object permission plus user-mode Apex, reviewed as code.
- **Files** - every sensitive file required to have a related record, file permissions reviewed separately from record permissions.
- **Reports** - subscriptions restricted to the personas that need them, and the claim report designed to exclude clinical fields.

The two I would flag as needing a decision rather than a reassurance:

1. **Report subscriptions.** Scheduled reports are emailed copies outside the access model. We have restricted subscription, but I would like a policy on export and forwarding, because after the email nothing in Salesforce controls it.
2. **Custom metadata.** The integration configuration is readable by anyone with Viewer access to the type. That is probably acceptable - it is configuration, not PHI - but I want it recorded as an accepted risk rather than an oversight.

That distinction is the point of the phase: **every one of these surfaces copies or exposes data outside the record model, and each needs its own decision.** An audit that only asks about OWD, sharing rules and FLS will find none of them.

---

## What's next

Phase 17 completed the surface map for data that is not ordinary records. Phase 18
assembles everything from Phases 1-17 into a single enforcement wave - the change
you would actually ship, in an order that keeps the business running.
