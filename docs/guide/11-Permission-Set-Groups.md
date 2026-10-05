# Phase 11: Permission Set Groups

This phase is tagged **Permissions to Objects and Fields**, the 27% domain. It
covers *recommend the appropriate org-wide defaults and sharing rules*'s
permissions-side equivalent, and more directly the objective on packaging
permissions so that they scale.

Permission set groups are a packaging and assignment mechanism, not a new
permission primitive. What makes them important is a single counterintuitive
rule: **within a group, permissions are intersected rather than unioned.** That
one behaviour makes them the only declarative way to subtract.

## Learning Objectives

By the end of this phase you will be able to:

- Explain the union-versus-intersection rule for permission set groups, and why it is a deliberate design lever.
- Decide what belongs in a permission set, a permission set group, and a profile, respectively.
- Design a PSG-based model that reduces per-user assignment sprawl without obscuring effective access.
- Explain the consequences of PSG changes on users, sessions and change control.

---

## 1. What a permission set group actually is

A permission set group is a **container of permission sets**, and its member sets
are assigned and unassigned together as one.

### The rule that defines it

> **Within a permission set group, permissions are intersected, not unioned.** If
> the group contains a set granting Read on `Member__c.SSN_Last4__c` and a set
> that does not grant it, the result is **no read on that field**.

This is the opposite of everything else in the platform, and it is the entire
reason permission set groups exist: it is the declarative way to subtract.

That is genuinely useful. The classic problem - *everyone should read a sensitive
field except one role* - has historically needed Apex or a separate org, because
plain permission sets only ever add. A group gives you the subtraction in
configuration.

| Context | Combination rule | Why |
|---|---|---|
| Profile + permission sets | **Union** | Both contribute; the union is effective |
| Several permission sets on one user | **Union** | All assigned sets apply together |
| Permission sets within one PSG | **Intersection** | The group is the only subtractive mechanism |
| Several PSGs on one user | **Union of the groups' results** | Each group resolves independently, then the results union |
| Record-level sharing | Always additive | No subtractive sharing mechanism except restriction rules |

> **Read the last two rows carefully.** Intersection applies **only within** a
> group. Across groups you are back to a union, which means **two groups cannot
> subtract from each other** - only from the sets inside themselves.

### Checkpoint

A user is in two PSGs. PSG A contains a set granting Edit on `Member__c` and a
set granting no access to a field; PSG B contains a set granting no Edit on
`Member__c`. What is the user's effective access?

**Answer.** **Edit is granted** - because cross-group combination is a union. PSG
B's "no Edit" contributes nothing, because a plain permission set cannot subtract.

If you wanted B to remove A's Edit, they would have to be in the **same group**,
and you would have to accept the other consequences of that grouping. This is a
real modelling constraint, and it is why exclusion groups need to be designed with
the user's whole assignment set in view rather than locally.

---

## 2. The three-layer model

The durable architecture is a three-layer split, and getting the boundaries right
is what makes a model maintainable.

| Layer | Holds | **Never** holds | Vantage example |
|---|---|---|---|
| **Profile** | The irreducible baseline every user needs; typically tab and object visibility | Any job-specific access | `Vantage_Baseline` profile: read Account, Contact, `Member__c`; no clinical objects |
| **Permission set** | One coherent capability or job function | Access needed to negate a peer capability | `Vantage_Claims_Adjuster`: Edit on `Claim__c`, Read on `Member__c` |
| **Permission set group** | Capabilities that must apply, or fail, together - especially where one must exclude another | Standalone capabilities that are useful on their own | `Vantage_Reviewer`: reviewer access **and** no underwriting access |

### The profile layer, where most orgs fail

If profiles carry job-specific permissions - because someone clicked "give this
user what they need" in Setup - then permission sets become decoration and every
future change is a per-profile exercise.

> **The test.** Could you delete all profiles except one and assign everyone to
> that one without breaking anything? If not, the baseline is not a baseline.

Run that test on an inherited org. The list of things that break is your real
worklist, and it is usually longer than anyone expects.

### The exclusion pattern, concretely

Suppose underwriters need broad `Member__c` access but must not see consent
evidence, and reviewers need consent access but must not see the underwriting
notes field. Neither should pollute the other.

The group is the container that makes both statements true at once:

```
Vantage_Reviewer (PSG)
├── Vantage_Reviewer_Core        → Read Member__c, Read Claim__c, Read Consent_Record__c
├── Vantage_No_Clinical_Notes    → no read on Member__c.Clinical_Summary__c
└── Vantage_No_Underwriting      → no Edit on Claim__c

Result: reviewer access, minus clinical notes, minus underwriting edits.
```

The cost of this pattern is **coupling**. Everything in the group is assigned and
removed together, so a group is the right container only when the capabilities
genuinely travel together.

> **Wrapping unrelated sets in a group "for tidiness" is a mistake** that shows up
> the first time someone needs one of them without the other.

---

## 3. The Vantage group inventory

Six groups, each with a stated reason for existing.

| Group | Member sets | Why a group and not separate assignment |
|---|---|---|
| `Vantage_Claims_Handler` | Core read on `Member__c`, `Claim__c`, `Access_Request__c` + Edit on `Claim__c` | These travel together; a claims handler without Edit on `Claim__c` cannot do the job |
| `Vantage_Underwriter` | Broad `Member__c` read + `Provider_Network__c` read + Edit on `Claim__c` + **no** `Consent_Record__c` | Underwriting and consent must never co-exist |
| `Vantage_Reviewer` | Reviewer read across three objects + no clinical notes + no underwriting | Reviewer and underwriter capabilities are mutually exclusive by design |
| `Vantage_Compliance_Auditor` | Read all + View All on the four sensitive objects + **no** Edit anywhere | Audit must never carry write capability |
| `Vantage_Field_Agent` | Field read set + **no** `Consent_Record__c` + no clinical notes | Field agents see claims, never evidence - this is the highest-value exclusion in the model |
| `Vantage_Data_Steward` | Edit on `Member__c` and `Provider_Network__c` + **no** Delete on clinical objects | Steward capability must never include delete |

| Design decision | Reasoning |
|---|---|
| No group exceeds five member sets | A large group is a permission set with a slower interface and a hidden subtractive behaviour inside it |
| Every group has a stated exclusion | A group with no exclusion should be a plain permission set assigned directly - there is no reason for the container |
| `Vantage_Claims_Handler` has no exclusion, yet is a group | Justified: the sets must be assigned and removed together for role changes to be atomic. Document that, because a reviewer will ask |
| Exclusion groups reference fields, not objects | Object-level exclusions are handled by simply not granting the object; field-level exclusions need intersection |

### Checkpoint

`Vantage_Underwriter` is a group whose purpose is to exclude `Consent_Record__c`
access. A reviewer points out that the user is assigned `Vantage_Reviewer`
directly, as a separate assignment outside the group. What is the risk?

**Answer.** Two. First, if `Vantage_Reviewer` grants Read on `Consent_Record__c`
- which it does, because reviewers legitimately need it - then the union across
the two assignments restores that access, and **the exclusion silently fails**.
Second, this is invisible in the Setup UI, because both assignments look correct
in isolation.

The lesson is that **an exclusion group is only as strong as the whole assignment
set allows.** Every permission set and group a user holds must be audited for
whether it re-grants what another group excludes. This is a real constraint, and
it is the one thing to check when reviewing a PSG design.

---

## 4. What PSGs do not solve

Four things a permission set group is often expected to do and cannot.

| Expected | Reality | Use instead |
|---|---|---|
| It manages object permissions dynamically per user | A PSG is assigned as a unit; it is **not conditional** | Permission set assignment rules, based on attributes such as role |
| It manages record-level access | PSGs carry **no sharing rules, records or fields** | Sharing rules, teams, Apex |
| It replaces profiles | It does not; profiles still supply the baseline | A minimal profile plus PSGs |
| It reduces licence usage | PSGs have **no licence effect** | Licence management, user provisioning |

### Dynamic assignment, and how it composes with PSGs

**Permission set assignment rules** assign permission sets to users automatically,
based on attributes - most usefully **role**, but also profile, territory or a
custom attribute.

Combined with PSGs, this is how a model becomes genuinely dynamic without a single
Apex class:

```
Permission set assignment rule
├── Filter: Role.Name = 'Claims Team Lead - NE'
└── Assign: Vantage_Claims_Handler

+ User manually assigned: Vantage_Reviewer (a PSG)
= The user gets both, intersected within each group, unioned across them.
```

> **The powerful combination, worth remembering:** PSG for what a group must
> exclude, plus an assignment rule on role for who gets the group. At Vantage, a
> rule assigning `Vantage_Underwriter` to users holding the Underwriter role means
> a new hire with that role picks up the right access at creation, with no admin
> action.

### The trap in dynamic assignment

It makes **effective access harder to see**. An admin looking at a user sees
assigned permission sets; they may not know that an assignment rule would add
three more next time the user's role changes.

> **Be able to answer: "what will this user have if their role changes to X?"**
> That is an examination question as much as an operational one.

### Preview and session behaviour

Permission set changes are applied at **next login or with a session refresh**,
and users with many permission sets can hit a session-related limit that forces
re-authentication.

Groups make this more visible, because a single group change can add several sets
at once. Plan the communication, not just the deployment.

---

## 5. Impact and consequences of PSG changes

Three consequences deserve explicit treatment, because two of them surprise
architects.

**Permission changes do not trigger recalculation - but they do change access.**
Assigning or removing a permission set changes what a user can reach without any
sharing recalculation. This is fast, which is good, and it means a permission
change is immediately visible - including immediately visible as an incident if
you remove access a user was relying on without telling them.

| Change | Recalculation? | Immediate impact | Risk |
|---|---|---|---|
| Permission set added | No | Next session | Usually additive, low |
| Permission set removed | No | Next session | A workflow that depended on it breaks at next login |
| PSG assigned | No | Next session, possibly re-authentication | Several capabilities change together, so the blast radius is harder to predict |
| PSG with View All assigned | No | Next session | **Effectively removes sharing as a boundary for that user** |
| Assignment rule matches a new user | No | At user creation | Easy to miss entirely in review |
| Sharing rule or OWD change | **Yes** | After recalculation | The slow, expensive one - Phase 15 |

> **The row to note is PSG assignment with View All.** Assigning a group
> containing a View All permission set does not trigger a recalculation, and
> **instantly removes sharing rules as the effective boundary** for every user in
> it. Fast is not the same as safe, and a recalculation-free change that opens
> access org-wide deserves the same change control as an OWD change.

### Licensing is unaffected

A PSG does not reduce the number of licences a user needs, and a user requiring a
high-volume or industry licence still requires one regardless of how their access
is packaged. Phase 16 covers licensing in full.

---

## 6. Migrating from the sprawl model

Most orgs arriving at PSGs are migrating from a set sprawl or a profile-heavy
model. The migration is mostly a re-attribution exercise.

1. **Inventory.** For every permission set, name the job function it serves. Unattributed sets are candidates for deletion.
2. **Baseline.** Confirm the profiles are minimal. If they are not, this is the bigger job - do it **first**, because groups cannot subtract from a profile that grants everything.
3. **Group.** Identify the small number of places where capabilities must exclude each other. Those, and only those, become groups.
4. **Automate.** Add assignment rules on role for the sets that map cleanly to job functions.
5. **Verify.** Compare effective access before and after for one user per job function, **field by field, not record by record**.

### Why step five must compare permissions, not records

| Comparison | Feasible? | Catches |
|---|---|---|
| Record visibility for sample users | **No** - infeasible at any real volume | Little |
| Effective permissions: object CRUD and field read/edit per object | **Yes** - a tractable diff | The real errors |

Export the permission summaries before and after and diff them.

### And resist the temptation

**One big group containing twenty sets** is a permission set with a slower
interface and a subtractive surprise waiting inside it. The benefit of groups
comes precisely from their being **few and specific**.

### Checkpoint

Your audit shows 40 users each assigned six to nine permission sets. Where does
the migration start?

**Answer.** Start with the **profiles**, not the permission sets. If profiles carry
job-specific permissions - and on an org that has grown this way they usually do -
then no group you create can subtract anything, because the profile already grants
it. Run the "delete all profiles but one" test and fix the baseline first. The
permission set re-attribution is straightforward once the baseline is clean, and
it is wasted effort if the profiles still grant everything.

---

## 7. Design review questions

Five questions to ask of any PSG design.

1. Does every group have a **stated exclusion**? A group without one should be a plain permission set.
2. Can any user in the model be granted, by some other assignment, something a group excludes?
3. Does every assignment rule have a documented answer for "what happens if this user's role changes to X"?
4. Does any group contain View All, and is that deliberate rather than inherited from a permission set nobody re-read?
5. Would deleting all profiles but one still work? If not, the migration is not finished.

### Checkpoint

An auditor asks whether a user with `Vantage_Compliance_Auditor` can modify a
`Member__c` record. How do you answer, and what does the answer depend on?

**Answer.** By design, no - the group contains "no Edit anywhere" and the
compliance group holds only Read and View All.

The answer **depends on two things you must verify**: that the user holds no other
assignment granting Edit on `Member__c` (the cross-group union problem), and that
the profile baseline does not grant Edit. Both are checkable, and the second is
the one organisations most often skip. This is why the exclusion is expressed in
a group rather than by simply not assigning an edit permission - "not assigned"
is weaker than "explicitly excluded".

---

## What's next

Phase 11 established how permissions are packaged and combined. Phase 12 moves
to the field level, where the only control that hides data from someone who can
already see the record lives.
