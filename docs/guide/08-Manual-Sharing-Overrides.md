# Phase 8: Manual Sharing and Overrides

This phase is tagged **Access to Records**, the 39% domain, and it covers the
objective *recommend the appropriate sharing mechanism*, together with the
practical governance that decides whether a mechanism is operable at all.

Manual sharing is one person granting one other person access to one record. No
criteria, no target group, no maintenance. It is the simplest mechanism in the
platform and the easiest to overuse.

## Learning Objectives

By the end of this phase you will be able to:

- Use manual sharing where it is genuinely the right answer, and recognise where it is a deferral.
- Explain the lifecycle of a manual share - what removes it, and what silently does not.
- Audit and clean up an org with accumulated manual shares.
- Distinguish manual sharing from every other mechanism, and state the confusion risks.

---

## 1. When a manual share is the honest answer

### The three legitimate cases

1. **A genuine exception** - an underwriter needs one claim from a sibling's book for a specific committee meeting on Thursday.
2. **A migration or remediation step** - temporary elevation while data is corrected, with a scheduled removal.
3. **A test** - confirming a fix works before committing to a broader change.

> **The signal that you are using it as a deferral.** The requirement is stated as
> a *pattern*. "Priya needs access to Dana's accounts while they cover the
> Northeast" is not an exception - it is a temporary role change, served by
> reassigning ownership or by a role-based grant. Manual shares are also a
> security-audit nightmare, because nobody remembers who granted them or when.

The deeper problem is that **a manual share answers no question about itself**. It
is not tied to a role, a team, a requirement or a ticket. Six months later it is
indistinguishable from a mistake, and removing it may break a workflow nobody
documented.

### Checkpoint

A director asks you to give a contractor access to one member's record for two
weeks. Manual share, or something else?

**Answer.** A manual share, **with the expiry written down**. It is a genuine
exception with a known end. Record the grant date, the end date, and who
authorised it, then diarise the removal.

If instead the contractor needs *ongoing* access, a guest user with a licence and
a narrower object scope is the right answer - because a manual share to an
internal user does nothing for an external person at all.

---

## 2. How manual shares end

Almost nothing removes a manual share on its own. This is the property that
decides whether manual sharing is manageable in your org.

| Event | Does the manual share survive? |
|---|---|
| The record's owner changes | **Usually yes** - the share row is independent of ownership |
| The sharing user is deactivated | The row survives; the access is inert until reactivation |
| The receiving user is deactivated | Access is inert; the row survives and returns on reactivation |
| The object's OWD changes | **Manual shares can be lost** - an OWD change is a re-evaluation |
| A sharing recalculation runs | Manual shares are generally preserved; declarative shares are rebuilt |
| The record is deleted | The row goes with it |
| The record is cloned | **Manual shares are not copied to the clone** |

> **Two rows deserve attention.** Ownership change does not remove a manual
> share, so a contractor's grant can outlive the contractor's engagement by months
> if nobody notices. And a deleted user's share **silently returns** when the user
> is reactivated - which is how an access leak reappears after a "cleanup" was
> believed to have fixed it.

Cloning is the other trap. A manual share on a Case does not travel to the cloned
Case, so a workflow that relied on it breaks on the copy with no error. **If a
manual share is load-bearing for a process, that process is fragile by
construction.**

---

## 3. The confusion risks

Because manual shares produce no notification, no audit trail in Setup and no
visible marker on the record, they are the most commonly misdiagnosed mechanism.

| Symptom reported by a user | Often assumed | Frequently the real cause |
|---|---|---|
| "I lost access to my record" | The manual share was removed | An OWD change, or the sharing user was deactivated |
| "I can see a record I should not" | A manual share was granted by mistake | A stale Apex grant, a restriction rule exemption, or ancestor access |
| "The clone is not visible to the team" | A sharing bug | The manual share was not copied by the clone |
| "Access came back after I deactivated a user" | A caching issue | The manual share row was never removed |
| "This user has far more access than their role suggests" | An over-broad permission set | Manual shares accumulated over years |

### The diagnostic habit

When access looks wrong, **query the share rows before theorising**. Manual shares
are invisible in the UI, so the UI will mislead you every time.

```sql
-- Manual shares on the sensitive objects, oldest first.
-- Manual rows are distinguishable by CreatedById being a person rather than
-- the automated grant process, and by having no matching rule.
SELECT ParentId, UserId, RowCause, CreatedById, CreatedDate, AccessLevel
FROM MemberShare
WHERE RowCause = 'Manual'
ORDER BY CreatedDate ASC
LIMIT 200
```

> **A useful shape.** Pull all share rows for the object, group them by type and
> age, and look at the distribution. Manual shares usually stand out as a long
> tail of old rows with no corresponding rule. Anything older than a year without
> a recorded justification is a candidate for removal.

---

## 4. Managing manual sharing as a process

If you cannot stop manual sharing, govern it. Six controls, in order of how much
they help.

1. **Policy** - state when manual sharing is permitted, who authorises it, and the maximum duration. Three lines, published.
2. **Naming convention** - require a reason in a field or a case comment when the share is created. If the platform will not carry the reason, carry it in a spreadsheet that the audit can join to.
3. **Age-based alerting** - report shares older than 60 days to the record owner, then to their manager.
4. **Quarterly reconciliation** - a batch that lists every manual share on the sensitive objects with its age and authoriser, and asks for confirmation.
5. **Owner notification** - tell the record owner when someone shares their record. This reduces both the surprise and the abuse.
6. **Removal on ownership change** - automation that strips manual shares from a record when it changes hands, **with a notification**, because sometimes the share was legitimate.

### The numbers worth holding onto

Manual shares sit alongside declarative shares in the same rows, they consume
from the same per-record sharing allocation, and a very large number of them on
hot objects is a measurable contributor to recalculation time. Phase 15 treats
the cost angle.

### Honesty about control six

Automation that deletes manual shares on ownership change will occasionally
break a legitimate cross-cover arrangement, and someone will be unhappy. **Decide
in advance whether that is acceptable, and communicate it**, rather than
discovering it.

---

## 5. Manual sharing versus the alternatives

The question to ask of every manual share request: is this a pattern?

| If the requirement is... | Use |
|---|---|
| "This once, for this meeting, ending Thursday" | **Manual share** |
| "Everyone in this group, ongoing" | Public group + criteria rule |
| "My manager's records" | Role hierarchy - already in place, nothing to do |
| "These two people, per record, named on the record" | Team, on an object with an access field |
| "This person, for as long as the work lasts" | Role assignment, or a temporary role, if the work is structured |
| "The same thing, next month, with different people" | **Not a manual share.** Declare the requirement properly |

The last row is the diagnostic that matters. A manual share that recurs is not
five exceptions; it is one undeclared requirement.

---

## 6. The audit procedure

Auditing manual shares is mechanical once you have the query. The judgement is
in what you do with the results.

1. **Extract.** All manual shares on the sensitive objects, with grantor, grantee, creation date and access level.
2. **Bucket by age.** Under 30 days, 30-180, 180-365, over 365.
3. **Join to user status.** Produce a list of shares to inactive users, and shares on records whose owner is a leaver.
4. **Find the concentration.** Identify the largest count on a single object and state what pattern generated it.
5. **Classify each finding** by the severity table below.
6. **Fix the design, not just the instance.** A concentration means a requirement was met by manual sharing.

| Finding | Severity | Action |
|---|---|---|
| Share on a VIP or restricted-cohort record, unauthorised | **Critical** | Remove immediately, investigate, check for a pattern |
| Share older than 12 months, no justification recorded | High | Contact the authoriser; remove unless confirmed |
| Share to an inactive user | High | Remove. Inert today, live on reactivation |
| Share on a record owned by a leaver | Medium | Remove, then review the whole leaver's shares |
| Hundreds of manual shares on one object | Medium | **Treat as a design problem** - find the pattern and declare it properly |
| Manual shares as the only mechanism for a team's access | High | Replace with team-based or group-based sharing |

> **The "hundreds on one object" finding is the important one**, because it means a
> requirement was met by manual sharing rather than designed. Fixing the instance
> without fixing the design guarantees it comes back within a quarter.

### Checkpoint

A deactivated employee is reactivated and immediately has access to records they
should not. Why?

**Answer.** Because their manual share rows were never deleted, so the access was
inert while they were inactive and returned on reactivation. This is the single
most common surprise with manual shares and the strongest argument for the
reconciliation job - **inactivity hides the leak rather than removing it.**

---

## 7. The policy, in full

The three-page document that makes manual sharing governable. This is the
structure, and it is short on purpose.

### Section 1: When manual sharing is permitted

Permitted only for a genuine, identified exception with a recorded end date.
Not permitted for any requirement that recurs, for any access pattern involving
more than five people, or as a substitute for a sharing rule that has not yet
been built.

### Section 2: Recording requirements

Every manual share records: the reason, the authorising manager, the grant date,
and the expiry date. Where the platform cannot carry the reason, the governing
spreadsheet is the record and is subject to audit.

### Section 3: Prohibited objects

Manual sharing is prohibited entirely on `Consent_Record__c` and on any object
flagged as a restricted cohort. The named replacement mechanism is specified for
each.

### Section 4: Technical controls

Age-based alerting at 60 days, owner notification on share, quarterly
reconciliation, removal on ownership change with notification.

### Section 5: The exception process

How someone requests a share, what evidence the requester must supply, who
approves, and where the record is stored.

### Checkpoint

Two auditors ask for the list of manual shares on `Consent_Record__c` and the
justification for each. What does your policy need to have produced for that
question to have a good answer?

**Answer.** The policy needs to have **prohibited manual sharing on
Consent_Record__c outright**, with a named replacement mechanism, so that the
honest answer is "there should be none, and here is the query that confirms
there are none". That is a far stronger position than producing a list and
explaining each entry. The prohibition and the replacement mechanism are what make
the answer defensible, and they are the reason the policy names a replacement for
every prohibited case.

---

## What's next

Phase 8 was access for one person to one record, granted by a person. Phase 9
covers the mechanism that changes everything: external users, who have no role,
no owner relationship you control, and run as a single shared guest identity.
