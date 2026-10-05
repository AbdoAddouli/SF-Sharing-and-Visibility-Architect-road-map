# Phase 13: Sensitive Data, Shield and Retention

This phase is tagged **Permissions to Objects and Fields**, and it reaches into
**Other Data** because the objects that matter here are the ones that are *not*
ordinary records. The objectives are *describe the capabilities and limitations
of user-based and permission-based access*, *explain the capabilities and
limitations of the Salesforce ownership model*, and the retention objective.

Everything so far has been about who can see what. This phase is about data whose
*value outlives the access decision* - and about the three mechanisms that treat it
differently from ordinary fields: encryption at rest, automated field history
beyond retention, and deletion on a schedule.

## Learning Objectives

By the end of this phase you will be able to:

- Distinguish Classic and Platform Encryption, state what each does and does not protect against, and design a field classification to match.
- Explain Field Audit Trail, retention policies and hard deletion as three different controls with different purposes.
- Design a retention policy that satisfies a legal hold requirement.
- Explain Winter '27 field masking and where it sits relative to FLS, sharing and encryption.

---

## 1. Three problems, three different controls

Begin by separating the problems, because they are routinely conflated and each
has its own mechanism.

| Problem | Mechanism | Protects against |
|---|---|---|
| Someone reads data they should not | **FLS, sharing, permissions** | Access |
| Data is copied off-platform, or read from a stolen backup | **Shield Platform Encryption** | Data at rest, and theft of the org's data files |
| Data is changed without attribution | **Field Audit Trail** | Repudiation |
| Data must not be deleted, or must be deleted | **Retention policies, legal hold** | Lifecycle and legal obligation |
| Data must be hidden from specific users without hiding it from others | **Winter '27 field masking** | Presentation of a value per persona |

> **The framing that keeps them straight.** FLS and sharing are about *access*.
> Shield is about *the data itself, wherever it lands*. Retention is about *time*.
> Field masking is about *presentation*. **A data classification exercise tells you
> which of the four you need**, and the common failure is applying one of them
> everywhere.

---

## 2. Encryption: the two types

### Classic Encryption

Enables encryption of custom fields and some standard fields, with a
**Customer-Supplied Key** or a **Platform Key**.

| Fact | Detail |
|---|---|
| Granularity | Selected fields |
| Keys | Platform key or customer-supplied key |
| Search | Values are not searchable |
| Reports, filters, formula references | **Unsupported on encrypted fields** |
| API behaviour | Values are decrypted for users with Read; the API sees ciphertext where it applies |
| Deletion | Key deletion renders values permanently unreadable |
| Add-on | **Shield Platform Encryption is an add-on licence** |

### Platform Encryption

Broader than Classic, available on standard fields and platform features, and
included with certain editions and add-ons rather than being an add-on of its own.

| Fact | Detail |
|---|---|
| Granularity | Selected fields and some platform features |
| Keys | Platform key or customer-managed key |
| Search | Values are not searchable |
| Advanced/chain state | Searchable through the state field in some configurations, with constraints |
| Coverage | Broader than Classic - standard fields and features |

> **The one fact to carry into the exam.** Encrypted fields are **not searchable**.
> Filters, sort order and formula references on encrypted values do not behave
> normally, and a `WHERE` clause against an encrypted value will not do what you
> expect. This is a genuine capability limitation, not a configuration mistake,
> and it is what makes encryption a design trade-off rather than a free win.

### What encryption does not do

| Threat | Does encryption help? |
|---|---|
| A user with Read permission sees the value | **No** - use FLS |
| A user without record access queries the object | **No** - use sharing |
| A report exports plaintext to a spreadsheet | **No** - use FLS |
| Someone copies the data file from a backup | **Yes** - this is the point |
| The org's data is stolen wholesale | **Yes** |
| A system administrator reads the database | Depends on the key custody model |

> **The distinction that matters for a review.** Encryption protects the data when
> it is **not being used**. It does nothing for the moment the data is displayed,
> which is the moment your access model is responsible. Presenting encryption as
> an access control is a category error, and one that leaves the FLS design
> unwritten.

### Checkpoint

Compliance wants `Member__c.SSN_Last4__c` encrypted. What must you ask before you
implement it?

**Answer.** Two questions, in this order:

1. **Will you need to filter, sort or reference it?** Encrypted values are not searchable. If a report or a `WHERE` clause must find members by SSN last four, **encryption is the wrong control** - the answer is FLS plus, if required, a tokenised or hashed field for matching.
2. **What is the key custody decision** - platform key or customer-supplied key? A customer-supplied key means your key is outside Salesforce, which changes the recovery and offboarding story entirely.

And note what you should *not* do: encrypt it and treat that as protecting it
from users with Read.

---

## 3. Field Audit Trail: attribution

Field History tracks up to 20 fields per object and keeps them for **90 days**.
Field Audit Trail extends that to **60 fields** and **10 years** for the objects
you configure.

| Fact | Classic Field History | Field Audit Trail |
|---|---|---|
| Fields tracked | Up to 20 per object | Up to 60 per object |
| Retention | 90 days | Up to 10 years |
| Licence | Included | **Additional licence per user, or an org-wide licence** |
| Coverage | Any object | Selected objects |
| Storage | Field history reports and related lists | Same, plus audit trail reports |

### What it does and does not prove

Field Audit Trail proves **what changed, when, and who changed it**. It does not
record who *read* the data, who *exported* it, or who queried it.

> **Design implication for the record, not the column.** Field Audit Trail on
> `Consent_Record__c` is a strong control - you can prove that consent evidence
> was never altered, which is the property that matters for a consent record. It
> tells you nothing about who viewed it. **Write history, and audit the audit
> trail, separately.**

### Two things to get right

**Custom fields only, plus the standard set.** Field History works on custom
fields; Audit Trail fields such as `CreatedById`, `CreatedDate` and `IsDeleted`
are available separately.

**Data cannot be edited in field history or audit trail records.** The records
are immutable, which is the entire value of them. This also means they are a
place where **cleanup does not apply** - Phase 17, where deletion strategies
converge.

### Checkpoint

Vantage needs to prove that a member's consent evidence was never altered since
capture. Which control, and what does it not prove?

**Answer.** **Field Audit Trail** on `Consent_Record__c`, tracking
`Evidence_Hash__c`, `Evidence_Payload__c`, `Consent_Type__c` and `Captured_At__c`
over 10 years. Combined with a compute of the hash at capture time, it lets you
demonstrate that the stored evidence still matches what was signed.

It does **not** prove who read it, who downloaded it, or who had permission to read
it. For that you need an access audit - Event Monitoring or a partner product -
which is a separate Phase 16 licence conversation.

---

## 4. Retention, deletion and legal hold

Three distinct things, frequently conflated.

### Retention policy

A retention policy **automatically deletes or archives records** when they reach a
configured age. You configure:

- An **age** - the duration.
- An **action** - delete the record, or archive it to a file.
- An **object** and an optional **record type** scope.

| Action | Behaviour | Use for |
|---|---|---|
| Delete record | Hard delete at age | Data with no legal or audit requirement to persist |
| Archive to file | Generates a file with the record and its related lists, then deletes the record | Data that must be retained but not queried |

> **Archiving is the interesting choice.** It satisfies a retention obligation
> while removing the record from the working org - which simultaneously reduces
> the exposure surface of the sensitive data. That dual benefit is worth stating
> in a design review, because it means retention can be an access control as well
> as a lifecycle control.

### Legal hold

A legal hold **prevents deletion of specific records**, overriding retention
policies for those records. This is how a litigation hold survives an automated
deletion schedule.

> **The requirement that shapes everything.** At Vantage, HIPAA requires six-year
> retention of claim records. That is the **minimum**. A legal hold can require
> retention **beyond** the retention period for specific records, and it will -
> in a dispute, the hold typically outlives the routine retention window.
>
> **Therefore: never configure hard deletion on `Claim__c` without a legal hold
> strategy.** A retention policy without a hold design is a data loss waiting for a
> dispute.

### What deletion does not cascade

| Related data | Behaviour on parent delete |
|---|---|
| Child records in a **master-detail** | **Cascade deleted** - irreversibly |
| Child records in a **lookup** | Orphaned - not deleted |
| Field history and audit trail | Retained separately |
| Files and Content | Dependent on configuration |
| Sharing rows | Deleted with the record |

> **The master-detail row is the one to plan around.** A delete that cascades
> through master-detail children takes their history with it, irreversibly. If
> `Consent_Record__c` were a child of `Member__c` through master-detail, deleting
> a member would destroy consent evidence - and with it the strongest control this
> org has. **Model the relationships so the sensitive objects hang off lookups,
> not master-detail.**

### Checkpoint

Vantage wants to delete `Member__c` records 25 years after termination. What three
things must you check?

**Answer.**

1. **What cascades?** Any master-detail children are destroyed irreversibly. Verify the relationship design on `Consent_Record__c` and `Claim__c` specifically.
2. **Is a legal hold in play?** A hold overrides the retention policy. There must be a hold process, or a disputed record will be deleted out from under the dispute.
3. **What survives?** Field history and audit trail records are retained, but they are not a substitute for the record - they hold field values, not the record's relationships.

And the design answer is usually **archive rather than delete**, because it meets
the obligation while reducing the live exposure surface.

---

## 5. Winter '27 field masking

A newer capability: **field masking** hides or redacts the *value* of a field for
specific personas while leaving the field itself present.

| Property | Behaviour |
|---|---|
| What is hidden | The displayed value |
| What remains | The field, its label, and usually the record |
| Who it applies to | Specific personas or permission contexts |
| Granularity | Field and persona |

> **Where it sits relative to FLS.** FLS removes the field entirely. Masking leaves
> the field visible with its value concealed. That difference matters: a masked
> field still confirms **that a value exists**, and it still occupies space in
> exports of layouts that render it. **Masking is a presentation control layered
> on top of permissions, not a replacement for them.**

The genuinely useful case is where a user must see that a field is populated -
"there is a consent record" - without seeing its content. FLS cannot express that.
Masking can.

### Checkpoint

Why is masking not a substitute for FLS on a sensitive field?

**Answer.** Because FLS removes the field from the user's view of the object
entirely - including from the API, reports and exports - while masking leaves the
field present with its value concealed. A masked value can still be inferred from
context, still signals that data exists, and can still leak if a client renders
the underlying value rather than the masked presentation.

Use FLS as the control and masking as the refinement. In this phase's Vantage
design, masking covers the case where a service agent must see *that* a consent
record exists and its capture date, without seeing the evidence payload.

---

## 6. Classifying the Vantage data

A classification is what makes the four mechanisms converge. Every field lands in
exactly one row, and the row determines the design.

| Field | Class | Encryption | FLS holders | Field Audit Trail | Retention |
|---|---|---|---|---|---|
| `Member__c.First_Name__c`, `Last_Name__c` | Internal | No | All service and care roles | No | Life + 6 years |
| `Member__c.SSN_Last4__c` | Restricted | No - not searchable | Named groups only | **Yes**, 10 years | Life + 6 years |
| `Member__c.Date_Of_Birth__c` | Restricted | No | Named groups only | **Yes**, 10 years | Life + 6 years |
| `Member__c.Clinical_Summary__c` | Restricted PHI | **Platform**, if filtering is not required | Care team only | **Yes**, 10 years | Life + 6 years |
| `Member__c.Notes__c` | Restricted free text | No - unstructured | Care team only | **Yes**, 10 years | Life + 6 years |
| `Consent_Record__c.Evidence_Hash__c` | Evidence | No | Compliance only | **Yes**, 10 years | **Never delete** |
| `Consent_Record__c.Evidence_Payload__c` | Evidence PHI | **Platform**, if filtering is not required | Compliance only | **Yes**, 10 years | **Never delete** |
| `Consent_Record__c.Captured_At__c` | Internal | No | Compliance and service | No | **Never delete** |
| `Claim__c.Total_Paid__c` | Confidential | No | Finance and claims | **Yes**, 10 years | **Never delete** - 6-year statutory floor |
| `Claim__c.Diagnosis_Code__c` | Restricted PHI | **Platform**, if filtering is not required | Care team and claims | **Yes**, 10 years | **Never delete** |
| `Provider_Network__c.Tax_ID__c` | Confidential | No | Finance only | **Yes**, 10 years | Life + 6 years |
| `Access_Request__c.Decision_Notes__c` | Internal | No | Compliance only | No | 7 years |

| Design decision | Reasoning |
|---|---|
| Encryption is applied only where **filtering is not required** | Encrypted fields are not searchable; encrypting a field you must query would break the requirement |
| Free-text fields are never encrypted | Encryption of unstructured text buys little and costs searchability on every field |
| `Consent_Record__c` has **no deletion** | It is legal evidence; a retention policy on it is indefensible |
| Field Audit Trail is on restricted and confidential fields, not on all fields | It is a licensed capability; spend it where attribution matters |
| `SSN_Last4__c` is not encrypted | Matching on it is required, and encryption would make it non-searchable - FLS plus audit is the right pair |

### Checkpoint

`Member__c.Clinical_Summary__c` must be searchable for a quality-of-care report
grouping members by condition. What is the correct design?

**Answer.** **Do not encrypt it.** Encrypted values are not searchable, so
encryption and the grouping requirement are mutually exclusive.

Instead: FLS restricting Read to the care team, plus record-level sharing scoping
that team to their panel, plus Field Audit Trail for attribution, plus masking for
personas who must see that a summary exists without its content. Encryption is the
control for a different threat - data at rest and off-platform copies - and it is
simply incompatible with this requirement.

If the data must also be protected at rest, the answer is a **separate,
non-encrypted derived field** carrying a categorised condition rather than the
narrative summary, and encrypting the narrative itself with no ability to query
it.

---

## 7. Platform events and change data

The other sensitive-data surface is what *flows*, not what is stored.

| Event type | Contains | Control |
|---|---|---|
| Platform event | Field values from the record | Grant the minimum field permissions; the event carries the data, so FLS applies to what the subscriber can read |
| Change Data Capture | Field *changes* | Same FLS reasoning; the change history is data |
| Big Objects | Long-retention records | They bypass the standard retention model entirely - a separate lifecycle design |

> **The gap worth naming.** Platform events are delivered to subscribers whose
> permissions are evaluated as the running user. A subscriber with broad read
> access receives PHI in the event payload, and **the event is a copy that persists
> outside the record's sharing model.** Design the subscriber set with the same
> care as a permission set.

Big Objects are the quiet retention exception: because they exist outside the
standard data model, standard retention policies do not apply to them, and their
lifecycle has to be designed separately.

---

## 8. Design review questions

1. **Is every sensitive field classified**, with encryption, FLS, audit and retention decided per field?
2. **Does anything need to be both encrypted and searchable?** If so, the design needs a derived non-encrypted field, because the two requirements are incompatible.
3. **Is any sensitive object a master-detail child**, so a parent delete would cascade into it?
4. **Does every deletion policy have a legal hold story** - and for evidence records, no deletion at all?
5. **Are free-text fields treated as a residual risk** that no structural control governs?
6. **Are platform event subscribers scoped** with the same care as permission sets?

---

## Checkpoint

A stakeholder proposes encrypting `Member__c.Clinical_Summary__c` "so nobody can
read it". What is your response?

**Answer.** Push back on two counts.

**First, encryption does not stop reading.** Anyone with Read permission sees the
decrypted value. The party that must not read clinical summaries is the field
agent population, and the control for that is **FLS plus record-level sharing** -
Phase 12 and Phase 6. Encryption solves theft of the data at rest, which is a real
problem, but it is a different one.

**Second, encryption makes the field non-searchable**, which breaks the
quality-of-care reporting requirement unless you introduce a separate derived
field.

The design I would propose: FLS restricting Read to the care team, record-level
sharing scoping that team to their panel, Field Audit Trail for attribution,
masking where presence-not-content is needed, and Platform Encryption for the
narrative at rest with a non-encrypted categorised field for reporting. That is
four controls doing four jobs. One encryption checkbox doing all four is how the
requirement gets met and the exposure stays.

---

## What's next

Phase 13 covered data whose value is in its sensitivity and its history. Phase 14
covers the mechanism that changes the *default* answer to every question in this
academy: user mode, and what happens when platform code stops defaulting to
trusting itself.
