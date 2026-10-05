# Phase 14: User Mode and System Mode

This phase is tagged **Permissions to Objects and Fields**. It is the phase that
changes the default answer to every question in the previous thirteen: whether
platform code enforces the org's access model or bypasses it.

The framing that makes it tractable: **there are two modes, and the keyword you
write decides which one your code runs in.** Everything else in this phase is
detail on that statement.

## Learning Objectives

By the end of this phase you will be able to:

- State what user mode and system mode enforce, and what each bypasses.
- Choose the right mode for a given piece of logic, and justify the choice.
- Explain the API 67.0 change to Apex defaults and the implications for existing code.
- Explain `WITH SECURITY_ENFORCED`, `WITH USER_MODE` and `WITH SYSTEM_MODE` and why each exists.

---

## 1. The two modes

| | **User mode** | **System mode** |
|---|---|---|
| Record-level access | Enforced | Bypassed |
| Object permissions (CRUD/FLS) | Enforced | Bypassed |
| Apex sharing keywords | Honoured | Ignored |
| Who is the running user | The actual user | "System" - no user |
| Typical use | Anything user-facing | Trusted internal batch and integration logic |
| Fails loudly? | Yes - `QueryException` / access errors | No - returns everything |

> **The single sentence to carry.** User mode asks *"what would this user be
> allowed to see?"* and returns an answer or an error. System mode asks
> *"what exists?"* and answers without reference to any user.

### Why both exist

System mode exists because platform features have to do things no individual user
is entitled to do: run a nightly reconciliation across every record, sync records
from an integration with no user context, or write an audit trail. FLS on
`SSN_Last4__c` cannot stop a nightly process from reading it, and should not - the
process is the system, not a person.

User mode exists because the default in most code should be the safe answer. When
you write a controller or a service that serves a user, the assumption should be
that the user can only see what the org permits.

> **The design question is not "which mode is better". It is "for this piece of
> logic, do I have a user?"** If there is a user, the answer is almost always user
> mode.

### Checkpoint

A nightly job recalculates every member's claim totals across 2.4M members.
Which mode?

**Answer.** **System mode**, and unambiguously. There is no user. The job is the
system doing work on the org's behalf, and requiring it to run as a user would
mean either granting a user Modify All or choosing an arbitrary user whose
permissions happen to cover the data - both of which are worse designs.

What you owe instead: run it in system mode, and make the *effect* of the
recalculation respect the access model. Writing `Claim__c.Total_Paid__c` from
system mode writes for everyone, which is correct for a derived total, and is the
reason this field has no FLS restriction beyond Read - the derivation must be able
to run.

---

## 2. The keywords

| Keyword | Enforces | Use when |
|---|---|---|
| `with sharing` | Record access only; FLS still applies per FLS | Legacy; you want record sharing enforced and nothing else |
| `without sharing` | Neither; runs in system mode | Legacy; treat as system mode |
| `WITH SECURITY_ENFORCED` | **FLS and object permissions enforced; record access still system-level** | You need FLS protection and the record scope is already correct |
| `WITH USER_MODE` | **Everything**: FLS, object permissions and record access | Any logic serving a user |
| `WITH SYSTEM_MODE` | Explicitly system mode | Making an inherited default explicit |
| SOQL `WITH USER_MODE` | FLS, permissions and record access for the query | Read paths in user-facing code |

### The distinction that trips people up

`WITH SECURITY_ENFORCED` and `WITH USER_MODE` are **not** the same, and choosing
between them is a real decision rather than a matter of preference.

| | `WITH SECURITY_ENFORCED` | `WITH USER_MODE` |
|---|---|---|
| Object permissions / FLS | Enforced | Enforced |
| Record-level access (OWD, sharing rules, manual shares) | **Not enforced** | **Enforced** |
| Apex `sharing` keyword | Ignored | Honoured |
| Use case | Recalculating a value across records the user can access; avoiding false failures from restrictive sharing | Anything that returns user-facing data |

> **The scenario that separates them.** A user runs a report over claims. They
> should see only what sharing gives them. If the Apex reads with
> `WITH SECURITY_ENFORCED`, the record scope is **not** enforced, and the report
> returns records the user cannot otherwise access - **while still appearing to be
> user-mode code.** That is the failure mode: a keyword that reads as responsible
> while under-restricting.

### SOQL with user mode

```apex
// Enforces FLS, object permissions and record access for the running user.
List<Claim__c> claims = [SELECT Id, Total_Paid__c FROM Claim__c WITH USER_MODE];
```

This is the read-side equivalent and belongs in any user-facing query path that
has not already been wrapped in a user-mode Apex method.

### Checkpoint

A controller fetches claims for display. Which declaration, and why not the other?

**Answer.** **`WITH USER_MODE`** - or equivalently `WITH USER_MODE` on the SOQL -
because the data is being returned to a user and must respect both FLS and
record-level access.

Not `WITH SECURITY_ENFORCED`: it enforces FLS but not record access, so the
controller could return claims the user has no sharing-based access to.

Not system mode: it would return every claim in the org, which is a data
exposure in a user-facing controller.

The only reason to choose `WITH SECURITY_ENFORCED` here is if you had a specific,
justified reason the record scope should not be limited - and in a controller,
you do not.

---

## 3. The API 67.0 change

This is the release-delta point that matters most for a sharing architect.

| | Before API 67.0 | API 67.0 and later |
|---|---|---|
| Apex with no `WITH` keyword | **System mode** | **User mode** |
| Reason for the change | Silent system mode was the safe default for legacy code | Enforcing the org's model by default reduces accidental exposure |
| Migration impact | - | **Existing code changes behaviour** |

> **What the change actually does.** When `sourceApiVersion` is **67.0 or later**,
> Apex code without an explicit `WITH` keyword runs in **user mode**. Code written
> for an earlier API and not revisited now enforces FLS and record access where it
> previously did not.

The consequence is symmetrical and both directions matter:

- **Code that was correctly bypassing** - a batch job, an integration sync - now
  fails with an access error or silently returns fewer rows. It needs
  `WITH SYSTEM_MODE` added explicitly.
- **Code that was accidentally exposing** now stops exposing. Good outcome, but
  it may surface as a regression report from a user who "used to see" something.

### The migration plan

1. **Raise `sourceApiVersion`** to 67.0 or later on the package manifest and
   `sfdx-project.json`.
2. **Deploy and watch for access errors.** They appear as
   `System.QueryException: Insufficient access` or
   `No access to this object` in scheduled jobs and batch runs - typically in
   *scheduled* contexts, which are the least manually exercised.
3. **Add `WITH SYSTEM_MODE` to trusted internal logic**: batch classes,
   `future` methods, schedulables, integration handlers, aggregate and roll-up
   recomputation.
4. **Leave user-facing logic alone** - it now does the right thing by default.
5. **Audit anonymous Apex**, because the Developer Console behaviour is separate
   and testing in system context will not reveal a user-mode failure.

> **The testing trap, stated precisely.** Your tests and your Developer Console
> often run in system context while your **deployed** code runs in user mode after
> this change. A test that passes locally can fail in production. So a `WITH
> SYSTEM_MODE` omission is invisible in testing and visible on the schedule - which
> is the worst combination, because the failure appears at 2am.

### Checkpoint

A scheduled class that updates 500,000 `Claim__c` records starts throwing
`Insufficient access` errors after the org moves to API 67.0. It worked before.
What happened, and what is the fix?

**Answer.** The class had no `WITH` keyword, so it ran in system mode before
67.0 and now runs in **user mode**. The scheduler runs it without a user context,
or in a context whose permissions do not cover the full data set, so the query
fails.

The fix is to make the intent explicit: declare the class or the query
`WITH SYSTEM_MODE`. It is trusted internal recomputation across the whole
dataset, which is exactly what system mode is for.

The broader lesson: this class was implicitly in system mode by accident of
omission. Under 67.0, mode becomes something you write down rather than something
you inherit.

---

## 4. `WITH USER_MODE` in SOQL and SOSL, and the propagation rules

User mode is available on queries as well as on classes, and the two interact.

```apex
// Method declares user mode; the SOQL inherits it.
WITH USER_MODE
public class ClaimService {
    public static List<Claim__c> recent(String memberId) {
        return [SELECT Id, Status__c FROM Claim__c WHERE Member__c = :memberId];
    }
}
```

| Declaration on the class | Effect on SOQL inside |
|---|---|
| `WITH USER_MODE` | Queries inherit user mode |
| `WITH SYSTEM_MODE` | Queries inherit system mode |
| `WITH SECURITY_ENFORCED` | Queries are FLS-enforced but not record-scoped |
| None, with `sourceApiVersion` < 67.0 | Queries run in system mode |
| None, with `sourceApiVersion` >= 67.0 | Queries run in user mode |

### Exceptions you must handle in user mode

| Exception | Cause | Handling |
|---|---|---|
| `System.QueryException: Insufficient access` | FLS or object permission denied | Catch and surface a permission error, or use user mode only where it belongs |
| `System.NoAccessException` | Apex class access denied by FLS | Grant class access to the group |
| Empty result set | Record access denied | **Indistinguishable from "no matching records"** |

> **That last row is the dangerous one.** In user mode, a query that should return
> 500 records and returns none because of record access looks exactly like a query
> whose filter matched nothing. No exception is thrown. **Silent under-retrieval
> is the characteristic failure of user mode**, and it will present to users as a
> report that is "empty for no reason".

The design response is to make absence visible: compare an expected count with a
returned count in code paths where completeness matters, and surface "restricted by
your permissions" rather than "no results" in the UI.

### Checkpoint

A user's dashboard shows zero claims. They are a claims adjuster with correct
permissions and should have 40. Nothing is logged as an error. What is the most
likely cause?

**Answer.** **User mode silently withheld records the user could not access.** In
user mode, a record-access failure returns no rows rather than raising an
exception, so the query succeeded and the result is legitimately empty from the
user's perspective.

The alternatives to check: the sharing rule criteria no longer match (the
zero-match problem from Phase 4), a relationship path is closed, or a
restriction rule removed access. But given no error and a complete absence, user
mode's silent filtering is the first hypothesis - and the UI should distinguish
"no data" from "no data you can see".

---

## 5. Choosing a mode: the decision table

| Situation | Mode | Reasoning |
|---|---|---|
| Controller returning data to a user | **User** | The user should see only what they can see |
| LWC calling Apex to populate a record | **User** | Same |
| Scheduled batch reconciling all records | **System** | No user; full-dataset internal work |
| `future` method firing from user action | Depends | If the work belongs to the user's context, user mode; if it is internal continuation, system mode - and state which |
| Data Loader or Bulk API via integration user | **As the integration user** | The integration user's permissions are the boundary |
| Anonymous Apex in the Developer Console | **System unless declared** | Testing blind spot |
| Recomputing a roll-up across records | **System** | Derivation must not depend on any one user's access |
| Writing an audit or log record | **System** | Logging must not fail because the user lacks create |
| Apex invoked from a flow | **As declared** | Flows run as the user or as the automated process - declare explicitly |

> **The pattern to adopt.** Default to user mode, and make every system-mode
> declaration a **deliberate, commented, reviewed choice**. A codebase where
> `WITH SYSTEM_MODE` appears in named places is auditable; one where it appears
> nowhere because it was never written is not.

### Checkpoint

A `future` method is called from a controller. It sends an email and updates a
status field on a record the user can access. Which mode?

**Answer.** **User mode**, because the work belongs to the user's context - the
status change should respect what the user can do, and an access failure should
surface to them.

This is the case where the answer is not obvious, because the work is
"background" and background feels like system mode. The distinction is not
synchronous versus asynchronous; it is **whose work this is**. A `future` method
continuing a user's action runs as that user; a nightly reconciliation runs as
the system.

Under API 67.0 this is also the default, so the code is correct without a keyword
- but writing `WITH USER_MODE` explicitly documents the intent, which is the point.

---

## 6. Verification

How do you know a code path is enforcing what you think it enforces? Four
techniques, in increasing order of confidence.

1. **Read the declaration.** Necessary, not sufficient - you may be reading a
   caller several layers up.
2. **Check `sourceApiVersion`.** If it is 67.0 or later and there is no keyword,
   the code is in user mode. This is the check people forget.
3. **Query as the user.** Run the SOQL in the Developer Console with
   `WITH USER_MODE` and compare the result count with the same query without it.
   **A difference proves the access model is filtering, and tells you by how much.**
4. **Test the negative case.** Construct a user who *should not* see the data and
   confirm the code path returns nothing. A test that only asserts the happy path
   never detects an over-permissive mode.

> **Technique 3 is the one to adopt routinely.** The count difference between a
> system-mode query and a user-mode query is a quantitative measure of how much
> your access model is actually constraining that code. Run it for your main
> read paths and record the numbers.

### Checkpoint

How do you verify that a service class is enforcing FLS?

**Answer.** Four steps, and the third is the one people skip:

1. Confirm the class declaration and every SOQL in it.
2. Confirm `sourceApiVersion` - at 67.0+ an absent keyword means user mode.
3. **Run the query both ways and compare counts**, as a user who should see a subset.
4. **Test a user who should see nothing** on that path, and confirm the result is empty.

A test that asserts a happy-path user sees their data passes identically whether
the class is in system mode or user mode. Only the negative case distinguishes
them.

---

## 7. Design review questions

1. **Does every class state its mode explicitly**, rather than relying on the API default?
2. **Is every `WITH SYSTEM_MODE` declaration justified in a comment** - "trusted internal batch", not "needed to make it work"?
3. **Do user-facing paths enforce FLS and record access**, and are the tests negative as well as positive?
4. **Has the org been tested after the 67.0 change**, specifically the scheduled and batch paths that nobody exercises manually?
5. **Does the UI distinguish "no data" from "no data you can see"**, given that user mode fails silently?
6. **Are integration and ETL paths scoped to a named integration user** with the narrowest permissions that work - rather than Modify All by default?

---

## Checkpoint

A developer writes an Apex class to populate a report of every claim in the
org for an executive dashboard, and adds `without sharing` "to make sure it
returns all the data". What is your response?

**Answer.** Three problems, and only one of them is about returning all the data.

**First**, `without sharing` is not a tool for getting all the data; it is system
mode. If all the data is genuinely wanted for a system-generated artifact, system
mode may be defensible - but then it should be `WITH SYSTEM_MODE`, which says
"I mean this", rather than `without sharing`, which is the legacy way of
accidentally arriving there.

**Second**, if this feeds a **user-facing** dashboard, system mode is wrong.
An executive should see what their role permits, not everything. If the dashboard
is a genuine org-wide artifact, that is a deliberate statement about who can see
all claims, and it should be an explicit, reviewed design decision with FLS
considered - not a keyword added to make a query return rows.

**Third**, the real risk is that the pattern spreads. `without sharing` in a
controller is a data exposure; in a batch it is often fine. The same keyword,
the same blindness, in both places - so the review rule is that every
system-mode declaration names its reason.

My ask: make the mode explicit, state who the artifact is for, and if it is
user-facing, enforce both FLS and record access.

---

## What's next

Phase 14 established how code decides which access model to obey. Phase 15 moves
to scale, and to the question every architect eventually has to answer: what
happens when the data is large enough that your design stops being a
configuration problem and becomes a recalculation problem.
