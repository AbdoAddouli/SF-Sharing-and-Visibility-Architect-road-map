# Phase 7: Apex and Managed Sharing

This phase is tagged **Access to Records**, the 39% domain, and it covers the
objective *describe the capabilities and limitations of user-based and
permission-based access* as it applies to code.

Managed sharing is the only mechanism in the platform that can **compute**
access. Everything declarative matches a static criterion. That power is the
whole reason it exists, and it is also the reason it carries the largest
long-term liability in any access model.

## Learning Objectives

By the end of this phase you will be able to:

- Write managed sharing correctly: the insert, the delete, the sharing declaration and the user-mode question.
- Explain why a grant created in Apex can outlast the logic that created it, and how to prevent that.
- Decide when Apex sharing is justified and when a declarative mechanism would be safer.
- Diagnose a sharing problem caused by Apex, including the cases that arise from system-mode execution.

---

## 1. What Apex sharing can do that nothing else can

### The three legitimate reasons

1. **Logic the data model cannot express** - a condition involving several related records that no single field captures.
2. **Per-record computation at volume** that a formula or flow cannot perform, or that would trigger a recalculation you cannot afford.
3. **Grant lifecycle management** - revoking grants that have become invalid, which no declarative mechanism can do at all.

### Vantage examples that justify Apex

| Requirement | Why declarative fails |
|---|---|
| A member's care coordinator is determined by a `Coordination_Assignment__c` record, not a field on Member__c | Access must follow the assignment, which lives on another object |
| A claim is visible to the reviewer only while an `Access_Request__c` is approved and unexpired | Time-dependent access is not expressible declaratively without a recalculation |
| A regional pod grants access to members within a radius of the assigned agent | Distance is not a field |

### And one that does not

"Agents should see all members in their region" is a **public group plus a
criteria-based rule**. If your justification is "the requirement changes with the
business", reach for a declarative mechanism first.

Apex sharing is a maintenance commitment, and it is the one mechanism that
survives every subsequent refactor as an unexplained behaviour nobody dares
remove.

### Checkpoint

A requirement: "give Dan read access to high-value accounts in the Northeast".
What is the right mechanism?

**Answer.** A public group containing Dan, plus a criteria-based sharing rule on
the region field and the value band. No Apex. The condition is static, expressible
on a field, and the rule maintains itself when Dan changes role. **Reaching for
Apex here is the most common over-engineering error in this exam.**

---

## 2. Writing the grant

The mechanics are small and unforgiving. Four lines of code, and each has bitten
somebody.

```apex
// Grants read access to a single user on a single record.
// This is a valid, minimal managed-sharing grant.
insert new MemberAccess(
    UserId      = UserInfo.getUserId(),
    ParentId    = memberRecordId,    // Member__c
    AccessLevel = 'ReadOnly'
);

// A group grant targets the group Id, and uses GroupId rather than UserId.
insert new MemberAccess(
    GroupId     = clinicalEscalationGroupId,
    ParentId    = memberRecordId,
    AccessLevel = 'ReadOnly'
);
```

### Field names are not interchangeable

`AccountShare`, `OpportunityShare`, `CaseShare`, `LeadShare` and `ContactShare`
each have their own fields, and the standard field names are inconsistent.

| Share object | Record field | Access field |
|---|---|---|
| AccountShare | `AccountId` | `AccountAccessLevel` |
| OpportunityShare | `OpportunityId` | `OpportunityAccessLevel` |
| CaseShare | `CaseId` | `CaseAccessLevel` |
| LeadShare | `LeadId` | `LeadAccessLevel` |
| ContactShare | `ContactId` | `ContactAccessLevel` plus the row-level `IsPrimary` flag |

Read the schema rather than guessing. An insert with the wrong field name either
fails to compile or - worse - compiles and grants nothing.

### The sharing declaration, and what it actually governs

The `with sharing` or `inherited sharing` declaration on a class governs **SOQL
and SOSL**, not the insert. Inserting a share row runs in whatever mode the
transaction is in. This distinction is the source of most exam traps in this
area.

| Declaration | Apex runs as the user | Records the user cannot see |
|---|---|---|
| `with sharing` | Yes | Filtered out of queries |
| `without sharing` | Yes | Returned by queries, then rejected on DML |
| `inherited sharing` | Depends on the caller | Depends on the caller |
| `WITH USER_MODE` | Yes, and FLS is enforced too | Filtered out of queries |
| `WITH SYSTEM_MODE` | No | All visible and updatable |
| No declaration, `sourceApiVersion` **< 67.0** | **System mode** | All visible and updatable |
| No declaration, `sourceApiVersion` **>= 67.0** | **User mode** | Filtered out of queries |

> **The release note, stated precisely.** The default changed at **API 67.0**. Before
> 67.0, Apex with no `WITH` keyword ran in **system mode** and saw and changed records
> the running user could not see. From **67.0**, Apex with no `WITH` keyword runs in
> **user mode** and enforces the org's access model.

> **The reason this phase still matters.** Trusted internal code - batch classes,
> `future` methods, schedulables, integration handlers - relied on *omission* rather
> than declaration. **On 67.0 those classes start failing on their schedules** with
> insufficient-access errors, and they fail silently in the Developer Console, which
> still runs in system context. So the practical rule under 67.0 is:
> **state the mode explicitly on every class, and treat any `WITH SYSTEM_MODE` as a
> decision that needs a stated reason.** Phase 14 covers the change in full.

---

## 3. Why the grant can outlive the requirement

A grant row has **no expiry**. It is removed only if you delete it, if the target
user is deleted, if the target group is deleted, or if a Salesforce-owned process
removes it.

**Nothing connects it to the logic that created it.** So the grant becomes stale
when the underlying relationship changes and your trigger does not fire.

### The four failure modes, all real

1. **The trigger never fires**, because the record is updated with a DML statement that skips triggers, such as `Database.update` with `AllOrNone` off.
2. **The trigger fires but the logic errors**, and the error is swallowed by a try/catch.
3. **The trigger fires, grants correctly, and never revokes the previous grant.** This is the most common one.
4. **The target group or user is deleted**, and the row survives.

> **Every managed-sharing design needs an explicit revocation path, not just a
> grant path.** If you cannot describe the revocation path, you have not finished
> the design.

### Checkpoint

A former coordinator can still read members they used to coordinate. The trigger
is correct. Where is the grant still coming from?

**Answer.** From a share row nobody deleted. The trigger grants correctly on
activation but nothing removes the row on deactivation; or the deactivation path
bypassed the trigger; or the coordinator was removed from the group after the row
was created, leaving the row orphaned. Check the share rows directly - a Tooling
API query on `MemberAccess` filtered by that user and member shows the row and its
creation date. Then build the reconciliation job, because this will recur.

---

## 4. Granting to groups, and the cascade that does not happen

A managed sharing row targets a **user Id or a group Id**. Targeting the group
rather than the individual is almost always right, because group membership then
changes propagate on their own.

- **Grant to the group, not to the people.** Six grants to six clinicians is six rows that drift as clinicians join and leave. One grant to the group is one row that keeps working.
- The exception is where membership is deliberately narrower than the grant - for instance a grant to the group plus FLS, so that only some members can read the sensitive fields.

### A related trap: role hierarchy and Apex

A grant targeting a group of one manager **does not extend to their reports**.
Apex has no implicit cascade to the hierarchy. If the reports need access, you
must target them individually, add them to the group, or use a declarative
mechanism that does cascade - which is usually a signal you chose the wrong tool.

### The one thing that does cascade

If the target is a group and you later delete that group, the rows disappear. So
the grant's lifetime is bounded by the group's lifetime, which is a genuine
advantage worth noting in the design.

---

## 5. Records, transactions and batch safety

At 2.4M members, batch behaviour is the difference between a feature and an
outage.

| Concern | What goes wrong | What to do |
|---|---|---|
| Query in a trigger | Non-selective SOQL against a large object, in every transaction | Filter on Id or an indexed field; never query on a formula |
| DML in a loop | Governor limit on DML statements | Collect into a `List` and insert once |
| Recursion | The trigger re-fires and re-grants | A `static boolean` guard, or a flag field the trigger ignores |
| Mixed DML | Inserting share rows in the same transaction as the record insert can hit sharing-related errors | Insert the record first, then the shares, in a separate transaction via a Queueable job |
| Hard failure | One bad row rolls back legitimate grants | Catch per record in a batch, log the failures, report them |

> **The most common reason a managed-sharing trigger appears to do nothing.**
> Share rows cannot reference a record that has not been created. If your trigger
> is on the shared object itself, insert the parent record first, then the share
> rows - usually by deferring the share work to a Queueable job.

### The governance point

Managed sharing is **invisible to admins** looking at sharing Setup. The only way
to see the full picture is a query. Build that query and schedule it.

```sql
SELECT ParentId, UserId, AccessLevel, CreatedById, CreatedDate
FROM MemberAccess
WHERE ParentId = :memberId
ORDER BY CreatedDate DESC
```

That single query is the most useful diagnostic in this phase, and it is the one
support should have open before they start theorising.

---

## 6. The release change, and what it moves

This is the change that reshapes this phase, and it is worth understanding as a
direction of travel rather than a single setting.

- Starting with **API 67.0 (Summer '26)**, Apex runs in **user mode by default** for new and updated code unless it declares otherwise.
- Existing classes that already declare a sharing keyword **keep their declared behaviour**, so the change is opt-in-by-default for the code you touch.
- **Declare user mode or system mode explicitly on every class.** Relying on the version default is how a security review turns into an archaeology project.
- **Triggers still run in system mode by default**; declare the mode on the trigger to get user-mode behaviour, and audit what that does to your DML.

> **Practical guidance, for the exam and for the job.** Treat every class as if it
> runs in the most restrictive mode that makes it work. If a class genuinely needs
> system mode, say so in the design document and justify it. **Undeclared classes
> are the vulnerability, not the declared ones.**

Phase 14 covers this in depth. The point to hold on to here is the direction: the
platform is progressively narrowing what Apex can bypass, which means ad-hoc
grants are the durable risk and declarative mechanisms are becoming the safer
default for new work.

---

## 7. Declarative or Apex: the decision table

| Requirement shape | Mechanism | Reasoning |
|---|---|---|
| "Everyone in this group sees all records of this object" | Object-based rule + public group | Static, no computation needed |
| "Everyone in this group sees records where field X = Y" | Criteria rule + public group | The condition is on a field |
| "Everyone in this group sees records where a *related* record's field = Y" | Criteria rule on a cross-object formula, or Apex | Depends on indexability and staleness - measure first |
| "Access follows a membership record on another object" | **Apex** | The relationship is not on the shared record |
| "Access only while a time-bounded approval is active" | **Apex** | Time-dependent, and revocation is required |
| "Access follows a computed value such as distance or a score" | **Apex** | Not expressible declaratively |
| "Revoke grants that are no longer valid" | **Apex** | No declarative mechanism can subtract over time |
| "This person needs this one record for this one meeting" | Manual share | An exception, not a pattern |

---

## 8. The reconciliation job

Every managed-sharing design must include the way back. This lesson is the one
most often skipped, and it is the one that decides whether the feature is
operable.

### The four questions to answer before shipping

1. When is a grant no longer valid, and what identifies that state?
2. What code path deletes the row when that state is reached?
3. What revalidates rows created before this code existed?
4. Who is paged when the reconciliation job finds rows it cannot explain?

Question three is the batch job. A nightly reconciliation that queries the share
rows, compares them against the current state of the underlying relationship, and
deletes the ones that no longer hold. It is unglamorous and it is the difference
between a managed-sharing model and an access-leak generator.

### Diagnosing from symptoms

| Symptom | Most likely cause | First thing to check |
|---|---|---|
| User can see a record they should not | A stale grant nobody revoked | Query the share rows for that record and the grant date |
| User cannot see a record they should | Trigger did not fire, or the record did not exist yet | Trigger order, and whether share DML was deferred |
| Grants appear but nobody can use them | The user lacks object or field permissions | Object permissions and FLS, not sharing |
| Intermittent, seems random | Sharing recalculation running concurrently | Recalculation status and its effect on grant timing |

### Checkpoint

Your design document says "on deactivation, revoke the coordinator's access". The
code implements it in a trigger on `Coordination_Assignment__c`. Name the three
cases where this fails to revoke.

**Answer.** (1) The assignment is **deleted** rather than deactivated, so the
trigger's deactivation branch never runs. (2) The assignment is updated by a
data load or integration using a path that skips triggers. (3) The coordinator's
access was granted to the **group** rather than the individual, and the coordinator
was removed from the group - the row survives because the group still exists. All
three are covered by the reconciliation job, which is why the job is not optional.

---

## What's next

Phase 7 was access computed by code. Phase 8 covers the simplest mechanism of
all - one person granting one other person access to one record - and why it is
both the right answer for genuine exceptions and the most dangerous habit in the
platform.
