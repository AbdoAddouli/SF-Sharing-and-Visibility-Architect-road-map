# Phase 19: New and Moving Boundaries

This phase is tagged **Implications for Deployment**, the 18% domain, and it
covers the objectives *given a new requirement, determine the design* and
*explain design tradeoffs and possible compromises* against capabilities that are
new, changing, or newly relevant.

The framing: **a new capability is an option, not a requirement.** Adopting one
is a design decision with a cost and a dependency, and the most useful architectural
work is deciding *not* to use something until it earns its place.

## Learning Objectives

By the end of this phase you will be able to:

- Evaluate a new platform capability against the existing design and reach a defensible adopt-or-defer decision.
- Explain the specific implications of each Vantage release-delta capability for the access model.
- Reason about capabilities that change an existing default, rather than adding a new option.
- Write an adoption decision that names the trigger that would change it.

---

## 1. The evaluation frame

A new capability arrives. Four questions decide whether it goes in.

| Question | What it tells you |
|---|---|
| **1. What problem does it solve that the current design cannot?** | If nothing, do not adopt |
| **2. What does it cost?** | Licence, performance, migration, ongoing complexity |
| **3. What does it depend on?** | A capability depending on a roadmap date is a risk |
| **4. What would change our mind?** | The trigger that revises the decision |

> **The discipline that keeps this honest.** A new capability is adopted when it
> **solves a problem the current design actually has**. Not when it is interesting,
> not when it is on the roadmap, not when it would simplify a diagram. **The
> strongest adopt decision is usually defer**, and the strongest defer decision
> always names the trigger that would reverse it.

### The Vantage release-delta landscape

| Capability | Timing | Status in this design |
|---|---|---|
| Apex user mode default | API 67.0 | **Adopted** - declared explicitly |
| `WITH SECURITY_ENFORCED` removal | API 67.0 | **Adopted** - `WITH USER_MODE` everywhere |
| Asynchronous recalculation | Spring '27 | **Adopted** - poll-and-retry in tests and integrations |
| **Profile Filtering** | Winter '27 | **Conditional** - adoption depends on one unmet requirement |
| **Field masking** | Winter '27 | **Conditional** - two specific use cases |
| Retention policy extensions | Winter '27 | **Evaluated and rejected** for `Consent_Record__c` |
| Agentforce and MCP surfaces | Current | **Deferred** - Phase 13, 17 |

---

## 2. Capabilities that change a default

These are more consequential than new options, because they alter code that
already exists.

### Apex user mode default (API 67.0)

| | Before | After |
|---|---|---|
| Apex with no `WITH` keyword | System mode | **User mode** |
| Code written for earlier API | Silently system mode | Now enforces FLS and record access |
| Risk | - | **Existing code changes behaviour without being touched** |

> **What it changed at Vantage.** Trusted internal code - the nightly claims
> reconciliation, the integration handlers - relied on omission rather than
> declaration. Under 67.0 those classes began failing with `Insufficient access`
> on their schedules. Each needed `WITH SYSTEM_MODE` added, which turned an
> implicit assumption into an explicit, reviewable statement.

> **The adopt decision.** Adopted, and the work is complete. The lasting value is
> not the security improvement - it is that **mode is now written down in the code**,
> so the next developer reads an intent rather than inferring one from an absence.

### `WITH SECURITY_ENFORCED` removal (API 67.0)

| | Before | After |
|---|---|---|
| Available | `WITH SECURITY_ENFORCED` | **Removed** |
| Enforced FLS without record scoping | Yes | **Use `WITH USER_MODE`** |
| Migration | - | Replace every use |

> **The consequence worth stating.** A class using `WITH SECURITY_ENFORCED` could
> enforce FLS while leaving record access at system level - a combination that looks
> responsible and under-restricts. Its removal closes that gap, because the
> replacement enforces both. **The migration is not merely a syntax change; it
> tightens record-level enforcement in every place it is used.**

At Vantage, `ConsentAccessService` was the one class using it, and its migration to
`WITH USER_MODE` meant its query began honouring sharing rules rather than
retrieving every consent record the caller could name. **That was a real
tightening, found by the deprecation rather than by a review.**

### Asynchronous recalculation (Spring '27)

| | Before | After |
|---|---|---|
| Recalculation | Largely synchronous | **Asynchronous where supported** |
| Save latency on objects with rule criteria | Can be slow | Improves |
| Access immediately after a change | Near-immediate | **A window** |
| Affected | - | Tests, integrations, any read-after-write on access |

> **The adopt decision, and it is not simply "yes".** Adopted for the platform
> benefit, with a compensating control: **every access assertion in the test suite
> and every read-after-write in an integration is now poll-and-retry with a
> timeout.** That is a codebase-wide change, and it was cheaper to make while
> touching each test than to discover the failures in production.

### Checkpoint

Your org is on API 66.0. Moving to 67.0 fixes a real FLS exposure in your Apex
code. What is the honest assessment?

**Answer.** **The fix is right and the migration is not free, and saying otherwise
would be selling it.**

The benefits are genuine: user mode by default closes accidental exposures, and
the `WITH SECURITY_ENFORCED` removal forces record-level enforcement into code that
was only partially enforcing.

The costs are concrete. Every class relying on implicit system mode needs
`WITH SYSTEM_MODE` - batch classes, `future` methods, schedulables, integration
handlers, roll-up recomputation. Under-testing is the danger: **the Developer
Console still runs in system context**, so a missing declaration passes locally and
fails on a schedule days later. You need a full sandbox and a plan to exercise the
scheduled paths deliberately.

And the residual risk: this changes the behaviour of code you did not write and may
not know exists. **The migration is a security improvement with a testing
obligation attached**, and both halves belong in the recommendation.

---

## 3. Winter '27 capabilities: conditional adoption

### Profile Filtering

| Question | Answer at Vantage |
|---|---|
| **Problem it solves** | A permission set group applies to everyone assigned to it; profile filtering excludes one profile. Our unmet requirement: **supervisors who hold the Senior Analyst role must not see consent evidence** |
| **Cost** | Configuration; no licence implication identified |
| **Dependency** | **Availability in Winter '27** |
| **Decision** | **Conditional** - design for both paths |

> **Why conditional rather than adopted.** The requirement is real and profile
> filtering is the right mechanism *if* role and profile are perfectly
> correlated. **They are not** - two supervisors on different profiles would get
> different access from the same role, which is confusing to administer and harder
> to audit than a capability-based rule.

> **Why the interim design does not depend on it.** The exclusion is already
> enforced by **permission set group intersection** - the underwriter group contains
> a set that withholds `Consent_Record__c`. That mechanism exists today, does not
> depend on a roadmap date, and is auditable from the assignment.

> **The trigger.** Adopting profile filtering when all supervisors are on a single
> profile, **or** when the group-count maintenance burden becomes real. Adopting it
> before then would replace one auditable mechanism with a less obvious one for no
> functional gain.

### Field masking

| Question | Answer at Vantage |
|---|---|
| **Problem it solves** | Two cases FLS cannot express: **a service agent must see that a consent record exists and its capture date without the evidence payload**; and a masked identifier for read-only viewers |
| **Cost** | Configuration; needs to be verified against actual behaviour |
| **Dependency** | **Availability in Winter '27** |
| **Decision** | **Conditional**, with the interim answer designed |

> **The distinction that keeps FLS primary.** FLS removes the field entirely.
> Masking leaves it present with the value concealed. **Only the second one answers
> "show them that it exists"**, and only that second case justifies masking. Every
> other sensitive field stays with FLS, because FLS is stronger - it also removes the
> field from reports, exports and the API.

> **The interim answer without masking.** For the service agent case, split the
> consent object: `Consent_Record__c` holds the evidence payload and is Private to
> compliance; a `Consent_Status__c` object holds the existence and capture date and
> is readable by service roles. **That is a design that works today**, and it is
> also more explicit than masking - the agent is reading a different object, not a
> concealed field on one they should not have access to.

> **The trigger.** Adopt field masking when the two-object split becomes a
> maintenance burden - when a third status field is needed, or when the join between
> status and record becomes costly. Until then, the extra object is the simpler
> design.

### Retention policy extensions

| Question | Answer at Vantage |
|---|---|
| **Problem it solves** | Extensions would help on `Claim__c`, where the statutory floor is 6 years |
| **Why rejected** | The extension changes *how* records are retained - archive rather than live deletion - and `Claim__c` records must stay queryable for reporting |
| **Decision** | **Rejected for `Consent_Record__c` outright**; not adopted elsewhere |

> **The reasoning, which is the useful part.** Retention extensions solve a
> lifecycle problem, and Vantage's lifecycle problem on consent evidence is
> **"never delete"** - which no retention policy expresses. On `Claim__c` the
> records need to remain *queryable*, and a mechanism designed for eventual deletion
> is the wrong shape.

> **The general lesson.** A capability that is broadly useful can still be the wrong
> tool for your specific problem. **Read the requirement before the feature list.**

### Checkpoint

A new platform feature would let you implement the supervisor consent exclusion
in configuration instead of by intersection. Should you adopt it?

**Answer.** **Not yet, and the reason is that your current mechanism already works
and is more auditable.**

Profile filtering would exclude supervisors by profile - but only if role and
profile correlate perfectly. Two supervisors on different profiles would receive
different access from the same role, and **an access model that depends on an
unwritten correlation between two attributes is harder to audit than one that
depends on an explicit capability group.**

The intersection-based exclusion in `Vantage_Underwriter` is auditable from the
assignment, works today, and has no roadmap dependency. Profile filtering is a
better answer if and when the group maintenance burden becomes real - **so it goes
in the design as the named trigger for a future change, not as a dependency.**

The architectural judgement here is worth stating plainly: **adopting a capability
because it exists creates a dependency on someone else's roadmap. That is a cost,
and it is only worth paying when the capability solves a problem you actually
have.**

---

## 4. Agentforce, Data 360 and MCP

The current-cycle capabilities, and the reasoning for deferral.

| Surface | The access question | Decision |
|---|---|---|
| **Agentforce actions** | An agent acts with the user's permissions, **or** with an agent's own | **Deferred** - must confirm the permission model before designing around it |
| **Agentforce Data Cloud / Data 360** | Customer data lives outside the CRM record model | **Deferred** - Phase 17's surface map applies with a new entry |
| **MCP servers** | **An MCP server can return data the org's access model would never grant a user** | **Deferred pending a security review** |

### The MCP concern, stated carefully

An MCP server is a tool that returns data to an AI agent. The architectural
question is whether the data it returns is bounded by the org's access model.

> **The concern.** If an MCP server queries `Member__c` in system mode, or queries a
> system of record directly, **the FLS and sharing rules that govern what a user can
> see do not apply to what the agent sees.** An agent handling a member enquiry could
> return clinical notes to a user who is not entitled to them - not through a
> permissions bug, but because the tool was built without the access model in it.

> **The requirement this creates.** Any MCP server touching Vantage data must be
> treated as **a privileged integration**: a named service identity with the
> narrowest permissions that work, user-mode queries where a user context exists, and
> an explicit review of what each tool can return. **The access model has to be
> written into the tool, because nothing outside the tool will write it in.**

### Checkpoint

An AI agent handles member enquiries through an MCP server connected to Vantage
data. What must you require before it goes into production?

**Answer.** **Four requirements, and the first is the one that decides the others.**

1. **What identity does the tool run as, and what can it see?** If it is a
   named service identity with broad read, then **every agent interaction operates
   with that identity's access, not the requesting user's.** That must be an explicit,
   accepted design decision - not a default.
2. **Are the queries user-mode or system-mode?** If a user context exists, it must be
   user-mode. If system mode is required for technical reasons, then the *filtering*
   has to happen in the tool, and that filtering is now code you own and must review.
3. **What can each tool return, field by field?** An agent tool that returns a whole
   `Member__c` record returns every field the identity can read, including
   `Clinical_Summary__c`. **Tools should return the minimum shape the task needs** -
   which is a design constraint on the tool, not only on the query.
4. **What is logged?** An agent conversation containing PHI is a new place PHI lives,
   subject to retention and to the same classification as the source data.

> **The architectural point.** An MCP server is **a new surface in Phase 17's map**,
> and the map is the tool for assessing it. The reason to insist on the classification
> is that **the agent's output is a copy of the data, outside the record model, held
> in a system - a transcript - that Salesforce sharing rules do not govern.** That
> makes it a Phase 13 classification question and a Phase 17 surface question at the
> same time.

---

## 5. Writing the adoption decision

The deliverable is a short document, and it has four parts.

### The template

| Section | Content |
|---|---|
| **Capability** | Name, timing, and what changed or was added |
| **Problem it solves** | Stated in terms of the *current design's* limitation - or "none" |
| **Cost** | Licence, performance, migration, ongoing maintenance, dependencies |
| **Decision** | Adopt / defer / reject, with the reasoning in one paragraph |
| **Interim design** | **What we do today instead** |
| **Trigger** | The specific event that would reverse the decision |

> **The interim design and the trigger are what make this a decision rather than an
> opinion.** A deferral with no interim design is an admission of a gap. A deferral
> with a trigger is a decision with a review date, and it is the version an auditor
> and the next architect can both work with.

### Worked example: Profile Filtering

> **Capability.** Profile filtering for permission set group and permission set
> assignments, Winter '27.
>
> **Problem it solves.** The supervisor consent exclusion. Role and profile are not
> perfectly correlated, so a capability-based exclusion remains correct where
> profile-based exclusion would not be.
>
> **Cost.** Configuration only. Introduces a dependency on a Winter '27 capability
> date and a second attribute to reason about in an access review.
>
> **Decision.** **Defer.** Permission set group intersection enforces the exclusion
> today, is auditable from the assignment, and does not depend on a roadmap date.
>
> **Interim design.** `Vantage_Underwriter` contains a set withholding
> `Consent_Record__c`. Negative-tested at step 5 of the deployment plan.
>
> **Trigger to adopt.** Supervisors consolidated onto a single profile, **or**
> permission set group count exceeding 12, whichever comes first. Re-evaluate at
> Winter '27 GA.

---

## 6. Design review questions

1. **For each new capability in scope, is the problem it solves stated in terms of the current design's actual limitation?**
2. **Does every deferral name an interim design?** A deferral with a gap is not a decision.
3. **Does every deferral name a trigger** that would reverse it?
4. **Does anything in the design depend on a roadmap date?** If so, is the dependency isolated so it can be removed without redesign?
5. **Have capabilities that change an existing default - user mode, asynchronous recalculation - been treated as higher risk than capabilities that add an option?**
6. **Have agent and MCP surfaces been added to the non-record surface map**, with the same rigour as reports and files?

---

## Checkpoint

The platform has released four capabilities relevant to your access model. Two
solve problems you have, one solves a problem you have differently, and one solves a
problem you do not have. What is your recommendation?

**Answer.** **Adopt two, defer one, reject one - and say so explicitly for each,
because "we did not adopt X" is a decision that should be on the record.**

**Adopt - Apex user mode default and `WITH SECURITY_ENFORCED` removal.** Both close
real gaps in code you already have. The cost is a migration and a testing
obligation, since the Developer Console runs in system context and will not reveal a
missing `WITH SYSTEM_MODE`. Adopt, and schedule the sandbox validation of the
scheduled paths deliberately.

**Adopt - asynchronous recalculation.** Adopted for the platform benefit, with poll-
and-retry in every access assertion and read-after-write. This is not free: it is a
codebase-wide test change, and it is cheaper now than after go-live.

**Defer - field masking.** It solves a genuine case - showing existence without
content - but the interim design is a separate status object, which is more explicit
and works today. **Trigger: a third status field, or a costly join.**

**Reject - Profile filtering.** Not because it is wrong, but because it solves a
problem the current design already solves better. Adopting it would add a dependency
and an attribute to every access review in exchange for nothing.

> **The shape of the answer is the point.** Two adoptions with named costs, one
> deferral with an interim design and a trigger, one rejection with reasoning. **That
> is what an architect's judgement looks like when it is written down** - and the
> rejection is the one that requires the most confidence, because declining a
> capability is a position that has to be defended.

---

## What's next

Phase 19 covered the boundaries that are new or moving. Phase 20 assembles the
whole academy into a capstone and an exam-readiness pass.
