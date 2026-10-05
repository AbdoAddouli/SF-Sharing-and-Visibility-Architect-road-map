# Phase 16: Licences, Sandboxes and Non-Record Data

This phase is tagged **Other Data**, the 16% domain, and it covers the objective
*describe the capabilities and limitations of user-based and permission-based
access* from the licensing side, plus the sandbox and test-data objectives that
sit in the same domain.

The framing: **a permission you cannot licence is a permission you do not have.**
Everything in this phase is about the constraints that are not in the data model -
what you may build, where you may build it, and what you may use to test it.

## Learning Objectives

By the end of this phase you will be able to:

- Map Vantage's user personas to licence types, and explain what each licence does not include.
- Explain the licence and data-model implications of the Winter '27 Profile Filtering capability.
- Choose the right sandbox refresh strategy for a data-dependent security design.
- Explain how sandbox and tooling constraints change what you can validate.

---

## 1. Licence types and what they do not include

| Licence | Includes | Does **not** include |
|---|---|---|
| **Salesforce Platform** | Custom objects, Apex, Lightning, most platform capabilities | High-volume or industry-specific features |
| **Salesforce CPQ** | CPQ objects and licensing for quoting and pricing | General data volume |
| **Salesforce Contracts** | Contracts objects | - |
| **Service** | Cases, knowledge, entitlements | Cases on **Standard** as a *licensed* entitlement; service capabilities vary by edition |
| **Field Service** | Field service and **mobile offline** | General customisation |
| **Customer Service / Contact Center** | Omni-channel and messaging features | - |
| **High Volume** | High-volume API and data operations | Any feature licensing |
| **Salesforce Inspector**, apps | Tooling | Nothing org-side |
| **Industry clouds** | Industry-specific objects | - |

> **The planning question is rarely "which licence".** It is **"which feature does
> my design need, and what does that feature require?"** Start from the capability
> - Shield Platform Encryption, field audit trail, Event Monitoring - then find
> the licence, then count the users.

### Per-user versus org-wide

| Feature | Charging model | Consequence |
|---|---|---|
| Shield Platform Encryption | **Org-wide** add-on, or per-user | Simpler to reason about as an org decision |
| Field Audit Trail | **Per user or org-wide** | Decide per persona; it is expensive per user at scale |
| Event Monitoring | **Add-on, usage-based** | Costs scale with volume, so it must be designed for |
| High Volume | **Add-on, usage-based** | Drives integration architecture |

> **At Vantage**, Shield Platform Encryption is an **org-wide** add-on - one
> decision, one line item - while **Field Audit Trail is a per-user cost** on top of
> that. With 1,200 agents, a decision to give every adjuster Field Audit Trail on
> `Claim__c` is a budget conversation, not a configuration one. **Phase 13's
> design decision to put audit on restricted fields rather than all fields is a
> licensing decision as much as a security one.**

### Checkpoint

Compliance wants Field Audit Trail on `Claim__c` for all 1,200 claims agents. What
must you establish first?

**Answer.** **Who actually needs attribution, and at what cost.**

Field Audit Trail is a per-user or org-wide licence. At 1,200 agents the cost is
substantial, and the design question is whether attribution is needed for every
change to every claim or only for the fields where repudiation matters. Phase 13's
classification answers it: audit on the restricted and confidential fields,
where someone altering the record is the actual risk.

Establish the user count and the field list, cost it, and present it. The
alternative - arguing for it without the numbers - tends to lose, and the
requirement then quietly goes unimplemented.

---

## 2. Winter '27 Profile Filtering

A newer capability: **profile filtering** allows permission set groups and other
assignments to be filtered by profile.

| Property | Behaviour |
|---|---|
| What it filters | Permission set group or permission set assignments, by profile |
| Why | Reduce unnecessary permissions for users who share a role but not a profile |
| Effect | A group assignment can be excluded for users on a given profile |
| Base requirement | Does not create access that permissions do not already allow |

> **Why it matters for a sharing design.** Under the three-layer model from Phase
> 11, a permission set group applies to everyone assigned to it. **Profile
> filtering lets a group apply to most users and not to one profile**, which
> closes a gap that previously needed either a second group or a custom
> permission.

### The architectural consequence

This weakens the argument for one group per job function when job functions
correlate imperfectly with profiles.

| Before | With profile filtering |
|---|---|
| One group per job function | One group per job function, **excluding** profiles that must not have it |
| A second group to carve out the exception | A filter condition on the assignment |
| Two groups to maintain in step | One group, one filter |

> **The important check.** Profile filtering narrows **assignments**; it does not
> narrow **permissions inside a set**, and it does not touch record-level sharing
> or FLS. **It is an assignment-scoping tool, not an access control.** A design that
> relies on it for the exclusion in Phase 11 - the one preventing field agents from
> seeing consent evidence - still needs the intersection behaviour inside the
> group. Profile filtering and permission set group intersection solve different
> problems.

### Checkpoint

Underwriter and reviewer both hold the Senior Analyst role. One must not see
consent evidence. Which mechanism, and which is not sufficient alone?

**Answer.** **Permission set group intersection**, containing the exclusion set
alongside the capability sets. That is the mechanism that subtracts.

**Profile filtering is not sufficient alone** if both users share a profile, and
even if they did not, profile filtering scopes *assignment* rather than
*permissions within an assignment*. It is the right tool for "everyone in this
role except people on this profile", not for "this capability but never that one
within the same person".

---

## 3. Sandboxes and refresh strategies

| Sandbox type | Refresh from | Holds production data | Full or partial copy |
|---|---|---|---|
| **Developer** | Production or another sandbox | Refreshable; **data can be scrubbed** | Full copy |
| **Partial** | Production metadata plus selected data | Partial data | Partial |
| **Full** | Production | **Yes** | Full copy |
| **Scratch** | Templated org, mostly empty | **No** | Created from a template |

> **The security-relevant fact: full and developer sandboxes contain production
> data.** A sandbox is therefore a **second copy of your sensitive data**, with the
> access model you designed - and it is the one most often left with relaxed
> permissions because "it is only a sandbox".

### Refresh strategies

| Strategy | How | Best for | Cost |
|---|---|---|---|
| **Refresh** | Copy from production or full sandbox | Keeping prod-like data | Slow for large orgs; **consumes sandbox refresh capacity** |
| **Clone** | New sandbox from a template, then deploy metadata | Metadata-dependent designs | Faster; **data must be built or loaded** |
| **Copy** | Selectively copy specific objects or data | Data-dependent but narrow requirements | Selective |

> **Refresh capacity is a real annual constraint.** Refreshes are limited per
> year by org type, and at Vantage's scale - 2.4M members, 380k claims - each
> refresh is expensive in time. **The design decision this forces: what genuinely
> needs production-shaped data?**

### Checkpoint

You need to test role-hierarchy-based access to claims for a regional manager
covering 400 claims. Which sandbox strategy?

**Answer.** **Refresh from production**, because the test depends on the real
shape of the data - the actual claims, their owners, and the actual role
assignments. A cloned sandbox with no data cannot demonstrate that a role-based
design works, because there is nothing to be hierarchical about.

The cost is one refresh, and it should be justified against the annual capacity.
Note that this test is exactly the kind that **cannot be done in a scratch org**,
which is a limitation worth stating: your scratch org cannot validate the design
you actually built.

### Checkpoint

The security team asks how you ensure a full sandbox does not become an
uncontrolled copy of member data. What is the answer?

**Answer.** Four controls, and the first is the one people forget.

1. **The sandbox org ID is known and tracked.** You cannot govern a sandbox you have not inventoried. Include it in the access model - it needs its own entry.
2. **The same access model applies.** The permission sets, groups and sharing rules are deployed there. A sandbox with production data and relaxed permissions is an uncontrolled copy, not a test environment.
3. **Refresh on a defined schedule, not on demand.** Capacity discipline doubles as data-minimisation discipline - a sandbox holding three-year-old production data is holding data you no longer need.
4. **Encryption and FLS are deployed.** Production's Shield configuration travels with the metadata; verify it did, because an unencrypted copy of production data is a finding.

---

## 4. Test data strategy

The constraint that shapes this: **you cannot construct 2.4M members by hand, and
you should not load production data to test access.**

| Approach | Fidelity | Risk | Use when |
|---|---|---|---|
| **Synthetic data** | Low realism, high safety | None | Permission-set membership, group intersection, profile filtering |
| **Anonymised production data** | High | Requires a real anonymisation process | Calibrating performance and recalculation behaviour |
| **Production data in a sandbox** | Highest | Highest | Final validation of a data-dependent design |
| **Volume test data** | Volume without content | Low | Performance testing only |

> **The property that matters: test data must exercise the *sharing*, not just the
> schema.** Synthetic data that gives every record the same region and plan tier
> proves nothing about a criteria-based rule. **Design the data to make the rules
> interesting** - a member with no region, a member whose region changed last
> week, a claim matching three rules at once.

### The cases that catch real bugs

| Test case | Bug it catches |
|---|---|
| A record matching **no** rule | Assumption that every record has an owner or region |
| A record matching **multiple** rules | Overlapping rules and precedence assumptions |
| A record whose **criteria field is null** | Rules that silently match nothing |
| A user in **two groups** that both grant access | Double-counting assumptions |
| A user in a group that was **just added to** | Recalculation timing |
| A record **just updated** so criteria no longer match | Stale access |
| A user with **no assigned role** | Empty-hierarchy behaviour |

> **The "matching no rule" case is the highest-yield test in the list**, because a
> criteria-based rule that matches nothing is silent - no error, no log, and a user
> who simply cannot see anything. Phase 4's zero-match problem, found by test data
> design rather than by luck.

### Checkpoint

Your test suite creates claims and asserts access. Under Spring '27 asynchronous
recalculation, some assertions fail intermittently. What is the correct fix?

**Answer.** **Poll for the expected access with a timeout**, rather than asserting
once. The intermittent failure is the platform's recalculation window, not a bug in
your logic.

This is the same discipline from Phase 15, applied to tests: **verify
empirically with retry**, because access is eventually consistent state rather than
a value returned synchronously. A test asserting once encodes an assumption the
platform does not make, and it will fail in CI on an unrelated day.

---

## 5. Tools and environments

The tooling available determines what you can validate.

| Environment | Can you validate access design? | Notes |
|---|---|---|
| **Production** | Yes, with care | Never test access changes here; **Profile Permissions** as a user is the safe read-only tool |
| **Full sandbox** | **Yes - this is the real test** | Production data plus deployed metadata |
| **Developer sandbox** | **Yes** | Refreshable, scrubbable |
| **Partial sandbox** | Partially | Data-dependent tests are limited |
| **Scratch org** | Metadata and logic only | **No data, so no realistic sharing tests** |
| **Developer Console** | Weakly | **Anonymous Apex runs in system context** - a testing blind spot that has caught real incidents |

> **The scratch org limitation is worth stating in a review.** A scratch org is
> excellent for validating that your Apex compiles, that your flows work and that
> your metadata deploys - and **unable to validate that a sharing design functions
> at volume**. Those are different tests, and a design that has only been checked in
> a scratch org has had its most important behaviour unverified.

### Checkpoint

A QA engineer reports a bug: "agents can see member SSNs in the sandbox." The
engineer ran an anonymous Apex query in the Developer Console. What happened?

**Answer.** **Anonymous Apex runs in system mode**, so the query ignored FLS and
returned the values regardless of who was logged in.

This is not a security bug in your design; it is an artefact of the testing
context. The correct test is to run the query as a **named user** - use
**Profile Permissions** to impersonate a field agent, or deploy a small Apex class
with `WITH USER_MODE` - and confirm the fields are absent.

The general lesson, and it has appeared in several phases now: **the Developer
Console is a system-context environment, so it cannot validate access control.**
Under API 67.0, deployed code defaults to user mode while the console still runs in
system mode - so the console is precisely the wrong place to confirm an access
model.

---

## 6. Design review questions

1. **Does every feature in the design have a licence and a cost attached**, and does the business know the number?
2. **Are per-user licensed features - Field Audit Trail especially - scoped to the personas that need them** rather than rolled out to everyone for simplicity?
3. **Are full and developer sandboxes in the access model**, with production's permission sets deployed to them?
4. **Is sandbox refresh capacity planned**, with the test cases that genuinely need production data identified and reserved?
5. **Does the test data exercise the sharing rules**, including no-match, multi-match and null-criteria cases?
6. **Are access tests run as a named user**, rather than in anonymous Apex?
7. **Have the release-delta capabilities - Profile Filtering, field masking - been checked against current availability**, rather than assumed?

---

## Checkpoint

The project is 80% complete. The team wants to validate the whole sharing model
before go-live. You have two full sandboxes, limited annual refresh capacity, and
one scratch org. What do you do?

**Answer.** **Sequence the validation by what each environment can actually prove.**

**Scratch org** - use it now, and for the things it is good at: does everything
deploy, does the Apex compile with the modes I intend, do the flows and permission
sets resolve. Zero refresh capacity consumed.

**One full sandbox, refreshed once, reserved carefully** - this is the only place
the design can be validated against production-shaped data. Spend it on the tests
that need it:

1. Role-hierarchy access for a regional manager across 400 real claims.
2. Criteria-based rule behaviour on `Claim__c`, including no-match and null-criteria records.
3. Recalculation timing on a bulk `Status__c` change, measured rather than assumed.
4. External access in Experience Cloud, empirically, with each persona - the test from Phase 9 that cannot be done anywhere else.
5. Effective permission diff against the pre-migration permission matrix.

**The second full sandbox** - do not refresh it yet. Hold it as the **pre-migration baseline** for the permission diff in step 5, and as the rollback destination. That is a better use of it than an early refresh that produces a second copy of the same data.

And state the limitation plainly: **none of this validates at production volume.** Refresh copies have limits, and 2.4M records may not fully copy. If recalculation timing at scale is a genuine risk, the honest answer is a Pilot or a limited-release go-live on `Consent_Record__c` first - which is a decision worth surfacing now rather than after the cutover.

---

## What's next

Phase 16 covered the environment outside the data model. Phase 17 stays in the
**Other Data** domain but moves inward, to the data that is not records at all -
platform events, big objects, files, aggregates and the rest of the surfaces where
"who can see this" has a different shape.
