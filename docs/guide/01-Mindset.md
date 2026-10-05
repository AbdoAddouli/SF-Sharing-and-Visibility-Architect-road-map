# Phase 1: The Architect's Security Mindset

This phase carries no exam weight, and that is exactly why it matters. The
official blueprint divides the exam into four domains; the *reasoning* that
connects those domains is not examinable but is what the exam actually tests.
Everything in Phases 2–19 is an application of what is set up here.

The scenario for the whole academy is introduced at the end of this phase:
**Vantage Health Group**, a multi-entity health insurer. Every exercise in every
later phase builds into that one org.

## Learning Objectives

By the end of this phase you will be able to:

- State what a Sharing & Visibility Architect is paid to deliver, and why it is not a list of features.
- Reproduce the four official exam domains with their exact weightings and the 18 objectives beneath them.
- Apply the additive-only rule: explain why no mechanism can ever narrow access below the org-wide default.
- Use one repeatable method — draw the model, then reason — to answer scenario questions instead of recalling features.

---

## 1. What the architect actually delivers

An administrator builds what the business asked for. An architect decides what
the business is allowed to have. The deliverable of this credential is not a
configuration — it is a written access model that a security auditor, a
regulator and the next engineer can all read, challenge and extend without you
in the room.

Three deliverables, in order of importance:

1. **A model.** The org-wide defaults, the role and territory structures, every
   sharing rule, every group, every team, and every programmatic grant —
   expressed so the effective access for any named user can be *derived* from
   the document alone.
2. **A justification.** For each choice, the requirement it serves and the
   alternative you rejected. An unjustified model cannot be maintained, because
   nobody can tell which parts are load-bearing.
3. **A validation plan.** How you will prove the model does what you claimed,
   and how you will detect it drifting. Drift, not the initial build, is what
   actually causes a breach.

Salesforce recommends two to three years of platform experience plus four to
five years implementing complex security models before you sit this exam. That
gap between the two numbers is the whole point: the experience makes you slow
and careful, and the exam checks whether you have earned the right to be.

> **The body of the official exam guide (Salesforce Help `id=005298977`) calls
> this the "Sharing and Visibility Specialist" exam twice**, while every heading,
> the Trailhead page and the prerequisite table say Architect. If you search for
> "Specialist" and find nothing, you are not imagining it.

## 2. Exam logistics

Verbatim from the official guide, so you never book on a number a blog invented.

| Item | Official value |
|---|---|
| Exam | Salesforce Certified Platform Sharing and Visibility Architect |
| Exam code | **Plat-Arch-205** |
| Content | 60 multiple-choice questions and up to five unscored questions |
| Time | 120 minutes |
| Passing score | **58%** |
| Version | Exam questions align to the **Winter '23** release |
| Prerequisite | None |
| Registration | US$400 (JPY ¥60,000), plus local taxes |
| Retake | US$200 (JPY ¥30,000) |
| Delivery | Proctored — testing centre or online |
| References | None. No hard-copy or online material. |
| Maintenance | One maintenance badge per year, Winter release cycle |

> **The passing score is 58%, not the 67% or 68% that almost every third-party
> site claims.** 68% belonged to the Summer '18 "Sharing and Visibility
> Designer" guide; 67% to a 2020–21 intermediate version. Both had different
> domain weightings too, so a study plan built on them is built on sand.

The five unscored questions are randomly integrated and have no impact on your
result. Practically: expect up to 65 items in 120 minutes, about 1 minute 51
seconds each. Flag and move rather than letting them eat the budget.

This credential expires **yearly, not every three years** — one maintenance
badge per Winter cycle.

## 3. The blueprint

Memorise the shape of this table before you memorise anything else.

| Domain | Weight | Objectives | Phases here |
|---|---:|---:|---|
| Access to Records | **39%** | 9 | 2–9 |
| Permissions to Standard Objects, Custom Objects and Fields | **27%** | 5 | 10–14 |
| Implications of Security Model Choice | **18%** | 3 | 15–16 |
| Access to Other Data | **16%** | 1 | 17 |

**The eighteen objectives, grouped**

*Access to Records (39%)* — recommend the appropriate organization-wide
defaults; leverage the role hierarchy; implement sharing rules; use groups; use
teams; choose the correct object relationships; use programmatic sharing; choose
a mechanism for External Users; use record access overrides.

*Permissions to Objects and Fields (27%)* — recommend the right level of object
permissions; recommend the correct level of field permissions; recommend a
mechanism to hide data at the user interface level; determine access controls to
protect sensitive data (PCI, PII, HIPAA); recommend a programmatic solution to
ensure security settings are enforced.

*Implications of Security Model Choice (18%)* — determine the scalability
implications of the sharing solution; determine the licence limitations that
will impact the intended sharing solution; determine how to test the sharing
model.

*Access to Other Data (16%)* — determine the appropriate access control needed
to grant access to data that is not standard or custom objects.

### What the blueprint does not contain

There is no mention of Agentforce, Data 360, MCP, Shield encryption, Event
Monitoring, Named Credentials, permission set groups, or any of the features
that reshaped this platform after Winter '23. The blueprint has not been
republished. That is precisely why Phases 18 and 19 exist in this academy: the
exam will not test them, but an interview in 2027 certainly will.

### One domain is unusual

Access to Other Data is a **single objective worth 16%**. Candidates assume
"other data" means trivia and skip it. It means folders, reports, list views,
export, files, Chatter, Knowledge, Big Objects and guest surfaces — wide, shallow
and highly learnable. It is where easy marks live.

---

## 4. The additive-only rule

If you learn one thing from this academy, learn this. Salesforce sharing is
cumulative and it only ever adds. The org-wide default is the **floor**.
Everything else sits on top and grants more.

| Mechanism | Direction | Can it narrow access? |
|---|---|---|
| Organization-wide default | sets the floor | — (it *is* the floor) |
| Role hierarchy + implicit sharing | widens upward | No |
| Grant Access Using Hierarchies | widens upward | No |
| Criteria-based sharing rule | widens | No |
| Ownership-based sharing rule | widens | No |
| Public group membership | widens (via rules) | No |
| Account / Opportunity / Case Team | widens | No |
| Manual sharing | widens | No |
| Apex managed sharing | widens | No |
| Object-level View All / Modify All | widens | No |
| System-level Modify All Data / View All Data | widens | No |
| **Restriction rule** | **narrows** | **YES** |
| **Scoping rule** | **narrows** | **YES** |

Restriction rules and scoping rules are the only declarative tools that
subtract. This is why they exist, why they are architect-level tools, and why
they are the answer to more scenario questions than most candidates realise.

If a requirement says *"this group must NOT see these records even though a
sharing rule would give them access"*, the answer is a restriction rule — never a
cleverer sharing design.

### Checkpoint

> **Account OWD is Public Read Only. A criteria-based sharing rule gives the
> "Claims Review" group read access to every Account where Type = 'Provider'. Can
> a member of Claims Review be prevented from editing a Provider Account?**

No — not by removing the rule. OWD already gives them edit access on every
Account, and Public Read Only is *more* permissive than the rule they hold. To
stop them editing you must change the floor (lower the OWD, then re-grant) or
apply a restriction rule. Chasing a sharing rule here is guaranteed wasted
effort.

---

## 5. Reasoning technique: draw the model, then answer

Do not read a scenario question and search your memory for a matching feature.
Read it and build the model on paper, in four fixed strokes.

1. **Write the floor.** Which OWD applies to this object? If the question does
   not say, ask what the object would plausibly be set to — and remember
   Controlled by Parent changes the whole shape of the answer.
2. **List the subjects.** Name each user by the role they play: owner, manager,
   teammate, portal user, guest, integration user, agent user. Do not use real
   names; the question will not.
3. **Stack the grants.** Role hierarchy, rules, groups, teams, manual shares,
   Apex, View All — in the order the platform applies them. Note which grants
   are additive over which.
4. **Ask the negation.** Finally, ask what the requirement *forbids*, and find
   the tool that can subtract. If the answer is "nothing can subtract this",
   then the floor itself is wrong and you have found the real design decision.

| The question says… | It is really asking… |
|---|---|
| "Recommend the appropriate OWD" | what is the floor, and what breaks if you move it |
| "Which sharing mechanism" | which tool is least privilege and most maintainable |
| "Determine how this can be implemented" | which feature fits — look for the constraint in the scenario |
| "Given a set of conditions" | there are interacting mechanisms; derive, do not recall |
| "Which is the best approach" | three options are plausible and two have a hidden cost — find the cost |

The last row is where marks are lost. "Best approach" questions are always a
trade-off question: the correct answer is rarely the most powerful tool, it is
the one whose downside you can name out loud.

---

## 6. The scenario: Vantage Health Group

Every exercise builds into one org so each phase extends the last.

| Element | Design | What it forces you to solve |
|---|---|---|
| Three subsidiaries | Vantage Health, Vantage Care Partners, Vantage Admin (claims TPA) | OWD, role hierarchy, restriction rules |
| 2.4M members / 380k claims | Members and Claims custom objects | Scalability, ownership skew, recalculation |
| "Grand Central" account | One account owning 40,000 member records | Skew diagnosis and mitigation |
| 1,200 field agents | Regional coverage of the provider network | Territory management |
| 4,000 external brokers | Partner portal, multi-tier | Sharing sets, external account hierarchy |
| Member portal + guest directory | Customer Community plus an unauthenticated public site | Guest user controls, external OWD |
| Acquired rival | 40k Accounts that legacy staff must not see | Restriction rules, scoping rules |
| Compliance | HIPAA on Member__c, PCI on card fields | Layered sensitive-data controls |
| Agentforce + Data 360 | A triage agent and a care-pathway lake | New sharing boundaries (Phase 19) |

### The five custom objects

| Object | Records | Why it exists |
|---|---:|---|
| Member__c | 2.4M | A covered life. Master-detail from Account. Carries the PII. |
| Claim__c | 380k | A claim against a member. Master-detail from Member__c. |
| Provider_Network__c | 85k | Junction between a provider Account and a health plan. |
| Consent_Record__c | 3.1M | Evidence of marketing and data-sharing consent. Audit-critical. |
| Access_Request__c | ~50k | A request for access, and the audit record of who granted it. |

Note the shapes. `Member__c` is master-detail from `Account`, so its access
partly inherits — that inheritance is a security decision, not just a modelling
one. `Claim__c` is master-detail from `Member__c`, two levels down.
`Consent_Record__c` and `Access_Request__c` are deliberately audit objects that
almost nobody should edit and everybody in the right role must read.

---

## 7. Maintainability, and how to study this

The requirement that separates an architect from a configurator is not
capability, it is longevity. A sharing model only its author understands is
worth nothing in eighteen months.

- **Name things.** Every role, group, permission set and sharing rule gets a name
  that says what it is for, not who asked for it. `Claims Review — read/write,
  HIPAA minimum` beats `Sarah's group`.
- **Use the Description field.** It exists on public groups and it is the only
  documentation a new admin will read. Winter '25 made it usable for exactly this.
- **Keep public groups shallow.** Three levels of nesting with inherited access
  is how you lose the ability to answer "who can see this record?".
- **Prefer roles over groups for structural access.** Roles survive
  reorganisations; groups survive nothing.
- **Write down the recalculation cost of every change before you propose it.**
- **Version the model.** Export it, review it, keep the decision record next to it.

### Official preparation

| Resource | Use it for |
|---|---|
| Architect Journey: Sharing and Visibility trailmix | Free, curated, the officially recommended path |
| Trailhead Academy **ARC202** | Instructor-led depth on the four domains |
| Salesforce Help `id=005298977` | The blueprint. Read it yourself, every time. |
| This academy | The reasoning method, the scenario, and four releases of drift |

> Read the exam guide from a **browser**, not a scraper. `help.salesforce.com` is
> a JavaScript app; a command-line fetch returns "Loading…" and you will think the
> article is gone.

A realistic plan is six to twelve weeks of focused preparation if you already
administer an org. Weight your hours to the domains, not to your comfort:
roughly three hours per percentage point puts Access to Records at about a
quarter of your total effort.

---

## Checkpoint

> **You are asked to recommend a sharing solution for an Account OWD of Public
> Read Only. Before you answer, what are the four strokes?**

Floor (Public Read Only — everyone reads, owners write), subjects (name the
users by role), additive grants (list every rule, team, role and share that
applies), negation (ask what must *not* be visible and find the restriction
rule). If your answer started with "I would use a sharing rule", you skipped
stroke one — and stroke one is where the answer usually is.

## What's next

Phase 2 establishes the floor properly: what each OWD value means, how to
choose between them from first principles, the internal/external split, and
what an OWD change actually costs in a recalculation.
