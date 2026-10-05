# Phase 20: Capstone and Certification Preparation

This phase is tagged **Certification Preparation**. It covers the whole blueprint -
all four domains - and the objective that sits across all of them: *given a new
requirement, determine the design*.

Nothing new is introduced here. That is the point. **A capstone that teaches a new
concept has taught it too late to be examined on it.**

## Learning Objectives

By the end of this phase you will be able to:

- Answer a scenario question in the structure the exam uses, under time pressure.
- Apply the domain-weighting strategy to allocate preparation effort.
- Recognise the distractor patterns used across the four domains.
- Walk into the exam with a decision procedure rather than a memorised fact list.

---

## 1. Exam structure and what it implies

| Fact | Detail |
|---|---|
| Exam | `Plat-Arch-205`, Salesforce Certified Platform Sharing and Visibility Architect |
| Format | **60 scored multiple-choice questions**, plus up to 5 unscored |
| Time | **120 minutes** |
| Pass mark | **58%** |
| Prerequisite | **None** |
| Domains | Records 39%, Permissions 27%, Implications 18%, Other Data 16% |

> **The arithmetic that should shape your preparation.** 120 minutes for 60 scored
> questions is **two minutes per question**, and the unscored questions take the same
> time. **At 58%, you can miss 25 and pass** - which means the strategy is to be
> certain on the 39% domain and to eliminate two options on the rest, not to be
> right everywhere.

### Weighting your effort

| Domain | Weight | Priority | Why |
|---|---|---|---|
| **Records** | 39% | **Highest** | Nearly four questions in ten, and the domain with the most mechanisms to confuse |
| **Permissions** | 27% | **High** | The union/intersection rules are learnable and decisive |
| **Implications** | 18% | Medium | Judgement questions; learn the vocabulary, not the facts |
| **Other Data** | 16% | **Lowest, not zero** | Enumerable - there are a finite number of surfaces, and they reward preparation |

> **The counterintuitive allocation.** Records and Permissions together are **66%**,
> and both are mechanisms with rules you can master. Implications and Other Data are
> 34%, and both are harder to drill because they are judgement and recall.
>
> **So: master the mechanisms first, then prepare the judgement.** Most candidates
> do the reverse - they spend their time on scenarios because scenarios feel like
> the exam, and arrive underprepared on the union rule that a single question tests.

---

## 2. The decision procedure

For almost every scenario question, the same six steps apply. **Practising the
procedure matters more than practising the facts.**

| Step | Question | Why |
|---|---|---|
| 1 | **Which domain is this?** | Determines which rules are relevant |
| 2 | **Is it a user or the system?** | If a user, FLS and record access apply. If the system, neither. This one step eliminates options |
| 3 | **What mechanism is named?** | OWD, rule, team, role, Apex, FLS, encryption |
| 4 | **What is the volume or scale?** | Decides whether the mechanism is viable at all |
| 5 | **What does the requirement actually need?** | Access, or a view? A report, or record-level access? |
| 6 | **Which of the options is the narrowest sufficient mechanism?** | The exam's preferred answer is almost always the narrower one |

> **Step 2 is the highest-yield single step.** Distinguishing a user context from a
> system context eliminates whole categories of wrong answers, and it is the
> distinction the exam tests most consistently across all four domains.

### Step 6, stated more precisely

When options differ only in breadth, the correct answer is the one that:

1. Meets the stated requirement **and no more**.
2. Does not bypass sharing or FLS where the requirement did not ask for it.
3. Is viable at the volume stated in the question.
4. Can be verified - a declarative mechanism beats code where both work.

> **The pattern to recognise.** A question offering "grant View All" and "create a
> sharing rule" is testing whether you will reach for the bypass. **The bypass is
> correct only when the question's requirement actually needs all records.** If it
> says "regional managers see their region", View All is wrong, and it is wrong
> precisely because it is more than the requirement.

### Worked example

> **Question.** A healthcare org has 2 million members. Business requires that
> service agents can read any member's contact details but no clinical fields.
> Which approach is most appropriate?
>
> A. Create a criteria-based sharing rule on `Member__c` granting read to the service
> agent public group
> B. Set OWD to Public Read Only on `Member__c` and use FLS to restrict the clinical fields
> C. Grant the service agent public group Modify All on `Member__c`
> D. Create an Apex sharing class that grants read to service agents

**Applying the procedure:**

| Step | Result |
|---|---|
| 1. Domain | Records, with Permissions |
| 2. User or system? | User |
| 3. Mechanism named? | Rule, OWD, or Apex |
| 4. Volume? | **2 million records** - this is decisive |
| 5. Actual need? | Read contact details, not clinical - **a field-level requirement, not a record-level one** |
| 6. Narrowest sufficient? | **B** |

> **Why A fails at 2M records:** share rows per record per group member, and
> recalculation triggered by criteria churn. **Why C fails:** View All is a bypass
> nobody asked for. **Why D fails:** Apex sharing for a requirement that is purely
> about fields. **B is correct because the requirement is field-level, and the
> volume makes the record-level mechanism the wrong tool anyway.**

---

## 3. Distractor patterns by domain

The wrong options are not random. Each domain has recurring patterns, and
recognising them is faster than reasoning from scratch.

### Records (39%)

| Distractor | Why it is wrong | Tell |
|---|---|---|
| A rule instead of OWD | Share row cost at volume | The question states a large volume |
| OWD instead of a rule | Grants far more than required | The requirement is selective |
| Manual sharing instead of a rule | Does not scale or persist | Any mention of many users or records |
| Ignoring a relationship requirement | Parents gate children | The record is a child |
| Assuming role hierarchy applies to external users | External users have no role | Any external or guest mention |

### Permissions (27%)

| Distractor | Why it is wrong | Tell |
|---|---|---|
| Assuming permission sets add to a restricted profile | They union with it | A profile lacking the first Read |
| Assuming groups union | **They intersect** | Any group question |
| Encryption as an access control | It protects data at rest, not reads | The requirement is about who can see |
| Page layout as a control | Not enforced by the API | A "hide this field" option |
| System mode for a user-facing path | Bypasses both | Any controller or LWC option |

### Implications (18%)

| Distractor | Why it is wrong | Tell |
|---|---|---|
| OWD change presented as low risk | It triggers full recalculation | Any OWD option in a change question |
| Apex sharing in a transaction at high volume | Locks and throughput | A volume plus a transaction question |
| Manual process with no ceiling | Not a plan | An "operational workaround" option |
| No trigger on a deferral | Not a decision | Any "phase 2 later" option |

### Other Data (16%)

| Distractor | Why it is wrong | Tell |
|---|---|---|
| Field history proving who read data | It records changes, not reads | An audit or read-receipts question |
| Assuming the record model covers the surface | It does not | Events, files, metadata, big objects |
| Reporting as record-level access | Different requirement | A dashboard or notification question |

---

## 4. Facts to have instant recall on

A short list, because at two minutes a question you can retrieve instantly is a
question you can afford to think about.

| Fact | Correct answer |
|---|---|
| Domain weights | Records 39, Permissions 27, Implications 18, Other Data 16 |
| Pass mark | 58% |
| Questions and time | 60 scored, 120 minutes |
| Prerequisite | None |
| Public Read Only | Everyone reads, nobody writes, **no share rows** |
| Public Read/Write | Everyone reads and writes, **no share rows** |
| Private | Access only via sharing rules, manual shares, or ownership |
| Owner-based | The default for Private and Controlled by owner |
| Controlled by owner | Owner and those above in the hierarchy, **plus the sharing options Private has** |
| Master-detail | A child **cannot** be in a public group on the master, and cascade delete applies |
| Lookup relationship | Full sharing flexibility |
| Role hierarchy | Org-wide default, **no cost, recalculates automatically** |
| Teams | Membership-based sharing, not positional |
| Permission set groups | **Intersect** within a group |
| Profile and permission sets | **Union** |
| Encryption | Values are **not searchable** |
| Field History | 20 fields, **90 days** |
| Field Audit Trail | 60 fields, **10 years**, licensed |
| Formula fields | **Never** secure - the value is in the database |
| Roll-up summaries | Inherit the security of the **child** |
| Restricted picklists | Do **not** control who can read a value |
| User mode | Enforces FLS, permissions and record access |
| System mode | Enforces **neither** |
| Recalculation | Sharing rules are the expensive case; OWD and permissions recalculate nothing |

### The formula and roll-up row

> **The single most-tested FLS fact.** A formula field is stored and computed
> regardless of permissions, and its value is visible in reports and API responses to
> anyone with read on the record - **even if the source fields are restricted**. FLS
> on a formula field restricts the field, not the underlying computation, and the
> derived value has been the source of real disclosure incidents.

> **Roll-up summaries are the opposite case**: they inherit the security of the
> **child** records. Because the underlying child data is not accessible, a roll-up
> on a restricted object is safer than a formula on the same object.

---

## 5. Two minutes a question

The time budget is real, and most candidates lose it in the same places.

| Question type | Target time | Approach |
|---|---|---|
| Direct fact recall | 45 seconds | Retrieve, confirm, move |
| Single-mechanism scenario | 90 seconds | Apply the six-step procedure |
| Multi-mechanism scenario | 2 minutes | Full procedure; read the options last |
| Two questions about the same mechanism | Split | Answer the easier first for momentum |

> **Read the question, then the options - but not in that order for multi-mechanism
> questions.** Read the question and the **last** option first. The last option in a
> Salesforce scenario question is frequently the platform-accurate answer, because
> the distractors are written first. **Then** read the rest. This is a small habit
> with a measurable effect on a timed exam.

> **The discipline that matters more: mark and move.** If you cannot eliminate two
> options in ninety seconds, the best guess is worth more than the ninety seconds,
> because the same ninety seconds across five questions is the difference between
> passing and failing.

---

## 6. The capstone

### Vantage Health Group - final access model

| Object | Volume | OWD | Record access | Field boundary | Non-record surfaces |
|---|---|---|---|---|---|
| `Member__c` | 2.4M | **Public Read Only** | Role hierarchy, teams | **FLS carries the boundary**; masking pending | Minimal event payload |
| `Claim__c` | 380k | Public Read Only | Criteria rules, **group targets**, stable criteria | FLS; diagnosis restricted to care and claims | Status event, **no clinical fields** |
| `Consent_Record__c` | ~1M | **Private** | **Apex sharing**, user mode, batch | FLS; evidence to compliance only | Consent event carries **no payload**; CDC **excludes** SSN |
| `Provider_Network__c` | 12k | Public Read Only | Role hierarchy, teams | FLS; Tax ID to finance | - |
| `Access_Request__c` | ~5k active | Public Read Only | Role hierarchy; **skew indicator** | FLS | Approval event, no member data |

| Cross-cutting decision | Resolution |
|---|---|
| **Permission architecture** | Minimal baseline profile, six permission set groups, exclusions by **intersection**, assignment by **role** |
| **Sensitive data** | Four controls, four jobs: FLS for access, Platform Encryption for data at rest, Field Audit Trail for attribution, retention policy for lifecycle |
| **External access** | **Three sites by trust level** - anonymous has no `Member__c` read at all |
| **Apex** | User mode declared on every user-facing path; `WITH SYSTEM_MODE` on batch and integration, each with a stated reason |
| **Non-record surfaces** | Five events with minimal payloads, subscriber restriction, file-requires-related-record rule, report subscription policy |
| **Release deltas** | User mode and async recalculation **adopted**; field masking and Profile Filtering **deferred with triggers**; retention extensions **rejected** |
| **Verification** | Effective permission diff against a baseline; empirical external access matrix; poll-and-retry for asynchronous recalculation |

### The capstone question

> **"The business asks for brokers to be able to see their clients' complete claims
> history. What do you do?"**

A complete answer covers all four domains, which is the point of the exercise.

| Domain | Element of the answer |
|---|---|
| **Records** | Brokers are external, so the role hierarchy does not apply. This is a **sharing set**, not a rule or a role. **But** 380k claims × broker client counts is a share-row cost, and the question is whether record access is needed at all |
| **Permissions** | The guest user permission set needs Read on `Claim__c`, with **FLS excluding `Diagnosis_Code__c`** from brokers - and the exclusion enforced by the guest user permission set or a separate group |
| **Implications** | The cheaper mechanism meets the need: **a summary object maintained by Apex**, because brokers *read* claims rather than acting on them. That is a tradeoff analysis with a named recommendation, not a build |
| **Other Data** | The Apex summary logic runs in **user mode**, and the object needs its own lifecycle policy - because `Broker_Claim_Summary__c` is new non-record state with its own retention and its own access model |

> **Why this question is the capstone.** It cannot be answered from one domain, and
> the full answer includes **recommending against the literal requirement** on
> grounds of cost and shape. **That is the skill the exam is testing** - and it is
> the skill the previous nineteen phases built.

---

## 7. Final checklist

### Mechanism recall

- [ ] OWD four options, and which recalculate
- [ ] Role hierarchy, teams, criteria rules, manual shares, Apex sharing - and what each costs
- [ ] Sharing rule target must be a group, queue or role
- [ ] Relationship sharing rules, and the parent-child gate
- [ ] External: sharing sets, external account hierarchy, guest user

### Permissions

- [ ] Union of profile and permission sets; intersection within a group
- [ ] FLS separate read and edit; derived-field behaviour
- [ ] Formula never secure; roll-up inherits child security
- [ ] Layout is not a control
- [ ] View All and Modify All, and what can claw back from each

### Data and environments

- [ ] Encryption not searchable
- [ ] Field History 20/90; Field Audit Trail 60/10 years
- [ ] Retention, archive, legal hold, master-detail cascade
- [ ] Platform events, CDC, big objects, files, reports, metadata
- [ ] Licence types; sandbox refresh limits

### Code and scale

- [ ] User mode versus system mode; `WITH USER_MODE`, `WITH SYSTEM_MODE`
- [ ] Async Apex starts in system mode; Developer Console runs in system context
- [ ] Subquery field access bypasses FLS
- [ ] Rule targeting a group versus individual users, and the row multiplier
- [ ] Access skew and the indicator field pattern

### Judgement

- [ ] Narrowest sufficient mechanism beats a bypass
- [ ] Ask what action the user takes: access or a view?
- [ ] Pilot, then negative test, then expand
- [ ] Every deferral names an interim design and a trigger

---

## Checkpoint

You have 120 minutes and 65 questions. How do you spend the time?

**Answer.** **Not evenly.**

**Records, 39%.** Roughly 25 questions, and the most time per question - the
mechanism space is wide and the multi-mechanism scenarios need the full procedure.
About 50 minutes.

**Permissions, 27%.** Roughly 17 questions, and the **fastest** domain per
question - the rules are decidable. Learn the union/intersection distinction and
these become quick. About 25 minutes.

**Implications, 18%.** Roughly 12 questions. These are judgement, so read the
question carefully and watch for the narrowest-sufficient answer. About 22 minutes.

**Other Data, 16%.** Roughly 10 questions, and the most prepared-for, because the
surface map is finite and enumerable. Fast elimination. About 15 minutes.

With roughly 8 minutes as buffer, because the unscored questions exist and because
the questions that look simple are not.

> **The two rules that produce the pass.** **Eliminate before you evaluate** - find
> the option that is wrong on the volume, the wrong on the mode, or the wrong on the
> mechanism, and you are choosing between three options rather than four. And
> **respect the two-minute budget**: mark and move, because a marked question with a
> best guess scores the same as a marked question with no answer, and the time you
> spend is worth more on the next one.

---

## What's next

Nothing. That is the point of the last phase.

You now have a model that starts from OWD, adds only the record-level mechanism the
requirement actually needs, carries the field boundary with FLS, keeps access inside
the model in code, and verifies empirically. **If you can explain why each mechanism
is or is not present at Vantage, you can answer any question the exam asks about it** -
and the exam, like the design, is ultimately about knowing the difference between
what is required and what is available.

Good luck.
