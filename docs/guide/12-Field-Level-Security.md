# Phase 12: Field-Level Security

This phase is tagged **Permissions to Objects and Fields**, the 27% domain. It
covers the objective *describe the capabilities and limitations of user-based and
permission-based access* at the level where most real data exposure happens: a
record the user is legitimately allowed to see, carrying a field they are not.

## Learning Objectives

By the end of this phase you will be able to:

- State how FLS composes with object permissions, sharing rules and Apex, and where it is bypassed.
- Design field permissions for sensitive data, including derived and roll-up fields.
- Explain why field-level filtering reports exist and what they can and cannot do.
- Diagnose a field that is visible in the UI but readable through the API, or the reverse.

---

## 1. FLS and its four layers

Field-level security is one permission layer among several, and it is routinely
applied at the wrong one.

| Layer | Granularity | Enforced in the UI | Enforced in the API | Notes |
|---|---|---|---|---|
| **Object permission** | Object | Yes | Yes | No Read on object, no fields |
| **Field permission** | Field | Yes | Yes | Read and Edit are separate |
| **Record-level access** | Row | Yes | Yes | Determines *which rows*, not which fields |
| **Layout** | Presentation | Yes | **No** | Not a security boundary |

> **The composition.** Object permission gates the object, FLS gates the fields
> within it, and record-level sharing gates the rows. **All three must permit
> access.** A user with Read on `Member__c` and read on `SSN_Last4__c` still cannot
> see a member they cannot access - and a user with full access to a member still
> cannot read `SSN_Last4__c` if FLS withholds it.

### Read and Edit are separate

Every custom field and every standard field carries an independent **Read** and
**Edit** permission, and they do not imply each other.

| Configuration | UI result | API result | What it is for |
|---|---|---|---|
| Read + Edit | Can see and change | Can query and write | Ordinary business field |
| Read only | Can see, cannot change | Can query, cannot write | Audit-protected fields |
| Neither | Not on layout by default | **Query fails** | Never-granted fields |
| Edit without Read | Field cannot be rendered | Write possible without read-back | Avoid - it produces confusing errors |

> **Avoid Edit without Read.** It is possible, and it is a trap: the user can
> write a value they cannot see, which is how accidental overwrites of correct
> data happen.

### Standard versus custom fields

Standard fields such as `Name`, `CreatedDate`, `OwnerId` and `RecordTypeId`
are **FLS-adjustable in most objects**, with important exceptions - `Id` and
`Name` cannot be made unreadable on standard objects, and Audit fields are
sometimes restricted.

> **Check before you design a layout that depends on it.** Do not assume a
> standard field is unprotectable; verify per object and per field. This is exactly
> the kind of detail that distinguishes an architect who has configured an org
> from one who has only read about it.

### Checkpoint

A user has Read on `Member__c` and full record access to a member, but
`SSN_Last4__c` renders empty. FLS grants Read. What else could cause it?

**Answer.** Three common causes, in order:

1. **A formula or roll-up whose source fields the user cannot read.** Derived fields are hidden when their inputs are not accessible. This is the cause developers most often miss.
2. **The field is not on the page layout** - which affects only the UI, not the API, so it is a symptom rather than a control.
3. **Record-level access was removed after the record was loaded**, so the row itself is no longer returned and the field has no record to come from.

Verify by querying through the API as that user: if the field is absent or null in
the query response, it is FLS or a derived-field consequence, not a layout
problem.

---

## 2. Where FLS is enforced, and where it is not

This is the part that matters for a sharing and visibility architect.

| Context | FLS enforced? | Why |
|---|---|---|
| Lightning UI, standard pages | Yes | Declarative enforcement |
| Reports, list views | Yes | FLS filters columns |
| Salesforce DX, CLI export, Data Loader | **Yes** | FLS enforced for interactive and bulk users |
| REST and SOAP API | **Yes** | FLS enforced for the running user |
| Apex **system mode** | **No** | `WITH SECURITY_ENFORCED` is required |
| Apex `without sharing` | No | Record access bypassed as well as FLS |
| Anonymous Apex, Developer Console | No | System context |
| Anonymous Apex, **with `WITH SECURITY_ENFORCED`** | Yes | Enforced |
| Platform events, **with `WITH USER_MODE`** | Yes | Enforced |
| **Asynchronous Apex** | **No, by default** | Starts in system mode; must declare |
| **Approval request actions** | No | System context |

> **The two rows that decide incident reports.** Apex in system mode ignores
> FLS, and **asynchronous Apex starts in system mode**, which means a
> `future` method that queries a restricted field does so successfully in
> testing and leaks in production. Phase 7 covers the Apex details; Phase 14
> covers `WITH USER_MODE` as the declarative fix.

### The relational trap

This one bites in a specific, recognisable way: **FLS is not applied to
subqueries in SOQL.** A user who cannot read `Member__c.SSN_Last4__c` can still
read it if a query on `Claim__c` selects it through a relationship.

The field does not come back with the field name it has on `Member__c`. It comes
back under the relationship alias, with a generated name like
`Member__r.SSN_Last4__c`. A developer who queries `SELECT Member__r.SSN_Last4__c
FROM Claim__c` will get data - and if their UI field or LWC reads
`Claim__c.Member__r.SSN_Last4__c`, that data reaches a user who should never see
it.

> **The query to run in any FLS review.** Ask which queries read restricted fields
> **through a relationship**, rather than directly on the object that owns them.
> That is where restricted data actually escapes.

### Checkpoint

A user without Read on `Member__c.SSN_Last4__c` runs `SELECT
Member__r.SSN_Last4__c FROM Claim__c` through an LWC. What happens?

**Answer.** The data is returned. FLS is not applied to subquery field access in
SOQL, so the restriction on the `Member__c` object does not apply to this path,
and the value arrives under the relationship alias.

This is a genuine control gap, not a misconfiguration. Mitigations, in order of
preference: do not select the field; use `WITH USER_MODE` in the SOQL; use
`WITH SECURITY_ENFORCED` on the Apex; or filter in the Lightning web component as
a last resort, understanding that client-side filtering is not a security
boundary and hides data only from the user's screen.

---

## 3. Designing field permissions for sensitive data

The starting position, stated positively: **every field is a decision, and the
default answer for sensitive data is no.**

| Field | Read | Edit | Reasoning |
|---|---|---|---|
| `Member__c.SSN_Last4__c` | Named groups only | Integration only | Last four digits are still PII |
| `Member__c.Date_Of_Birth__c` | Named groups only | Integration only | Combined with a name, effectively identifying |
| `Member__c.Clinical_Summary__c` | Care team only | Care team only | Clinical data; no sharing agent or field agent access |
| `Member__c.Notes__c` | Care team only | Care team only | Free text - the highest-risk field in the schema |
| `Member__c.Phone__c` | Service and care roles | Service roles | Contact data |
| `Member__c.Address_Line1__c` | Service and care roles | Service roles | Contact data |
| `Consent_Record__c.Evidence_Hash__c` | Compliance only | **Nobody human** | Tamper evidence |
| `Consent_Record__c.Evidence_Payload__c` | Compliance only | Integration only | The scanned consent document |
| `Claim__c.Total_Paid__c` | Finance, claims | Claims | Financial |
| `Provider_Network__c.Tax_ID__c` | Finance only | Finance only | Provider identifiers |
| `Claim__c.Diagnosis_Code__c` | Care team, claims | Care team | Clinical |

> **The Notes__c row is the one to defend in a review.** Free-text fields bypass
> every structural control you have built. A field permission stops a *column*; a
> sharing rule stops a *row*; **nothing stops what someone types into a free-text
> box.** If clinical detail can be typed into a field that a broad role can read,
> FLS has done nothing for you.

### The derived-field rule

If `Member__c.Is_HIPAA_Eligible__c` is a formula over fields the user cannot
read, it is hidden for them. That is desirable for genuinely sensitive inputs and
surprising elsewhere.

> **Design implication.** Decide for each derived field whether hiding it is
> correct. Where the derivation reveals nothing sensitive, exposing the source
> fields may be simpler than explaining why the derived field is blank.

### Checkpoint

You are asked to hide clinical notes from field agents. Give the layered answer.

**Answer.** Three layers, because any one of them alone is inadequate:

1. **FLS** on `Member__c.Clinical_Summary__c` and `Notes__c` - no Read for the field agent permission set group.
2. **Record-level sharing** so the agent cannot access the member at all in most cases - Phase 6, the parent-child question.
3. **Apex and query review** for relationship queries and subquery field access - because FLS does not cover subqueries.

And note what none of the three does: it does not stop a field agent typing
clinical detail into a field they *can* read, such as `Claim__c.Notes__c`. That
requires a process or validation control, not a permission.

---

## 4. Field-level filtering reports

Field-level filtering reports exist to answer audit questions: *who could
potentially have read or written a given field?*

**How they work.** You specify a field - for example
`Member__c.SSN_Last4__c` - and optionally a time window. The report returns the
users who held permission to read or edit that field during that period, from
permission set assignments and group membership history.

### What they can and cannot tell you

| Question | Can it answer? |
|---|---|
| Which users had Read on `SSN_Last4__c` in Q3? | **Yes** |
| Which users had Edit on `Total_Paid__c` in Q3? | **Yes** |
| Which user read a *specific* member's SSN last four on a specific date? | **No** |
| Which users had record access to a given member in the period? | **No** - this is a permissions question, not a record-access question |
| Which fields a user could read via a **relationship** query | **No** - subquery FLS bypass is invisible here |

> **The limitation worth remembering.** A field-level filtering report answers
> "who **could** have read this", not "who **did**". There is no native audit of
> field reads. Conflating the two is a serious analytical error, and using a
> filtering report as evidence of actual access is worse.

For record-access history there is no equivalent declarative report. Audit of
who actually accessed a record needs either Salesforce Event Monitoring or a
partner product - and that is a Phase 16 licensing conversation.

### Checkpoint

Compliance asks: "show me everyone who could have read members' SSN last four in
the third quarter." Which report and what caveat?

**Answer.** A **field-level filtering report** on `Member__c.SSN_Last4__c`, scoped
to Q3, returning the read-capable users. The caveat to state alongside it: this is
a *permission* report. It says who was capable of reading the field, not who did,
and it is blind to record-level sharing - a user in the list may have had no
access to any member at all. Say the caveat out loud, because an unqualified
capability report presented as an access log is how an audit finding happens.

---

## 5. FLS and the org-wide default

OWD is a record-level mechanism, and this trips people up: **OWD does not
control fields.** Public Read Only or Private on an object says nothing about who
can read `SSN_Last4__c`.

| Control | Governs |
|---|---|
| OWD | Which rows are the default baseline |
| Sharing rules, manual sharing, Apex sharing | Which additional rows |
| Profile and permission set object permissions | Whether the object is reachable |
| FLS | Which fields within a reachable row |
| Page layout | What the UI renders |

> **Say it as one sentence.** OWD is the floor for rows, FLS is the wall for
> fields, and a page layout is a suggestion. They are three different mechanisms
> and none substitutes for the others.

### Checkpoint

OWD on `Member__c` is Private. A user has Read on `Member__c` but sees no member
records at all - not even ones they own. Which layer is failing?

**Answer.** **Record-level access.** OWD Private means the user sees only their
own records by default, and something is preventing that from applying:

1. **The user owns nothing** - the most common and least alarming explanation. Private means *own records only*, so a user with no owned members sees none.
2. **A sharing mechanism is not matching** - check sharing rules, Apex sharing, manual shares.
3. **The relationship path is closed** - the member is a child of an account the user cannot access. Phase 6.
4. **A restriction rule removed access** the user would otherwise have had.

Note that FLS is not a candidate here: a field permission never determines whether
a row is visible.

---

## 6. FLS outside the declarative model

Two situations where FLS is not the tool.

### Apex

System mode ignores FLS. The options:

| Approach | Enforces FLS | Enforces sharing | When |
|---|---|---|---|
| System mode | No | No | Trusted internal logic that must bypass both |
| `without sharing` | No | No | Legacy; effectively always system mode |
| `WITH SECURITY_ENFORCED` | **Yes** | No | FLS is required, sharing is not - the right choice when the record scope is already correct |
| `WITH USER_MODE` | **Yes** | **Yes** | Both required; the declarative path |

> **The distinction to get right.** `WITH SECURITY_ENFORCED` enforces FLS but keeps
> record access in system mode. `WITH USER_MODE` enforces both. Choosing wrongly
> either over-restricts your logic or, worse, under-restricts it while looking
> responsible because the keyword was present. Phase 14 covers this in full.

Asynchronous Apex starts in system mode, so a `future` or `Queueable` method
needs an explicit declaration to enforce FLS. Testing in the Developer Console,
where anonymous Apex runs in system context, will not reveal the problem.

### Custom code outside the platform

| Surface | FLS enforced? | Control |
|---|---|---|
| Standard UI | Yes | Declarative |
| Reports | Yes | Declarative |
| API, REST, SOAP, GraphQL | Yes | Declarative |
| Apex | Only with the keywords | Code declaration |
| LWC, Aura | No - **client-side only** | Apex must enforce |
| External ETL and Data Loader | Depends on the tool and user | Governed by the integration user |
| Anonymous Apex | No | Use `WITH SECURITY_ENFORCED` when testing |

> **LWC is the gap people forget.** An LWC has no permissions of its own; it calls
> Apex. If that Apex runs in system mode, the LWC can render anything the Apex
> returned. Client-side checks in the component are a UX nicety, not a control.

### Checkpoint

A `future` method populates a report object with claim totals for an executive
dashboard. It works. A later version of the same logic is moved into a batch Apex
class and a compliance reviewer asks whether FLS is enforced. What is the honest
answer?

**Answer.** **No, not automatically.** Asynchronous Apex starts in system mode, so
both the `future` method and the batch class ignore FLS unless they declare it.
The honest answer is that FLS enforcement in that path is a code decision, not a
platform guarantee, and it should be made explicit with `WITH USER_MODE` or
`WITH SECURITY_ENFORCED` depending on whether record scoping is also wanted.

The reason to say this plainly rather than "we enforce FLS" is that the next
developer to refactor this logic will move the query, drop the keyword, and
nothing will fail in testing - because the Developer Console also runs in system
context.

---

## 7. Migrating FLS in a live org

Field permissions are the least glamorous and most disruptive migration, because
a field nobody thought about is being read by somebody.

1. **Inventory every field** on the sensitive objects. Custom and standard, including fields on standard objects added by managed packages.
2. **Find out who reads it** - profile and permission set assignments, plus a search for the field in Apex, SOQL, LWC and report definitions. **A field permission change breaks code, not just layouts.**
3. **Classify** each field: public, role-restricted, role-restricted and audit-tracked, or never-granted.
4. **Map fields to the new permission set groups** - `Vantage_Field_Agent` and the others.
5. **Deploy permission sets first**, then assign. Assigning before the permission set exists silently fails.
6. **Validate** by running the sensitive queries as a representative user from each job function, and confirm the expected fields are absent.

> **Managed packages are the trap in step 2.** Fields added by packages are
> frequently read by package Apex, and package code does not care that you removed
> a permission - it runs in system mode and keeps working, silently, which means
> the data is still flowing even though your FLS report says nobody can read it.
> **An FLS report describes configured permissions, not actual access through
> system-mode code.**

### Checkpoint

Which single artefact would you hand to a compliance reviewer as evidence that
FLS is correctly configured?

**Answer.** The **permission matrix** - every sensitive field, its Read and Edit
holders, and the group or profile that grants it - combined with the field-level
filtering report for the audit period, which shows the historical assignment.

What you should not hand over is a screenshot of Setup. And note the matrix
answers "who is configured to read this", not "who read this"; if the question is
the second, that needs Event Monitoring or a partner product.

---

## 8. Design review questions

1. **Is every sensitive field an explicit decision**, with a named set of holders?
2. **Are free-text fields reviewed separately**, on the basis that no structural control governs their contents?
3. **Does any SOQL read a restricted field through a relationship?**
4. **Do all Apex entry points that touch sensitive data declare an execution mode?**
5. **Do all asynchronous Apex methods declare an execution mode**, given they start in system mode?
6. **Would the removal of one permission set break code**, and do you know which code?

---

## Checkpoint

A stakeholder wants to hide `Member__c.Clinical_Summary__c` by removing it from
the page layout, because "that is faster". What is your response?

**Answer.** Decline, and explain the layer. A page layout is a presentation
setting, enforced only in the UI. The field remains fully readable through the
API, reports honour FLS rather than layouts, and any integration or LWC can still
retrieve it. Removing a field from a layout hides data from a user on a screen -
which is the appearance of a control without the substance.

The correct control is **FLS on the field**, combined with record-level sharing so
the agent cannot reach the member in most cases, and a review of relationship
queries because FLS does not cover subqueries. And state the residual risk
honestly: none of these prevent someone typing clinical detail into a free-text
field they can read. That is a process control, and pretending a layout solves it
leaves you with neither.

---

## What's next

Phase 12 covered the fields on records a user can already reach. Phase 13 covers
the fields that are dangerous regardless of who reads them - encryption,
retention and the masking that arrives in Winter '27.
