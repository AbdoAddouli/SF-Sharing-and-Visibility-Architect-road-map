# Phase 10: Object Permissions and CRUD

This phase is tagged **Permissions to Objects and Fields**, the 27% domain, and
covers its first objectives: *recommend the appropriate org-wide defaults and
sharing rules*, and more directly *describe the capabilities and limitations of
user-based and permission-based access*.

This phase answers the question that produces the most support tickets in every
Salesforce org: **why can this user not see that record?** The answer is almost
always an intersection, and candidates consistently understand only one direction
of it.

## Learning Objectives

By the end of this phase you will be able to:

- State precisely how object permissions interact with record-level sharing, in both directions.
- Choose the narrowest CRUD level that lets a user do their job, and justify each choice.
- Distinguish object permissions from record types and page layouts as access controls.
- Explain why "Read" without "View All" is the safest combination for most users.

---

## 1. How permissions and sharing compose

This is the single most important conceptual point in the domain, and it is a
**two-way street**.

| Direction | Statement | Consequence |
|---|---|---|
| **Permissions cap sharing** | A user with no Read on an object cannot see a shared record of that object | Sharing cannot grant access to an object the user cannot read at all |
| **Sharing scopes permissions** | A user with Read on an object sees only the records sharing gives them | Read is an upper bound, not a grant |

> **So the effective answer to "can this user see this record" is an
> intersection.** Object and field permissions on one side, record-level access on
> the other. Both must be satisfied. **Neither system knows about the other**, and
> a mistake in either produces the same symptom - a user who cannot see something
> they should, or can see something they should not.

A useful corollary: **"they cannot see it, so it is safe" is not a security
conclusion.** If the user cannot see the record, they may still be able to query
a sensitive field on the records they *can* see. If a future permission change
grants object access, the sharing configuration is what remains. Both layers must
be right.

### The asymmetry: add yes, subtract no

Profile and permission sets both contribute, and the effective object permission is
the **union**. So a permission set **can** grant an object permission the profile
lacks - including the very first Read.

| Direction | Possible? | Detail |
|---|---|---|
| Permission set **adds** Read where the profile has none | **Yes** | Union of profile and permission sets |
| Permission set **adds** Edit where the profile has Read | **Yes** | Same union |
| Permission set **removes** something the profile grants | **No** | Except restrict settings, and only at field level |

> **The asymmetry is the whole point.** Permission sets are an additive mechanism,
> with one narrow subtractive exception: **restrict settings**, which can withhold a
> field permission from the sets in a permission set group. That is the only
> declarative way to say "everyone else may read this, but you may not", and it
> works at field level rather than object level.

This is why every profile in a permission-set-group architecture must be a minimal
baseline. **A generous profile cannot be corrected with permission sets** - so the
profile's tab and object settings are a design decision rather than a default.
Phase 11 covers the three-layer model that follows.

### Checkpoint

A user has Read on `Claim__c` and a sharing rule grants them Read on critical
claims. They say they can see none of them. What are the candidate causes, in
order?

**Answer.**

1. **The rule criteria do not match.** Remember silent zero matches - check the filter, and check for nulls in the criterion's field.
2. **The rule targets a group the user is not in.** Check membership, not the rule.
3. **FLS hides the fields the user is looking at**, so the records appear to be empty or the list appears blank.
4. **A recalculation is in progress** and share rows have not settled.
5. **Object permissions are fine but a restriction rule removed the access** - possible, and worth checking if the user previously had it.

Note that Read on the object being present tells you permissions are *not* the
first problem. Start with the rule.

---

## 2. The CRUD plus F matrix

| Permission | Means | Vantage example |
|---|---|---|
| **Read** | View records and query them | Any clinician reads claims assigned to them |
| **Create** | Create new records; not edit others' | Intake agents create Claims |
| **Edit** | Edit any record they can otherwise access | Claims adjusters correct claim data |
| **Delete** | Remove records entirely | Almost never granted - see below |
| **View All** | Read every record of the object, bypassing sharing | Compliance auditors, reconciliation jobs |
| **Modify All** | Read, edit and delete every record, bypassing sharing | Data loader users, integration users |
| **View All Data / Modify All Data** | Across all objects and all records | Guest user, integration users, some system contexts |

> **"All" means all, and it is absolute.** It is not scoped by OWD, by sharing
> rules, by restriction rules, or by the role hierarchy. **Nothing in the
> declarative model can subtract from it** - except, in one narrow case, a
> restriction rule where the object is configured to allow it (Phase 4, section 5).
>
> Every View All or Modify All grant is therefore a **permanent, unrecoverable
> decision** unless you change the permission again.

### Field permissions

For each of Read, Edit and Modify on a custom field you get separate checkboxes.
The pattern is "the action you can take on the record" crossed with "what you can
do with this field".

- `Member__c.SSN_Last4__c` - readable for audit, **not editable** by anyone except the integration.
- `Consent_Record__c.Evidence_Hash__c` - readable, never editable by a human.
- `Claim__c.Total_Paid__c` - editable by adjusters, not by auditors.

---

## 3. Choosing the narrowest sufficient level

The design question is not "what does this user need" but "what is the minimum
that lets them do their job without granting them the power to cause an incident".

| Job | Object permissions that should suffice | Why not more |
|---|---|---|
| Claims adjuster | Read, Edit on `Claim__c` | No Delete - an adjuster should never remove a claim |
| Intake agent | Read, Create, Edit on `Member__c` and `Claim__c` | No Delete on `Member__c` - records must be inactivated, not deleted |
| Compliance auditor | Read on all sensitive objects; View All on `Consent_Record__c` | No Edit anywhere - audit is read-only by nature |
| Regional manager | Read on all relevant objects; access via the role hierarchy | No View All - the hierarchy already scopes it |
| Data steward | Read, Edit on `Member__c`; no Delete on any clinical object | Delete on `Member__c` would break referential history irreversibly |
| Integration user | Modify All on the objects it synchronises; View All elsewhere | Modify All Data only if cross-object logic truly requires it |

### The Delete argument

**Delete is the permission to argue about.** It is the only one that destroys
evidence. In a healthcare org, `Member__c`, `Claim__c` and `Consent_Record__c`
should have Delete withheld from all human users, with an inactivate or
status-change workflow instead. Hard delete should be reserved for a named
service identity, if used at all.

The counter-argument is legitimate: some cleanup genuinely requires it, and
withholding it leads people to build Apex that deletes records anyway, which is
worse because it is invisible.

> **The resolution is a documented, narrow, audited path** - not a general
> permission.

### Checkpoint

Can a permission set grant an object permission the profile lacks?

**Answer.** **Yes.** Profile and permission sets both contribute, and the effective
object permission is the **union** - so a permission set can grant Read on an object
the profile omits entirely, and can add Edit where the profile has Read.

What it cannot do is the reverse: **subtract** something the profile grants. A
permission set cannot remove an object permission, with one narrow exception -
**restrict settings**, which withhold a *field* permission from the sets inside a
permission set group.

That asymmetry is why profiles must be minimal baselines. A generous profile cannot
be corrected with permission sets, so the profile's tab and object settings are a
design decision rather than a default.

---

## 4. Objects that are not access controls

Three things get mistaken for access controls. They are not, and confusing them
produces models that look secure and are not.

| Thing | What it actually does | Why it is not an access control |
|---|---|---|
| Record type | Changes available fields and layout on a page | Every record is still readable if sharing allows it |
| Page layout | Controls field visibility and layout for the user | A hidden field can still be queried via API if FLS allows |
| Approval process | Gates a state change | Does not restrict read access at all |
| Validation rule | Blocks a bad value | No bearing on who can read or write the record |
| Record ownership change | Moves the record to a new owner | The previous owner loses access - a real access effect, via ownership, not via the change itself |

> **The page-layout row is the dangerous one.** Removing a field from a layout
> looks like hiding it, and for a user in the UI it works. But the API and reports
> honour **FLS, not layouts**. Any field hidden only by layout is fully readable
> by anyone who can query the object - which is why layout and FLS must be
> aligned, and why **layout alone is never an acceptable control for sensitive
> data.**

A subtle related point: **FLS applies to the running user**, including system-mode
contexts unless they declare otherwise. If a field is not readable, it is not
readable - from a report, an export, a Lightning component, a guest user, or
Apex that does not enforce it. Phase 12 covers this in full; Phase 14 covers the
system-mode exception.

---

## 5. Negative permissions and the special exceptions

Two features break the "union of permissions" model, and both matter for sensitive
data.

### Restrict "Read" and similar in the permission set

A permission set can be configured so it does **not** add a field permission, and
can even remove field access granted elsewhere. This is the only declarative way
to say "everyone else may read this, but you may not", and it is the right tool
when a single role must be excluded from an otherwise broad grant.

**Example at Vantage:** a permission set granting Read on `Member__c`, plus a
second permission set restricting Read on `Member__c.SSN_Last4__c` for the
Underwriting role. Combine with a record-level sharing rule that excludes
underwriting records, and the role cannot read the field at all.

**Neither mechanism alone is sufficient; together they are defensible.** One
controls the field, the other controls the rows.

### View All and restriction rules

View All grants read on every record of the object regardless of OWD and
regardless of sharing rules. One important exception: **restriction rules**. A
restriction rule can remove View All access where the object is configured to
allow it - which is why restriction rules were introduced, and why they only
apply to the declarative model, never to Apex or ownership.

### The complete picture

For a given user and record, the effective access is:

1. **Permissions cap it.** No Read on the object means no records regardless of sharing.
2. **Sharing scopes it.** Read on the object gives only the shared records.
3. **View All overrides both.**
4. **Restriction rules claw back from View All**, where the object is configured to allow it.
5. **Nothing claws back from Modify All.** Modify All is the true ceiling.

### Checkpoint

What is the ceiling that nothing in the declarative model can exceed?

**Answer.** **Modify All.** Nothing subtracts from it, so granting it is a
permanent decision. View All can be clawed back by a restriction rule; Modify All
cannot. This asymmetry is why View All is sometimes defensible in an audit and
Modify All effectively never is, for a human user.

---

## 6. Permission set sprawl

Permission sets are additive, so **the number of assigned sets per user is the
number of things you must evaluate to answer any question about a user**. Sprawl
is a security problem, not just a maintenance one.

**The tell:** a user assigned seven permission sets where two would do, one of
which grants a "miscellaneous" bundle of unrelated access. That bundle is where
every unexplained access finding eventually leads.

> **The discipline.** One permission set per coherent job function, no bundles of
> unrelated access, and a documented answer to "why does this user have this
> set". If you cannot name the job function a permission set serves, delete it and
> see who breaks.

### The migration method

1. **Inventory** every permission set and name the job function it serves. Unattributed sets are candidates for deletion.
2. **Fix the baseline.** Confirm profiles are minimal. If they are not, this is the bigger job - do it first, because groups cannot subtract from a profile that grants everything.
3. **Group** only where capabilities must exclude each other. Phase 11.
4. **Automate** with assignment rules on role. Phase 11.
5. **Verify by diffing effective permissions** - object CRUD and field read/edit per object. Comparing record visibility is infeasible; comparing effective permissions is a tractable diff.

---

## 7. The Vantage permissions matrix

The eight job functions and the five custom objects plus Account and Contact.

| Role | Account | Contact | Member__c | Claim__c | Consent_Record__c | Provider_Network__c | Access_Request__c |
|---|---|---|---|---|---|---|---|
| Intake agent | R | R, C, E | R, C, E | R, C, E | - | - | R, C |
| Claims adjuster | R | R | R | R, E | - | - | R |
| Underwriter | R | R | R | R, E | - | R | R |
| Compliance auditor | R, **VA** | R | R, VA | R, VA | R, VA | R | R, VA |
| Regional manager | R | R | R | R | R | R | R |
| Data steward | R, E | R, E | R, E | R | - | R, E | - |
| Field agent | R | R | R | R | - | R | R |
| Integration user | **MA** | **MA** | R, E | R, C, E | R, C | R, C | R, C |

`R` Read, `C` Create, `E` Edit, `VA` View All, `MA` Modify All, `-` no access.

| Design decision | Reasoning |
|---|---|
| No Delete anywhere on clinical objects | Evidence preservation; inactivate workflows instead |
| Compliance auditor holds View All on four objects | Audit scope genuinely requires all records; the redundancy with sharing rules was removed deliberately |
| Regional manager holds **no** View All | The role hierarchy already scopes their access - granting View All would remove sharing as their boundary |
| Underwriter has no `Consent_Record__c` access | Research consent is not underwriting material; access via the Research Review group instead |
| Field agent has no `Consent_Record__c` access | The single highest-value control in the matrix - agents see claims, never evidence |

### Checkpoint

The compliance auditor holds View All on `Claim__c`, and there is also a
criteria-based sharing rule granting auditors read on second-opinion claims. Is the
rule redundant?

**Answer.** Yes, and this is the kind of redundancy worth removing deliberately.
View All bypasses sharing rules for that user, so the rule contributes nothing
for the auditor. Keep the rule only if it serves a user **without** View All. The
general practice: every sharing rule should be traceable to at least one persona
that does not hold View All on that object, or it is dead configuration.

---

## 8. Diagnosing an access complaint

The ordered procedure. Follow it in order; it is ordered by cost, cheapest first.

1. **Licence.** Does the user have a licence that includes the feature? (Phase 16)
2. **Object permission.** Profile plus permission sets - does the union include what they need?
3. **FLS.** Is the field readable? A readable field can still be blank if it is a formula over a non-readable source.
4. **Record access.** Sharing rules, OWD, hierarchy, teams, Apex, manual shares. Check the record's sharing rows with a query.
5. **Relationship access.** Is the record reachable only through a parent the user cannot see? (Phase 6)
6. **Restriction rules.** Is anything removing access that the other mechanisms granted?
7. **View All / Modify All.** Does the user hold one, and does that explain why they see *more* than expected rather than less?

> **The most common diagnostic error** is starting at step 4. If the object is not
> queryable at all, no amount of sharing investigation will help.

### Checkpoint

A user can see a `Claim__c` but `Total_Paid__c` appears blank in the UI. They are
on Lightning. What are the likely causes?

**Answer.** In order:

1. **FLS makes the field non-readable** - correct, and it applies to reports and API too.
2. **A page layout omits it** - UI-only, and the API would still return it, so this is a symptom rather than a control.
3. **The field is a formula or roll-up whose source fields they cannot read**, so the derived value is withheld.

Check FLS first, because it is the actual control. And note the third cause: a
blank derived field is a permissions signal, not a data problem - a point
developers frequently miss.

---

## What's next

Phase 10 established the permission layer and the union rule. Phase 11 covers the
mechanism that breaks that rule on purpose: permission set groups, where
intersection rather than union is the point.
