# Phase 18: The Enforcement Wave

This phase is tagged **Implications for Deployment**, the 18% domain, and it
covers its objectives directly: *describe the implications of design changes*,
*given a new requirement, determine the design*, and *explain design tradeoffs and
possible compromises*.

Everything so far has been a piece. This phase is the **change**, and the
governing fact is that sharing and visibility changes are **hard to reverse and
easy to get wrong in aggregate**.

The framing: **you are not making a change, you are swapping an access model
while people are working.** Every phase so far contributes one risk to that swap.

## Learning Objectives

By the end of this phase you will be able to:

- Sequence a sharing and visibility change so the business keeps working, and explain the dependency order.
- Identify the changes that trigger recalculation, and plan around the access gaps they open.
- Analyse a new requirement against an existing design and produce a tradeoff analysis rather than a yes or no.
- Communicate a compromise in terms the business can decide on.

---

## 1. Why the aggregate risk is the risk

Each individual change in Phases 1-17 is defensible. The risk is in combination.

| Change type | Individually | In combination |
|---|---|---|
| OWD change | Simple | **Recalculates everything; affects every sharing mechanism** |
| Add a sharing rule | Local | Interacts with every existing rule; possible overlap |
| Change a role hierarchy | Local | Changes access for everyone in the subtree |
| Add FLS | Local | **May break Apex, reports, and relationship queries** |
| Assign a permission set group | Local | Intersection behaviour is non-obvious; may re-grant an exclusion |
| Deploy Apex in system mode | Local | Bypasses everything at once, silently |

> **The principle to state in a review.** Two safe changes can produce an unsafe
> system - for example, a permission set that re-grants access a group excludes.
> **There is no incremental safety**, which is why the review evidence is the
> *effective* permission diff, not the list of changes.

### The dependency order

Not arbitrary. Each step depends on the one before it.

| Step | Change | Why here |
|---|---|---|
| 1 | Baseline: **Profile Permissions** export of effective permissions | Without the before-state you cannot prove anything changed safely |
| 2 | Deploy permission sets and groups, **assign to nobody** | Establishes the metadata without changing anyone's access |
| 3 | Deploy permission sets to a **pilot group** | Real access change, limited blast radius |
| 4 | OWD changes, one object at a time, lowest volume first | Each triggers recalculation; start where it is cheap |
| 5 | Sharing rules, **stable criteria first** | Establish the rules that will not churn |
| 6 | Apex classes, modes declared explicitly | Code is what enforces sharing; get it right before volume |
| 7 | Apex sharing, in **batch**, for the sensitive objects | Most expensive mechanism, last |
| 8 | Field-level filtering reports and audit verification | Prove the result |
| 9 | Expand assignment by role | Now it is routine |

> **Why OWD comes before the rules.** Changing OWD recalculates all sharing for
> that object. Doing it **after** the rules are in place means the rules are
> recalculated as well - twice the work and twice the exposure window. **Do the
> expensive recalculation first, while the object has the fewest sharing
> mechanisms attached.**

### Checkpoint

Why must the baseline export come before any change is made?

**Answer.** **Because the only valid evidence that a change was safe is a
comparison.** `Profile Permissions` gives you the effective permissions of a user as
configured - object CRUD and field read and edit.

That export is what you diff against afterwards. Without it, "did this change
break anyone?" can only be answered by asking users, which means the first people
to suffer discover it themselves. And the diff is per user per object per field -
tractable. Verifying that nobody's *records* changed visibility is infeasible at
this volume, so permissions is the layer you can actually prove.

---

## 2. The recalculation windows

This is the part that surprises people, because each change below creates a period
during which **access is correct in configuration and wrong in state**.

| Change | Recalculation | Exposure window | Mitigation |
|---|---|---|---|
| **OWD change** | Yes, on the object | Hours at Vantage volumes | Pilot, one object at a time, communicate |
| **Sharing rule criteria change** | Yes | Hours | Change criteria only when necessary; expect the window |
| **New sharing rule** | Yes, for matching records | Hours | Deploy before the business depends on it |
| **Role hierarchy change** | Automatic | Short | Schedule it; subtree size drives cost |
| **Group membership change** | For all members | Minutes to hours | Avoid bulk membership changes during business hours |
| **Permission change** | **None** | Next session | Fast - and immediately visible |
| **Field Audit Trail enablement** | **None** | None | Licences only |
| **Spring '27 async recalculation** | **Asynchronous by default** | **Every data change has a window** | Poll-and-retry in tests and integrations |

> **The asymmetry to be explicit about.** Permission changes are instant and
> silent - no recalculation, so a wrongly granted View All is live immediately. Data
> changes are slow and visible. **Your change control should be strongest on the
> fast path**, because that is where a mistake is instantly org-wide.

### Spring '27: asynchronous by default

| | Before | After |
|---|---|---|
| Recalculation | Largely synchronous | Asynchronous where supported |
| Save latency | Can be slow on objects with rule criteria | Improves |
| Immediate consistency after save | Closer to immediate | **A window** |
| What breaks | - | Anything asserting access immediately after a save |

> **The design implication is for your tests and your integrations, and it should
> be built into the design rather than discovered.** Both need **poll-and-retry with
> a timeout** instead of a single assertion or a single read-back. This is Phase 15's
> point, now applied to the whole change.

### Checkpoint

A permission set granting View All on `Claim__c` is deployed and assigned to 40
users on a Friday afternoon. No recalculation is triggered. What is the risk, and
why is it worse than an OWD change?

**Answer.** **The risk is that all 40 users immediately see every claim in the org**,
including ones they have never had access to, with no recalculation, no delay and no
error.

It is worse than an OWD change because an OWD change at least opens a *window* -
hours during which state converges, with monitoring possible and partial exposure
bounded. A permission change is **instant and complete**. There is no interval in
which only some of the wrong access has materialised.

Which is why: View All grants should be deployed in a **pilot group of one or two**
first, and the group should carry a documented removal date. A permission granted
"temporarily" and never removed is the most common permanent finding in this domain.

---

## 3. Requirement analysis against an existing design

The Phase 18 skill is not deployment - it is **analysing a new requirement against
what exists** and producing a reasoned answer.

### The method

| Step | Question | Output |
|---|---|---|
| 1 | **What is the requirement, stated as an access outcome?** | A sentence in the form "role X can do Y to records matching Z" |
| 2 | **Which layers must change?** | Permissions, sharing, both, or neither |
| 3 | **What is the current behaviour?** | Verified, not assumed |
| 4 | **What is the cost?** | Recalculation, licence, performance, ongoing maintenance |
| 5 | **What are the alternatives?** | Including the option of not doing it |
| 6 | **What is the compromise, and who decides?** | A named decision, with the tradeoff stated |

> **Step 6 is where most designs fail.** A sharing requirement arrives, and the
> architect either builds it or objects. **The actual deliverable is a tradeoff
> analysis that lets the business decide with the cost in front of them** - and the
> most valuable option in the list is frequently *a cheaper mechanism that meets 80%
> of the need*.

### Worked example: the broker portal requirement

**Requirement.** *"Brokers must see their client's complete claims history."*

| Analysis | Finding |
|---|---|
| Current behaviour | Brokers are external; they have sharing set access to member records, **not** to `Claim__c` |
| Layers to change | Sharing (a new sharing set on `Claim__c`) **and** permissions (the guest user permission set needs Read on `Claim__c`) **and** FLS (brokers must not see `Diagnosis_Code__c`) |
| Volume impact | `Claim__c` is 380k records; the sharing set produces share rows per matching claim per broker |
| Cost | Share row volume proportional to broker client counts; recalculation on every new claim |
| **Alternative 1** | A **summary object** - `Broker_Claim_Summary__c` - maintained by Apex, one record per broker-client pair, containing what brokers actually need |
| **Alternative 2** | A **report** on `Claim__c` shared to the broker group, no new sharing at all |
| Recommendation | **Alternative 1**, because "complete claims history" is a report-shaped requirement that does not need record-level access |

> **The reasoning worth internalising.** The requirement as stated - *brokers see
> client claims* - sounds like an access requirement. On examination it is a
> **reporting requirement**: brokers do not act on claims, they read them. Building
> 380k-odd share rows to deliver a view the business could have had as a report is
> paying a permanent, scaling cost for a one-off display need. **Ask what action the
> user takes on the data - that question determines whether you need access or a
> view.**

---

## 4. Compromise, and how to communicate it

Compromises are legitimate. Uncommunicated compromises are not.

### The four compromises available

| Compromise | What you give up | When it is right |
|---|---|---|
| **Narrow the scope** | Some users or records do not get the access | The requirement over-reaches; the common case works |
| **Delay the automation** | Manual step until Phase 2 | The volume does not justify the build yet |
| **Trade recalculation for simplicity** | Performance cost | The object is small and stable |
| **Add a compensating control** | Nothing, if the control is real | The ideal mechanism is too expensive |

> **Compensating controls are the strongest of the four.** If the ideal design is a
> criteria-based rule on `Member__c` and that is not viable at 2.4M records, then
> **OWD Public Read Only plus FLS plus roles plus field masking** may deliver the
> same outcome at a fraction of the cost. That is not a compromise - it is a better
> design found by knowing what each mechanism costs.

### Communicating in the business's language

| Do not say | Say |
|---|---|
| "A criteria-based sharing rule would generate 300,000 share rows" | "This approach would slow down saving claims noticeably for about two days. Here is the faster alternative." |
| "OWD Public Read Only is not appropriate for PHI" | "Making claims visible to all staff and relying on field permissions to hide the sensitive parts is faster and cheaper, but depends on those permissions being right. Do you want that trade?" |
| "We cannot implement Apex sharing at this volume" | "We can do this, but it will slow down the nightly batch. Here is roughly what that means for the batch window." |

> **The pattern.** State the **business consequence**, offer the **alternative**,
> name the **residual risk**, and make the **decision explicit and named**. An
> architect's deliverable is frequently a decision someone else makes, supported by
> an analysis they could not have produced themselves.

### Checkpoint

The business will not fund the automated solution and asks for a manual process
for now. What is your obligation before agreeing?

**Answer.** **Three things, in writing.**

1. **The residual risk, stated plainly** - a manual step is skipped, and the consequence is ungoverned access. Name it.
2. **The volume assumption under which manual is acceptable** - at current volumes, how many items per week? At what number does it break?
3. **A review date** - with the trigger for building the automated version.

The failure mode to avoid is agreeing to manual and never revisiting it, so the
manual process quietly becomes permanent at triple the volume. **A manual process
without a volume ceiling and a review date is not a compromise, it is a deferred
incident.**

---

## 5. The deployment plan

The consolidated sequence with the reasons attached.

| # | Action | Gate before proceeding |
|---|---|---|
| 1 | Export effective permissions for every affected persona | Baseline exists |
| 2 | Deploy permission sets, groups, FLS - **unassigned** | Metadata deploys cleanly; no access change yet |
| 3 | Verify FLS impact: **search all Apex, SOQL, LWC and reports** for restricted fields | No code depends on a field being readable |
| 4 | Assign to a **pilot group of 2-3 users** | Pilot users confirm they can do their jobs |
| 5 | Negative test: confirm excluded personas are actually excluded | The intersection and FLS exclusions work |
| 6 | OWD change, **lowest-volume object first** | Recalculation completes; access verified |
| 7 | Sharing rules deployed, **stable criteria first** | Rule matches verified, including the no-match case |
| 8 | Apex deployed with **explicit modes**; batch-run the sharing Apex | No access errors in the batch |
| 9 | Empirical external test - every persona, every denied record type | The Phase 9 matrix complete |
| 10 | Permission diff against the baseline | **Zero unintended differences** |
| 11 | Expand by role assignment rules | No incidents over the stabilisation window |
| 12 | Field Audit Trail reports; recalculation queue monitored; document | Handover signed off |

> **Step 3 is the one that gets skipped and the one that breaks deployments.**
> Removing a field permission does not fail gracefully - it breaks Apex queries,
> reports and Lightning components, often with a message that points at the field
> rather than at the permission change. **Searching the codebase for the restricted
> field names is five minutes of work that prevents a failed deployment.**

### Checkpoint

Step 5 in the plan is a negative test - confirming excluded personas are actually
excluded. Why does it sit before the broad rollout rather than after?

**Answer.** Because **the excluded case is the one that fails silently.**

A pilot user who has lost access to something they should have had reports it
immediately, and you fix the permission set. An excluded user who has *gained*
access to consent evidence, underwriting fields or SSN data sees exactly what they
have always seen - and reports nothing, ever.

So the failure modes are asymmetric in the worst possible way: **losing access is
loud, gaining access is silent.** That makes the negative test the only way to
confirm the exclusion mechanisms - permission set group intersection, FLS, and the
cross-assignment re-grant problem from Phase 11 - are actually working. Testing
that with 40 users after rollout means testing it with 40 people's PHI.

---

## 6. Post-deployment

| Watch | Why | Escalation trigger |
|---|---|---|
| Recalculation queue depth | Sustained depth means a design that does not scale | Growth over days, not minutes |
| Save latency on affected objects | The user-visible cost of the design | Regression against the pre-deployment baseline |
| Apex exceptions in scheduled jobs | **System-mode code hitting user-mode defaults**, or FLS removals | Any new exception type |
| Permission diff, re-run at 30 days | Assignment rules and group drift | Any difference from the intended state |
| Access requests to the security team | Users encountering real gaps | Pattern rather than volume |
| Field Audit Trail reports | Attribution is working | - |

> **The scheduled-job exception is the one to check first in the first week.**
> Under API 67.0 with asynchronous recalculation, trusted internal code that lost
> access silently starts failing **on a schedule nobody watches** - so it surfaces
> days later as a business complaint about stale data rather than as an error.

### The handover

| Document | Purpose |
|---|---|
| **Effective permission matrix** per persona | What each role can reach, as configured |
| **Sharing architecture** - mechanism per object | Why each object uses the mechanism it uses |
| **Empirical external access matrix** | The Phase 9 persona-versus-record matrix |
| **Residual risks and accepted compromises** | What was decided against, and by whom |
| **Recalculation characteristics** per object | What to expect after changes |
| **Release-delta dependencies** | Profile Filtering, field masking, async recalculation |

> **Include the residual risks.** A handover that lists only what was built is an
> incomplete handover, because the compromises were decisions someone made and the
> next architect needs to know which parts of the model are load-bearing decisions
> rather than defaults.

---

## Checkpoint

You have completed Phases 1-17 for Vantage. The CISO asks for a single view of
what changed, what it cost, and what you would do differently. What do you
present?

**Answer.** **Four things, in this order.**

**What changed.** The access model, per object and per persona. `Member__c` moved
from a rules-based design to OWD Public Read Only with FLS, roles and teams
carrying the boundary - because at 2.4M records the rules design would not hold.
`Claim__c` keeps criteria-based rules, targeting groups, on stable criteria.
`Consent_Record__c` is Private with Apex sharing, because high sensitivity and high
volume rule out rules. Permission set groups replaced 340 individual permission set
assignments across 1,200 users, with the exclusions that were previously
impossible now enforced by intersection.

**What it cost.** Recalculation: the OWD change on `Member__c` was the largest,
followed by rule deployment on `Claim__c`. Licences: Shield org-wide, Field Audit
Trail on restricted fields only for the personas that need it. Ongoing: the
`AccessRequest__c` skew indicator, and recalculation monitoring. One sandbox
refresh consumed from the annual capacity.

**What I would do differently.** I would model region and plan tier on the user
rather than on the member from the start. It was a data-modelling decision that
turned a cheap role-hierarchy design into an expensive rules design - and **that
cost is locked in now**. I would also have written the negative test first rather
than the fifth step, because the exclusion mechanisms were the hardest thing to
verify and I nearly shipped them unverified.

**What is still open.** Report subscriptions produce copies outside the access
model and need a policy. Report field exclusion depends on who maintains the
reports. And the model assumes Profile Filtering and field masking land as
described in Winter '27 - if they do not, the field-agent exclusion needs a
different mechanism.

> **The value of that structure** is that it separates what is done, what it cost,
> what you learned and what remains uncertain. A CISO does not need a tour of the
> design - they need to know whether to sign it, and what would wake them up.

---

## What's next

Phase 18 delivered the change. Phase 19 looks at the boundaries that are new or
moving - the release-delta capabilities, and the reasoning that decides whether to
adopt a new mechanism or stay with the known one.
