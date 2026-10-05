# Phase 2: Organization-Wide Defaults — The Access Floor

This phase is tagged **Access to Records**, the 39% domain, and it covers the
first of its nine objectives: *recommend the appropriate organization-wide
defaults to restrict access to records*.

The org-wide default is the least interesting screen in Setup and the most
consequential decision in the model. Get it right and eight later phases become
design work. Get it wrong and they become a series of workarounds fighting a
floor you cannot lower cheaply.

## Learning Objectives

By the end of this phase you will be able to:

- Explain why the org-wide default is a floor that can only be raised by other mechanisms, never lowered by them.
- Choose between Private, Public Read Only, Public Read/Write and Controlled by Parent for a given object from first principles.
- Distinguish internal from external org-wide defaults and explain why Experience Cloud makes the external setting the more dangerous of the two.
- Plan and risk-assess an org-wide default change, including the sharing recalculation it triggers.

---

## 1. Floor, not ceiling

The org-wide default is the baseline visibility for every record of an object,
applied to everyone. It is the **floor** of your access model. Everything else in
Salesforce exists to grant access above that floor.

The word *ceiling* is the intuitive mistake, and it reverses the entire logic of
the exam. Ask "which sharing mechanism prevents Group A from seeing these
Accounts?" and the ceiling framing sends you hunting for a restrictive tool. The
floor framing tells you immediately that the answer is either a restriction rule
or a change to the OWD itself.

| OWD | Who can read | Who can write | When to choose it |
|---|---|---|---|
| **Private** | Owner only, plus those above in the role hierarchy | Owner only | Default choice for anything sensitive. The only setting that gives you room to design. |
| **Public Read Only** | Everyone | Owners and those above in the role hierarchy | Reference or lookup data nobody should edit but everybody must read. |
| **Public Read/Write** | Everyone | Everyone | Genuinely public data. Almost never right commercially — and the most common OWD in an acquired org nobody reviewed. |
| **Controlled by Parent** | Whatever the parent record grants | Whatever the parent record grants | Detail records whose access should never diverge from their parent. |

> **Controlled by Parent does not mean "inherit everything"** — it means the
> detail record follows the parent record's access. If the parent is Private the
> child is as private as its parent, and the child **cannot have its own sharing
> rules at all**. That last consequence is what makes it a security tool rather
> than a modelling convenience.

### Checkpoint

> **Contact OWD is Public Read Only. A user complains they can see a contact
> they should not. What is the architecturally correct first move?**

Stop and establish the floor. Public Read Only means everyone can read every
Contact *by design*, so no sharing mechanism will ever hide it — every other
mechanism only adds. Options: lower the OWD (disruptive, full recalculation) or,
if the requirement is scoped to a subset, a restriction rule.

---

## 2. Deciding the OWD, one question at a time

Never pick an OWD by intuition or by copying another org. Work through these in
order — the first "yes" usually determines the answer, and each is a shape the
exam will ask you.

1. **Must access to this record ever depend on its parent?** If yes, Controlled
   by Parent — and you have eliminated the entire sharing design for this
   object, which is a huge win.
2. **Does this record hold data the organisation classifies as confidential or
   regulated?** If yes, Private. Always. You can widen access later in minutes;
   you cannot retroactively audit who saw a record in the meantime.
3. **Must every user read every record with no exceptions?** If yes, Public Read
   Only or Public Read/Write. Then ask the harder question: must every user
   *write*? "Yes to read" almost never implies "yes to write".
4. **Is it reference data** — codes, tiers, reference tables — written by a small
   data team and read by everyone? Then Public Read Only, with writes controlled
   by field-level security and a data-steward permission set.
5. **None of the above?** The default is Private. Private is the answer you
   argue yourself *out of*, not into.

> **The asymmetry is the design principle:** a floor that is too low can be
> raised with a permission set and takes seconds. A floor that is too high can
> only be lowered with a disruptive recalculation. When genuinely uncertain,
> choose the more restrictive option and plan to widen it.

### The worked case: Member__c at Vantage

`Member__c` is master-detail from Account, holds HIPAA-regulated PII, has 2.4M
records, and is read constantly by claims processors, clinicians and brokers.

- *Does access depend on the parent?* The parent Account carries the group and
  the subsidiary, so yes for the reporting line — but a member must stay visible
  to a broker whose relationship runs through Account rather than Member. That
  argues **against** Controlled by Parent, because it would weld member access to
  account ownership and then spend Phase 9 undoing it with sharing sets.
- *Sensitive?* Overwhelmingly. → **Private**.

Private gives us the design room the 39%-weighted domain needs: role hierarchy
for the reporting line, sharing rules for cross-functional review, teams for
collaboration, Apex for the access-request workflow. Choosing Public Read Only
would have made five later phases impossible.

That is the cost of a careless OWD, and it is why this question comes first.

---

## 3. OWD on the standard objects of a health insurer

Standard objects arrive with values chosen for a generic sales org. In a health
insurer almost every one is wrong, and each is wrong in a different way.

| Object | Shipped default | Vantage setting | Why |
|---|---|---|---|
| Account | Public Read/Write | **Private** | Holds group and subsidiary. Public Read/Write across three legal entities is a data-protection incident waiting to happen. |
| Contact | Public Read/Write | **Private** | Broker and member contacts. Needs a careful external model (Phase 9). |
| Lead | Public Read/Write | Public Read Only | Inbound enquiry data; written by marketing, read by sales. |
| Opportunity | Controlled by Parent | **Private** | Provider-contract renewals are commercially sensitive per subsidiary. |
| Case | Controlled by Parent | **Private** | Claims disputes are legal-sensitive. The claim is the case here, not the account. |

> **Account at Public Read/Write is the single most common finding in an
> acquired org.** Every user can read and edit every customer record in every
> subsidiary, including the 40,000 accounts of the rival Vantage just bought. No
> sharing rule, role hierarchy or team can undo it. It is fixed by the OWD, and
> it is fixed by a recalculation that locks the org for hours.

### The internal/external split

Every object has **two** org-wide defaults. The internal default governs internal
users. The external default governs portal and community users — a separate
setting with its own values, which is exactly where incidents live. An org can
have Account internal Private, external Public Read Only, and everyone in the
building reads that as "Account is Private".

### Checkpoint

> **Vantage sets Account external OWD to Public Read Only so brokers can see the
> provider network. What happens to member data on Account records, such as a
> member's date of birth on a household record?**

Every external broker can read it. External OWD applies to the **object**, not
to the subset of fields you care about, so a household record holding member PII
becomes readable by 4,000 partner users the moment the external default is Public
Read Only. The fix is not to change the OWD back — the broker requirement is
real — it is to move member PII onto `Member__c` with its own external handling
and control what the broker experience renders.

---

## 4. External OWD: the more dangerous of the two

The external default governs every user you did not employ: partner portal
users, customer community users, guest users. The population is unbounded by your
HR system, frequently multiplies overnight when a partner onboards their own
staff, and is invisible in your internal user audit.

**The secure posture is default-deny.** External OWD Private, plus a small number
of explicit, auditable grants:

| Grant | Serves |
|---|---|
| Sharing sets | Customer community users, scoped to their account |
| External account hierarchy | Partner users, scoped down the partner org |
| Guest user sharing rules | The unauthenticated public directory |

**The insecure posture** — and the one you will inherit — is Public Read Only
with a scattering of exceptions carved out later. That is default-allow with
patches, and it does not scale, because the number of things nobody thought about
grows faster than the team.

> Since **Spring '25**, Salesforce shows a warning when a sharing rule would open
> visibility to external users. Treat that pop-up as a **design review trigger**,
> not a dialog to dismiss: someone has just proposed widening access past a
> compliance boundary, and it is worth knowing who and why.

Phase 9 takes this from principle to build.

---

## 5. Controlled by Parent as an access decision

Controlled by Parent is usually taught as a modelling convenience: it keeps
detail records in lockstep with their parent and guarantees accurate roll-ups.
That is true, and it is the smaller half of the benefit. The security half is
that it eliminates an entire category of design decision.

| | Private detail record | Controlled by Parent detail record |
|---|---|---|
| Own sharing rules | Yes | **No** |
| Shareable independently of parent | Yes | **No** |
| Access design surface | Every grant | Zero — it inherits |
| Roll-up accuracy | Depends on roll-up type | Guaranteed |
| Good fit | Records needing distinct audiences | Records that should never diverge |

**When it is wrong:** Controlled by Parent is wrong when the detail record has a
genuinely different audience from its parent. At Vantage, `Claim__c` is
master-detail from `Member__c` and therefore Controlled by Parent — correct,
because a claim about a member has no meaning without that member, and its
audience is the member's audience. The same claim surfaced to an external broker
would be wrong, so it should never be visible to a broker at all. A design that
says "no" is exactly what a security model is for.

### Checkpoint

> **A client wants Claims visible to underwriters who cannot see the Members they
> belong to. Can Controlled by Parent deliver that?**

No, and this is the reason to know the setting well. Controlled by Parent welds
claim access to member access, so the requirement is self-contradictory: you
cannot show a child without its parent. The correct answer is to break the
master-detail relationship into a lookup so `Claim__c` gets its own sharing
model, accepting the loss of guaranteed roll-ups — or to model claims under a
different parent that underwriters can see.

The OWD setting is what told you the design was impossible, which is why it
belongs in an architect exam.

---

## 6. What an OWD change actually costs

Changing an org-wide default is the most disruptive thing you can do to a
Salesforce org. It triggers a sharing recalculation across every record of that
object, which locks the object for users, can run for hours on large data
volumes, and can time out into a background job you then have to babysit.

**The mechanics**

- Lowering access and raising it both trigger recalculation. Raising it is not
  cheaper just because it grants more.
- The recalculation rebuilds every sharing row for the object: role hierarchy
  grants, rule-based grants, team grants, ownership grants and manual shares are
  all re-evaluated.
- Manual shares are recomputed too. (Note the scope of the Winter '27 "retain
  manual shares" option carefully: it concerns **ownership transfer**, not OWD
  recalculation.)
- On large objects the recalculation moves to a background process. Users see
  stale access until it completes.

> **Spring '26** introduced the ability for sharing recalculation to run
> **asynchronously**, and the release update enforcing that behaviour lands in
> **Spring '27**. Code that creates a share and immediately queries for it — or
> inserts a record and expects its role-hierarchy grants to be queryable in the
> same transaction — can start failing. "Recalculation is synchronous and
> therefore safe to assume" is no longer a safe assumption.

**The change plan**

1. Record the current setting and every mechanism that grants access above it.
   You cannot assess the change without knowing what will re-grant what you took.
2. Model the before and after. For a sample of named users, list records gained
   and records lost. Losing access silently is the dangerous direction — it
   surfaces as a support ticket weeks later.
3. Size the recalculation from the record count for that object. Above roughly a
   million records on Enterprise, assume a background job.
4. Choose the window, and tell the people who will lose access **before** the
   window.
5. Have the rollback ready: the previous OWD value, written down, with the same
   plan attached.

That last point — the rollback written down *before* the change — is what
separates an architect from someone who got lucky.

---

## 7. Reading an org's OWD posture in five minutes

Before designing anything in an unfamiliar org, spend five minutes reading its
floor. It is the cheapest diagnostic in the platform.

1. Setup → Sharing Settings. Read every default internal **and** external value.
   Photograph them.
2. Flag every object at Public Read/Write. Each is a potential finding, not a setting.
3. Flag every object where external access is more permissive than internal.
   That combination is almost always an oversight rather than a decision.
4. Count the objects at Controlled by Parent and confirm each is a detail record
   that genuinely should never diverge.
5. Query actual record counts per object. The recalculation risk lives in the
   record count, not the setting.

```sql
-- Surface every object so you can review its OWD pair in Sharing Settings.
SELECT QualifiedApiName, DurableId
FROM ObjectDefinition
WHERE IsCustomizable = TRUE
ORDER BY QualifiedApiName
LIMIT 200;

-- Size the recalculation before proposing an OWD change.
SELECT COUNT() FROM Member__c;   -- 2.4M  -> assume a background job
SELECT COUNT() FROM Case;        -- 380k  -> still a real recalculation, plan the window
```

> Read **both** OWDs, every time, for every object. The most common finding in a
> real security review is an external default more permissive than the internal
> one, and it takes about four seconds to check.

---

## Checkpoint

> **You have three hours and a change window. What must exist before you touch
> the Account OWD?**

A written inventory of every mechanism granting Account access above the current
floor; a before/after access model for a sample of named users; a recalculation
size estimate from the record count; a communicated window; and the previous OWD
value written down with its own rollback plan. Missing any one of these is how
organisations end up in a state where nobody knows why a manager lost access.

## What's next

Phase 3 builds the spine that sits on the floor: the role hierarchy, the implicit
sharing it produces, and the Secure Roles Behavior release update that renamed
its internal targeting in Winter '25.
