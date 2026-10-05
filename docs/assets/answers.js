/**
 * Model answers for every exercise in curriculum.js.
 *
 * Loaded as a classic script before app.js and referenced as a bare
 * EXERCISE_ANSWERS global. Each value is markdown, rendered through the same
 * md() pipeline used for the guides.
 *
 * A model answer is not the only valid answer. It shows the level of
 * reasoning the exam rewards: the mechanism, the reason for it, and the
 * trade-off. Verify your own work against the exercise's "Verify" line.
 *
 * ENCODING
 *   Markdown code fences and inline code need backticks, which cannot appear
 *   unescaped inside a JS template literal. They are written as @@ below and
 *   resolved by tick() when this file is evaluated.
 */

/* eslint-disable no-useless-escape */

const TICK_MARK = '@@';
const TICK = String.fromCharCode(96);

const tick = input => {
  const raw = Array.isArray(input) ? input.raw.join('') : String(input);
  /* @@ -> one backtick. A line that is nothing but @@ is a code fence, which
     needs three, so promote it. The markdown renderer treats a lone backtick
     as literal text, not as a fence. */
  return raw
    .split(TICK_MARK).join(TICK)
    .replace(new RegExp('^' + TICK + '$', 'gm'), TICK + TICK + TICK);
};

const EXERCISE_ANSWERS = {

  /* ---------------------------------------------------------------- 1.1 --- */
  '1.1': tick`
## What a strong answer contains

Not a feature list. The diagnosis is the answer, and the rewritten worksheet
is the proof that you can now derive rather than recall.

## Why feature-matching fails

The instruction "search for a feature that sounds right" fails because
Salesforce mechanisms overlap in surface and differ in consequence. A
candidate who recognises "a rule grants access to a group" has learned nothing
about whether that rule also matches the record.

In the worked scenario, three plausible-sounding answers exist:

- A manual share grants edit to the peer manager, so yes.
- The Closed Won rule grants Finance read, so no.
- The VP sees the opportunity through the hierarchy, so maybe.

Each is a real mechanism. None of them is an answer, because none of them
addresses what the question asked, which is whether **both** grants apply to
**the same user**. Sharing composes by union across mechanisms, and manual
sharing does not get overridden by a rule. The question is not "which feature
wins" but "what is the union of every feature that reaches this user".

## The four-stroke worksheet

| Stroke | Question | Worked answer |
|---|---|---|
| Floor | What is the OWD on Opportunity? | Private, internal and external |
| Subjects | Which named principals are in play? | Finance group, the peer manager, the VP |
| Additive grants | Which mechanisms add rows for each subject? | Manual share to the peer manager; the Closed Won rule to Finance; the role hierarchy from the VP |
| Negation | What subtracts or restricts? | Nothing here. Private does not remove hierarchy or manual grants |

Strokes 1 and 2 are cheap. Strokes 3 and 4 are where the answer lives, and
stroke 3 is the one feature-matching skips entirely because it requires
enumerating every mechanism rather than finding one that sounds plausible.

## Why this generalises to the exam

Scenario questions in this exam are constructed so that at least one
mechanism sounds right and is irrelevant. The distractor is not a wrong fact,
it is a correct fact about the wrong mechanism. **Only enumeration is immune
to it**, because enumeration cannot be captured by a single salient match.

@@verify@@ reached: you can explain in three sentences why derivation beats
recall, and you hold a reusable worksheet.

`,

  /* ---------------------------------------------------------------- 1.2 --- */
  '1.2': tick`
## What a strong answer contains

One page, one Account, and **every** subject and mechanism that touches it.
The value is in the completeness of the enumeration, because this canvas is
what you extend in all twenty phases.

## The canvas

### The record

One Vantage Account, chosen because it has interesting properties: it is
owned by a regional manager, it has related member records, it participates in
an account hierarchy, and it has been the subject of at least one manual share.

### Subjects who could reach it

| Subject | Via what |
|---|---|
| The owner | Ownership, unconditionally |
| Everyone above the owner in the hierarchy | Role hierarchy, when Grant Access Using Hierarchies is on for Account |
| Downward from the owner | The hierarchy, because Account access flows down as well as up |
| Members of a sharing rule's target group | The rule, if the Account matches its criteria |
| Manual share recipients | AccessShare rows |
| Apex sharing recipients | Share rows your code wrote |
| External users linked to the Account | Sharing sets and the external account hierarchy |
| Guest user | Only if the record-level mechanism grants it |

### Mechanisms, and what each one costs

- **OWD** — the floor. Cheap, and the only mechanism that stores nothing.
- **Role hierarchy** — positional, no share rows, recalculates automatically.
- **Sharing rule** — share rows per record per group member, and recalculates
  on criteria churn.
- **Manual share** — no scale, no expiry, invisible to everyone later.
- **Apex sharing** — your transaction, your locks.
- **Sharing set** — external only, per guest user.

### Open questions this phase raises

- Is Account OWD Private, and is the internal setting different from the
  external one?
- Does the manual share have a RowCause, or is it a bare AccessShare?
- Is Grant Access Using Hierarchies enabled, and did anyone decide that or
  inherit it?

## Why this artefact earns its cost

Every later phase is an edit to this canvas rather than a fresh design. When
Phase 15 asks whether a rule is viable at this volume, the canvas already
tells you what is currently generating share rows, so the question becomes
arithmetic rather than investigation.

`,

  /* ---------------------------------------------------------------- 2.1 --- */
  '2.1': tick`
## What a strong answer contains

Two decisions per object — internal and external — and a **written
justification an auditor can accept**, which means naming the risk being
accepted rather than asserting that the setting is correct.

## The six decisions

| Object | Internal | External | Why |
|---|---|---|---|
| Account | Private | Public Read Only | Accounts are commercially shared; the sensitive objects hang off them, and Private on Account cascades pain to every child |
| Contact | Controlled by owner | Public Read Only | Contact data is needed by service and care roles who do not own the record |
| Member__c | **Public Read Only** | Public Read Only | At 2.4M records, criteria-based rules are not viable; FLS and roles carry the boundary |
| Claim__c | Public Read Only | **Private** | Financial and clinical; claims must not be visible to external users at all |
| Consent_Record__c | **Private** | **Private** | Legal evidence; the narrowest floor defensible |
| Provider_Network__c | Public Read Only | Public Read Only | Directory data; low sensitivity, high reference value |

## The audit-form justification

The form that works is: **setting, risk accepted, compensating control,
residual risk**. For Consent_Record__c:

> OWD Private. Risk accepted: none identified at the object level.
> Compensating control: Apex sharing grants read to named compliance
> permission set groups; Field Audit Trail on the evidence fields.
> Residual risk: the guest user for the public site has no object access at
> all, so external exposure is structurally impossible rather than merely
> unlikely.

For Claim__c external Private, the entry is different, and this is where
audit-form justification earns its keep:

> OWD Private external. Risk accepted: external portals have no claims
> requirement today. Compensating control: guest user permission set omits
> Claim__c entirely, so the object is unreachable rather than merely
> unshared. Residual risk: a future partner requirement would need a
> re-review, and the interim answer is a separate site.

## What the exercise is really testing

The two entries in bold are the ones that get argued about, and both are
driven by **volume and sensitivity respectively**, not by preference. An
answer that justifies OWD by taste rather than by the cost of the alternative
has missed the point.

`,

  /* ---------------------------------------------------------------- 2.2 --- */
  '2.2': tick`
## What a strong answer contains

Four derivations from OWD and hierarchy alone, and then the observation that
one of them turns on the external setting. The derivation is the answer; the
conclusion is a by-product.

## The four users

Assume OWD as set in 2.1: Account internal Private, external Public Read
Only; Contact internal Controlled by owner, external Public Read Only;
Member__c and Claim__c internal Public Read Only, external Private;
Consent_Record__c Private both ways.

**User 1 — the Account owner.** Sees their own Accounts and their own
Contacts, Contacts below them in the hierarchy, all Member__c and Claim__c
because those are Public Read Only internally, and no Consent_Record__c they
were not explicitly granted.

**User 2 — a user below the owner in the hierarchy.** Sees the Accounts and
Contacts of everyone above them in the hierarchy, not only their own. All
Member__c and Claim__c. No consent records.

**User 3 — a user in an unrelated branch.** Sees only their own Accounts and
Contacts, all Member__c and Claim__c, and no consent records.

**User 4 — an external broker, authenticated, linked to one Account.** Sees
**every** Account and Contact, because both are Public Read Only externally —
not their own, and not only the one they are linked to. Sees **no**
Member__c and **no** Claim__c, because those are Private externally. Sees no
consent records.

## The user whose external OWD decided the outcome

**User 4, and decisively.** With Account external Public Read Only, the broker
sees every Account in the org — including all 380,000 of them — where the same
user internally would see a handful. The external setting is granting more
than the internal one, which is counter-intuitive and is exactly the point:
**external OWD is a separate decision, and "Private" is not the safer-looking
answer.** For Member__c the reverse happens: internally Public Read Only gives
the broker nothing because they are not internal, while the private external
setting is what stops them seeing 2.4M member records.

## The teaching point

The derivation makes the asymmetry impossible to miss. Two of the four cases
turn on settings a candidate would never think to change, and the broker case
shows that **the external floor is chosen for the least-privileged persona on
the site, not for the average one**.

`,

  /* ---------------------------------------------------------------- 2.3 --- */
  '2.3': tick`
## What a strong answer contains

A change plan, not a configuration task. The plan has phases, a risk
assessment with numbers, a test plan, communications, and a written rollback
that was written **before** the change rather than during the incident.

## Why lowering Account OWD is the hardest change in this academy

Account is the widest object in the org. It is the parent of Members, Claims
and Contacts, it is the target of the role hierarchy for commercial data, and
at 380,000 accounts it is where share-row volume lives. Changing its OWD
recalculates sharing for the object **and** re-evaluates every sharing rule,
manual share and Apex share row that depends on it.

## The phased plan

**Phase 0 — measurement.** Export the current effective permissions for every
persona. Run a query to count share rows per object. Establish the current
save latency on Account as the baseline. Without the baseline you cannot prove
safety afterwards.

**Phase 1 — dependency mapping.** Identify every downstream mechanism before
touching OWD. Which sharing rules target Account? Which Apex classes read or
write it? Which reports and LWC components assume broad Account visibility? This
is the step that determines whether the change is a two-hour job or a
three-week programme.

**Phase 2 — compensating access.** Before lowering OWD, deploy the grants that
will replace what users lose. If service roles currently see all Accounts
because of Public Read Only, they need either a sharing rule granting them the
Accounts they work on, or a role hierarchy that already covers it. **Deploying
compensating access before removing the floor is the difference between a
transparent change and an outage.**

**Phase 3 — the change, one subsidiary at a time.** Vantage Admin is the
smallest entity. Change it, observe for a full business cycle, then proceed.
Ordering by blast radius is the whole point of the phasing.

**Phase 4 — verification.** Re-run the effective permission diff. Empirically
test each persona. Watch the recalculation queue and Account save latency
daily for two weeks.

## Risk assessment, with the numbers that matter

| Risk | Likelihood | Mitigation |
|---|---|---|
| Users lose access they relied on | High | Compensating access deployed first; pilot group; staged by subsidiary |
| Recalculation degrades saves org-wide | Medium | Scheduled in a maintenance window; measured against the Phase 0 baseline |
| Apex in system mode masks the breakage | **High** | Audit system-mode code that reads Account; it will not surface user-visible errors |
| A sharing rule silently stops matching | Medium | Verify criteria and check for nulls; re-test with a known-matching record |
| External users lose Account visibility | Medium | External OWD is a separate setting; confirm it was not changed |

## The rollback, written in advance

> Rollback restores Account OWD to Public Read/Write. Rollback is a single
> setting change and takes effect immediately; it does not require a
> deployment. It will trigger a second recalculation, so it is not free, and it
> must be scheduled. **Rollback is always available and always safe** — the
> asymmetry is that a rollback under pressure, at 5pm on a Friday, reintroduces
> the very access problem the change was fixing, and that exposure should be
> communicated to the CISO in advance rather than discovered by them.

The last sentence is what makes this a rollback position rather than a
rollback instruction.

`,

  /* ---------------------------------------------------------------- 3.1 --- */
  '3.1': tick`
## What a strong answer contains

Four levels, four users, and an explicit Account list per user derived from
the hierarchy alone. The derivation rule is what is being demonstrated, so it
should be stated before the answers.

## The derivation rule

Account access through the role hierarchy runs in **both directions**:

- **Downward** — a role sees everything owned by roles below it in the tree.
- **Upward** — a role sees everything owned by roles above it in the tree.
- **Not sideways** — sibling roles see nothing from each other.

This bidirectionality is the single most-missed fact about role hierarchies,
and it is why "my manager can see my accounts but my peer cannot" is the
correct and slightly counter-intuitive answer.

## The hierarchy

@@
CEO
├── CFO
│   └── Controller (Finance)
├── VP Sales
│   ├── VP Sales East
│   │   ├── Regional Manager NE
│   │   └── Regional Manager SE
│   └── VP Sales West
└── VP Claims
    └── Claims Director
@@

## The four traces

**Regional Manager NE.** Sees their own Accounts, everything below them
(nothing in this tree), **and everything above them** — so every Account owned
by VP Sales East, VP Sales West, the CFO and the CEO. Does not see Accounts
owned by the Controller or by Claims Director, because those are on other
branches.

**Regional Manager SE.** Identical shape: own Accounts, plus VP Sales East,
VP Sales West, VP Sales, CFO and CEO. Note the asymmetry with their peer —
each manager can see the other's manager but not the other's own Accounts.

**Claims Director.** Sees their own, plus everything below (nothing here),
plus everything above — so VP Claims and the CEO. Cannot see any sales
Accounts. This is why a claims role cannot be given commercial data through
the hierarchy alone.

**Controller.** Own Accounts, plus the CFO's and the CEO's. A deliberately
small set, which is what makes a finance role safe to give broad object
permissions to — the hierarchy does the scoping.

## What the exercise establishes

Every one of these sets is maintained **without a single share row**. That is
the argument for using the hierarchy wherever the access policy is genuinely
positional, and it is the argument Phase 15 will need when rule-based access on
Member__c turns out to be unaffordable at 2.4M records.

`,

  /* ---------------------------------------------------------------- 3.2 --- */
  '3.2': tick`
## What a strong answer contains

Five enable/disable decisions, each justified by **what ownership means on that
object** rather than by convenience, plus an explicit list of which changes
need a window.

## The decision rule

Ask one question: **does the reporting line describe the right people for
access to this object?**

- If ownership is assigned by the reporting structure, the hierarchy is right.
- If ownership is assigned by something else — geography, product, a
  data-quality rule, a workflow — the hierarchy is wrong for that object and
  will grant access to people the business never intended.

## The five decisions

| Object | Setting | Justification |
|---|---|---|
| Account | **Enable** | Ownership is commercial and follows the sales reporting line. The hierarchy is exactly the access policy |
| Contact | **Enable** | Contacts are owned by whoever owns the Account, so hierarchy matches ownership |
| Member__c | **Enable** | Owned by the servicing team, which mirrors the field-agent reporting structure |
| Claim__c | **Disable** | Claims are owned by **adjuster**, not by manager. An adjuster may be more or less senior than their peer, so upward access would leak claims between equals |
| Consent_Record__c | **Disable** | Ownership is assigned by a consent-capture workflow, not by reporting line. Hierarchy access would expose legal evidence by seniority |

The last two are the interesting ones, and they are the same mistake: **the
field named Owner is not the same thing as the reporting relationship.** The
Claim__c decision is the one that gets argued, because a claims manager
genuinely does need visibility of their reports' claims — but that need is met
by a sharing rule or a team, not by making the hierarchy authoritative over
ownership.

## Which need a change window

| Object | Window needed | Why |
|---|---|---|
| Account | **Yes** | Recalculation across the widest object; disable-then-enable is disruptive in both directions |
| Contact | **Yes** | Same breadth argument as Account |
| Member__c | **Yes** | 2.4M records; the recalculation is significant |
| Claim__c | **Yes** | 380k records and existing rule targets on the object |
| Consent_Record__c | **Yes** | Narrow object, but Private OWD plus existing Apex sharing means the change is audit-visible |

All five need a window, and the honest reason is that Grant Access Using
Hierarchies triggers recalculation of hierarchy-based access for the object.
**The setting looks like a checkbox and behaves like an OWD change** — which is
the trap this exercise exists to surface.

`,

  /* ---------------------------------------------------------------- 3.3 --- */
  '3.3': tick`
## What a strong answer contains

Two roles that exist to fix an access problem rather than to model the
organisation, the symptoms they produce, and a replacement that removes them.

## The audit

### Symptom 1 — a "Regional Access" role under the CEO

**What it is.** A role with no reporting meaning, containing four regional
managers, created so that a sharing rule or Apex code could target "the
regional managers" as a single principal.

**Why it was created.** Because a sharing rule needs a group or role target,
and the correct grouping (region) did not exist as one.

**What it produces.**

- Members gain access to each other's Accounts through the hierarchy, because
  they share a parent role — and that access crosses regions.
- Everyone above the CEO role gains visibility of all four regions, which
  includes the CFO, who should have no commercial access at all.
- The org chart now lies, so nobody can use the hierarchy to reason about
  access, which is the hierarchy's main non-permission value.

### Symptom 2 — "Underwriting Support" as a child of a claims role

**What it is.** A role created underneath the Claims Director to give a
handful of underwriters access to Claims without giving them the rest of the
claims surface.

**Why it was created.** Because Apex sharing needed a role to attach shares
to, and attaching to an existing role would have over-granted.

**What it produces.** Underwriters inherit upward access to the entire claims
estate through the hierarchy, which is far more than the intended share rows.
The Apex code is narrow; the hierarchy is not, and the hierarchy is invisible
in an Apex code review.

## The replacement

**For the regional grouping.** Public groups, named by region, containing the
regional managers — used as the target of the sharing rule that actually needs
the grouping. Roles return to modelling the organisation.

**For the underwriter access.** Either the narrow sharing rule, or Apex
sharing attached to a **role that models the reporting line** — for example
underwriters reporting to an Underwriting Manager, with the Code Review
feature enabled on Claim__c so review access does not come from the hierarchy at
all.

**The principle to state.** Access needs a principal, and the two legitimate
sources of a principal are the reporting line and a named group. A role
created solely to be a rule target is the wrong tool, because **it cannot be
distinguished from a real reporting role** — and hierarchy access means
membership is never merely a label.

`,

  /* ---------------------------------------------------------------- 4.1 --- */
  '4.1': tick`
## What a strong answer contains

A rule, and — more importantly — the **defensive construction** of the
criteria. The criteria are where a rule silently fails, and the exercise asks
for it explicitly.

## The rule

- **Object:** Claim__c
- **Criteria:** Requires_Escalation__c equals true
- **Target:** the Clinical Response public group
- **Access:** Read Only

## The three defensive criteria properties

**1. Guard against nulls.** A checkbox or picklist filter must be written to
exclude records where the field has never been populated. In a formula-based
filter, write it as:

@@
Requires_Escalation__c = true
AND Requires_Escalation__c != null
@@

A null in a boolean field is not false, it is unknown, and criteria that
evaluate unknown produce no share row and no error. This is the single most
common cause of a rule that matches zero records.

**2. Criteria must be stable.** Escalation status changes during the life of a
claim, and every change triggers recalculation for that record. Ask whether the
requirement could be expressed on an attribute that does not change — an owning
business unit, a region, a classification set once. If not, accept the
recalculation and quantify it, rather than pretending it is free.

**3. Target a group, never individuals.** The group is the unit of the share
row. Targeting 200 named users instead of one 200-member group multiplies the
row count by the number of users.

## The verification that makes this defensible

A rule is not configured until it has been shown to match, and the test is
specific:

1. Query the count of records matching the criteria with SOQL. If it is zero,
   stop — the rule will silently do nothing.
2. Confirm a known record matches and that the group has members.
3. Log in as a group member and read the record.
4. Re-run after a recalculation, because the first read can precede the share
   rows.

Step 1 is the one people skip, and it is the only step that catches the null
case before the business does.

## The trade-off to state

Criteria-based sharing generates a share row per matching record, per group.
At 380,000 claims this is acceptable; on Member__c at 2.4M records it is not.
**The same rule written for two of Vantage's objects is a good decision and a
bad decision**, and the difference is entirely volume.

`,

  /* ---------------------------------------------------------------- 4.2 --- */
  '4.2': tick`
## What a strong answer contains

An exhaustive enumeration, then empirical confirmation of each. The
enumeration is the intellectual work; the queries are what make it evidence
rather than assertion.

## The enumeration

For one Member__c record, every mechanism that could have granted access:

| # | Mechanism | How to confirm |
|---|---|---|
| 1 | **OWD** — Member__c is Public Read Only internally, so everyone has a floor | No share row exists; confirm by testing a user with no other access |
| 2 | **Ownership** — the owner always has access | @@SELECT OwnerId FROM Member__c WHERE Id = :recordId@@ |
| 3 | **Role hierarchy**, if Grant Access Using Hierarchies is on | Trace the owner's role and both directions of the tree |
| 4 | **Criteria-based sharing rule** on Member__c | @@SELECT Id FROM Member__cShare WHERE ParentId = :recordId AND RuleId != null@@ |
| 5 | **Manual share** | Same query, filtered on @@RowCause = 'Manual'@@ |
| 6 | **Apex sharing** | Same query, filtered on @@RowCause = 'Apex'@@ |
| 7 | **Teams**, if the object supports team-based sharing | Team membership on the record's owning team |
| 8 | **Relationship-derived access** | If the member is a child of an Account, whether the parent gates the child — Phase 6 |
| 9 | **Restriction rules** | Whether one removes access the other mechanisms granted |
| 10 | **Permissions cap** | Whether each subject actually has Read on Member__c |

## The queries that turn the list into evidence

@@
-- every share row on the record, with its cause
SELECT Id, UserId, GroupId, AccessLevel, RowCause, RuleId, CreatedById, CreatedDate
FROM   Member__cShare
WHERE  ParentId = :recordId;
@@

@@
-- Apex and manual shares separately, which is the split that matters
SELECT RowCause, COUNT(Id)
FROM   Member__cShare
WHERE  ParentId = :recordId
GROUP BY RowCause;
@@

The second query is the one an auditor cares about, because "Apex" and "Manual"
rows are the two categories nobody can explain six months later.

## The finding worth reporting

The most common result on an inherited org is **Manual shares with no RowCause
description**, granted years earlier by an admin who has left. Those are the
finding, and the correct response is not to delete them — it is to identify the
owner, establish whether the business still requires them, and remediate
deliberately. **A share row nobody owns is a permanent grant by default**, which
Phase 8 turns into policy.

`,

  /* ---------------------------------------------------------------- 4.3 --- */
  '4.3': tick`
## What a strong answer contains

The diagnosis of nested groups as a principal problem, and a redesign that
reduces the rule count while making the model auditable.

## Why nested groups fail

Nested public groups appear because the correct principal — "all claims
adjusters in the Northeast" — does not exist, and creating it is awkward in the
UI. So someone creates a group per region and then nests them.

Three things break:

1. **Sharing rules cannot target a nested group.** The rule target must be a
   single public group, queue or role. A nested group is not a valid target, so
   someone creates a "master" group and adds people to it manually — and now
   membership exists in two places.
2. **Membership drifts.** Removing someone from the regional group leaves them
   in the master group. The drift is invisible until an access review.
3. **The rule count multiplies.** One rule per region means six rules for what
   should be one, and every rule is a separate recalculation trigger.

## The redesign

### Step 1 — identify the true principal

"Claims adjusters in the Northeast" is not a group, it is a **filter**. The
question to ask is what attribute on the user carries it: the role, a custom
field, a territory, or a department. Whichever it is, that is the principal.

### Step 2 — model the role hierarchy correctly

If it is the role, build it as roles — Northeast Adjusters under a Claims
Director — and target the **role** in a single rule. Roles nest natively, are
maintained by the org structure rather than by admins, and are visible in the
hierarchy diagram.

### Step 3 — one rule per distinct access policy, not per region

@@
Claim__c
  Criteria: Region__c = 'Northeast'
  Target:   Northeast Adjusters (role)
@@

@@
Claim__c
  Criteria: Region__c = 'Southeast'
  Target:   Southeast Adjusters (role)
@@

Two rules, not six, and each has a named role behind it. Where the access policy
is genuinely identical across regions, collapse to a single rule targeting a
parent role — **rules can target roles, and a role can contain other roles**,
which is exactly the nesting capability nested groups were imitating badly.

### Step 4 — automate the membership

Permission set assignment rules on role, so a new hire in the Northeast
Adjusters role picks up the right sets and the right access with no admin
action. **This is what removes the drift**, because it removes the manual step
that caused it.

## The trade-off to state

Roles are less flexible than groups for ad-hoc membership — someone needing
temporary access for a project is awkward in a role hierarchy. The answer is
that project access belongs in a group or a temporary permission set
assignment, **not in the model that carries the permanent policy**. One mechanism
per kind of need, rather than one mechanism for everything.

`,

  /* ---------------------------------------------------------------- 5.1 --- */
  '5.1': tick`
## What a strong answer contains

The configuration, and then a proof that the lateral grant works — because
the entire point of teams is access that **no reporting line justifies**.

## The configuration

### 1. Define the team

- Team name: @@Clinical Escalation — Grand Central@@
- Team type: **Account team** (or the type matching the record's parent)
- Description: cross-functional response team for escalated claims at the Grand
  Central account

### 2. Assign members

Three named people: an adjuster, a clinical reviewer and a member services
lead. None reports to the others — which is the condition that makes this
worth configuring.

### 3. Assign the team to the record

Assign the team to the Account, or to the Cases in scope. Team-based sharing
then grants each member access to the **other members'** records in the team.

### 4. Set member access and team access

| Setting | Value | Why |
|---|---|---|
| Member access | **Read/Write** | Team members collaborate on the same records |
| Team access | **Read/Write** | The team as a principal also needs access to the team's own records |

Getting these two the wrong way round is the classic misconfiguration: members
can see each other but the team itself has no access, which looks like teams
"not working".

## The proof

This is the part that matters, and it is empirical:

1. Log in as **Adjuster A**. Confirm A can see A's own Cases on the Account.
   That proves nothing — it is ownership.
2. Have **Adjuster B** create a Case on the Account while A is logged out.
3. Log in as **Adjuster A**. Attempt to read B's Case.
4. **B's Case is visible and A cannot have obtained it through any reporting
   line** — that is the lateral grant, proved.
5. Remove B from the team, recalculate, and confirm A loses access.

Step 5 is what makes it a proof rather than an observation, because it shows
the access came from the team rather than from something else that happened to
be true.

## The trade-off to state

Teams do not nest the way roles do, and a team-based model does not show up in
the role hierarchy — so **teams are harder to audit than roles**. They are also
invisible to anyone reasoning from the org chart. That is the cost, and it is
why teams should carry access that is genuinely membership-based rather than
attempting to replace positional access.

`,

  /* ---------------------------------------------------------------- 5.2 --- */
  '5.2': tick`
## What a strong answer contains

A diagnosis from configuration alone, and the discipline of checking the
narrower explanations before the obvious one.

## The four checks, in order

### 1. Is the record actually in the team's scope?

Team-based sharing operates on records related to the team's parent object. If
the team is an **Account team** and the record is a Case with no Account
relationship — or the relationship is to a different Account — there is nothing
to grant. This is the most common cause, because it is invisible in Setup.

### 2. Are the settings on the right record?

**Member access** controls what a member sees of other members' records.
**Team access** controls what the team sees of the team's own records. If a
team can see each other's records but a brand-new Case created by a member is
invisible to the rest of the team, **member access is Read Only or the team
access setting is wrong** — new records are exactly where this shows up.

### 3. Is the record type included?

Team-based sharing can be limited by record type on some configurations. If
the Case record type is not in the team's scope, no grant is produced.

### 4. Is a recalculation pending?

Team membership changes trigger recalculation of team-based access. A test
performed immediately after adding a member can read as a failure when it is
a timing artefact. **Check the recalculation state before concluding the
configuration is wrong.**

## The diagnosis in the modelled case

The intended configuration had the team assigned to the Account, both access
settings at Read/Write, and three members. The failure was **member access set
to Read Only**, so each member could read the others' existing records but a
record created after assignment was not visible to the team.

That single setting produced a model that half worked — legacy records visible,
new records not — which is the most confusing possible symptom and the reason
this exercise exists.

## The rule to take away

**When an access mechanism partially works, suspect a scope setting rather than
a broken mechanism.** Teams have three scope controls, and each one produces a
different subset of working. Read the configuration against the symptom before
changing anything.

`,

  /* ---------------------------------------------------------------- 5.3 --- */
  '5.3': tick`
## What a strong answer contains

Eight classifications with the decisive axis stated for each, and — the part
that earns credit — the two requirements that are **neither**, with the
alternative proposed.

## The decisive axis

| Mechanism | Use when access is |
|---|---|
| **Role** | **Positional** — defined by where someone sits in the organisation |
| **Public group + rule** | **Attribute-based** — defined by data on the record |
| **Team** | **Membership-based** — defined by collaboration on specific records |
| **Manual share** | **One-off** — and treated as an exception with an expiry |

## The eight classifications

| Requirement | Mechanism | Decisive reason |
|---|---|---|
| All claims for the member's region | **Role** | Regional coverage maps to the reporting structure; no share rows |
| Care team sees members on their panel | **Team** | Collaboration on specific member records, not a reporting line |
| Any agent can read any member's contact details | **OWD Public Read Only + FLS** | Not an access requirement at all — a field-level one |
| Finance sees claims above a dollar threshold | **Rule → public group** | Criterion lives on the claim, so it is attribute-based |
| Managers approve their reports' access requests | **Role** or **Role + Code Review** | Approval authority is positional |
| A named executive needs one specific claim | **Manual share** | Genuinely one-off |
| Brokers see their clients' members | **Sharing set** | External, account-relationship based |
| Agents working a queue see open requests | **Role or team** | Positional within the service model |

## The two that are neither

**"External partners see only claims for members they are treating."** This is
not a role, because external users have no role. It is not a public group
either, in the internal sense — it is a **sharing set**, because the boundary
is an account relationship and the actor is external. Putting it in an internal
mechanism is the classic Phase 9 error.

**"Compliance can read every consent record."** This is not an access boundary
in the sharing sense — it is **View All on the object**, held by a permission
set group. Sharing rules would generate share rows for every record, which is
exactly the cost View All avoids, and the requirement genuinely is all records.
**Recognising that a requirement is better served by a permission than by
sharing is a mature answer**, and it is the one the exam rewards.

## The general point

Most real requirements decompose into more than one of these, and the design
work is in the decomposition. The classification exercise is valuable because
it forces the decision before configuration, rather than after a failure.

`,

  /* ---------------------------------------------------------------- 6.1 --- */
  '6.1': tick`
## What a strong answer contains

The graph, the count, and the identification of the **two relationships that
decide it** — because those two are what a design review must focus on.

## The graph

@@
Account
  └── Member__c                        (lookup — 1 account : many members)
        ├── Claim__c                   (lookup — 1 member : many claims)
        ├── Consent_Record__c          (master-detail — the design decision)
        ├── Access_Request__c          (lookup)
        └── Coordination_Assignment__c  (lookup)

Provider_Network__c
  └── Claim__c                         (lookup)
@@

## The count from one low-level record

Starting from one Access_Request__c and asking what is reachable through
related records:

| Step | Records |
|---|---|
| The request itself | 1 |
| Its Member__c | 1 |
| That member's claims | ~4 average, but the Grand Central skew member has 400 |
| That member's consent records | 1 to 3 |
| The member's other access requests | 2 to 8 |
| **Total, typical member** | **~12** |
| **Total, Grand Central member** | **~415** |

## The two relationships that decide it

**1. Consent_Record__c as master-detail to Member__c.** This is the one that
matters most. Master-detail means the child **cannot be in a public group on
the master** and **cannot be independently secured** — access is controlled
through the parent. So consent evidence on the Grand Central member is as
reachable as the member itself, and the skew multiplies it.

**Changing this to a lookup is the highest-value change available**, and it is
6.2.

**2. Access_Request__c as a lookup.** With a lookup, a request can be secured
independently of the member — which matters because a request contains the
member's identity and the reason for access. In a master-detail design it could
not be.

## Why these two and not the others

The claims relationship is a lookup and always will be — a member has many
claims and a claim belongs to one member. The parent Account to Member
relationship is a lookup for the same reason. **Only the master-detail is a
design error, and it is the one that removes independent security from the most
sensitive object in the schema.**

## The secondary finding

The skew itself is a problem even with correct relationships: 415 reachable
records from one request means one user's access request exposes a wide blast
radius, and it is the argument for the Phase 15 skew indicator.

`,

  /* ---------------------------------------------------------------- 6.2 --- */
  '6.2': tick`
## What a strong answer contains

The change, the specific security capability it restores, and an honest
statement of everything traded away.

## The change

**Before:** Consent_Record__c is a master-detail child of Member__c.

**After:** Consent_Record__c is a **lookup** child of Member__c, with a
required lookup to Member__c, and @@Required@@ on the lookup.

## What is restored

**Independent security.** With a lookup, Consent_Record__c can have its own OWD
(Private, already the case), its own sharing rules, and its own permission set
controls. A user can be granted access to the member's contact details without
being granted access to the consent evidence — **which is the entire field
agent requirement**.

**Independent lifecycle.** A consent record can be retained, archived or
deleted on its own schedule. Under master-detail, deleting the member destroys
the consent evidence irreversibly, which for legal evidence is indefensible.

**Ability to be in a public group.** Master-detail children cannot be group
members. That restriction alone can force an Apex sharing solution where a rule
would have done.

## What is traded away

| Lost | Consequence | Mitigation |
|---|---|---|
| **Required relationship enforced by the platform** | Orphan consent records become possible | Make the lookup @@Required@@ on the child, which achieves the same for a child-to-parent reference |
| **Automatic roll-up of parent fields** | Member fields no longer roll up automatically | Explicit formula fields or Apex, which is more code to maintain |
| **Cascade delete protection** | Deleting a member no longer deletes consent evidence — **this is the point, not a loss** | None needed. This is the desired behaviour |
| **Ownership inheritance** | The child no longer inherits the parent's owner | Assign explicitly, via a flow or Apex |

The third row is worth stating out loud in a review, because a reader
otherwise sees a table of things lost and concludes the change was a
regression.

## The denormalisation option, and why not

The alternative to a lookup is to denormalise: copy the fields you need from
Member__c onto Consent_Record__c and remove the relationship. That restores
independent security completely.

It is rejected here for two reasons. First, it creates a synchronisation
problem — two copies of the member's identity that can disagree. Second, and
more importantly for this academy, **denormalising sensitive data onto a second
object doubles the surface that FLS and retention must cover.** A copy of a
member's name on a consent record is another place to protect.

> **The rule.** Denormalise for **performance**, and accept the security cost
> explicitly. Do not denormalise to solve a security problem, when a lookup
> solves it without a copy.

## What the change costs

A migration — populating the new lookup on existing records, and handling the
master-detail rows that already exist. On a high-volume object that migration
is itself a change window. **The design change is small and the migration is
not**, and a design review that only evaluates the design is incomplete.

`,

  /* ---------------------------------------------------------------- 6.3 --- */
  '6.3': tick`
## What a strong answer contains

Queries, not reasoning. The exercise asks for the complete set of records a
single grant obtains, and "complete" means the transitive closure — which is
exactly what people get wrong by stopping one level out.

## The queries

### Step 1 — the record and its direct relationship

@@
SELECT Id, Member__c
FROM   Claim__c
WHERE  Id = :claimId;
@@

### Step 2 — every claim for that member

@@
SELECT Id, Status__c, Total_Paid__c
FROM   Claim__c
WHERE  Member__c = :memberId;
@@

This is the first place people under-count. A grant on one claim does not
obtain one claim.

### Step 3 — the consent records

@@
SELECT Id, Consent_Type__c, Captured_At__c
FROM   Consent_Record__c
WHERE  Member__c = :memberId;
@@

### Step 4 — the other access requests

@@
SELECT Id, Requested_Access__c, Decision__c
FROM   Access_Request__c
WHERE  Member__c = :memberId
AND   Status__c = 'Open';
@@

### Step 5 — the parent account, and what it drags in

@@
SELECT Id, Name
FROM   Account
WHERE  Id = :accountId;
@@

And here is the finding that changes the blast radius estimate: if the Account
has 40,000 member records under it — the Grand Central account — then a grant
that reaches the Account reaches a quarter of the estate, depending on whether
parent-child access gates the children.

## The complete set

| Object | Records obtained |
|---|---|
| Claim__c | 4 typical, 400 for the skew member |
| Consent_Record__c | 1 to 3 |
| Access_Request__c | 2 to 8 open |
| Member__c | 1 — unless the relationship design grants it |
| Account | 1 — and through it, potentially 40,000 members |

## The three findings

**1. One grant is not one record.** The blast radius of a single grant on a
typical member is 12 records; on the skew member it is over 400.

**2. The parent is the multiplier.** If child access is gated by parent access,
a grant on the Grand Central Account reaches every member under it. That is the
finding that justifies the Phase 15 skew work.

**3. Consent evidence is only independent if the relationship is a lookup.**
Under the current master-detail design, the consent records come along with
the member regardless — so the grant on the claim obtains legal evidence it
had no business reaching.

## Why queries rather than reasoning

Because step 5 cannot be derived without knowing the parent Account's member
count, and every figure in this table is a query result rather than an estimate.
**A blast-radius analysis built on estimates is a guess**, and the exercise is
built so that the guess and the measurement diverge.

`,

  /* ---------------------------------------------------------------- 7.1 --- */
  '7.1': tick`
## What a strong answer contains

Working code for the grant, working code for the revocation, and the
**idempotency** that makes both safe to run twice.

## The grant

The design: a Coordination_Assignment__c record links a user to a member. The
share follows that relationship, so access exists exactly as long as the
assignment does.

@@
public with sharing class CoordinationAccessService {

    public static void syncGrants(Set<Id> assignmentIds) {
        List<Coordination_Assignment__c> assignments = [
            SELECT Id, Coordinator__c, Member__c, Access_Level__c, End_Date__c
            FROM   Coordination_Assignment__c
            WHERE  Id IN :assignmentIds
            WITH    USER_MODE
        ];

        List<MemberAccess> toInsert = new List<MemberAccess>();
        for (Coordination_Assignment__c a : assignments) {
            toInsert.add(new MemberAccess(
                UserId      = a.Coordinator__c,
                ParentId    = a.Member__c,
                AccessLevel = a.Access_Level__c
            ));
        }
        if (!toInsert.isEmpty()) insert toInsert;
    }
}
@@

**The access level comes from the assignment, not from a constant.** Hard-coding
ReadOnly in the share while the assignment says Edit produces a model that is
invisible to review.

## The revocation

Revocation is the part that is usually missing, and it is the part that
accumulates grants.

@@
    public static void syncRevocations(Set<Id> assignmentIds) {
        List<Coordination_Assignment__c> ended = [
            SELECT Id, Member__c, Coordinator__c
            FROM   Coordination_Assignment__c
            WHERE  Id IN :assignmentIds
            AND    End_Date__c != null
        ];

        Set<Id> memberIds = new Set<Id>();
        Set<Id> userIds  = new Set<Id>();
        for (Coordination_Assignment__c a : ended) {
            memberIds.add(a.Member__c);
            userIds.add(a.Coordinator__c);
        }

        List<MemberAccess> stale = [
            SELECT Id
            FROM   MemberAccess
            WHERE  ParentId IN :memberIds
            AND    UserId    IN :userIds
            AND    RowCause  = 'Apex'
        ];
        if (!stale.isEmpty()) delete stale;
    }
}
@@

## The three properties that make this safe

**1. Idempotency.** Running syncGrants twice must not create duplicates or
fail. Before inserting, delete existing Apex rows for the same user and parent
pair — or catch the duplicate. **A share service that is not idempotent will
produce DML exceptions at 2am** the first time a trigger fires twice.

**2. Scoped revocation.** The revocation deletes only rows with
@@RowCause = 'Apex'@@ and only for the affected user and member pairs. It must
not delete manual shares — **an Apex revocation that removes manual shares is
destroying grants it does not own**, and it is the most common bug in
hand-written sharing code.

**3. User mode where a user exists.** The query is @@WITH USER_MODE@@ so that
the service cannot read an assignment the coordinator is not entitled to see.

## The trade-off to state

Apex sharing is the most expensive mechanism available: every grant runs in a
transaction, holds row locks, and produces share rows that must later be
reconciled. This design is justified **only** because the grant follows a
relationship that no declarative mechanism can express — a per-record
coordination assignment with its own access level and end date.

If the requirement were "coordinators see their panel's members", a team or a
rule would be cheaper and declarative. **The justification for Apex is the
specificity of the requirement**, and it should be written down.

`,

  /* ---------------------------------------------------------------- 7.2 --- */
  '7.2': tick`
## What a strong answer contains

A batch class that finds orphans and deletes them **without deleting anything
it does not own**, and that is safe to re-run and safe to interrupt.

## The class

@@
public class StaleGrantReconciler implements Database.Batchable<SObject>, Database.Stateful {

    public Integer rowsDeleted = 0;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator(
            'SELECT Id, UserId, ParentId FROM MemberAccess WHERE RowCause = \'Apex\''
        );
    }

    public void execute(Database.BatchableContext bc, List<MemberAccess> scope) {
        Set<Id> memberIds = new Set<Id>();
        Set<Id> userIds  = new Set<Id>();
        for (MemberAccess m : scope) {
            memberIds.add(m.ParentId);
            userIds.add(m.UserId);
        }

        Set<Id> validPairs = new Set<Id>();
        for (Coordination_Assignment__c a : [
            SELECT Id, Member__c, Coordinator__c
            FROM   Coordination_Assignment__c
            WHERE  Member__c IN :memberIds AND Coordinator__c IN :userIds
        ]) {
            validPairs.add(a.Coordinator__c + '-' + a.Member__c);
        }

        List<MemberAccess> stale = new List<MemberAccess>();
        for (MemberAccess m : scope) {
            if (!validPairs.contains(m.UserId + '-' + m.ParentId)) {
                stale.add(m);
            }
        }

        if (!stale.isEmpty()) {
            rowsDeleted += stale.size();
            delete stale;   // scoped to Apex rows only
        }
    }

    public void finish(Database.BatchableContext bc) {
        // Report the count. Silent deletion is how this job becomes alarming
        // the first time it deletes a million rows.
    }
}
@@

## The four properties that matter

**1. RowCause scoping, twice.** The query selects only @@RowCause = 'Apex'@@
and the delete list is built only from that scope. This is the property that
stops the job deleting manual shares, and it is the one to state in a code
review because a future edit that drops the filter would be invisible in
testing.

**2. Pair-based validity, not record-based.** Validity is a **user-member pair**,
not an assignment Id — because a share row does not know which assignment
created it. Building the valid-pair set is what makes the comparison possible
at all, and getting this wrong produces a job that deletes every grant every
night.

**3. Batching.** The scope is chunked, so this runs against millions of rows
without hitting governor limits. @@Database.Stateful@@ carries the deleted
count across batches.

**4. It reports.** A reconciliation job that silently deletes is a liability.
The count must surface, because a sudden change in the number is the signal
that something else is wrong.

## The operational requirements

| Requirement | Reason |
|---|---|
| Schedule nightly, off-hours | It is a full scan of the Apex share rows |
| Alert on the deleted count | A sudden drop to zero means the validity query is broken |
| Run in a deliberate system context | It must see all share rows regardless of who runs it |
| Never run it in the first hour after a deployment | Grants may not exist yet |

## The trade-off to state

**This job exists because the model does not clean up after itself, and that is
the real cost of Apex sharing.** Every declarative mechanism removes access when
its input is removed; Apex sharing requires you to write the removal. The
reconciler is not an optimisation, it is a permanent operating cost, and it
should be weighed against the declarative alternative before the design is
approved.

`,

  /* ---------------------------------------------------------------- 7.3 --- */
  '7.3': tick`
## What a strong answer contains

Eight classifications on one decisive axis, and then an implementation of the
weakest case — where "weakest" means the one where the declarative option is
most tempting and most dangerous.

## The decisive axis

Ask: **can the requirement be expressed as a criterion on the record, matched
against a principal that already exists?**

- **Yes, and the principal is positional** → Role, with a rule targeting it.
- **Yes, and the principal is data** → Public group, with a rule.
- **Yes, and it is per-record membership** → Team.
- **No** → Apex.
- **It is all records** → View All, not sharing at all.

## The eight

| # | Requirement | Answer | Decisive reason |
|---|---|---|---|
| 1 | Regional managers read members in their region | **Role** | Positional; no share rows |
| 2 | Finance reads claims over a threshold | **Rule → group** | Criterion on the record |
| 3 | Care team sees members on their panel | **Team** | Per-record membership |
| 4 | Coordinators see members with an active assignment, at the assignment's access level | **Apex** | The access level varies per record |
| 5 | Compliance reads all consent records | **View All** | All records; sharing would be pure cost |
| 6 | Members see their own records externally | **Sharing set rule** | External, session-based criterion |
| 7 | A one-off executive request | **Manual share** | Genuinely exceptional |
| 8 | Agents see claims above a threshold during a dispute window | **Apex** | The criterion depends on a time window |

## The weakest case, and why

**Requirement 8 is the weakest.** It is the one where a declarative solution
looks available and is wrong.

The temptation: create a rule matching claims over the threshold during an open
dispute. It works, it is easy, and it is a bad design for three reasons:

1. **The criterion includes a time condition**, so **every claim entering or
   leaving the window triggers recalculation.** At volume, this is a
   recalculation storm driven by business process, which is the worst possible
   trigger pattern.
2. **Access depends on state that changes without a change to the record.** The
   dispute opening does not modify the claim, so nothing about the record
   signals that access should change.
3. **It is invisible in an access review**, because the rule's criteria are a
   compound expression referencing a related object.

## The implementation

@@
public with sharing class DisputeAccessService {

    public static void grantDisputeAccess(Set<Id> claimIds) {
        Set<Id> userIds = new Set<Id>();
        Set<Id> parents = new Set<Id>();

        for (Dispute__c d : [
            SELECT Id, Claim__c, Requested_By__c
            FROM   Dispute__c
            WHERE  Claim__c IN :claimIds AND Status__c = 'Open'
            WITH    USER_MODE
        ]) {
            userIds.add(d.Requested_By__c);
            parents.add(d.Claim__c);
        }

        List<MemberAccess> grants = new List<MemberAccess>();
        for (Id u : userIds) {
            for (Id p : parents) {
                grants.add(new MemberAccess(
                    UserId = u, ParentId = p, AccessLevel = 'ReadOnly'
                ));
            }
        }

        // Idempotent: clear prior Apex grants for the same scope first.
        delete [
            SELECT Id FROM MemberAccess
            WHERE  UserId IN :userIds AND ParentId IN :parents
            AND    RowCause = 'Apex'
        ];
        if (!grants.isEmpty()) insert grants;
    }
}
@@

## The three properties of the implementation

**It keys off the Dispute record, not off the claim's fields.** The share rows
exist because a dispute is open, and they are removed when it closes. The
trigger belongs on Dispute__c, not on Claim__c.

**It revokes explicitly.** Closing a dispute deletes the grant. **A grant that
depends on state must be revoked by the thing that changed the state**, and
this is the step that separates a working design from one that quietly
accumulates access.

**It is idempotent, and revocations are scoped to RowCause = 'Apex'.** Same
two properties as 7.2, for the same reasons.

## The conclusion to state

Apex is the right answer for requirement 8 **and it is more expensive than the
rule would have been** — in code, in locks, in reconciliation, and in audit
complexity. The classification exercise earns its value by making you pay that
cost consciously rather than discovering it in production.

`,


  /* ---------------------------------------------------------------- 8.1 --- */
  '8.1': tick`
## What a strong answer contains

Three things, in this order: the query that finds the shares, the severity
categories, and a remediation plan that does **not** start by deleting
anything.

## The finding query

@@
SELECT ParentId, UserId, AccessLevel, RowCause, CreatedBy, CreatedDate
FROM   Member__cShare
WHERE  RowCause IN ('Manual', 'Apex')
AND    CreatedById NOT IN (SELECT UserId FROM ServiceAccountUser)
ORDER BY CreatedDate ASC;
@@

@@
-- The audit question: who can see what, and who granted it
SELECT RowCause,
       CreatedById,
       CreatedBy.Profile.Name,
       COUNT(Id) AS shares
FROM   Member__cShare
WHERE  RowCause IN ('Manual', 'Apex')
GROUP BY RowCause, CreatedById, CreatedBy.Profile.Name
ORDER BY COUNT(Id) DESC;
@@

## The four severity categories

| Severity | Definition | Example | Action |
|---|---|---|---|
| **S1 — orphan** | Grantor no longer active, or grantor had no business granting | Manual share from an admin who left 14 months ago | **Revoke immediately** |
| **S2 — over-privileged** | Access exceeds any current business requirement | Read on Member__c granted to a role that now uses a team model | Revoke, with notice |
| **S3 — undocumented** | Valid-looking grant with no business justification found | A manual share with a blank RowCause, no ticket reference | Investigate, then document or revoke |
| **S4 — acceptable** | Grant matches a current requirement | Team-based access, documented | **Leave alone and record it** |

S4 is the category people omit, and its omission is what turns an audit into a
blanket deletion exercise. **A share that is correct is evidence that the model
works**, and removing it is as much a finding as leaving an illegitimate one.

## The remediation plan

**Phase 1 — establish the baseline.** Export every manual and Apex share with
grantor and date, and store it. Without it you cannot demonstrate that
remediation did not break something, and the export is the evidence an auditor
will ask for.

**Phase 2 — revoke S1 without notice.** Orphaned grants have no owner and no
defender. Revoke, log, and notify the record owner's manager rather than the
individual, since the individual may have left.

**Phase 3 — investigate S3 before touching it.** Each S3 share needs a business
question: who asked for this, and does the requirement still exist? **Deleting
an S3 share without asking converts an undocumented grant into a broken
workflow**, and the resulting support ticket is how remediation programmes lose
credibility.

**Phase 4 — S2 with notice.** Two weeks, communicated, with a named contact.
Some users will discover a dependency nobody documented. Capture it — that
dependency is a design finding.

**Phase 5 — prevent recurrence.** This is the phase that matters:

1. A **sharing policy** stating that manual shares require a RowCause description and a review date (Phase 8.3).
2. A **scheduled report** of manual shares older than 90 days, delivered to record owners.
3. **Field Audit Trail** or equivalent on the grantor, so the next audit is a query rather than an investigation.
4. Removal of the ability to grant from the relevant profile where the requirement is genuinely narrow — **a permission you cannot grant is a better control than a policy telling you not to grant it.**

## The finding to report upward

The most valuable output is not the revocation count. It is:

> 4,180 manual shares exist on the three sensitive objects. 61% were granted by
> three individuals who are no longer active. 8% grant access wider than any
> documented requirement. Recurring grants are being made because **no
> declarative mechanism exists for the requirement being met** — the recurring
> pattern is a missing-mechanism finding, not a user-behaviour finding.

That reframes remediation from policing users to closing design gaps, which is
the only version of this project that finishes.

`,

  /* ---------------------------------------------------------------- 8.2 --- */
  '8.2': tick`
## What a strong answer contains

Four experiments, each with the **predicted** result written before the
result, because the predictions are where the learning is.

## The four experiments

### Experiment 1 — ownership change

**Predicted:** the manual share persists. Manual shares are independent of
ownership, so transferring the record does not remove the recipient's access.

**Why it matters:** teams often assume a share follows the record's owner. It
does not. A manual share is a standing grant and **survives any number of
ownership changes**, which is precisely why it accumulates.

### Experiment 2 — recipient deactivation

**Predicted:** access is removed, and the share row **remains**. Deactivating a
user blocks their login and their effective access, but does not delete the
share.

**Why it matters:** the share row becomes latent. If the username is reused, or
if the user is reactivated during an offboarding that was reversed, the grant
resumes silently. **A share to a deactivated user is a dormant grant**, and
that is the mechanism behind a large share of unintended-access incidents.

### Experiment 3 — OWD change

**Predicted:** the manual share **survives** an OWD change. Manual shares are not
recalculated away by OWD changes.

**Why it matters:** lowering OWD to Private does not remove existing manual
shares, so an org that assumes "Private means only what we granted" is wrong
unless the manual shares are also cleaned up. **OWD changes the floor; they do
not clean the grants above it.**

### Experiment 4 — cloning

**Predicted:** the clone has **no manual shares**. Clone copies the record and
its fields, not its share rows. Apex and rule-derived shares will be recreated
by their mechanisms if the criteria still match; manual shares will not.

**Why it matters:** cloning is a common way to create legitimate records, and it
means **the clone has strictly different access from the original** — usually
less. Anyone relying on "the copy behaves like the original" is wrong about
access.

## The summary table

| Event | Manual share row | Effective access | The trap |
|---|---|---|---|
| Ownership change | **Persists** | Recipient keeps access | Assumed to follow the owner |
| Recipient deactivated | **Persists** | Removed | A dormant grant waiting for reactivation |
| OWD change to Private | **Persists** | Recipient keeps access | Assumed Private cleans up grants |
| Clone | **Not copied** | Original's recipient loses access to the clone | Assumed the clone matches |

## The design conclusions

**1. Manual shares are permanent until deleted.** No platform event removes
them. That makes them the only truly permanent grant type in the model, and it
is the strongest argument for treating them as an exception with an expiry.

**2. Deactivation is not revocation.** The share row survives, so offboarding
must delete shares explicitly — which is a procedural requirement the platform
will not enforce for you.

**3. Cloning resets access.** A workflow that clones records produces records
with different access, and that difference is invisible until someone notices a
user cannot see what they could see on the original.

`,

  /* ---------------------------------------------------------------- 8.3 --- */
  '8.3': tick`
## What a strong answer contains

A policy that a CISO can approve, and **technical controls that enforce it**.
The second half is what distinguishes a policy from a document.

## The policy

### 1. Principle

Manual sharing is an exception mechanism for requirements that no declarative
mechanism meets. It is not a way of working. Every manual share must carry a
justification and an expiry, and the default answer to "can I share this?" is
"change the model instead".

### 2. When manual sharing is permitted

Only where all three hold:

- The requirement is genuinely one-off or genuinely temporary.
- No role, team, rule or permission set can express it.
- The share has a named business owner who will confirm it still exists at
  review.

### 3. Mandatory fields on every manual share

| Field | Rule |
|---|---|
| **RowCause description** | Required, minimum 20 characters, must state the business reason |
| **Access level** | Never Modify All; Read or Read/Write only |
| **Expiry** | Maximum 90 days, no exceptions without CISO approval |
| **Reviewing manager** | Recorded, notified at grant and at expiry |

### 4. Prohibited

- Manual shares on Consent_Record__c by anyone outside the compliance
  permission set groups.
- Manual shares to inactive users, service accounts, or guest users.
- Manual shares as a substitute for a missing sharing rule — **a repeated
  pattern of the same manual share is a design finding and must be raised as
  one.**
- Sharing to a whole public group as a workaround for a missing principal.

### 5. Review

Quarterly, by record owner, using the aged-manual-share report. Every share
either confirmed or revoked. **Confirmation is a decision, not an absence of
complaint**, and the report must produce a positive action rather than a
notification nobody reads.

### 6. Exceptions

CISO approval, in writing, with an expiry, and reported in the quarterly
review. An exception process with no register is not an exception process.

## The technical controls that enforce it

This is the half that makes the policy real.

| Policy clause | Technical control |
|---|---|
| RowCause must be recorded | **Validation rule** on the sharing object where supported, plus a scheduled report flagging blank or short descriptions |
| Expiry must exist | A **scheduled job** that deletes expired manual shares, with the report retained as evidence |
| Quarterly review happens | **Scheduled report** of manual shares older than 90 days, delivered to record owners, with a tracked response |
| Never Modify All by manual share | **Restrict the Modify All permission** from the profiles of any role permitted to share manually |
| No shares on Consent_Record__c | **Do not grant the manual-sharing capability** for that object to any profile outside compliance — the strongest control, because it removes the possibility |
| No shares to inactive users | **Offboarding automation** that deletes manual shares as part of deactivation, not as an optional step |
| Repeated patterns become findings | **Report grouped by grantee and parent**, so a recurring share to one person for one object is visible as a pattern |

## The design point to make to the CISO

> The most effective control in this policy is not a report. It is **removing
> the ability to grant a manual share on Consent_Record__c** from every profile
> outside the compliance groups. Everything else detects a violation after the
> fact; that one prevents it. **A policy that depends on user discipline is a
> policy that will be breached, and a policy backed by permissions is not.**

That paragraph is the difference between a document and an architecture, and it
is the one to get into the meeting.

`,

  /* ---------------------------------------------------------------- 9.1 --- */
  '9.1': tick`
## What a strong answer contains

The working configuration, and then **three breakages found empirically** —
each with the mechanism that caused it, because a break without a cause is
just an anecdote.

## The working configuration

- **Sharing set rule** on Contact, granting access to Member__c where the
  Contact Id equals the current external user's Contact Id.
- **Sharing set** named Member Self-Service, containing the rule.
- **Guest user permission set** with Read on Contact and Member__c; no access
  to Claim__c, Consent_Record__c or Clinical_Summary__c.
- **Apex controller** that resolves the external user's Contact Id from the
  session rather than from a URL parameter.
- **No role for external users at all** — there is none to have.

## The three breakages

### Breakage 1 — the Contact link is missing

**What you find:** an authenticated member sees no records at all. No error, no
records.

**Cause:** the external user's Contact record was never linked to a
Member__c — for example, the member registered through a flow that created the
portal user but not the Contact relationship. The sharing set rule criterion
evaluates against nothing and matches nothing.

**Why this is the important one:** it is **silent**. There is no error, no log
entry, and no configuration defect. The mechanism is working exactly as
designed on a set of zero records.

### Breakage 2 — the identifier comes from the URL

**What you find:** member A can read member B's records by editing a URL
parameter.

**Cause:** the controller reads the member Id from a query string parameter
rather than from the session. The sharing set rule correctly limits what the
**guest user** can reach — and the guest user can reach every member the rule
granted, which is all of them for that shared credential.

**The mechanism to name:** the guest user is a shared credential with broad
system permissions, so **the sharing rule filters the guest user, not the
person**. Anything the controller takes from the request instead of the session
bypasses the entire external access model.

### Breakage 3 — the field is exposed by a related query

**What you find:** the portal page renders a clinical summary the member's
portal should never show — in a list view component, not the detail page.

**Cause:** an LWC queries @@Member__r.Clinical_Summary__c@@ through a
relationship from another object, and the Apex is not in user mode.

**Why it is missed:** the portal's own queries all enforce FLS correctly, so
testing the portal's features finds nothing. The leak is in a component nobody
thought of as part of the portal.

## What the three breakages have in common

**Every one of them is a zero-match or a bypass, and neither produces an
error.** An external access design that has only been tested on the happy path
has been tested on exactly the case that works by construction.

## The fix that makes it durable

1. **A nightly integrity check** for external users whose Contact has no related Member__c — because breakage 1 is a data problem that no configuration can prevent.
2. **Never take a record identifier from the request** in guest-user Apex. Resolve it from the session, in a base class every controller extends.
3. **Audit every SOQL that reads a restricted field through a relationship**, not only the fields on the object that owns them.

`,

  /* ---------------------------------------------------------------- 9.2 --- */
  '9.2': tick`
## What a strong answer contains

A mechanism that works internally and does nothing externally, the evidence
for each half, and the design consequence.

## The case: role hierarchy

This is the cleanest example, and it is the one most likely to appear in the
exam.

### The internal half

**Configuration:** Member__c has Grant Access Using Hierarchies enabled.
Ownership of a Member__c is assigned to the servicing team, which mirrors the
agent reporting structure.

**Test:** log in as a Regional Manager. Their reports' 4,000 members are
visible, plus their own.

@@
SELECT COUNT()
FROM   Member__c
WHERE  OwnerId IN (
    SELECT Id FROM User WHERE UserRoleId IN (:subtreeIds)
);
@@

**Result:** 4,000 records. The hierarchy is working.

### The external half

**Configuration:** unchanged. The portal uses the same Member__c object.

**Test:** log in as an authenticated broker on the partner site. Attempt the
same query.

**Result:** **zero records**, and no error. The guest user is not in any role,
so there is no hierarchy to traverse — and **role-hierarchy access does not
apply to external users at all.**

### The evidence that closes the argument

@@
-- The guest user's role, which is the whole explanation
SELECT Id, Name, IsActive, UserRoleId
FROM   User
WHERE  Profile.Name = 'Agentforce Guest User';
@@

@@
-- Sharing set rules, which are what actually carries external access
SELECT Id, Name, Status
FROM   SharingSetRule
WHERE  ObjectName = 'Member__c';
@@

@@
-- share rows are per guest user, which is the mechanism external access uses
SELECT GuestId, COUNT(Id)
FROM   Member__cShare
GROUP BY GuestId;
@@

The first query returns a null role. That single row is the proof: there is no
hierarchy for the external user to be part of.

## The design consequence

**External access must be designed as a separate model, not inherited from the
internal one.**

Any grant that relies on the role hierarchy, on ownership flowing from a
manager, or on an Apex sharing class that assumes a user context is **not
covering external users at all**. Three categories must be re-implemented for
the external path:

| Internal mechanism | External equivalent |
|---|---|
| Role hierarchy | Sharing sets and sharing set rules |
| Ownership from the reporting line | Account relationship via the external account hierarchy |
| Apex sharing on a user context | Apex sharing evaluated against the **guest user**, with the person's identity read from the session |

## The trap worth naming

Because the internal model works, the external requirement appears satisfied in
design review. The failure surfaces in production as "portal users cannot see
their data", investigated by an integration developer who concludes the sharing
sets are misconfigured — because nobody thought to check whether the working
internal mechanism had any external equivalent.

`,

  /* ---------------------------------------------------------------- 9.3 --- */
  '9.3': tick`
## What a strong answer contains

Five personas, the mechanism for each, the permission scope, and — the part
that separates a design from a configuration — the **verification plan**.

## The five personas

| Persona | Authenticated | Mechanism | Object scope |
|---|---|---|---|
| Anonymous visitor | No | Guest user permission set only | Read on a public directory object only |
| Member | Yes | Sharing set rule on Contact | Own Member__c, Claims, Consent status |
| Broker | Yes | Sharing set via employer Account | Member__c and Claim__c for their clients |
| Provider | Yes | Sharing set rule on Contact | Own Provider_Network__c entry; Claims for their panel |
| Partner admin | Yes | External account hierarchy | All accounts and members under the parent |

## Site structure

| Site | Personas | Guest user scope | Why |
|---|---|---|---|
| **Public** | Anonymous | Read on Directory_Entry__c only | No Member__c read at all |
| **Member** | Member | Read Contact, Member__c, Claim__c; FLS excludes clinical fields | Member's own records |
| **Partner** | Broker, provider, partner admin | Read Contact, Account, Member__c, Claim__c, Provider_Network__c; **no** Consent_Record__c evidence | Their account-related records |

**Three sites, three guest users, three blast radii.** On a single site the
guest user's permission set is the union of every persona's needs, so the
anonymous visitor's session could attempt a Member__c query and only the
sharing rules would stop it. Separating them makes the anonymous exposure
structurally impossible.

## Permission scope, stated precisely

**Guest user permission set — Partner site:**

| Object | Permission | Notes |
|---|---|---|
| Contact | Read | Needed for identity resolution |
| Account | Read | Needed for the account relationship |
| Member__c | Read, Create | Create is required to bootstrap an unknown contact |
| Member__c.Clinical_Summary__c | **No Read** | FLS |
| Member__c.SSN_Last4__c | **No Read** | FLS |
| Claim__c | Read | |
| Claim__c.Diagnosis_Code__c | **No Read** | FLS |
| Consent_Record__c | **No access** | Not on the site at all |
| Consent_Record__c.Evidence_Payload__c | **No access** | Never uploaded to a partner-accessible site |

**No Update and no Delete on anything the guest user did not create**, enforced
in Apex because permissions cannot express it:

@@
private static void assertGuestOwnership(List<SObject> records) {
    for (SObject r : records) {
        if (r.get('CreatedById') != UserInfo.getUserId()) {
            throw new SecurityException(
                'Guest user may only modify records it created.'
            );
        }
    }
}
@@

## The verification plan

This is the section that makes the design defensible, and it must be
persona-by-persona rather than feature-by-feature.

| Step | Action | Evidence produced |
|---|---|---|
| 1 | Enumerate personas and write down what each should reach | The intended-access matrix |
| 2 | For each persona, log in and **attempt to read one record of each type you intend to deny** | Positive proof of denial |
| 3 | Record anything that returns | Finding: permission gap or sharing gap |
| 4 | Repeat after every change to a guest user permission set or a sharing set | Change-controlled evidence |
| 5 | Test the boundary cases | The rows below |

**The boundary cases, which is where external designs leak:**

- A member whose Contact has no related Member__c — zero matches, silently.
- A broker whose employer Account was deleted or deactivated.
- A provider whose Contact is deactivated but whose portal user is not.
- An anonymous request to a page that requires context.
- A Contact whose external user has multiple portal accounts.

## The two open items to state

1. **Report subscriptions from partner sites** produce emailed copies outside the access model, and the policy does not yet cover them.
2. **An MCP server connected to Vantage data for partner self-service** would be a new surface with its own access model, and it is not in this design — it needs a separate review.

Naming the gaps is part of the deliverable. A design review that presents only
the covered surface has claimed more than it built.

`,

  /* ---------------------------------------------------------------- 10.1 --- */
  '10.1': tick`
## What a strong answer contains

The matrix, and then a **justification for every "All" grant** — because the
justification is the part of this exercise that is actually assessed.

## The matrix

Legend: R Read, C Create, E Edit, D Delete, VA View All, MA Modify All.

| Role | Account | Contact | Member__c | Claim__c | Consent_Record__c | Provider_Network__c | Access_Request__c |
|---|---|---|---|---|---|---|---|
| Intake agent | R | R,C,E | R,C,E | R,C,E | — | — | R,C |
| Claims adjuster | R | R | R | R,E | — | — | R |
| Underwriter | R | R | R | R,E | — | R | R |
| Compliance auditor | R,VA | R | R,VA | R,VA | R,VA | R | R,VA |
| Regional manager | R | R | R | R | R | R | R |
| Data steward | R,E | R,E | R,E | R | — | R,E | — |
| Field agent | R | R | R | R | — | R | R |
| Integration user | MA | MA | R,E | R,C,E | R,C | R,C | R,C |

## The four "All" grants, justified individually

**Compliance auditor — View All on four objects.** Justified because the audit
function genuinely needs every record regardless of ownership or region, and
because a rule-based alternative would generate a share row for every record in
a 380,000-claim object to deliver a capability a permission already provides.
**The cost to name:** View All removes sharing as the boundary for that user, so
the sharing rules that protect everyone else no longer apply to them — which is
precisely why the role holds **no Edit anywhere**.

**Regional manager — no View All, and this is the interesting decision.** They
can see their region's members through the role hierarchy, so View All would add
nothing except the removal of a working boundary. **The design point: the
absence of a grant is a decision, and this one should be recorded as one**,
because the next person to review the matrix will assume the omission was an
oversight.

**Data steward — Edit on Member__c and Provider_Network__c, no Delete anywhere.**
Edit is required for data correction. **Delete is withheld from every human
role on all three sensitive objects**, because it is the only permission that
destroys evidence and in a healthcare org there is always an inactivation
workflow instead. The trade-off to state: some legitimate cleanup will now be
manual, and the cost is being accepted deliberately rather than discovered.

**Integration user — Modify All on Account and Contact.** Justified by a
specific requirement: the integration creates and links Accounts and Contacts
with no user context, and user mode would fail on records the user cannot see.
**Narrowed deliberately** to the two objects it genuinely needs, with Read or
Read/Edit everywhere else, and Modify All Data **not** granted — the
integration does not need cross-object logic.

## The three design decisions worth surfacing

| Decision | Reasoning |
|---|---|
| **No Delete on clinical objects, any human role** | Evidence preservation; inactivation workflow instead |
| **Compliance is read-only** | Audit is read-only by nature, and a read-only role cannot alter what it audits |
| **Integration scoped per object, not Modify All Data** | The requirement is object-specific, so the grant should be too |

## What to check before deploying

FLS per field, not just per object. The matrix above is the object layer; the
field layer is Phase 12, and it is where the real Vantage risk sits — SSN last
four, clinical summary, diagnosis code and consent evidence each need a named
holder list rather than an object-level grant.

`,

  /* ---------------------------------------------------------------- 10.2 --- */
  '10.2': tick`
## What a strong answer contains

Two experiments, one per direction, each with the **predicted and actual**
result recorded — because the point is proving the intersection from both ends.

## Direction 1 — permissions cap sharing

**Setup.** A criteria-based sharing rule on Claim__c grants the Finance group
read on claims over $10,000. Two Finance users:

- **User A**: has Read on Claim__c via a permission set.
- **User B**: has **no** Read on Claim__c anywhere — profile or permission set.

**Test.** As User A, query the matching claims. As User B, attempt the same
query.

**Predicted:** A returns 4,200 records. **B returns nothing.**

**Actual result and the error to capture:**

@@
System.QueryException: Insufficient access on entity id [01i...]
@@

@@
-- and the proof that the share rows exist for BOTH users
SELECT UserId, AccessLevel, RowCause
FROM   Claim__cShare
WHERE  ParentId = :claimId;
@@

**The share rows exist for User B too.** This is the finding that proves the
direction: sharing did its job, and permissions removed the result. **User B
being in the target group is irrelevant** — the rule matched and wrote a row,
and the row was never consulted because B cannot read the object.

## Direction 2 — sharing scopes permissions

**Setup.** User C has Read on Claim__c via a permission set, and is **not** in
the Finance group and owns nothing.

**Test.** As User C, query all claims over $10,000.

**Predicted:** **zero records**, and no error.

**Actual result:** an empty list. No exception, no warning.

@@
SELECT COUNT()
FROM   Claim__c
WHERE  Amount__c > 10000;
-- returns 4200 as a system-context query, 0 as User C
@@

## Why direction 2 is the more important experiment

Direction 1 produces an error, so it is self-reporting. **Direction 2 fails
silently**, and that is the shape of the more dangerous incidents: a user with
the correct permissions who sees an empty list and reasonably concludes there is
no data.

## The three conclusions to record

1. **The effective answer is an intersection.** Object and field permissions on one side, record access on the other. Both must permit.
2. **Neither layer knows about the other.** Permissions are not evaluated against share rows, and share rows are not filtered by permissions. A correctly configured rule produces share rows for users who cannot see the object — **which is why share row counts overstate real exposure and understate real risk.**
3. **Only one direction complains.** Permissions blocking access raises an error; sharing blocking access returns nothing. **An access investigation must therefore check permissions first and never stop at a successful query.**

`,

  /* ---------------------------------------------------------------- 10.3 --- */
  '10.3': tick`
## What a strong answer contains

The before-and-after assignment lists, the permission that had to stay, and the
**proof that nothing broke** — which is the part that requires a method rather
than an assertion.

## The starting point

Nine permission sets on one claims adjuster:

| # | Permission set | What it grants | Verdict |
|---|---|---|---|
| 1 | Vantage_Claims_Adjuster | Read Member__c, Read/Edit Claim__c | **Keep** — the job function |
| 2 | Vantage_Misc_Access | Read on Account, Contact, Provider_Network__c, Access_Request__c | **Absorb** |
| 3 | Vantage_Read_All_Sensitive | Read on Consent_Record__c, Clinical_Summary__c | **Remove** — not a claims requirement |
| 4 | Vantage_Reports | Read for report access | **Absorb** — report folder access is a folder permission, not a permission set |
| 5 | Vantage_Mobile | Read for mobile offline | **Remove** — Feature Management, not a permission set |
| 6 | Vantage_Integration_Read | Read on everything | **Remove** — duplicates 1 and 2 |
| 7 | Vantage_Time_Off | Create/Edit on a leave object | **Keep** — a genuine second job function |
| 8 | Vantage_Training | Read on training objects | **Keep** |
| 9 | Vantage_Admin_Utilities | Modify All on Access_Request__c | **Remove** — Modify All for a queue workflow |

## The target

**Two permission sets.** Vantage_Claims_Adjuster, extended to absorb the
read access in sets 2 and 4. Vantage_Time_Off, unchanged. Plus the permission
set group that carries the field-level exclusions.

## The critical finding

@@
-- The effective field permissions BEFORE, per object
SELECT PermissionSet.Name, sObject.Name, FieldPermissions.SobjectType,
       FieldPermissions.PermissionsRead, FieldPermissions.PermissionsEdit
FROM   FieldPermissions
WHERE  ParentId IN (SELECT Id FROM PermissionSetAssignment
                    WHERE AssigneeId = :userId)
ORDER BY sObject.Name;
@@

The output reveals that **Vantage_Read_All_Sensitive is the only thing granting
Read on Member__c.Clinical_Summary__c** — so removing it is a real change, not
a tidy-up. The claims adjuster has been reading clinical summaries they were
never entitled to, and nobody noticed because there was no negative test.

**This is the finding that justifies the whole exercise.** Permission sprawl is
not untidy; it is invisible over-permission, because each set looks reasonable
in isolation and the union of nine is unreviewable.

## The proof that nothing broke

**Do not test by asking the user.** Test by diffing effective permissions.

1. **Export the before state** — Profile Permissions, per object CRUD and per
   field read and edit, for this user.
2. Make the assignment changes.
3. **Export the after state** from the same tool.
4. **Diff.** Every difference must be one of the three removals above. Anything
   else is an unintended consequence and is investigated, not accepted.
5. **Run the negative test** — confirm the user can no longer read
   Clinical_Summary__c, which is the change that was intended.
6. **Have the user walk their real workflow**, because a permission diff cannot
   detect a workflow that depended on a permission nobody documented. Capture
   any dependency found — **it is a design finding, not a nuisance.**

## The systemic fix

| Finding | Fix |
|---|---|
| Nine sets with no job-function rationale | One set per job function; delete unattributed sets |
| "Misc_Access" bundles unrelated objects | Unbundle into the sets that actually need each object |
| Capability granted by a package set nobody re-reads | Audit package permission sets as part of every upgrade |
| "Admin_Utilities" with Modify All for a queue workflow | Replace Modify All with the specific object permissions the workflow needs |

## The conclusion to state

Permission sprawl is a **security finding**, not a maintenance one. Nine
permission sets per user means nine things to evaluate to answer any question
about that user's access, and nobody does that evaluation — so the effective
access model is whatever the union happens to be. **Reducing the set count is
how you make the model auditable at all.**

`,

  /* ---------------------------------------------------------------- 11.1 --- */
  '11.1': tick`
## What a strong answer contains

The group, the proof that intersection removed something, and the proof that a
plain permission set could not have done it.

## The group

@@
Vantage_Reviewer (Permission Set Group)
├── Vantage_Reviewer_Core
│     Read Member__c, Read Claim__c, Read Consent_Record__c
├── Vantage_No_Clinical_Notes
│     restrict settings: withhold Read on Member__c.Clinical_Summary__c
└── Vantage_No_Underwriting
      restrict settings: withhold Edit on Claim__c

Result: reviewer read access, minus clinical notes, minus underwriting edits.
@@

## Test 1 — the intersection removes access

Assign the group to a user. Query as that user:

@@
-- Should return 0 rows
SELECT Clinical_Summary__c
FROM   Member__c
WHERE  Id = :testMemberId;
@@

@@
-- Should return the member's other fields, so we know the row is visible
SELECT Id, First_Name__c, Phone__c
FROM   Member__c
WHERE  Id = :testMemberId;
@@

The second query returns the record and the third returns nothing. **The record
is visible and the field is not**, which is the intersection working.

## Test 2 — a plain permission set could not do it

Now assign Vantage_Reviewer_Core as a **plain permission set**, without the
group, to a second user.

@@
-- The clinical summary IS returned
SELECT Clinical_Summary__c FROM Member__c WHERE Id = :testMemberId;
@@

**This is the demonstration the exercise asks for.** The same permission set
that was denied the field inside the group is granted it outside the group.
The capability is identical; only the **container** differs.

## Why this is the only declarative way to subtract

| Attempt | Result |
|---|---|
| A permission set that does not grant the field | **Fails** — the union means the other set still grants it |
| Removing the permission from the granting set | Breaks every user who needs it for other fields |
| A separate role without the set | Breaks the group's atomic assignment |
| **Restrict settings inside a group** | **Works** — intersection applies only within a group |

## The two properties to record

**1. Intersection applies only within one group.** Assign a second group that
grants the field, and the union across groups restores it. This is the
limitation that makes group design non-local, and it is the reason every user
holding the exclusion must be audited for other assignments.

**2. Restrict settings work at field level.** Object-level exclusion is simpler
— just do not grant the object. Field-level exclusion is what needs the
mechanism, and that is why FLS-shaped requirements are the ones that justify
groups.

## The trade-off to state

Everything in a group is assigned and unassigned together, so the group couples
capabilities that might legitimately need to diverge. **A group is correct only
where the capabilities genuinely travel together.** Wrapping unrelated sets in a
group for tidiness creates a container whose only behaviour is the surprising
one.

`,

  /* ---------------------------------------------------------------- 11.2 --- */
  '11.2': tick`
## What a strong answer contains

The redistribution, and a written justification for **each placement** — with
the placement test stated first, so the decisions are auditable rather than
deferential.

## The placement test

| If the capability is… | It belongs in |
|---|---|
| Needed by every user of that type, permanently | **Profile** |
| One coherent job function, and useful on its own | **Permission set** |
| Required to apply *and* must fail together — especially where one capability must exclude another | **Permission set group** |

## The profile layer

One baseline profile, @@Vantage_Baseline@@:

| Object | Access | Reasoning |
|---|---|---|
| Account | Read | Every Vantage user has customers |
| Contact | Read | Identity resolution |
| Member__c | Read | Every internal role needs member context; **FLS carries the field boundary** |
| Claim__c, Consent_Record__c, Provider_Network__c, Access_Request__c | **None** | Role-specific; baseline must be minimal |

**The test result:** can you delete all profiles but this one without breaking
anything? Yes — and that is the finding, because it means the baseline is
genuinely a baseline.

## The permission set layer

| Permission set | Grants | Placement reason |
|---|---|---|
| Vantage_Claims_Handler | Read Member__c, Read/Edit Claim__c, Read Access_Request__c | One job function, useful standalone |
| Vantage_Field_Read | Read on the four objects field agents need | One job function, useful standalone |
| Vantage_Finance | Read/Edit Claim__c totals, Read Provider_Network__c, Tax ID | One job function |
| Vantage_Data_Steward | Edit Member__c, Edit Provider_Network__c | One job function |
| Vantage_Time_Off | Leave object access | A genuinely separate job function |

## The permission set group layer

| Group | Member sets | Why a group and not a permission set |
|---|---|---|
| Vantage_Claims_Handler_PSG | Claims handler + **no** Delete on clinical objects | Delete must never travel with the capability |
| Vantage_Underwriter | Broad member read + **no** Consent_Record__c | Underwriting and consent must never co-exist |
| Vantage_Reviewer | Reviewer read + **no** clinical notes + **no** underwriting | Two capabilities that must be excluded together |
| Vantage_Compliance_Auditor | Read all + View All on four objects + **no** Edit anywhere | Audit must never carry write capability |
| Vantage_Field_Agent | Field read + **no** Consent_Record__c + **no** clinical notes | The highest-value exclusion in the model |

## The four placements that are genuinely arguable

**Vantage_Claims_Handler is a group with no exclusion of its own.** It is a
group because the Delete exclusion lives with it, and because role changes must
be atomic. **Document that reasoning**, because a reviewer will otherwise ask
why a group with no capability-specific exclusion exists.

**Vantage_Time_Off stays outside every Vantage group.** It is a separate job
function and coupling it to a clinical role would mean a person on leave cannot
hold their clinical access — which is a data problem, not a security one.

**Consent_Record__c appears in no baseline profile and one capability set.**
Reviewers need it; field agents, adjusters and underwriters must not. That is
the requirement expressed as membership in exactly one group, which is the
cleanest possible answer.

**View All sits inside Vantage_Compliance_Auditor rather than in a standalone
set.** Because the group carries "no Edit anywhere", the intersection means a
user in the group cannot be granted Edit by any other member set. **Separating
them would reintroduce the risk the group exists to remove.**

## The conclusion to state

The three-layer model earns its keep because **each layer has one job**: the
profile supplies the floor, permission sets supply capabilities, and groups
supply the exclusions and the atomicity that neither of the other two can
express. Every placement decision above is one of those three questions, and
being able to answer "which layer is this?" for any permission is what makes
the model auditable.

`,

  /* ---------------------------------------------------------------- 11.3 --- */
  '11.3': tick`
## What a strong answer contains

Four questions answered decisively, including the two about **future** changes
— because those are the ones that separate a model that is documented from one
that is understood.

## Question 1 — can this user read Member__c.Clinical_Summary__c?

**No.** Vantage_Field_Agent contains Vantage_Field_Read, which does not grant
Read on that field, and Vantage_No_Clinical_Notes, whose restrict settings
withhold it. Intersection removes it.

**The verification that is not optional:** check every *other* permission set and
group the user holds for one that grants Read on the field. **Intersection
applies only within a group**, so an assignment outside the group restores
access through the cross-group union. This question cannot be answered from the
group definition alone.

## Question 2 — can this user edit Consent_Record__c?

**No.** Edit on Consent_Record__c is granted to no permission set in the model.
Even a group that granted it would need a matching exclusion, and the design
deliberately grants nothing to subtract from.

**The stronger statement worth making:** this answer is robust to assignment
error. Question 1 depends on no other set re-granting the field; question 2
depends on no set existing that grants it. **Designs are more robust when the
exclusion is "nothing grants it" than when the exclusion is "something withholds
it".**

## Question 3 — what happens if this user's role changes to Underwriter?

**Answering this correctly is the point of the exercise.**

| Step | Consequence |
|---|---|
| 1 | The permission set assignment rule on role stops matching them |
| 2 | **At their next session**, Vantage_Claims_Handler_PSG is unassigned |
| 3 | They lose Read/Edit on Claim__c — **and no recalculation is triggered** |
| 4 | The manual shares they hold persist, because manual shares survive role changes |
| 5 | Access they held through the role hierarchy changes at next login |
| 6 | Any Apex sharing they hold persists until the reconciler removes it |

**The three non-obvious consequences:**

- **Step 2 is not immediate.** Permission changes apply at next login or session
  refresh, so between the role change and the next login the user holds both
  the old and the new assignments. On API 67.0 with no declared mode this
  window is wider, and it is the reason role changes need a communication plan.
- **Step 3 triggers no recalculation**, which is why it is fast and why a wrongly
  granted capability takes effect instantly and org-wide.
- **Step 4 is the leak.** The declarative model corrects itself; manual shares
  and Apex grants do not. **The reconciliation job from Phase 7 is what closes
  step 4**, and it runs nightly, so the exposure window is up to 24 hours.

## Question 4 — what will this user have if their profile changes?

**Almost nothing, and that is deliberate.** Profiles in this model are minimal
baselines, so a profile change affects only tab visibility and the small set of
baseline object permissions.

**The honest caveat:** a profile change to a **different** baseline profile
would swap the baseline object permissions immediately, and permission sets
would re-union on top of the new profile at next login. So the answer is "little,
provided profiles stay minimal" — and the proviso is the real answer, because
**the profile is the one layer that is designed not to change.**

## The operational artefacts this implies

| Question a model must answer | Artefact that answers it |
|---|---|
| What does this user have now? | Effective permission export, per user |
| What happens on a role change? | Assignment rule definition + the session-refresh window |
| What happens on a profile change? | Profile minimality, plus the baseline permission list |
| What survives a role change? | The manual share and Apex grant report |

**A permission set group model that cannot answer these four questions is not
finished**, and the third one — about the future — is the one that gets skipped.

`,


  /* ---------------------------------------------------------------- 12.1 --- */
  '12.1': tick`
## What a strong answer contains

Three tiers, a matrix with a **reason in every cell**, and an explicit
statement about free-text fields — because that is the residual risk no
permission addresses.

## The three tiers

| Tier | Meaning | Handling |
|---|---|---|
| **T1 — Public** | Non-sensitive business data | Read for all internal roles |
| **T2 — Restricted** | Sensitive or identifying; access by role | Named holder list; Field Audit Trail |
| **T3 — Evidence** | Legal or regulatory evidence; access by exception | Named holders; **audit on change**; never deleted |

## The classification

| Field | Tier | Reasoning |
|---|---|---|
| Member__c.First_Name__c, Last_Name__c | T1 | Identifying but routinely needed |
| Member__c.Phone__c, Address_Line1__c | T2 | Contact data, disclosure risk |
| Member__c.Date_Of_Birth__c | **T2** | Combined with a name, effectively identifying |
| Member__c.SSN_Last4__c | **T2** | Still PII; last four is not a safe subset |
| Member__c.Clinical_Summary__c | **T2** | PHI; narrative clinical content |
| Member__c.Notes__c | **T2** | PHI, free text — see the risk note below |
| Member__c.Status__c, Region__c | T1 | Operational |
| Consent_Record__c.Consent_Type__c | T1 | Needed to service the member |
| Consent_Record__c.Captured_At__c | T1 | Existence and timing, without content |
| Consent_Record__c.Evidence_Hash__c | **T3** | Tamper evidence |
| Consent_Record__c.Evidence_Payload__c | **T3** | The signed document |
| Claim__c.Total_Paid__c | T2 | Financial |
| Claim__c.Diagnosis_Code__c | **T2** | PHI |
| Claim__c.Status__c | T1 | Operational |
| Provider_Network__c.Tax_ID__c | T2 | Provider identifiers |
| Provider_Network__c.Specialty__c | T1 | Directory data |
| Access_Request__c.Decision_Notes__c | T2 | Internal, contains justification detail |

## The FLS matrix

R = Read, R/W = Read and Edit, — = no access.

| Role | SSN_Last4 | DOB | Clinical_Summary | Notes__c | Diagnosis | Total_Paid | Evidence_Payload | Tax_ID | Decision_Notes |
|---|---|---|---|---|---|---|---|---|---|
| Intake agent | — | — | — | — | — | — | — | — | R |
| Claims adjuster | — | — | — | — | **R** | **R/W** | — | — | R |
| Underwriter | — | — | — | — | R | R/W | — | — | R |
| Compliance auditor | **R** | **R** | **R** | R | **R** | R | **R** | R | **R** |
| Regional manager | — | — | — | — | R | R | — | — | R |
| Data steward | R/W | R/W | — | — | — | R | — | R/W | — |
| Field agent | — | — | **—** | **—** | — | — | — | — | R |
| Care team lead | R | R | **R/W** | **R/W** | R | — | — | — | R |
| Finance | — | — | — | — | — | **R/W** | — | **R/W** | — |
| Integration user | **R/W** | R/W | R/W | R/W | R/W | R/W | R/C | R/W | R/C |

## The reasons, per cell type

**The cell that matters most** is Field agent / Clinical_Summary = no access.
Reason: **field agents see claims, never evidence or clinical narrative.** This
is the single highest-value cell in the matrix, and it is enforced twice — by
the permission set group exclusion and by FLS.

**Compliance auditor = Read everywhere, Write nowhere.** Audit is read-only by
nature, and a role that can alter what it audits is not an audit.

**Data steward = R/W on identity fields, — on clinical.** Correcting a mistyped
date of birth is data stewardship; editing a clinical summary is clinical work.
The split is the requirement.

**Integration user = broad.** Justified by having no user context, and it is the
one row where "it needs everything" is defensible — provided it is a named
service identity and not a person.

## The free-text risk, stated explicitly

@@
Member__c.Notes__c and Claim__c.Notes__c accept any text from any role with
Edit. No field permission stops a field agent typing a clinical detail into a
field they can read. FLS controls the column, not the contents.
@@

**This is the residual risk to state in the assessment.** It requires a process
control — guidance, a validation rule, or structured fields replacing free text
— and no permission model can deliver it. Saying so is what distinguishes an
honest assessment from a reassuring one.

## Two more cells worth justifying

**SSN_Last4__c is not T3.** It is often treated as safe because it is only four
digits. It is not: combined with a name and a date of birth it is
identifying, and it is a common pretext for social engineering. T2 with
compliance and data steward access is the right call.

**Decision_Notes__c is T2 not T1.** Access request justifications contain
information about why someone needed access — which describes the member's
circumstances. Making it T1 would put it in the hands of every agent.

`,

  /* ---------------------------------------------------------------- 12.2 --- */
  '12.2': tick`
## What a strong answer contains

Four tests across four surfaces, each showing the **same data behaving
differently** depending on whether the control is a layout or FLS.

## The setup

- Member__c.SSN_Last4__c exists and is currently readable by a test user.
- A page layout for the test user's profile omits the field.
- Then FLS is changed to withhold Read.

## Test 1 — the UI

@@
-- With the field removed from the layout only
SELECT Id, First_Name__c FROM Member__c WHERE Id = :testMemberId;
-- SSN_Last4__c is RETURNED, because FLS still grants Read
@@

**The field does not appear on the screen, and the API returns it.** The
appearance of security with none of the substance.

## Test 2 — a report

@@
-- A standard report on Member__c including the field
SELECT SSN_Last4__c FROM Member__c WHERE Id = :testMemberId;
@@

**Reports honour FLS, not layouts.** So the field appears in the report even
though it is absent from the user's page. **The user discovers the data they
"could not see" by running a report** — and reports are the one thing every
user learns to do in their first week.

## Test 3 — an export

Same query, exported to CSV. The file contains the value. **It is now on the
user's filesystem**, in a location no permission set governs, and the export
happened inside a transaction the user was entitled to run.

## Test 4 — after FLS is applied

@@
-- With FLS withholding Read
SELECT Id, First_Name__c FROM Member__c WHERE Id = :testMemberId;
-- SSN_Last4__c is ABSENT from the result, not null — the field is not returned
@@

@@
-- Through a subquery, which bypasses FLS
SELECT Id, Member__r.SSN_Last4__c FROM Claim__c WHERE Id = :testClaimId;
-- the value is RETURNED under the relationship alias
@@

The second query is the finding that makes the exercise worth doing. **FLS on
Member__c does not apply to a subquery from Claim__c**, so the value arrives
under a different field name and a code review looking for
"Member__c.SSN_Last4__c" will not find it.

## The results table

| Surface | Layout hides it? | FLS hides it? |
|---|---|---|
| Lightning detail page | **Yes** | Yes |
| Lightning list view | Yes | Yes |
| Standard report | **No** | Yes |
| Report export | **No** | Yes |
| REST / SOAP API | **No** | Yes |
| Apex, system mode | **No** | **No** |
| Apex, user mode | No | Yes |
| SOQL subquery from another object | **No** | **No** |

## The three conclusions

**1. A layout is a display preference.** It controls one surface for one user.
It is not an access control and must never appear in a security design as one.

**2. FLS is the control, and it is the only declarative one.** It applies to
every surface — UI, reports, exports and API — for the running user. That
breadth is exactly what makes it the right tool.

**3. FLS has one hole, and it is the one to test for.** **FLS is not applied to
subquery field access.** So the audit question is not "who can read this field"
but **"which queries read this field through a relationship"** — and that is a
code search, not a configuration review.

## The practical control set

1. FLS as the control, with layouts aligned to it so the UI does not mislead.
2. Never select a restricted field through a relationship. Audit by searching the codebase for the field name **and for its derived uses**.
3. Declare user mode on the Apex that serves it, so FLS applies in code too.
4. If a value must not be visible at all, delete the field rather than hiding it — **a field that does not exist cannot leak through a subquery.**

`,

  /* ---------------------------------------------------------------- 12.3 --- */
  '12.3': tick`
## What a strong answer contains

A systematic sweep rather than a targeted search, because **the leaks are
derived fields nobody suspected** — and then a deliberate decision per field.

## The sweep

### Step 1 — enumerate every derived field

@@
SELECT TableName, Name, Formula, Type
FROM   EntityParticle
WHERE  DataType IN ('Formula', 'Summary')   -- formulas and roll-ups
AND    TableName IN ('Member__c','Claim__c','Consent_Record__c','Provider_Network__c');
@@

@@
-- and the layout of what they reference
SELECT TableName, Name, Formula
FROM   EntityParticle
WHERE  TableName = 'Member__c'
AND    Formula LIKE '%SSN_Last4__c%';
@@

### Step 2 — classify each leak by what it reveals

| Leak type | Mechanism | Example |
|---|---|---|
| **Direct reproduction** | Formula copying a restricted value | @@SSN_Display__c = LEFT(SSN_Last4__c, 2) + '**'@@ |
| **Derived indicator** | Boolean derived from a restricted value | @@Has_Clinical_Note__c = LEN(Clinical_Summary__c) > 0@@ |
| **Aggregation** | Roll-up over restricted child records | @@Consent_Count__c = COUNT(Consent_Record__c)@@ |
| **Concatenation** | Restricted value embedded in a larger string | @@Display_Name__c = First_Name__c + ' (' + Member_ID__c + ')'@@ |
| **Cross-object reference** | Formula reaching a restricted field on another object | @@Last_Claim_Amount__c = Claim__c.Total_Paid__c@@ |

## The deliberate decisions

### Keep — Has_Clinical_Note__c (derived indicator)

**Decision: keep, and grant it deliberately.**

It reveals that a clinical note exists and nothing about its content. That is
the same information a field agent legitimately needs — "there is something
here, escalate" — without the PHI. **This is the one leak that is a feature**,
and keeping it is a better design than removing it, because the alternative is
the field agent not knowing to escalate.

### Keep — Consent_Count__c (aggregation, roll-up)

**Decision: keep.** A roll-up summary inherits the security of the **child**
records, so with Consent_Record__c Private and Apex sharing, this roll-up is
only readable by users who could read the children. **Roll-ups are structurally
safer than formulas on the same data**, and this is the field to point at when
someone asks which mechanism to prefer.

### Remove — SSN_Display__c (direct reproduction)

**Decision: remove.** A masked SSN that reveals the first two digits is a
partial disclosure that helps an attacker and helps nobody operationally. There
is no operational requirement that needs "SS**", because anyone who needs to
verify identity has a different, auditable process.

### Rewrite — Member_ID__c concatenated into Display_Name__c

**Decision: rewrite.** The concatenation exists for UI convenience. It creates
a second copy of the identifier in a field that will be indexed, reported and
exported, and it will appear in list views nobody reviewed. **The convenience
should be delivered in the presentation layer, not by duplicating the value
into a second field.**

### Restrict — Last_Claim_Amount__c (cross-object reference)

**Decision: restrict to finance and claims.** It is a legitimate business field;
it is simply sensitive, and the restriction is an FLS entry rather than a design
change.

## The structural finding to report

Four of the seven leaks existed **because someone wanted a field on a page**,
and the field they created copied data that was already on the record. So the
data now exists in two places, and the second place has its own permission set,
its own report exposure, and its own history.

> **The rule that prevents this class of finding.** Do not create a field to
> display a value that already exists. Use a dynamic component, an output
> binding, or a field that references the original without copying it. Every
> duplicated field is a field that must be classified, protected and audited
> independently — for no benefit.

## The one to check on every schema

**A formula field's value is computed regardless of permissions and is stored
in the database.** FLS on the *source* field does not hide a formula that
references it — FLS on the formula field hides the formula field, but the value
is still there for anyone who can read it through a report or a subquery. This
is the leak that has produced real disclosure incidents, and it is the reason
"is the source field restricted?" is not a sufficient question.

`,

  /* ---------------------------------------------------------------- 13.1 --- */
  '13.1': tick`
## What a strong answer contains

For each field: the **threat**, the encryption decision with its reason, the
access control, and the compromise where encryption and searchability conflict.

## The threat model, stated first

| Threat | Control that addresses it |
|---|---|
| A user with Read sees the value | **FLS** |
| A user reaches the record at all | **Record-level sharing** |
| The org's data is stolen, or read from a backup | **Encryption** |
| Someone alters the value without attribution | **Field Audit Trail** |
| The data is copied off-platform | **Export and report policy** |
| It must not be deleted, or must be deleted | **Retention** |

> **Encryption answers the third row and nothing else.** It does not stop a user
> with Read from seeing a decrypted value, and treating it as an access control
> is the single most common error in a sensitive-data design.

## The field decisions

| Field | Encrypt? | Access | Reasoning |
|---|---|---|---|
| Member__c.SSN_Last4__c | **No** | T2 — compliance, data steward | **Matching on it is required.** Encrypted values are not searchable, so encryption breaks the requirement |
| Member__c.Date_Of_Birth__c | **No** | T2 | Must be filterable for eligibility logic |
| Member__c.Clinical_Summary__c | **Conditional** | T2 — care team only | Encrypt **only if** it need not be queried. If a quality-of-care report must group by condition, do not encrypt; add a non-encrypted categorised field instead |
| Member__c.Notes__c | **No** | T2 — care team only | Free text. Encryption of unstructured text buys little and costs searchability on every field |
| Member__c.Phone__c, Address_Line1__c | No | T2 | Contact data; FLS is the control |
| Consent_Record__c.Evidence_Hash__c | **No** | T3 — compliance | Must be computable and comparable |
| Consent_Record__c.Evidence_Payload__c | **Conditional** | T3 — compliance | Encrypt if retrievable-but-not-queried. **Store externally with a reference if the blob is large** |
| Consent_Record__c.Captured_At__c | No | T1 | Existence and timing are not sensitive |
| Claim__c.Total_Paid__c | **No** | T2 — finance, claims | Must be summed in reports; encryption would prevent aggregation |
| Claim__c.Diagnosis_Code__c | **Conditional** | T2 — care team, claims | Same conditional as the clinical summary |
| Provider_Network__c.Tax_ID__c | No | T2 — finance | Directory reference data |

## The three conditional decisions, resolved

**Clinical_Summary__c and Diagnosis_Code__c.** Encryption is chosen only if no
filter, report or formula references them. Where a quality-of-care requirement
needs grouping by condition, the design is: encrypt the narrative, add a
non-encrypted @@Primary_Condition_Category__c picklist for reporting. **The
narrative is protected at rest; the category carries the reporting need; neither
is asked to do the other's job.**

**Evidence_Payload__c.** A scanned PDF is large, and encrypted fields are a poor
fit for binary content. The chosen design: the payload lives in external storage
with the Salesforce record holding a reference and the hash. **That record is
then the only thing to protect**, which is a smaller and more auditable surface.

## The threat each control actually answers

| Field | Threat 1: user with Read | Threat 3: theft at rest |
|---|---|---|
| SSN_Last4__c | FLS on the field, named groups only, audit on change | **Unencrypted — accepted risk.** Mitigated by export policy and the field-level filtering report |
| Clinical_Summary__c | FLS to the care team; field agent excluded at group level | Platform Encryption if not queried |
| Evidence_Payload__c | **No access outside compliance**; external storage | Platform Encryption at rest in the external store |
| Claim__c.Total_Paid__c | FLS to finance and claims | Unencrypted; protected by export policy |

## The accepted risk to state explicitly

> SSN_Last4__c, Date_Of_Birth__c and Claim__c.Total_Paid__c are **not
> encrypted**, because encryption would make them non-searchable and the
> business requires filtering and aggregation on all three. The accepted risk is
> that a wholesale theft of org data or a backup exposes these values in
> plaintext. This is mitigated by export and report policy, by restricting
> backup access, and by the field-level filtering report that establishes who
> could read each field. **Recording this as an accepted risk, with its
> mitigation and its owner, is more defensible than encrypting and breaking a
> requirement.**

## The design point

Three of the ten fields are encrypted, and **the encryption is not doing the
security work** — FLS and record-level sharing are. Encryption is a second line
that protects a different threat, and a design review should be able to say
which threat each control addresses. A design where encryption is the only
control for a readable field has an unaddressed threat.

`,

  /* ---------------------------------------------------------------- 13.2 --- */
  '13.2': tick`
## What a strong answer contains

Four residual risks, each with a **severity, an owner and a review date** —
and, critically, no control presented as more than it is.

## The four residual risks

### 1. Free-text fields bypass every structural control

**Severity: High.**

Member__c.Notes__c and Claim__c.Notes__c accept arbitrary text from any role
with Edit. A field agent with no access to Clinical_Summary__c can type clinical
detail into Notes__c, and it becomes readable by every role with Read on that
member.

**Why no control fixes it.** FLS controls the column. Sharing rules control the
row. **Nothing controls the contents.** No declarative mechanism inspects what a
user typed.

**Mitigations, partial by nature:**

- Guidance and training on what may be entered
- A validation rule rejecting obvious patterns — a weak control that is
  trivially circumvented, and its presence should not create false confidence
- **Structured fields replacing free text** for anything that must be controlled
- DLP or masking tooling applied at the platform level, which is the only
  approach that examines content

**Owner:** Clinical governance. **Review:** annually, or on the first
structured-field change.

### 2. Formula fields reproduce restricted values

**Severity: High, and under-appreciated.**

A formula field's value is computed and stored regardless of permissions.
Restricting the source field does not hide a formula that references it — FLS
on the formula hides the formula field, but the value remains available through
reports and subqueries on other objects.

**Mitigations:**

- A schema review of every formula field against the classification, at each
  release
- Automated detection of new formula fields referencing restricted fields,
  wired into the deployment pipeline
- Removal of any formula whose only purpose is display convenience

**Owner:** Data governance. **Review:** each release.

### 3. Exported and subscribed data leaves the access model

**Severity: Medium-High, and growing.**

A report export is a file on a filesystem. A scheduled report is an email
attachment. Neither is governed by FLS, sharing rules, or any org-side control
after it is generated.

**Mitigations:**

- Restrict report subscription to personas that need it
- Prefer an in-org dashboard over a scheduled email
- Restrict which reports may include restricted fields
- Data loss prevention on the mail boundary, which is outside the org and must
  be stated as such

**Owner:** Security. **Review:** semi-annually, with the report inventory.

### 4. Sandbox copies of sensitive data

**Severity: Medium.**

Full and developer sandboxes contain production data. If the access model is
not deployed there, or encryption is not configured there, the sandbox is an
uncontrolled copy.

**Mitigations:**

- Inventory every sandbox and its org ID, and include it in the access model
- Deploy the same permission sets, groups and encryption to every sandbox
- A defined refresh schedule — capacity discipline is also data-minimisation
  discipline
- Restrict sandbox access to a named list

**Owner:** Release management. **Review:** per refresh.

## What this section must not contain

The temptation in a residual-risk section is to write a list of controls and
imply the risk is closed. Three specific overstatements to avoid:

| Do not write | Write instead |
|---|---|
| "Clinical data is protected by FLS" | "Clinical data is protected from roles without field Read. It is **not** protected from a role with Read typing clinical content into a free-text field" |
| "Access is logged" | "Field **changes** are logged for 10 years. Field **reads** are not logged by any org-side capability" |
| "Encryption protects sensitive data" | "Encryption protects data at rest and in backups. It does not affect what a user with Read sees" |

## The section in one paragraph, for comparison

> Four residual risks remain. The most significant is that free-text fields
> cannot be structurally controlled, which no permission model can address;
> mitigation is procedural and partial, and this is accepted with clinical
> governance ownership. Second, formula fields may reproduce restricted values
> and are subject to schema review rather than automated prevention. Third,
> exported and subscribed reports create copies outside the access model, and
> the controls available are organisational rather than technical. Fourth,
> sandbox environments hold production data and require the same access model
> as production. **Each risk has a named owner and a review date, and none is
> closed.**

## The last sentence is the point

A residual-risk section that claims everything is mitigated has not been written
honestly, and it will not survive the first incident. **The purpose of the
section is to be believed when something goes wrong**, which requires it to be
accurate about what does not work.

`,

  /* ---------------------------------------------------------------- 13.3 --- */
  '13.3': tick`
## What a strong answer contains

Three sources of evidence, what each **can and cannot** prove, and a scoping
proposal with a cost — because the answer to "how would you evidence who read
sensitive data" is constrained by what the platform does not record.

## The uncomfortable starting point

**There is no native audit of field reads.** The platform records changes
(field history, audit trail) and it records record access in some
configurations. It does not record that a user displayed a value.

So the question has to be decomposed into three answerable parts:

| Question | Can the org answer it? |
|---|---|
| Who **could** have read this field? | **Yes** — field-level filtering report |
| Who **changed** this field? | **Yes** — Field Audit Trail |
| Who **did** read this field? | **No, natively** — requires Event Monitoring or a partner product |

## Evidence source 1 — the field-level filtering report

@@
-- Conceptually: users with Read on the field during the period
-- Produced from the Setup report, not a query
Field:   Member__c.SSN_Last4__c
Window:  2026-07-01 to 2026-09-30
@@

**Proves:** who held Read during the period.

**Does not prove:** that they read anything, that they had record access to any
member, or that they accessed it through a **relationship query** — which FLS
does not govern.

**The caveat that must accompany every use of this report:**

> This is a capability report. It identifies users who were **permitted** to
> read the field, not users who read it, and it is blind to record-level
> sharing. A user listed here may have had access to no member records at all.

**Scope:** free, generated on demand, and appropriate for quarterly
attestation.

## Evidence source 2 — Field Audit Trail

**Proves:** every change to the field for 10 years — who, when, old value, new
value.

**Does not prove:** any read.

**For consent evidence specifically**, this is the strongest evidence available
and it is genuinely strong: with the hash computed at capture and tracked by
audit, you can demonstrate the stored evidence has not been altered since
signature. That is the property a consent record exists to provide.

**Cost:** a licence, per user or org-wide. At 1,200 agents this is a budget
decision, and the scoping decision is to put audit on **restricted and
confidential fields**, not on all fields.

## Evidence source 3 — Event Monitoring (the only read evidence)

@@
-- Transaction Security / Event Monitoring policies
--   on Login, Logout, and the API event types
--   for users holding access to Member__c and Consent_Record__c
@@

**Proves:** that a user **queried** the object. Combined with field-level
filtering, it narrows to "this user queried this object during a window in which
they had Read on this field".

**Does not prove:** which field was returned, or that the user read the value
rather than the record metadata.

**The honest characterisation:** this is **access evidence, not field-read
evidence**. It is the closest available approximation, and the gap should be
stated rather than glossed.

**Cost:** an add-on, usage-based, so it scales with volume. Scope it to the
sensitive objects and the personas that handle them — **an org-wide
Event Monitoring policy on 2.4M member records is not affordable and would
produce more data than anyone would review.**

## The scoped proposal

| Evidence | Scope | Cost | Cadence |
|---|---|---|---|
| Field-level filtering report | Every restricted and evidence field | Free | Quarterly, with manager attestation |
| Field Audit Trail | Restricted and evidence fields, on the personas that change them | Licensed | Continuous, 10-year retention |
| Event Monitoring | Consent_Record__c and Member__c, compliance and service personas only | Add-on, usage-based | Continuous |
| Report subscription inventory | All restricted-field reports | Free | Semi-annually |

## The three gaps to state

1. **No field-read evidence exists.** Everything above is capability, change, or object access. **The residual gap is acknowledged, not papered over.**
2. **Relationship queries are invisible** to FLS-based reporting. The only mitigation is the code audit in Phase 12 — a query sweep, not a configuration report.
3. **Exports are invisible** to all three. A report exported to CSV leaves no org-side trace beyond the report run itself.

## The sentence to give the auditor

> The platform does not record field reads. We therefore evidence **capability
> by field-level filtering report**, **change by Field Audit Trail**, and
> **object access by Event Monitoring**, scoped to the sensitive objects and
> the personas that handle them. The gap between those three and actual field
> reads is a known limitation of the platform, and we compensate with export
> policy, code review of relationship queries, and least-privilege field
> permissions that make the permissioned population small.

That answer is acceptable to an auditor **because it is accurate**. The
unacceptable answer is the one that claims to know who read what.

`,

  /* ---------------------------------------------------------------- 14.1 --- */
  '14.1': tick`
## What a strong answer contains

An **inventory by declared mode**, a risk register where each system-mode
instance is either justified or remediated, and the finding that anonymous Apex
is the highest-risk category in any codebase.

## The inventory method

@@
-- 1. Every class and its declaration
SELECT Name, NamespacePrefix, WithoutSharing, WithSharing
FROM   ApexClass
ORDER BY NamespacePrefix, Name;
@@

@@
-- 2. Every trigger, since triggers are system mode by default
SELECT Name, TableEnumId, IsBeforeInsert
FROM   ApexTrigger;
@@

@@
-- 3. Every SOQL that declares or inherits a mode
SELECT Id, Query FROM ApexCodeBody
WHERE Query LIKE '%WITH USER_MODE%' OR Query LIKE '%WITH SECURITY_ENFORCED%';
@@

@@
-- 4. Classes with no explicit declaration — the ones that change meaning at 67.0
SELECT Id, Name FROM ApexClass
WHERE WithoutSharing = false AND WithSharing = false;
@@

Query 4 is the most important, because **those classes change behaviour when the
API version moves** and nothing else in the inventory reveals them.

## The classification table

| Category | Count | Risk | Action |
|---|---|---|---|
| @@WITH USER_MODE@@ | 12 | Low | None |
| @@with sharing@@ | 8 | **Medium** — FLS not enforced | Convert to user mode |
| @@without sharing@@ | **5** | **High** — system mode by accident | Remediate |
| No declaration, @@sourceApiVersion@@ < 67.0 | 14 | **High** — becomes user mode at 67.0 | Declare explicitly |
| Triggers | 22 | **High** — system mode by design | Per-trigger justification |
| Anonymous Apex | unknown | **Critical** — no inventory exists | Establish the practice |

## The three system-mode justifications that are acceptable

| Class | Justification | Required comment |
|---|---|---|
| @@NightlyClaimReconciler@@ | Full-dataset recomputation; no user exists | "Trusted internal batch. Runs as the scheduled user. Reads all claims." |
| @@IntegrationSyncHandler@@ | No user context; syncs from the external system | "Named integration user. System mode required for records the user cannot see." |
| @@AuditTrailWriter@@ | Logging must not fail because the user lacks create | "System mode: audit records are written regardless of the acting user's permissions." |

**Each justification names why there is no user.** That is the test, and a class
that says "needed to make it work" has not passed it.

## The findings that must go in the register

### F1 — five @@without sharing@@ classes with no stated reason

**Severity: High.** @@without sharing@@ is the legacy way of arriving in system
mode, and it reads as deliberate when it is usually an omission.

**Action:** convert to @@WITH SYSTEM_MODE@@ where the justification holds, and to
@@WITH USER_MODE@@ where it does not. The conversion itself is a useful test —
**a class that breaks under user mode was relying on access it could not justify.**

### F2 — fourteen undeclared classes

**Severity: High, and time-limited.** They run in system mode today and will run
in user mode at 67.0.

**Action:** declare each one's intended mode **before** the API version moves.
Declaring now is free; declaring during the migration is an incident.

### F3 — twenty-two triggers with no mode justification

**Severity: Medium-High.** Triggers are system mode by default, which means
every trigger is a place where FLS is not enforced and nobody decided that.

**Action:** per trigger, one of: declare the handler's mode, or add a comment
explaining that system mode is required and why. **An unexamined trigger is the
most likely location of a real FLS bypass in a typical codebase**, because
triggers run on records the acting user may not be able to read.

### F4 — anonymous Apex as an untracked access path

**Severity: Critical, and structural.**

Anonymous Apex runs in system context. It appears in the Developer Console, in
debug logs, and in the setup audit trail — but it is not part of the codebase,
so **no review process covers it**.

**Action:**

1. Enable Apex script tracking and name every script by convention.
2. Prohibit anonymous Apex in production and state the enforcement method.
3. **Make the Developer Console test context explicit**: a test passing in the
   console is not evidence, because the console and the deployed code run in
   different modes under 67.0.

### F5 — subquery field access

**Severity: Medium-High.** Not a mode issue, but found by the same sweep.

@@
-- Searches for restricted fields reached through a relationship
SELECT Id, Query FROM ApexCodeBody
WHERE Query LIKE '%Member__r.SSN_Last4__c%'
OR    Query LIKE '%__r.Clinical_Summary__c%';
@@

**Action:** remove the fields from the queries, or declare user mode. **This is
a code search rather than a configuration review**, which is why it is missed.

## The register format

| ID | Class or surface | Current mode | Intended mode | Justification | Action | Severity | Owner |
|---|---|---|---|---|---|---|---|
| F1 | @@LegacySyncService@@ | without sharing | SYSTEM | No user context | Add explicit keyword | High | Platform |
| F2 | @@ClaimAggregator@@ | undeclared | SYSTEM | Full-dataset roll-up | Declare | High | Platform |
| F3 | @@ClaimTriggerHandler@@ | trigger, SYSTEM | SYSTEM | Trigger must write regardless | Document | Medium | Platform |
| F4 | Anonymous Apex | system | — | Untracked | Policy + tracking | Critical | Security |
| F5 | @@MemberSummaryQuery@@ | system | USER | Serves a user | Add @@WITH USER_MODE@@ | Medium-High | Platform |

## The finding to report upward

> Five classes reach system mode without a stated reason, fourteen change
> behaviour at API 67.0 without being touched, twenty-two triggers enforce no
> FLS by default, and anonymous Apex provides an access path outside the
> codebase entirely. **The aggregate finding is that the org has no inventory of
> its own code's execution modes**, which means it cannot currently answer "what
> can this code see?" — and that question is answerable only after this exercise.

That last sentence is what makes the exercise worth the effort: **the
deliverable is the ability to answer the question**, not the list.

`,

  /* ---------------------------------------------------------------- 14.2 --- */
  '14.2': tick`
## What a strong answer contains

One class migrated, the **specific workflows that broke**, and a decision per
breakage rather than a blanket revert.

## The migration

@@
- public without sharing class ClaimSummaryService {
+ public with sharing class ClaimSummaryService {

      public static List<Claim__c> totalsFor(Set<Id> memberIds) {
          return [
              SELECT Member__c, SUM(Total_Paid__c) total
              FROM   Claim__c
              WHERE  Member__c IN :memberIds
              GROUP BY Member__c
          ];
      }
  }
@@

**Two changes, both required.** The class is user mode, and the query declares
@@WITH USER_MODE@@ as well — belt and braces, because the query can be copied
into another class and the declaration is what travels with it.

## What breaks, and why each case is different

### Breakage 1 — a scheduled job calling it

**Symptom:** the nightly reconciliation stops with
@@System.QueryException: Insufficient access@@ on the schedulable.

**Cause:** the scheduler runs it in a context that cannot read all claims. The
method was called from system mode code and inherited that leniency through the
call.

**Decision:** **declare the caller @@WITH SYSTEM_MODE@@**, not the service. The
service serves users; the job does not. **Making the service system mode to
satisfy one caller would remove the protection for every user-facing caller.**

### Breakage 2 — a user with no Read on Claim__c

**Symptom:** the LWC renders an empty list with no error.

**Cause:** user mode filtered the rows. This is user mode **working correctly**,
surfacing as a UI bug.

**Decision:** fix the **UI** to say "restricted by your permissions" rather than
"no data". **This is the silent-failure case, and reverting the class would
have hidden a real user-visible defect.**

### Breakage 3 — an Apex class reading a restricted field through a subquery

**Symptom:** a value that used to appear is now null, with no exception.

**Cause:** a related object's field read is filtered.

**Decision:** decide per field. If the user should not see it, **remove the
field from the query** rather than exempting the class. If they should see it,
add the FLS permission — because the requirement was never written down.

### Breakage 4 — a bulk operation exceeding limits

**Symptom:** @@Too many query rows@@ or a governor limit in the batch.

**Cause:** system mode previously returned the full unfiltered set; user mode
reduced it. Or the reverse — user mode applied sharing filters that changed
query planning.

**Decision:** batch the query. This is a genuine performance consequence of
user mode and it is permanent, not transitional.

### Breakage 5 — an integration handler with no user context

**Symptom:** the integration writes fail.

**Cause:** no user exists, so user mode cannot resolve permissions.

**Decision:** @@WITH SYSTEM_MODE@@ on the handler, with the comment naming the
integration user as the reason. **This is the legitimate case, and the migration
is what documents it.**

## The catalogue

| # | Symptom | Real cause | Decision |
|---|---|---|---|
| 1 | Scheduled job throws | Caller relied on inherited leniency | Declare the **caller** system mode |
| 2 | Empty list, no error | User mode filtering — working as intended | Fix the UI message |
| 3 | Null field value | Subquery FLS | Remove the field, or grant FLS deliberately |
| 4 | Governor limits | Filtered or unfiltered result size changed | Batch; permanent cost |
| 5 | Integration failures | No user context | @@WITH SYSTEM_MODE@@ with a stated reason |

## The two findings worth reporting

**1. Every breakage is a dependency on undocumented leniency.** Not one of the
five was a bug in user mode. All five were **behaviour the codebase relied on
without having decided to**. That is the strongest argument for the migration
that has just been completed.

**2. Breakage 2 is the dangerous class, and it is silent.** Four of the five
produced an error, a null, or a limit. One produced **an empty result that looks
exactly like no data** — and if it had been left as an unnoticed UI regression,
the access restriction would have been "fixed" by someone adding a permission.

## The rule to adopt

> **Fix the caller, not the callee.** A class that serves users stays in user
> mode. Trusted internal contexts declare themselves system mode, at the point
> where the trust originates. Every @@WITH SYSTEM_MODE@@ therefore sits next to the
> business reason it exists, and no user-facing path is weakened to satisfy a
> batch job.

`,

  /* ---------------------------------------------------------------- 14.3 --- */
  '14.3': tick`
## What a strong answer contains

The wave plan with **sequencing driven by dependency and blast radius**, and
user impact stated per step — because an access change wave fails on
communication far more often than on technology.

## The capability set being adopted

| Capability | What it does | Adopted? |
|---|---|---|
| **User Access Policies** | Restrict which profiles or permission sets may hold a permission | **Yes** — for the sensitive field permissions |
| **Profile Filtering** | Scope permission set group assignments by profile | **Conditional** — see the trigger |
| **Guest user FLS** | Enforce field permissions on guest-user surfaces | **Yes** — the anonymous case |
| **Field masking** | Hide a value from specific personas, leaving the field present | **Conditional** — two use cases |
| **User mode by default at 67.0** | Undeclared Apex enforces the access model | **Yes** |

## The sequenced wave

### Step 1 — declare every class's mode, deploy nothing else

**Why first:** it is free, it changes no behaviour, and it removes the
67.0 time bomb. Nothing else can be reasoned about while fourteen classes have
undeclared modes.

**User impact:** none.

### Step 2 — Profile Permissions baseline export

**Why second:** the evidence for every later claim that nothing broke.

**User impact:** none.

### Step 3 — User Access Policies on the sensitive fields

Which permissions may be held by whom: Read on Member__c.SSN_Last4__c,
Read on Clinical_Summary__c, Read on Consent_Record__c.Evidence_Payload__c.

**Why third:** it is additive-restrictive and testable, and it stops the next
permission assignment from re-granting a field that a group currently excludes.

**User impact:** any user found holding one of these permissions outside the
named groups is **notified before enforcement**. Enforcing without notification
produces a support incident, and a support incident produces an emergency
permission assignment, which defeats the control.

### Step 4 — Guest user FLS on the public site

The anonymous guest user has no Read on Member__c. Field masking makes this
presentable where a service agent needs to see that a consent exists.

**Why fourth:** the anonymous exposure is the highest-severity finding, and it
is a small, contained change with a clear before and after.

**User impact:** none for internal users. The partner portal's field behaviour
changes, and partner communications lead.

### Step 5 — profile filtering, if the trigger has been met

**Adopted only when** all supervisors in the Senior Analyst role are on one
profile, **or** the group count exceeds 12. Until then the permission set group
intersection enforces the exclusion.

**Why late and conditional:** it introduces a second attribute into every access
review, and the current mechanism works. **Adopting it before the trigger would
replace an auditable mechanism with a less obvious one for no functional gain.**

### Step 6 — field masking on the two named cases

A service agent sees that a consent record exists and its capture date, without
the evidence payload. A read-only reviewer sees a masked member identifier.

**Why last:** it is a refinement on top of FLS, so it is only meaningful once
FLS is correct.

**User impact:** two UI changes, both announced.

## The user impact statement, per step

| Step | Who is affected | What they see | Communication |
|---|---|---|---|
| 1 | Developers | Nothing | Internal note |
| 2 | Nobody | Nothing | None |
| 3 | Users holding sensitive-field permissions outside the named groups | **Loss of access** | Two weeks notice, named contact, then enforcement |
| 4 | Partner portal users | Field visibility change | Partner notification, in advance |
| 5 | Supervisors | Exclusion behaviour | Only if the trigger fired |
| 6 | Service agents, reviewers | Masked values | Release notes |

## The dependencies, stated

- Step 3 depends on step 1, because a policy enforced against code that runs in
  system mode protects nothing.
- Step 6 depends on step 3, because masking a field that FLS already removes is
  a no-op.
- Step 5 depends on nothing, which is why it is conditional rather than
  sequenced — **it is waiting on a decision, not on a predecessor.**

## The two things that will go wrong, and the plan for each

**Emergency permission assignments.** A user reports loss of access during step
3, and someone assigns a broad permission set to fix it quickly. **Mitigation:**
a named escalation path with a 24-hour SLA, and a standing rule that an
emergency grant carries a 30-day expiry recorded in the decision log.

**Verification done too early.** Someone verifies at step 3, finds an issue,
fixes it, and declares the wave complete. **Mitigation:** the verification
matrix from Phase 16 runs at every step, not once at the end.

## The deliverable to state

A sequenced plan in which **each step is independent, reversible, and has a
named user impact**. That is what lets the wave proceed under pressure — because
the question "can we stop here?" has an answer at every point, and a plan that
must be finished in one go cannot be stopped at all.

`,

  /* ---------------------------------------------------------------- 15.1 --- */
  '15.1': tick`
## What a strong answer contains

The **measurement that distinguishes volume from skew**, the structural fix,
and the numbers that justify it. The distinction is the exercise; the fix
follows from it.

## Step 1 — establish the volume baseline

@@
SELECT COUNT() total, COUNT_DISTINCT OwnerId) owners,
       COUNT_DISTINCT Region__c) regions
FROM   Member__c;
@@

| Metric | Value |
|---|---|
| Records | 2,400,000 |
| Distinct owners | 4,000 |
| Distinct regions | 12 |
| Records per owner, mean | 600 |
| **Records per owner, maximum** | **40,000 — Grand Central** |

**67x skew ratio.** That single number is the diagnosis.

## Step 2 — establish the skew evidence

@@
-- The distribution, not the mean. This is the query that finds skew.
SELECT OwnerId, COUNT(Id) AS memberCount
FROM   Member__c
GROUP BY OwnerId
ORDER BY memberCount DESC
LIMIT 20;
@@

| Owner | Members | Share of estate |
|---|---|---|
| Grand Central team | 40,000 | 1.7% |
| Northeast field team | 8,200 | 0.3% |
| Southeast field team | 7,900 | 0.3% |
| Remaining 3,997 owners | 2,343,900 | 97.7% |

**97.7% of records are unremarkable. 0.03% of owners hold 1.7% of the estate.**
Any aggregate metric would have hidden this.

## Step 3 — establish the symptom is skew, not volume

This is the discriminating test, and it is the part the exercise is really
about.

@@
-- Measure the skewed record and a normal one, separately
SELECT Id, Name FROM Member__c WHERE OwnerId = :grandCentralOwner LIMIT 1;
SELECT Id, Name FROM Member__c WHERE OwnerId = :normalOwner LIMIT 1;
@@

| Observation | If volume were the cause | If skew were the cause |
|---|---|---|
| Query time for one record, skewed owner | Slow | **Same as normal** |
| Save time for one record, skewed owner | Slow | **Same as normal** |
| Dashboard listing the owner's members | Slow | Slow — large result set |
| Page load for a normal user's member | Slow | **Fast** |

**The discriminating result:** single-record operations on the skewed owner are
the same speed as on a normal owner, while aggregate operations over the skewed
owner's records are slow. **That isolates the problem to read amplification over
a large record set owned by one principal, not to per-record cost.**

The second signature to look for is **row-lock contention on save**: two agents
editing records owned by the same principal queue behind each other, while two
agents editing records on different principals do not.

## The diagnosis

Not volume. Volume is 2.4M records with a mean of 600 per owner, which is
unremarkable. The problem is **one principal holding 40,000 records**, which
produces:

1. **Read amplification** — every dashboard and every hierarchy expansion over that owner scans 40,000 rows.
2. **Hierarchy expansion cost** — role-hierarchy access to a role containing that owner expands 40,000 records on every recalculation touching the subtree.
3. **Lock contention** — concurrent edits within one ownership domain serialise.
4. **A single recalculation trigger point** — any criteria change on records in that set recalculates 40,000 records at once.

## The structural fixes

### Fix 1 — decompose the ownership domain

**Split Grand Central into 40 owners of 1,000 records each**, organised by
service team or panel.

| Property | Before | After |
|---|---|---|
| Max records per owner | 40,000 | 1,000 |
| Records per hierarchy expansion, worst case | 40,000 | 1,000 |
| Lock contention domain | 40,000 records | 1,000 |

**Cost:** an ownership migration on 40,000 records, and a reporting change for
anyone who owned "all Grand Central members" as a single owner value. **It is
the highest-value change and it is not free**, and a design review that omits
the reporting cost is incomplete.

### Fix 2 — the skew indicator on the access queue

Independently of the ownership change, and applying to AccessRequest__c:

@@
Is_Assigned__c = TRUE   → set when assigned, FALSE when closed
@@

Dashboard queries become @@WHERE Is_Assigned__c = TRUE AND OwnerId = :UserInfo.getUserId()@@
— a small stable result set instead of a filtered scan of the whole queue.

**This reduces read pressure and adds a write per assignment change.** Stating
the trade honestly is part of the answer.

### Fix 3 — do not put criteria-based rules on Member__c

**This is the fix that makes the others sufficient.** At 2.4M records, any
criteria-based rule generates share rows across the object and recalculates on
criteria churn. Access comes from OWD Public Read Only, the role hierarchy, and
teams, with FLS carrying the field boundary. **None of those maintains per-record
state, so none of them is affected by skew or by volume.**

### Fix 4 — partition the reporting

Dashboards and reports that aggregate across the estate should query a
**summary object** maintained by a scheduled job, rather than aggregating
2.4M member records on demand.

## The recommendation

Fix 3 first, because it is a configuration change with no migration. Fix 1
alongside it, because it is the one that actually removes the contention. Fix 2
independently. **Fix 4 only if measurement shows the aggregate queries remain the
dominant cost after the first three.**

The sequencing matters: fix 3 alone reduces the recalculation load but leaves
the read amplification, and reporting only the first two as a complete answer is
the failure this exercise is designed to catch.

`,

  /* ---------------------------------------------------------------- 15.2 --- */
  '15.2': tick`
## What a strong answer contains

The ordering **by blast radius**, the reasoning that drives it, a rollback for
each step, and the rehearsal evidence.

## The ordering principle

**Lowest blast radius first.** The first change should be the one that, if it
goes wrong, affects the fewest people — so that the team learns the process on a
small change before attempting a large one.

| Step | Change | Objects affected | Blast radius | Recalculation |
|---|---|---|---|---|
| 1 | Provider_Network__c — add a stable-criteria rule | 12,000 | 12 field agents | Small |
| 2 | Claim__c — add the review rule, group target | 380,000 | 45 claims staff | Moderate |
| 3 | Member__c — remove the two region-based rules, replaced by roles | 2,400,000 | **All internal users** | **Large** |
| 4 | Member__c — OWD stays Public Read Only; confirm | 2,400,000 | All internal users | **Large** |
| 5 | Consent_Record__c — Apex sharing, phased by region | 1,000,000 | Compliance only | Moderate |

## The reasoning for the two hard steps

**Step 3 is the riskiest**, and the reasoning is what makes it defensible: two
region-based criteria-based rules on a 2.4M-record object are the single largest
source of recalculation in the org, and they are removable **only because region
is modelled on the user rather than on the member**. If region were a member
field, this step would not be available — and that is the data-modelling
correction from Phase 15 that must be stated.

The replacement is deployed **first**: roles and teams must grant the same access
before the rules are removed, or there is a window where members have neither.

**Step 5 is last because it introduces new code.** Apex sharing for consent
evidence is new logic, so it is deployed to one region, observed, and only then
extended. **Deploying new access code on the largest object in the org first
would be indefensible.**

## Rollback per step

| Step | Rollback | Cost of rollback | Time to restore |
|---|---|---|---|
| 1 | Delete the rule | Small recalculation | Minutes |
| 2 | Delete the rule | Moderate recalculation | Minutes |
| 3 | Re-deploy the two rules | **Large recalculation, and share rows return** | Hours to settle |
| 4 | Confirm — no change made | — | — |
| 5 | Disable the Apex trigger; revert to rule-based | Share rows replaced by rule rows | Hours |

**Step 3's rollback is the expensive one, and that is the honest reason it is
last.** A rollback that regenerates millions of share rows under time pressure
is a different incident from the one being recovered from.

## The rehearsal

Rehearsal is not a dress rehearsal in the full sense — it is **the same
sequence against production-shaped data in a sandbox, with the timings
measured**.

| Rehearsal step | Measured | Why |
|---|---|---|
| Deploy the role replacement, verify access unchanged | Diff count | Proves the replacement is equivalent before the cutover |
| Add rule 1, time the recalculation | Minutes | Calibrates the estimate for step 2 |
| Add rule 2, time the recalculation | Minutes | Confirms the cost scales with matching records |
| Remove the Member__c rules, time the recalculation | Hours | **This is the number the whole plan depends on** |
| Run the Apex sharing job on Consent_Record__c, time it | Minutes per region | Sizes the nightly window |

**The rehearsal's purpose is to replace the estimate with a measurement on
Step 3.** Every other step is small enough to reason about; that one is not, and
planning it on an estimate is how change waves overrun.

## The communication plan

| Audience | Message | Timing |
|---|---|---|
| All internal users | "Access to some member records is changing on date X; if you lose access you relied on, contact Y" | Two weeks before |
| Claims and compliance | "A new rule grants read on review claims; you may see records you did not previously see" | One week before |
| Field agents | "Member records remain available; clinical fields remain restricted" | One week before, to counter the assumption that Member__c is being restricted |
| Support | "Script for access-loss calls, with escalation path" | Two weeks before |

The third row matters: **step 3 removes access rules, not access**, and users
will assume the opposite. Correcting that assumption in advance prevents a
support spike that would have no cause.

## The go / no-go criteria

**Go** if the rehearsal Step 3 recalculation completed within the maintenance
window with 50% margin, and the effective permission diff showed zero
unintended differences.

**No-go** if the recalculation exceeded the window, or if the diff showed any
unintended change — and **no-go is not postponed, it is a re-plan**, because
the finding is that the estimate was wrong, and re-running the same plan
produces the same result.

## The residual risk to state

Rollback on step 3 is available and safe, but it is not fast: reinstating the
rules regenerates share rows across 2.4M records. **The rollback position must
therefore be communicated to the CISO as available-but-slow**, because a
30-minute rollback that takes six hours to settle is a different proposition
when a decision is being made under pressure.

`,

  /* ---------------------------------------------------------------- 15.3 --- */
  '15.3': tick`
## What a strong answer contains

The expensive mechanism, the reason it was chosen, the cheap replacement, and
the **proof that access is identical** — because "identical" is the part that is
hardest and the most important.

## The expensive mechanism

**Regional compliance reviewers need read on every Member__c belonging to their
region.**

Implemented as a criteria-based sharing rule:

@@
Object:   Member__c
Criteria: Region__c = 'Northeast'
Target:   Northeast Compliance Reviewers (public group)
Access:   Read Only
@@

**Why it was built this way:** region is on the member, so a criterion on the
member is the obvious expression, and the requirement is genuinely
attribute-based.

## The cost, quantified

| Item | Value |
|---|---|
| Member__c records | 2,400,000 |
| Northeast share of records | ~200,000 |
| Share rows per matching record | 1 |
| **Share rows generated** | **~200,000** |
| Records outside Northeast affected by any criteria change | 0 — but any change to the *rule* recalculates all 200,000 |
| Recalculation trigger | Every time a member's Region__c changes |

**The trigger is the real problem.** Region changes when a member moves, which
happens daily at this scale. Each change triggers a recalculation for that
record, in a rule whose target group has 40 members — and the aggregate load
across 200,000 records is sustained background work on the org's largest object.

## The cheap replacement

**Role hierarchy, because region is a property of the reviewer, not of the
member.**

| Step | Action |
|---|---|
| 1 | Confirm each reviewer is in exactly one regional review role. **If a reviewer covers two regions, this fails** — see below |
| 2 | Create the roles: Northeast Compliance Review, Southeast, and so on, under a Compliance Review Director |
| 3 | Enable Grant Access Using Hierarchies on Member__c — it is already enabled |
| 4 | Confirm ownership on Member__c follows the **field agent servicing team**, which maps to region |
| 5 | Delete the sharing rule |
| 6 | Verify identical access (below) |

**Why this is cheaper in every dimension:**

| | Rule | Role |
|---|---|---|
| Share rows | ~200,000 | **0** |
| Recalculation on region change | Yes, per record | **None** — the hierarchy maintains access structurally |
| Config change cost | Recalculates 200,000 records | **None** |
| Auditability | Criteria must be interpreted | Visible in the org chart |

## The multi-region reviewer problem — and the honest caveat

The replacement fails for a reviewer covering two regions, because a role
hierarchy grants access to what is **below** the role in the tree, and one person
cannot be in two sibling roles.

Two legitimate answers, and the choice must be made explicitly:

1. **Restructure so each reviewer covers one region.** Cleanest, and it is a
   business decision about how review work is allocated.
2. **Keep a rule for the multi-region reviewers only.** A small group, a small
   match set, and a quantified exception rather than an org-wide compromise.

**What must not happen** is discovering this during cutover. That check is step
1, and it is why the rehearsal exists.

## The proof of identical access

This is the part that decides whether the change is safe, and it cannot be done
by reasoning.

### Method 1 — the account-by-account comparison

For a sample of accounts, run this **twice**: once with the rule deployed, once
with it deleted, comparing the effective access set.

@@
-- Effective access for a given user, derived not assumed
-- Run with the rule present, capture; run with it deleted, capture; diff
SELECT Id FROM Member__c
WHERE Id IN (
    SELECT ParentId FROM Member__cShare
    WHERE UserId = :reviewerUserId OR UserId IN (
        SELECT UserId FROM GroupMember
        WHERE GroupId = :reviewerGroupId
    )
);
@@

@@
-- The authoritative comparison
SET DIFF = (records visible before) EXCEPT (records visible after)
SET DIFF2 = (records visible after) EXCEPT (records visible before)
-- both must be empty
@@

### Method 2 — the coverage proof

@@
-- Every member in the region must still be reachable by the role path
SELECT COUNT(Id) FROM Member__c
WHERE Region__c = 'Northeast'
AND   OwnerId IN (
    SELECT Id FROM User
    WHERE UserRoleId IN (
        SELECT Id FROM UserRole
        WHERE ParentId IN (
            SELECT ParentId FROM UserRole WHERE Name = 'Northeast Compliance Review'
        )
    )
);
-- must equal the total Northeast count
@@

### Method 3 — the empirical negative test

Log in as a Northeast reviewer and confirm they can see a Northeast member.
Then log in as a **Southeast** reviewer and confirm they **cannot** see that same
member.

**Method 3 is the one that catches an over-grant**, and it is the one people
skip because it is manual. A replacement that grants too much is a security
incident, and only a negative test finds it.

### The three-way result

| Check | Must be |
|---|---|
| Records lost by Northeast reviewers | **Zero** |
| Records gained by Northeast reviewers | **Zero** |
| Records visible to Southeast reviewers | **Zero change** |

**All three, not the first one.** Gaining access is a more serious finding than
losing it, and a replacement that grants too much is a security incident, not a
migration bug.

## The generalisable lesson

> **When a requirement is attribute-based on the record but positional on the
> person, the positional mechanism is usually cheaper and more robust.** The
> question to ask is not "can a rule express this?" — it can — but "does the
> criterion describe the record or the person?" A criterion describing the
> **person** belongs in the role hierarchy, and moving it there removes the
> recalculation entirely.

That is the insight, and it applies to every rule in the org: **most criteria
describe the person, not the data.**

`,
  /* ---------------------------------------------------------------- 16.1 --- */
  '16.1': tick`
## What a strong answer contains

The matrix itself, at persona-by-record-class granularity, and then the part
that matters more: **the negative cases executed rather than reasoned.** A
matrix of what people *should* reach is a design document. A matrix of what
they *actually* reach, with the failures recorded, is evidence.

## The personas

Fifteen in total, and the count is the first thing to get right because an
incomplete persona list is the most common way a verification pass reports
zero findings on an org that has real ones.

| # | Persona | Notes |
|---|---|---|
| 1 | Intake agent | Creates members and claims; least access of any internal role |
| 2 | Claims adjuster | The volume role - 1,200 users, so every finding here is 1,200 findings |
| 3 | Underwriter | Must **not** see consent evidence; the Phase 11 exclusion set |
| 4 | Claims reviewer | Second opinion on escalated claims; must not see underwriting fields |
| 5 | Regional manager | Oversees a region; the role hierarchy and teams carry this |
| 6 | Compliance auditor | Reads broadly across consent and access requests; edits almost nothing |
| 7 | Privacy office | Works escalated access requests; the only role with write on @@Access_Request__c |
| 8 | Care coordinator | Access follows the care relationship, not the claims relationship |
| 9 | Member (external) | Own records only |
| 10 | Broker (external) | The members of the employer they represent |
| 11 | Provider (external) | Own network entry only |
| 12 | Anonymous (external) | Public directory; no person context |
| 13 | Partner admin (external) | All accounts under one parent account |
| 14 | Support agent impersonating a member | The impersonation path, which is its own persona with its own risk |
| 15 | Integration identity | Not a person; must be tested like one |

## The matrix, and the shape of each row

The useful structure is **persona by record class**, where record class means
the intersection of object and the attribute that actually scopes the record -
because access in this org is never "all Claims", it is always "Claims where
@@Region__c = Northeast" or "Claims owned by my reports".

For each cell, three columns, and the third is the one candidates omit:

| Should reach | Should not reach | Actually reaches |
|---|---|---|
| The design's positive statement | The design's negative statement | The executed result |

## The test count, accepted rather than sampled

Fourteen personas, five custom objects, and within each object roughly three to
five record classes worth testing - the owned record, the hierarchical record,
the rule-matched record, the rule-unmatched record, and the record that belongs
to a sibling branch.

- 14 x 5 objects x 4 record classes = **280 record-level cases**
- Restricted-field cases: 14 personas x ~6 restricted fields = **84**
- Escalation routes: the exercise asks for three per persona, so 14 x 3 = **42
  routes**, and each route re-tests the same negative cases through a different
  door.

**642 cases.** The number is the finding. Most teams propose sampling; the
correct response is to accept the count, automate it, and let the machine run
the matrix. The estimate itself is what proves you understood the shape of the
design - if your count is 80, you have tested four personas and extrapolated.

## The escalation routes, and why they differ from the obvious one

| Route | What it proves that the UI does not |
|---|---|
| **REST API** | Whether FLS and sharing are enforced outside the UI, and whether a page-layout assumption is being carried by a component |
| **Report and export** | Whether the report's **run-as** identity differs from the viewer's, and whether export produces a copy nobody controls |
| **Alternate UI route** | Whether a second component, such as a Lightning page or a flow screen flow, fetches the same data differently |

The third route is the one teams skip and the one that finds real defects: the
same field, reachable from the record page and from a related list or a flow
screen, can be governed by different permission logic.

## The findings, and why severity is not uniform

| Severity | Meaning | Example from this design |
|---|---|---|
| **Critical** | PHI or identity data reachable by an unintended persona | Field agent reads @@SSN_Last4__c via export |
| **High** | Restricted business data reachable, or an excluded persona not excluded | Underwriter reads consent evidence because a second permission set re-granted it |
| **Medium** | Access wider than intended, no sensitive data | Regional manager sees a neighbouring region's claims |
| **Low** | Correct data, wider route than needed | Anonymous user reaches provider names who should be hidden |

The mechanism column is the part that makes the findings list actionable.
Every finding should name **which layer failed**, because the layer determines
the fix and therefore the owner:

| Layer | Fix |
|---|---|
| Licence | Purchase, or change the requirement |
| Object permission | Permission set |
| Field permission | FLS, or a permission set group exclusion |
| Record sharing | Rule, team, Apex |
| Guest user scope | Guest permission set |
| Execution mode | The code declaration |

## What the exercise establishes

**Testing a security model is not testing whether it works; it is testing
whether it fails in exactly the ways you designed it to fail.** A suite with
only positive cases will pass against a completely broken model, because the
model does work - just for the wrong people. The negative and escalation cases
are the whole exercise, and the findings list is what turns them into change.

`,

  /* ---------------------------------------------------------------- 16.2 --- */
  '16.2': tick`
## What a strong answer contains

The persona-to-licence map, the integration identity in four parts, and - the
part that earns the marks - **at least one requirement you redesigned rather
than licensed.**

## The map

| Persona | Licence | Feature that drives it |
|---|---|---|
| Intake agent | Salesforce Platform | Custom objects, Lightning, Apex |
| Claims adjuster | Salesforce Platform | Custom objects, Apex, reports |
| Underwriter | Salesforce Platform | Same platform, different permission sets |
| Claims reviewer | Salesforce Platform | Same platform |
| Regional manager | Salesforce Platform | Same platform, plus dashboards |
| Compliance auditor | Salesforce Platform | Broad read; no feature uplift |
| Privacy office | Salesforce Platform | Same platform |
| Care coordinator | Salesforce Platform | Same platform |
| Member, broker, provider, partner admin | **External Identity / Experience Cloud**, consumption- or member-based | The site itself |
| Anonymous | **Experience Cloud guest**, member-based or consumption-based | The public site |
| Integration identity | **Salesforce Platform user plus an API entitlement**, and High Volume if the volume justifies it | Nightly batch, REST calls |

## The conflicts

| # | Conflict | Resolution |
|---|---|---|
| 1 | **Field Audit Trail on all of @@Claim__c for 1,200 agents** | Not a licensing failure but a cost failure. It is per-user, so the ask is a budget conversation. Phase 13 already scoped it to restricted fields for the personas that need attribution - adopt that, and cost it as a subset |
| 2 | **Compliance wants audit on every claim change** | This is the requirement to **redesign rather than purchase**. Attribution on 380k records x 1,200 users is bought to serve a repudiation question that only arises for a small fraction of fields. Keep audit on the restricted and confidential fields, and meet the rest of the requirement with change data capture on the fields where history is genuinely needed - which is a configuration cost, not a per-user licence |
| 3 | **Event Monitoring** on the consent and access-request surfaces | Usage-based, so it must be designed for rather than switched on. Scope the events narrowly, or accept a volume-driven bill |
| 4 | **Two full sandboxes plus a scratch org** | Consumes licences and refresh capacity. The design decision is a lifecycle: named owner, expiry date, and an explicit deletion date |
| 5 | **Change-wave testers** | 50 provisioned users from eight business units, for two weeks, on full licences. If deprovisioning is manual, the licences are consumed indefinitely. **Make deprovisioning part of the change record** |
| 6 | **The integration user needing broad access** | If the design currently assumes Modify All on @@Member__c to make the batch work, that is a design failure masquerading as a permission requirement. Scoped Edit plus a filter is sufficient, because a service identity does not need to see every record |

## The integration identity, in four parts

1. **Identity.** A named integration user, not an admin and not a shared
   account. Named so that its actions are attributable in a log, and licensed
   as a real user so it consumes a licence rather than hiding in a profile.
2. **Licence.** Salesforce Platform user, plus an API entitlement for the
   integration pattern in use. High Volume only if measured call volume
   justifies it - decide on the number, not on the fear.
3. **Permissions.** Scoped object CRUD and scoped field edit on exactly what the
   job writes. No @@View_All, no @@Modify_All. If a rule says the integration
   cannot do its job without broad access, the finding is a missing
   declarative mechanism, not a licence to escalate.
4. **Mode.** **@@WITH SYSTEM_MODE**, with a written justification: the nightly
   job has no user context, must reconcile records across the full dataset, and
   must not fail because the integration identity happens to lack read on a
   record it is fixing. The justification is what makes it auditable - an
   unjustified system mode is indistinguishable from a backdoor.

## The external model, and what it depends on

**Licensing basis.** Experience Cloud consumption-based or member-based, and
the choice depends on a fact about authentication rather than about volume:

- **Members-based** fits an experience where users **log in** and are
  individually identified.
- **Consumption-based** fits an experience where the flow is largely
  **anonymous or lightly authenticated**.

Vantage has both: 4,000 brokers who log in, and an unauthenticated public
site. So the licensing basis **depends on member authentication** - and the
dependency is sharp, because moving a site from consumption-based to
members-based changes what you pay without changing what users see.

That gives the practical rule: **the external model must be chosen with
licensing in view, not added afterwards.** Migrating a site after launch means
re-migrating users, re-pricing the estate, and re-verifying every persona,
because the licensing basis is part of the site's configuration.

## What the exercise establishes

**A permission you cannot licence is a permission you do not have**, and the
three gates are administered by three different teams in three different
places. The diagnostic skill - recognising whether a failure is a licence, a
permission, or a sharing problem from the *shape* of the failure - is what this
phase is for. A licence failure produces an error or an invisible feature; a
permissions failure produces a missing object; a sharing failure produces a
present object with no records in it.

`,

  /* ---------------------------------------------------------------- 16.3 --- */
  '16.3': tick`
## What a strong answer contains

A before, during and after diff with every difference classified, and runbook
additions that come from something you observed rather than something you
predicted. The classification is the deliverable; the runbook is the
by-product.

## The baseline, before anything changes

Export effective permissions per persona with **Profile Permissions**, and
capture the current answer to each matrix question as a pass or fail. Two
things about this that people get wrong:

- It must be taken **before** the first change, or the diff has nothing to
  compare against.
- It is per **user, per object, per field**. That is tractable. Verifying that
  nobody's *records* changed visibility is not tractable at 2.4M members, so
  permissions is the layer you can actually prove - which means it is the layer
  you must not skip.

Run the negative cases too, not just the positives. A baseline that records
only what works will show a diff that looks alarming and is actually the
negative cases starting to fail correctly.

## During recalculation: what you should predict, and what actually happens

This is the interesting part, because access is **correct in configuration and
wrong in state** for the duration.

| Predicted transitional behaviour | What it looks like in practice |
|---|---|
| Recently-updated records satisfy the new rule but rows not yet written | A user sees the change on some claims of a batch and not others |
| Removed grants linger as stale rows | A user retains access to a record they should have lost, **temporarily**, with no error |
| Role hierarchy moves propagate downward | A moved user keeps inherited access briefly, then loses it |
| Bulk group membership changes are slow to apply | A newly-added group member waits before seeing anything |

The unpredictable one, and the reason the exercise asks for observation: under
Spring '27 asynchronous recalculation, **every data change has a window**, not
just the ones that trigger a full recalculation. So the transitional state is
not a special phase of the wave - it is the normal operating condition of the
platform after the wave, and tests and integrations must be built for it with
poll-and-retry rather than a single assertion.

The safety consequence worth recording: during the window, **the failure is
inconsistency, not blanket denial.** That cuts both ways. Users lose access
they should keep, which generates tickets - and reviewers who assume "access
must have been removed" can be looking at an org where the opposite is true.

## After the change: the diff and its classification

| Difference | Classification | Reason |
|---|---|---|
| Field agents no longer read @@SSN_Last4__c | **Intended** | The permission set group exclusion now works; this was the design |
| A regional manager lost access to a neighbouring region | **Intended** | Restriction rule R7 is subtractive by design |
| Underwriter now reads consent evidence | **Defective** | A second permission set re-granted what the exclusion set removed - the cross-assignment re-grant problem |
| An integration batch throws @@QueryException on a record it cannot see | **Defective** | System-mode declaration missing on the reconciler |
| Anonymous users see fewer provider names | **Intended** | Guest field-level access control applied |
| Save latency on @@Member__c is up | **Intended, and monitored** | The cost of criteria-based access at 2.4M records, accepted knowingly |

Every difference gets one of two labels, and there is no third. "Probably
intended" is a bug in the review, not a category: if you cannot say which, you
have not finished investigating, and shipping it means shipping a question.

## Runbook additions, grounded in what was observed

These are the lines that would not exist in the runbook if the wave had been
reasoned about rather than watched.

1. **During any OWD or criteria change, treat access as non-deterministic for
   the duration.** Support script: if a user reports intermittent access to
   records they should see, check the recalculation queue depth before opening
   an access ticket. Observed: three "intermittent access" tickets during the
   @@Member__c window, all of which were queue depth, none of which were
   defects.
2. **Any scheduled job exception in the first week is a permission regression
   until proven otherwise.** Observed: the reconciler began failing silently
   on a schedule nobody watched, and surfaced three days later as a business
   complaint about stale data rather than as an error. Monitor scheduled job
   exceptions daily for the first fortnight, not on a dashboard nobody opens.
3. **After any permission change, the effective permission diff must be
   re-run at 30 days**, not only at deploy. Assignment rules and group
   membership drift, and drift is invisible until a diff finds it.
4. **Tests and integrations must poll with a timeout, never assert once.**
   This is now a standing requirement rather than a fix for a flaky test.
5. **Rollback of an OWD or rule change is itself a recalculation.** Plan for
   hours, not minutes, and do not rely on it as an incident response.
6. **Snapshot manual shares before any change that deletes them.** They are
   not recoverable without re-creation from your own records.

## What the exercise establishes

**The transitional state is a state you design for, not an incident you
investigate.** The three-phase diff is the honest picture of what a sharing
change does: it is not a switch, it is a sequence with a slow middle. An
architect who has watched a wave rather than planned one knows what the middle
looks like - and that knowledge is what makes the next wave routine.

`,

  /* ---------------------------------------------------------------- 17.1 --- */
  '17.1': tick`
## What a strong answer contains

The inventory with **read access, change access, and intentionality** for every
store. Three columns, because "who can read it" without "was that intended" is
half the work, and the secret findings are what the review is actually for.

## The inventory

| Store | Read | Change | Intentional? |
|---|---|---|---|
| **Custom metadata types** - integration endpoint config, field mappings, feature flags | Anyone with Viewer access to the type; visible to Apex by default | Deploy only - not user-editable | Mostly. The config is internal, but "no one edits it" is not "no one should see it" |
| **Protected custom metadata** - integration credentials | Users with the custom permission only | Deploy only | Yes, and this is where credentials belong - not in plain metadata |
| **Hierarchy custom setting** - approval thresholds by role | Generally readable; FLS applies | Users with edit on the hidden object | Yes |
| **Custom permissions** - "may view masked SSN" | Assigned users | Assignable via profile, permission set, PSG | Yes - this is the auditable entitlement record |
| **Files and Salesforce Files** | Per file: object permission plus explicit shares to users, groups, queues | Upload and delete per file | **Per file, and this is where it breaks** |
| **ContentVersion** | Anyone who can reach the file | Owner, or someone with delete on the file | Treated as the sensitive object, because it holds the payload |
| **Report and dashboard folders** | Folder membership | Folder owner | Yes, if membership is a named persona list |
| **Individual reports** | Report owner; anyone it is shared with; folder members | Owner | **Run-as is the finding** |
| **Dashboard components** | Dashboard viewer | Dashboard owner | Components honour FLS and sharing - but the dashboard aggregates |
| **Saved list views** | Owner; shared views expose a filtered scope to the sharer | Owner | A shared list view can reveal the existence of records in a scope the viewer should not perceive |
| **Big Objects** - @@Claim_History__BO | Object permission only - **no OWD, no rules, no custom sharing** | Object permission | Intentional, and code-enforced |
| **External Objects** | Object permission plus named credentials | Object permission | Yes |
| **Static resources** | Anyone who can fetch them | Deploy only | Any secret here is a finding |
| **Platform caches** | Cache and entry visibility | Cache admin | Ephemeral; low risk unless a long TTL holds PHI |

## The potentially sensitive stores

| Store | Why it is sensitive |
|---|---|
| Change Data Capture on @@Member__c | Old and new values of changed fields, in a surface the record's FLS does not govern. @@SSN_Last4__c is **explicitly excluded** from the capture set for exactly this reason |
| Platform event payloads | A copy outside the record model; the payload persists between publish and subscribe. No Vantage event carries a clinical or identity field |
| Files with no related record | Not protected by any record's sharing. A consent PDF in a library is visible to the file read population while the @@Consent_Record__c it belongs to is Private |
| Report subscriptions | A scheduled report is **a copy, delivered by email**, outside every control in the org |
| Exports | A copy with no further controls, honouring FLS and sharing for the running user at the moment of export |
| Big Object history | Seven years of claim status, no declarative sharing, reachable by object permission alone |
| List views | A shared view exposes a filtered scope, which leaks existence even when it leaks no data |

## The secret findings

Two, and both are the classic mistake - a secret placed where configuration
belongs.

1. **An API key in a plain custom metadata record.** Readable by anyone with
   metadata API access to the type, and committed to the repository in
   plaintext. **High severity**, because a repository is a much larger
   population than a Salesforce permission.
2. **A service credential in a static resource.** Static resources are fetched
   by URL; a credential there is a credential in a web-accessible location.

The correction for both is the same: **secrets belong in Named Credentials or
protected custom metadata**, and the *configuration describing* them - endpoint
paths, field names, feature flags - stays in ordinary metadata where it
belongs. The distinction is between a value that authorises access and a value
that describes where access goes.

## The run-as list

Every report shared beyond its owner, with the identity it runs as and what the
recipients' own access would have produced:

| Report | Runs as | Recipients' own access would give | Finding |
|---|---|---|---|
| Claims summary - regional | **Regional manager (viewer)** | The same | Correct - no finding |
| Claims summary - executive | **VP Claims** | Any regional manager sees one region only | **Finding** - a deliberate disclosure, so name it and accept it in writing |
| Consent audit | **Compliance auditor** | Privacy office sees escalated only | **Finding** - narrower owner than intended |
| Member 360 | **Service integration user** | Nobody internal sees this | **High** - runs with integration privileges and is shared to a folder |

The last row is the pattern worth naming: **a report inherits its owner's
access, and the owner is invisible to the recipients.** A report shared to a
folder is a deliberate grant of that owner's visibility, whether or not anyone
intended it.

## What the exercise establishes

**Access control has more surfaces than the record model, and the ones that are
not records are the ones nobody reviews.** Every store in this inventory needed
its own decision, and an audit that asks only about OWD, sharing rules and FLS
finds none of them. The inventory is the artifact; the cadence is what keeps it
true, because this surface changes every time someone adds a report.

`,

  /* ---------------------------------------------------------------- 17.2 --- */
  '17.2': tick`
## What a strong answer contains

Four justified choices, **inheritance stated for each** - that is the part the
exercise flags as the one people skip - an access model for the hidden object,
and an explicit answer about what happens when a user's profile or role
changes.

## The four choices

| Use | Visibility option | Inheritance - who else reads a value someone set |
|---|---|---|
| **Default queue per user** | **$USER Global** | **Nobody.** Only the user who set it reads their own value; everyone else reads the system default. This is genuine per-user preference |
| **Page size by role** | **$USER Profile** | **Every user on the same profile** reads the value that user set, whether or not they hold the same role. Two agents on one profile who do the same job get each other's setting |
| **Approval thresholds by role** | **$User Hierarchical** | **Reports of the setter, and anyone on the same profile in the same subtree.** The most inheritance of the four, and it flows **down the org chart** |
| **Global feature flag** | **System Default only** | **Everyone, always.** No user can set a value, so there is nothing to inherit and nothing to diverge |

## Why each, in one line

- **Default queue** is a preference with no organisational meaning, so
  inheriting it would be a bug - one user's queue choice silently changing
  another's.
- **Page size** genuinely varies by job function, and profile is the closest
  available approximation of job function. Note the approximation honestly: it
  also groups together users whose jobs differ.
- **Approval thresholds** follow authority, and authority follows the org chart,
  so hierarchical is the only option that tracks it.
- **Feature flag** is a single organisational decision. System Default only
  makes that structural rather than conventional.

## The inheritance trap in $User Hierarchical

Worth stating explicitly because it is a genuine information flow down the org
chart that nobody declared:

- A manager who sets a threshold is readable by **their reports**.
- A report who then sets their own value does **not** affect the manager - the
  flow is downward only.
- A user on the same profile and role **outside** the subtree does not read it.
- The practical hazard: a manager sets an aggressive threshold "for testing",
  and thirty agents inherit it. It is occasionally what you want and frequently
  a surprise, so it must be documented, not discovered.

## The access model for the underlying object

Custom settings are records of a **hidden custom object**, so the normal model
applies to them - including sharing rules and Apex managed sharing. This is
routinely forgotten, because the object is not visible in the object manager.

| Decision | Setting | Reason |
|---|---|---|
| Who can **read** the settings | Broad read via the permission set that carries the feature | Every user needs to read the value their page renders from; denying read breaks the feature rather than protecting it |
| Who can **edit** | Named personas only - the role that owns the configuration, per setting type | Edit access to a setting is as sensitive as the code that reads it, because changing the value changes behaviour for everyone |
| Is editing **scoped** | Yes where the setting is security-relevant | A security-relevant flag edited by anyone with broad edit is a global control anyone can turn off |
| OWD on the hidden object | Private, with the read population granted through the owning permission set | Matches the sensitivity of what it holds |

## What happens on a profile or role change

This is the operational question, and it has a different answer per option.

| Option | On profile change | On role change |
|---|---|---|
| $USER Global | **Nothing** - the value is bound to the user | **Nothing** - the value is bound to the user |
| $USER Profile | **The value can disappear.** The user's value was readable because of profile membership; change profile and the lookup resolves to a different value or to the default | **Nothing** - unless the profile also changes |
| $User Hierarchical | **The value can disappear** for the same reason | **The value can change** - moving the user into or out of the subtree changes what they inherit, in both directions |
| System Default only | **Nothing** | **Nothing** |

**Is that acceptable?** For all four, yes - with one condition attached, and
the condition is the real answer:

> A value that silently changes or vanishes when a user is reorganised is a
> support incident the day someone moves teams. So: **the design must not store
> a security-relevant decision in a setting whose visibility option is tied to
> profile or role membership.** Approval thresholds are the borderline case -
> acceptable, because the threshold is *supposed* to follow authority. Anything
> that is not supposed to follow authority belongs in $USER Global or in
> System Default only.

And a second condition, which is the one people forget: **changing a custom
setting does not change record access.** A setting is configuration read by
formulas and Apex; it can decide what to show, and it can be read by Apex that
grants sharing - but it is not an access rule, and it will not appear in any
record-level access review.

## What the exercise establishes

**The visibility option is an inheritance decision, not a storage decision.**
Choosing $USER Profile because "it is per role" silently also makes it per
profile; choosing $User Hierarchical because it tracks authority silently
creates a downward information flow. The option is only right once you can
answer "who else reads this value when someone sets it" - which is the question
the exercise is really asking.

`,

  /* ---------------------------------------------------------------- 17.3 --- */
  '17.3': tick`
## What a strong answer contains

The shared-report list with run-as identities, **at least one run-as difference
found**, every independently shared file assessed, and a review process with a
named owner and a cadence. A process without a name and a date is not a
process.

## The report and dashboard surface

| Report or dashboard | Shared via | Runs as | Recipients' own access | Finding |
|---|---|---|---|---|
| Claims summary - regional | Folder: Regional Reports | **The viewer** | Same | None - the correct design |
| Claims summary - executive | Folder: Executive Reports | **VP Claims** | One region each | **Difference found.** Deliberate: executives are not in the claim hierarchy, so a grant is required. Accept in writing, or add a team and run it as the viewer |
| Consent audit | Folder: Compliance Reports | **Compliance auditor** | Privacy office sees escalated only | **Difference found.** Over-broad: recipients can see all consent history, not the escalated subset |
| Member 360 | Folder: Shared Reference | **Service integration user** | No internal persona can see this | **High.** An integration identity's access, delivered to a folder, to recipients who cannot reproduce it |
| Provider network scorecard | Shared to 6 users directly | **VP Provider Operations** | A provider relations specialist sees their own network | **Difference found.** Narrow the sharing or accept it explicitly |
| Claims dashboard - NE | Folder: Regional Reports | **The viewer** | Same | None |

Three of the five are run-as differences, and that ratio is the point: **a
report shared to a folder is a grant of its owner's visibility**, delivered to
people who cannot reproduce it and who cannot see that it happened.

## Deciding each finding

| Finding | Decision | Reason |
|---|---|---|
| Executive claims summary runs as VP Claims | **Accept with a documented reason** | There is no mechanism that gives region-spanning claim visibility declaratively; running as the viewer would require sharing every claim to every executive |
| Consent audit runs as compliance auditor | **Change the run-as to the viewer, or narrow the report** | The recipients' own access is sufficient for the escalated subset they need |
| Member 360 runs as the integration identity | **Restrict the sharing, immediately** | Highest-value finding in the surface: it hands an integration user's reach to everyone with folder access. Move it to a named distribution list and re-scope the owner |
| Provider scorecard runs as a VP | **Restrict the sharing to a named group** | The requirement is provider-relations visibility, not org-wide leadership visibility |
| NE claims dashboard | **No change** | Runs as the viewer; correct by design |

Note the asymmetry in the remedies: **two are fixed by narrowing the sharing,
one by changing the run-as, and one is accepted.** The cheapest remedy is
usually to narrow who receives the report rather than to reduce what the owner
can see - the owner's access is usually load-bearing for something else.

## The file surface

| File | Shared independently of its parent | Content | Finding |
|---|---|---|---|
| Consent evidence PDF | **Yes** - shared to the Privacy Office queue | Consent evidence, binary | **High.** Must inherit @@Consent_Record__c access; remove the independent share |
| Member ID card scan | **Yes** - shared to a field agent group | Identity document images | **Critical.** A file carrying identity documents, shared to 1,200 agents, with none of the record's protections |
| Claim adjuster notes | No | Business notes | None - correctly inherited |
| Provider contract PDF | No | Contract | None |
| Training slide decks | Yes | None | Accept - no member data |
| Claim survey exports | **Yes** - static resource link | Member-reported detail | **High.** An export file is a copy with no further controls; it also sits in the repository |

The rule that prevents the first two: **every sensitive file has a related
record, and file access is reviewed as its own layer.** Two mechanisms enforce
it:

1. A **validation rule or flow** on ContentDocument that rejects an upload of a
   sensitive file type with no related record. This prevents the orphan at the
   point of creation, which is the only moment it is cheap to prevent.
2. A **scheduled review** of file shares that have no corresponding parent
   grant, because shares can also be added directly to a person or a queue
   later.

And the standing caution: **do not rely on the attachment relationship alone.**
A direct request by @@ContentVersion Id is evaluated against file permissions,
not against the related record's sharing rules, so the related list in the UI
respects the record while a direct URL does not.

## The review process

| Element | Definition |
|---|---|
| **Owner** | The security architect owns the model; a named operations role owns the recurring review. Not the same person, or the review does not happen |
| **Cadence** | **Quarterly** for the full sweep; **monthly** for the run-as diff alone, because that is cheap and it is where the findings actually come from |
| **Scope of the sweep** | Every report and dashboard shared beyond its owner; every file share independent of a parent record; every folder membership; every saved list view shared beyond its owner |
| **Method** | Export the list, compare run-as against the recipient population's own access, record each difference with a decision. The diff is the artifact |
| **Trigger for immediate review** | Four events: a new report folder; a change of report owner; any file share added outside the parent record; any guest user permission set change - because that one alters every external surface at once |
| **Output** | A findings list with severity, a decision per finding, and a re-test date. An open finding with no date is not a finding, it is a worry |

## What the exercise establishes

**Reports and files are copies, and copies leave the access model.** The report
itself is safe - it renders per the viewer's permissions - and the delivery is
not: a subscription is an email attachment, an export is a file, and an
independently shared file has no parent protection at all. The run-as identity
is the highest-yield single check in this entire domain, because it is cheap to
audit, invisible to the recipients, and regularly wrong.

`,

  /* ---------------------------------------------------------------- 18.1 --- */
  '18.1': tick`
## What a strong answer contains

Seven scoped changes in a defensible order, impact analysis with a remedy for
**every** break, a test plan and comms plan per change, and - the decision that
makes the plan credible - **an explicit statement of which change you would not
roll back and why.**

## The seven changes, scoped to Vantage

| # | Change | Objects | Personas | Code |
|---|---|---|---|---|
| C1 | Restriction rules deployed (R7) | @@Claim__c | Claims adjuster, Agency Adjuster role | None |
| C2 | FLS enforcement on restricted fields | @@Member__c, @@Claim__c | All internal; field agents most | Apex and reports referencing the fields |
| C3 | User Access Policies replacing direct assignment | All | All internal | None |
| C4 | Apex classes migrated to user mode | All | Integration, batch, agents | The largest code change |
| C5 | OWD tightening | @@Member__c | All internal | Apex sharing reconciliation |
| C6 | Guest field-level access control | External surfaces | All external personas | LWC components, guest Apex |
| C7 | Profile Filtering enforcement | Setup only | Every internal user | None |

## The order, by increasing blast radius and rollback difficulty

| Order | Change | Why here |
|---|---|---|
| 1 | **C1 Restriction rules** | Narrow, subtractive, testable, and fully reversible - restriction rules are configuration with no recalculation of anything else |
| 2 | **C2 FLS enforcement** | Reversible by editing a permission set, effective next session, no recalculation. Narrow enough to test exhaustively |
| 3 | **C3 User Access Policies** | Governance rather than access change: it makes the current assignments explicit without changing them |
| 4 | **C5 OWD tightening** | Triggers recalculation on 2.4M members. Hours of exposure. Must come after the cheap controls are proven |
| 5 | **C4 Apex user-mode migration** | Difficult to reverse cleanly - it is a code change across many classes, and reversing restores the leniency **and its risk** |
| 6 | **C6 Guest FLS** | Externally visible, so it needs its own verification matrix and a support path, and external users cannot be self-served |
| 7 | **C7 Profile Filtering enforcement** | Org-wide, affects everyone including executives, and the hardest to communicate precisely because the symptom is "a Setup menu item is missing" |

Two placements worth defending because they are counter-intuitive:

- **C4 after C5.** Migrating Apex to user mode before the OWD change means the
  code is already user-mode when the recalculation window opens, which is good -
  but it also means the window's failures surface as **code exceptions** rather
  than as access gaps, which is harder to diagnose. Doing the OWD change first,
  with the code unchanged, means the window's failures surface as the thing they
  actually are.
- **C7 last, always.** It is the only change in the wave whose symptom is a
  missing navigation item rather than a missing record, so it produces
  confusion rather than complaints, and confused users escalate to executives
  rather than to support.

## Impact analysis, per change

| Change | Entry points | Who reaches them | What breaks | Remedy |
|---|---|---|---|---|
| C1 | Claim record pages, list views, reports, Apex queries on @@Claim__c | Adjuster in Agency Adjuster role | **VIP claims become invisible** where the adjuster relied on a rule grant. Also: **any Apex sharing on @@Claim__c is untouched**, so if grants exist the control is incomplete | Named. The remedy is to state that R7 cannot subtract Apex grants, and to remove or reconcile them |
| C2 | Every Apex SOQL, every report, every LWC, formula and roll-up referencing the fields | All internal | Queries throw or return nulls; **reports fail with a message that points at the field, not at the permission** | Search the codebase for each restricted field name before deploying. Five minutes of work that prevents a failed deployment |
| C3 | Assignment rules, admin assignment UI | Admins and security team | Assignments outside a policy scope **still succeed** - policies do not prohibit | Named in the plan. State that the benefit is a governed path and a record of intent, not a technical boundary |
| C4 | Flows, scheduled jobs, batch chains, invocable actions, integration endpoints | Service identities, agents, the nightly batch | **Scheduled jobs lose access silently** and fail on a schedule nobody watches. Reports with @@View_All owners now respect sharing | Declared @@WITH SYSTEM_MODE with a written justification for trusted internal jobs; user mode for anything serving a user |
| C5 | Every query on @@Member__c | Everyone | Hours of inconsistent access; **stale grants linger** as well as missing ones | Pilot, one object, communicate, monitor the recalculation queue |
| C6 | External pages, LWC field visibility, guest Apex | All external personas | Pages lose fields; **external users cannot self-serve** | Support path published in advance; verify each persona empirically, not by reading the permission set |
| C7 | Setup navigation | Every internal user | Missing Setup features users relied on | Named. The features should come through a permission set, not a profile feature. **Do not disable the enforcement to restore navigation** |

## Test plan per change

Common to all seven, from the Phase 16 matrix:

1. **Regression of the code paths**, not only the access checks - enforcement
   changes behaviour, not just visibility.
2. **Transitional-state tests** during recalculation, so support knows what to
   expect rather than improvising.
3. **A deliberate break attempt.** If the test cannot break it, the test is not
   trying. For each change, name the specific thing you will try to break.

| Change | The deliberate break attempt |
|---|---|
| C1 | Try to reach a VIP claim as an Agency Adjuster through the API, a report, and a second LWC |
| C2 | Query the restricted field directly through REST as each persona |
| C3 | Assign a permission set outside the policy scope from the admin UI |
| C4 | Trigger the nightly batch and read its exception log the next morning |
| C5 | Query a record updated mid-recalculation and record what you get |
| C6 | Attempt the external denial for each of the six personas, then re-attempt via the API |
| C7 | As three users, try the Setup features they used and record exactly which fail |

## Comms plan per change

Four elements every time: **what and when**, **what you will no longer be able
to do, named specifically**, **what to do instead, with the exact path**, and
**who to contact**. Plus one rule: **remove any sentence that could be read as
vague.** "Enhanced security measures are being applied" is the failure mode.

The worked example, because it shows the standard the others must meet:

| Element | Content |
|---|---|
| **What and when** | On Friday 14 March, agent field agents will no longer be able to read @@SSN_Last4__c on member records |
| **What you lose** | The last four digits of the SSN field on the Member record. You will see that the field is populated, but not the value |
| **What to do instead** | If your work requires the last four digits, request the *View masked SSN* entitlement from the Privacy Office. Requests are approved within one business day and take effect at your next login |
| **Who to contact** | Privacy Office, queue *SSN Entitlement Requests*. For anything else, the Security Desk, ext. 4400 |
| **Before and after** | Before: the Member record showed @@SSN_Last4__c as a readable value. After: the field is visible but masked, and the entitlement request path is on the field's help text |

## The rollback position

| Change | Category | Rollback |
|---|---|---|
| C1 Restriction rules | Fully reversible | Delete the rule. No recalculation. Minutes |
| C2 FLS | Fully reversible | Edit the permission set. Next session. Minutes |
| C3 Policies | Fully reversible | Deactivate the policy. Assignments revert to direct |
| C5 OWD | **Another recalculation** | Hours, and it re-exposes the window. Do not rely on it as an incident response |
| C4 Apex modes | Reversible by redeploy | **But reversing restores the leniency, and its risk.** This is not a free rollback |
| C6 Guest FLS | Reversible | Revert the permission set. External users see the fields again |
| C7 Profile Filtering | Reversible | Disable enforcement. **Users may have built workarounds in the interim** |

**The change I would not roll back: C1, the restriction rules.**

Not because it is technically irreversible - it is the *most* reversible change
in the wave. It is because it is the change that **stops removing access from
people who should not have it.** The others protect against future misuse; this
one closes an active gap on VIP claims. Reverting it under pressure would
re-expose exactly the records the change was written to protect, and the
precedent - that enforcement changes get reverted when the noise starts - is
more expensive than the exposure.

The two categories that genuinely are not reversible, and therefore require a
snapshot rather than a plan:

- **Manual shares deleted as part of the wave.** Not recoverable without
  re-creation. **Snapshot the share rows before touching anything.**
- **Any change where a user could copy a value before it became masked.** The
  data has already left your control; rolling back does not bring it back. This
  asymmetry is the strongest argument for **masking before removing, rather than
  removing before masking.**

## What the exercise establishes

**You are not making a change, you are swapping an access model while people
are working.** Naming the one change you will not roll back - in advance, in
writing - is what stops a panic-driven rollback on day two, and it is the
difference between a wave that is planned and one that is merely survived.

`,

  /* ---------------------------------------------------------------- 18.2 --- */
  '18.2': tick`
## What a strong answer contains

A complete call graph as an artifact, **at least one path you did not expect**,
and an honest statement of what your manual analysis missed. The third item is
the one that earns the marks, because it is the only one that demonstrates you
actually traced it rather than reconstructed it from memory.

## The class chosen

**@@NightlyClaimReconciler**, the scheduled Apex that reconciles claim status
against the adjudication system. Chosen deliberately because it looks like a
simple internal job with no user-facing surface at all - which is exactly why it
is a good test of whether the impact analysis was real.

## The call graph

| # | Path | Calling identity | Mode before | Effect of enforcing user mode |
|---|---|---|---|---|
| 1 | **Scheduled execution** - @@NightlyClaimReconciler.execute(), declared @@Schedulable | The scheduler's running user - a service principal, not an end user | System by default | **No user context exists**, so user mode cannot serve the job. Must be declared @@WITH SYSTEM_MODE with a justification |
| 2 | **Batch chaining** - the class instantiates @@ClaimStatusBatch, which calls the reconciler logic | The same service identity, inherited through the batch | System | Same as above; the justification must cover the chain, not just the entry class |
| 3 | **Flow entry criterion** - a flow on @@Claim__c calls the reconciler's invocable method to reconcile on demand | The **user** who triggered the flow | System today; user mode under enforcement | **The surprising one.** A user-initiated path into a class justified as "trusted internal batch" - so a blanket system-mode declaration would grant a user-triggered operation full privilege |
| 4 | **Integration endpoint** - an Apex REST resource calls the same reconciler to force a reconcile | The integration identity, or the **integration user configured on the site** | System | If the integration user lacks access to the records being reconciled, the endpoint starts failing |
| 5 | **Invocable action** - exposed to Lightning, so any user with the action can call it | The invoking user | System | **The high-severity path.** A user-triggered action that currently bypasses every sharing rule |
| 6 | **Report refresh** - a scheduled report refresh triggers a flow, whose entry criteria call the invocable method | The **report owner** | The owner's access | A scheduled refresh running with an owner's elevated access, reconciling records that owner should not reach |
| 7 | **Test context** — see below | - | - | - |

## The path I did not expect

**Path 5 and path 6 together.** The manual analysis found the scheduled job,
the batch, and the REST endpoint - the three paths that appear in the codebase
as callers. It missed that the reconciler's logic is **@@Invocable**, which
means:

- Any Lightning component exposing the action makes it reachable by any user
  with access to that component, with no admin involvement.
- A **scheduled dashboard refresh** can trigger a flow that calls it, which
  means the reconcile runs on a schedule, as the dashboard owner, over records
  that owner has no business reconciling.

Neither is visible from reading the class. Both are visible from reading the
**callers**, which is the entire point.

The honest statement of what the manual analysis missed:

> The original impact analysis enumerated entry points by looking for callers of
> the class. That found three of the seven. It missed the invocable action
> because invocable methods are called **by the platform**, not by code, so
> there is no call site to grep for. It missed the scheduled report refresh for
> the same reason - the caller is a configuration record, not source. **A call
> graph built by grepping for callers is not a call graph; it is a list of the
> paths someone remembered to write down.**

## The artifact

Produced as a table rather than a diagram, because a diagram is not reviewable
and a table diffs:

| Class or trigger | Calls | Called by | Caller type | Identity | Mode to declare | Severity if wrong |
|---|---|---|---|---|---|---|
| @@NightlyClaimReconciler | - | Scheduler | Platform | Service identity | SYSTEM (justified) | Batch fails nightly |
| @@NightlyClaimReconciler | @@ClaimStatusBatch | Batch chain | Code | Service identity | SYSTEM (inherited) | Silent partial runs |
| @@ClaimStatusBatch | Reconciler logic | Flow entry criterion | **Config + platform** | End user | USER or SYSTEM per justification | **User-triggered escalation** |
| Reconciler @@Invocable | - | Lightning component | **Config** | End user | USER | **High** |
| Reconciler logic | - | Scheduled dashboard refresh | **Config** | Report owner | USER | **Medium-high** |
| Reconciler logic | - | Apex REST resource | Code + config | Integration identity | SYSTEM (justified) | Integration fails |

The three rows marked as configuration callers are the ones that make the
artifact worth building: they are the paths a source-level review cannot find.

## The remedy, and the tool question

| Path | Remedy |
|---|---|
| Scheduled execution and batch chain | **@@WITH SYSTEM_MODE**, justified: no user context exists, and the job must reconcile across the full dataset |
| Flow entry criterion | **Split the class.** The user-facing entry point declares user mode and calls the shared logic; the scheduled entry point declares system mode. One class cannot be both |
| Invocable action | **@@WITH USER_MODE**, or remove the invocable annotation entirely - which is better, because the user-facing need is "reconcile my claims", not "reconcile anything" |
| Integration endpoint | SYSTEM, justified: the integration reconciles from the external system, not from a user session |
| Scheduled report refresh | Change the report to run as the viewer, or remove the flow call from the refresh path |

**Where static analysis earns its place.** This graph had seven paths and a
grep found three. At seven paths the manual approach fails and the cost is a
remediation discovered in production. At 200 paths it fails badly. So: for any
enforcement change touching a class with more than a handful of callers, **run
static analysis to enumerate the graph, then review the configuration callers
by hand** - because the tool finds the code paths and cannot find the
configuration ones, which is precisely where the risk is.

## What the exercise establishes

**Impact analysis done properly means enumerating entry points, not
remembering them.** The indirect paths - through flows, through invocable
methods, through scheduled report refreshes - are where enforcement changes
break production, and they are invisible to anyone reading the class rather than
its callers.

`,

  /* ---------------------------------------------------------------- 18.3 --- */
  '18.3': tick`
## What a strong answer contains

A communication a reader **outside the project** can act on without asking a
question, a rollback position covering every change, a snapshot list, and no
ambiguity in either document. The test is the reader, and the reader is not an
architect.

## The communication

**Change:** agent field agents can no longer read @@SSN_Last4__c on member
records. **Date:** Friday 14 March, 18:00 UTC. **Prepared by:** Security
Architecture. **Questions:** Security Desk, ext. 4400.

### 1. What is changing and when

From 18:00 UTC on Friday 14 March, field agents will no longer be able to read
the last four digits of a member's SSN on the Member record. Nothing else about
the Member record changes. No records are deleted. No other field is affected.

### 2. What you will no longer be able to do

You will no longer be able to read the value of @@SSN_Last4__c on any member
record. The field will still appear on the page - you will see that it is
populated, but the value will be masked.

**Specifically, this means:**

- You cannot confirm identity from the Member record.
- You cannot use the last four digits in a phone call to verify a member.
- Any list view, report or export you built that includes this field will show
  the masked value or will fail.

That last bullet is the one people discover late, so it is stated first in
practice.

### 3. What to do instead

If your work requires the last four digits:

1. Open the Member record.
2. Select **Request SSN Entitlement** from the action menu. The request opens
   pre-populated with the member reference.
3. Submit it. Privacy Office approves within one business day.
4. The entitlement takes effect at your **next login**, not immediately -
   log out and back in.

No email, no ticket, no approval email chain. The button is the path.

### 4. Who to contact

- **Entitlement questions:** Privacy Office, queue *SSN Entitlement Requests*.
- **Anything else, including "a report I built is now empty":** Security Desk,
  ext. 4400, 09:00-18:00 UTC weekdays.

### Before and after

| | Before 13 March | After 14 March |
|---|---|---|
| @@SSN_Last4__c on the Member page | Readable value | Visible, masked |
| Report including the field | Returns values | Returns masked values, or errors |
| Verifying identity by phone | Possible from the record | **Not possible** - use the entitlement |
| Identity document on file | Attached to the member record | Unchanged |
| Field agent's other Member fields | Readable | **Unchanged** |

Two sentences removed from the draft, because either could be read as vague:
*"Additional security controls are being applied to protect member data"* - which
tells the reader nothing about what they lose, and is why it generates tickets
rather than cooperation.

## The rollback position, by reversibility category

| Category | Changes | Rollback | What it costs |
|---|---|---|---|
| **Fully reversible** | C1 restriction rules, C2 FLS, C3 policies, C7 Profile Filtering | Delete the rule; edit the permission set; deactivate the policy; disable enforcement. Minutes to one session. No recalculation | Nothing structural. These are the safe things to change first |
| **Reversible at a cost** | C5 OWD tightening, C4 Apex mode declarations, C6 guest FLS | OWD rollback is **another recalculation** - hours, and it re-exposes the window. C4 rollback is a redeploy that **restores the leniency and its risk**. C6 restores external visibility of fields | Each rollback is a second change wave with its own comms and its own window |
| **Not reversible in practice** | Deleted manual shares; any value a user copied before masking | Manual shares need re-creation **from your own records**. Copied data is gone from your control and rollback does not bring it back | Irreversible. Must be prevented by snapshotting and by masking before removing |

**The change I would not roll back: C1, the restriction rules on @@Claim__c.**
It is the most reversible change in the wave, and it is the one that closes an
active gap on VIP claims. Rolling it back under pressure re-exposes exactly the
records it was written to protect, and - more damaging - it teaches the
organisation that enforcement changes get reverted when the noise starts.

## The snapshot list

| What to snapshot | When | Why | How |
|---|---|---|---|
| **All manual share rows** on the objects in the wave | **Before** any change | Not recoverable without re-creation | SOQL export of the share object, stored outside the org with the change record |
| The **effective permission export** per persona | Before C2, C3, C7 | The only valid diff baseline | Profile Permissions export, per user per object per field |
| The **current role tree** | Before C5 | Role changes are silent losses of implicit access | Roles export |
| The **guest user permission set** | Before C6 | The external surface changes wholesale | Metadata retrieval of the permission set |
| **Field-level audit reports** for restricted fields | Before C2 and after | Evidence that attribution survived | Shield field audit report, retained |
| **Recalculation characteristics** per object | Before C5 | To recognise normal behaviour during the window | Documented baseline timings |
| **Any data users can copy before masking** | Before C2 | **Irreversibly** - this is the one no snapshot fixes | Mask first, then remove |

## Testing both documents against a skeptical reader

Given to someone outside the project - a claims team lead, not a security
person. What they said, and what it changed:

| Their question | What it revealed | Fix |
|---|---|---|
| "Does the entitlement work on Friday night?" | The comms did not state that approval takes a business day | Added "within one business day" and the 09:00-18:00 window |
| "My report is now empty - who do I tell?" | Named, but the consequence was buried in a bullet | Promoted to its own line in section 2, and added the Security Desk number there too |
| "Can I see the full SSN if I need to?" | Not answered at all - the reader assumed the entitlement gave the full value | Added: "The entitlement gives read on the last four digits. It does not give read on the full SSN, which no agent role holds." |
| "What happens to my saved list views?" | Not mentioned | Added to section 2 |
| "Is any data being deleted?" | Not mentioned, and it was the reader's first fear | Added to section 1 |

That last exchange is the one worth internalising: **the reader's first
question was not about access at all.** It was about whether anything is being
lost. An enforcement communication that does not answer that leaves the reader
assuming the worst, and the assumption generates more noise than the change.

## What the exercise establishes

**An architect's deliverable is frequently a decision someone else makes,
supported by an analysis they could not have produced themselves.** Both
documents are written for a reader who will act on them once, under pressure,
without you - so the standard is not completeness, it is that every question
they would reasonably ask has an answer in the text.

`,

  /* ---------------------------------------------------------------- 19.1 --- */
  '19.1': tick`
## What a strong answer contains

Every change classified **with the three-question test shown**, the material
ones with effect, cost and action, and at least one identified piece of
removable Apex. The classification is the examinable skill; the rest is
application.

## The three-question test

1. **Does it change what a user can reach?**
2. **Does it change who enforces it** - configuration, or runtime?
3. **Does it change the operational cost of a change?**

Material, plan-worthy, or a reading item. Most changes answer yes to the second,
and that is the useful signal: **enforcement is moving from configuration into
the runtime.**

## The classification

| Change | Reaches? | Enforcer? | Cost? | Material to Vantage | Action |
|---|---|---|---|---|---|
| **Enhanced sharing configuration** (Winter '25) | Yes | Configuration | Recalculation if it changes access | **Yes** - some Apex workarounds are now declarative | **Plan for** - re-test the Apex, then delete |
| **User Access Policies** (Winter '25) | Indirectly | Configuration | None to deploy; governance overhead | **Yes** - the unattributed permission sets from exercise 10.3 are the migration worklist | **Plan for** |
| **Guest user licensing changes** (Winter '25 onwards) | Yes | Configuration | Licence cost | **Yes** - the external model choice | **Plan for** - decide before launch, not after |
| **Apex user mode by default** (Summer '26) | Yes | **Runtime** | Code change; silent job failures | **Yes, most material** | **Adopt now** |
| **Removal of @@WITH SECURITY_ENFORCED** (Summer '26) | No directly | **Runtime** | Code change to remove | **Yes** | **Adopt now** - it becomes a no-op that implies enforcement it does not provide |
| **More records per external sharing object** (Summer '26) | No | Configuration | Share row capacity only | **No** - Vantage's external volumes are not near the limit | **Monitor** |
| **Asynchronous sharing recalculation** (Spring '27) | No | **Runtime** | **Every data change gains a window** | **Yes** | **Adopt now** - poll-and-retry in tests and integrations |
| **Manual share retention toggle** (Winter '27) | No | Configuration | None | **Yes** - it is an answer to the Phase 8 problem | **Adopt now** |
| **Profile Filtering enforcement** (Winter '27) | Yes | **Runtime** | Org-wide comms | **Yes** | **Plan for** - last in the wave |
| **Guest FLS** (Winter '27) | Yes | **Runtime** | External verification | **Yes** | **Plan for** |
| **Field masking** (Winter '27) | Yes | **Runtime** | Per-user licence; irreversible copies | **Yes** | **Plan for** - mask before remove |

**Not material for Vantage, with the reason stated:** external account
hierarchy improvements (Vantage's external model is sharing-set based and does
not hit the limitation), and the release notes items that are convenience or UI
improvements. Saying "not material, because we do not use that surface" is a
full-credit answer. A paragraph about a feature you do not have is not.

## Effect, cost and action for the material set

| Change | Effect on the existing model | Operational cost of a future change | Action |
|---|---|---|---|
| **Apex user mode by default** | Undeclared code becomes **safer**; declared system-mode code becomes the audit list. The Phase 14 enforcement wave stops being a project and becomes a default | Code change only | **Adopt now** - declare every class explicitly, even where the keyword is redundant, so the list is the audit |
| **Removal of @@WITH SECURITY_ENFORCED** | Any surviving usage becomes misleading: it looks like enforcement and provides none after the version boundary. Findings written against it stop being valid | Code change to remove; review evidence must be rebuilt on user mode | **Adopt now** - remove it, and re-base the audit evidence on the mode declaration |
| **Async recalculation** | Access becomes **eventually consistent** as a permanent property, not a wave-time exception | Every test and integration needs poll-and-retry; support needs a runbook line for the window | **Adopt now** - build it into the design rather than discovering it in CI |
| **Manual share retention toggle** | Phase 8's long tail becomes a policy decision rather than an accumulation. A share granted "temporarily" can now actually expire | Choosing a retention period is a business decision about how long an exception is legitimate | **Adopt now** - set it deliberately and document the period |
| **Profile Filtering enforcement** | Setup access becomes enforced rather than navigational | Org-wide comms; support path | **Plan for** - last in the wave |
| **Guest FLS** | Field-level confidentiality becomes enforceable **including for external traffic**, which no previous mechanism covered | External verification matrix per persona | **Plan for** |
| **Field masking** | A value can be visible-but-hidden, and the entitlement becomes a named custom permission rather than a permission set's existence | Per-user licence; **values copied before masking are irreversibly gone** | **Plan for** - mask first |
| **Enhanced sharing configuration** | Requirements that needed Apex may now be declarative | Recalculation where access changes | **Plan for** - audit, then delete |
| **User Access Policies** | Intent becomes machine-readable; **the authoritative record of who should have access finally exists** | Governance, not deployment | **Plan for** |

## The removable Apex

Three pieces, and the estimate matters as much as the identification.

| Apex | Why it is now removable | Audit-surface reduction |
|---|---|---|
| **Criteria-driven grant on @@Claim__c status transitions** | The status transition logic was written as Apex because declarative criteria could not express "recently moved to this status from that one". Enhanced sharing configuration covers the current-state criteria case | **~180 lines**, plus one scheduled job and its exception surface |
| **Manual share lifecycle sweeper** | A nightly job that removed stale manual shares by querying and deleting. The retention toggle makes the platform do it | **~90 lines**, and - more valuable - **one nightly job that could silently fail is gone** |
| **Field masking shim LWC** | A component that hid restricted values client-side, which was never a control. Field masking makes it a real one | **~120 lines** of front end, and one false assurance removed |

The shim is the most interesting of the three, and worth naming explicitly:
**it was never a security control.** It hid a value in the browser, which any
API call bypasses. Deleting it does not reduce functionality - it removes a
control that was documented as protection and provided none. That is the most
under-appreciated security improvement available: removable code, and code that
was lying about what it did.

**Before deleting any of it, verify equivalence against your own data model** -
particularly the parts your Apex handled that no declarative criterion could
express, such as logic across related records or time-dependent grants. Then
delete. Do not delete first and discover the gap in production.

## What the exercise establishes

**The delta layer is a re-examination, not a rewrite.** Most of a roadmap is a
reading item, and a confident two-sentence "not material to Vantage, because we
do not use that surface" is worth more than an accurate paragraph about a
feature you do not have. What is worth designing around is the shape common to
all of it: **enforcement is moving out of configuration and into the runtime,
and ad-hoc workarounds are becoming the residual risk.**

`,

  /* ---------------------------------------------------------------- 19.2 --- */
  '19.2': tick`
## What a strong answer contains

An **action-led** permission specification with per-action justification, a
scoped identity, a stated consent enforcement mechanism, and both runtime
checks identified - with the second one located explicitly. The last item is
the one that distinguishes a real design.

## The action list, and the discipline of writing it first

Written from what the agent must *do*, not from what a high-privilege user
already has. This ordering is the whole exercise: start from permissions and
you end up copying privilege with no relationship to purpose.

| # | Action | Object | Permission required |
|---|---|---|---|
| A1 | Triage an inbound member query | @@Member__c | Read, restricted fields |
| A2 | Summarise a member's open claims | @@Claim__c | Read, excluding diagnosis fields |
| A3 | Propose a claim status change | @@Claim__c | Read |
| A4 | Read the member's consent state | @@Consent_Record__c | Read, **consent state only - not evidence** |
| A5 | Create an @@Access_Request__c when consent blocks an action | @@Access_Request__c | Create |
| A6 | Look up the provider for a claim | @@Provider_Network__c | Read |
| A7 | Escalate to a human | @@Access_Request__c | Create |
| A8 | Anything else | - | **Not granted** |

Note what is absent: no write on @@Claim__c (the agent *proposes*; a human
disposes), no write on @@Member__c, no read on consent **evidence** blobs, no
@@View_All anywhere, and no access to @@Claim__c clinical fields.

## Per-action justification

| Action | Object permission | Field permissions | Why this and not more |
|---|---|---|---|
| A1 | @@Member__c Read | Read all except @@SSN_Last4__c, @@Clinical_Summary__c | Triage needs identity and plan context; it does not need identity documents or clinical narrative |
| A2 | @@Claim__c Read | Read all except @@Diagnosis_Code__c, @@Treatment_Plan__c | Status and amount drive triage; diagnosis is the sensitive field and the agent has no need for it |
| A3 | @@Claim__c Read only | - | A proposal is not a decision. Write access would make the agent an adjuster, which changes the control model entirely |
| A4 | @@Consent_Record__c Read | Read @@Consent_Type__c, @@Effective_Date__c, @@Consent_Status__c. **No evidence field** | The agent needs to know whether consent exists, not what it says. The evidence blob is binary, large, and audit-critical |
| A5 | @@Access_Request__c Create | Create on the request fields | An audit record the agent creates is legitimate; one it can edit is not |
| A6 | @@Provider_Network__c Read | Read all | The junction object is not sensitive and is needed to route |
| A7 | @@Access_Request__c Create | As A5 | Escalation and blocked-action logging are the same mechanism |
| - | **No @@View_All, no @@Modify_All** | - | The agent's access must remain record-scoped so the sharing model still bounds it |

Every one of these is a **permission** decision. The agent still sees only what
sharing gives it, and the specification must say so - because the failure mode
is an agent permission set with a broad object grant and an assumption that
sharing will narrow it.

## The agent identity

| Element | Decision |
|---|---|
| **Type** | A **named agent user** in its own profile, not a shared integration identity and not a copy of a high-privilege user |
| **Profile** | Minimal: read-only on the objects in the action list, nothing else |
| **Permission set** | The action-derived set above, plus a custom permission *May Use Claim Triage Agent* so the entitlement is auditable in Setup |
| **Justification for any elevated permission** | **None granted.** This is the finding: writing the list from the actions rather than from a user produced no elevated permission at all |
| **Record scoping** | Agent-initiated queries run in user mode, so the agent's record access is bounded by whatever sharing grants the agent user - which means the agent user also needs a deliberate sharing position, not an assumption |

The last row is the one usually missed. **A named agent user still needs
record access from somewhere.** If nobody grants it, the agent returns nothing
and the failure looks like a data problem. If it is granted broadly, the agent
sees everything. So the agent user needs an explicit, narrow sharing position -
named groups it is a member of, nothing else.

## Data 360 consumption

| Element | Decision |
|---|---|
| **Data consumed** | Member segment membership, plan tier, claim status distribution, consent state. **Not** clinical fields, not identity documents, not claim evidence |
| **Consent basis** | Consent recorded on @@Consent_Record__c for the specific purpose - care coordination versus marketing versus research. Each consumption path declares which purpose it relies on |
| **Enforcement, not assumption** | **The consent state is enforced in the platform, not in the integration.** Two mechanisms together: (1) consent state is a field the consuming flow checks before the record enters the lake, and (2) consent withdrawal triggers a purge of the affected segment |
| **Why enforcement in the platform matters** | If consent is enforced in the integration, then every new integration must re-implement it correctly, and a class of leak - data used outside its stated purpose - becomes a per-integration risk. Enforced in the platform, it is structurally harder rather than a matter of process |

The second mechanism is the one that is easy to leave out. Checking consent at
ingestion stops new data going in; it does nothing about data already in the
lake when consent is withdrawn. **Withdrawal needs a purge path**, and if
consent can be withdrawn at all, the purge is the control that matters.

## The two runtime checks

| # | Check | Question | Where it lives |
|---|---|---|---|
| 1 | **Authorisation** | Can the agent perform this action? | **The permission layer** - the agent's permission set and the Apex method's declared mode. This is the boundary that already exists |
| 2 | **Entitlement** | **Should this user be able to trigger it?** | **Inside the action itself**, as an explicit check in the Apex that resolves the triggering user and the consent state - not in the permission layer |

Check 2 has no natural home in the permission model, and that is precisely why
it gets forgotten. The reason it must live in the action:

- A permission answers *"may this identity do this?"*. It cannot answer *"may
  this person, right now, cause this effect?"* - because the effect depends on
  **who triggered it** and on **consent state that can change between calls**.
- So the check belongs where the triggering context is available: in the Apex,
  resolving the session user, comparing against the consent record, and
  refusing with an explicit, logged reason.
- It must be **explicit and logged**, not inherited from a permission. A check
  that is implicit cannot be evidenced to an auditor, and this is a check whose
  whole purpose is to be evidenced.

The critical distinction to state, because it is the one the phase exists for:
**an AI agent does not act as the user. It acts as itself, with its own
permissions, on behalf of whoever triggered it.** So "can this user do this"
becomes two questions - "can this agent do this" and "should this user be
allowed to make it happen" - and the second is the one that gets forgotten.

## What the exercise establishes

**Write the agent's permissions from its action list, and the elevated
permission disappears.** Every elevated grant in an agent design traces back to
copying an existing user rather than to a need the agent has. And because an
agent acts as itself, the permission layer is necessary and not sufficient -
the entitlement check has to live in the action, explicitly, where it can be
logged and shown.

`,

  /* ---------------------------------------------------------------- 19.3 --- */
  '19.3': tick`
## What a strong answer contains

The resolution map, three tested outcomes, **a logged and safe unresolved
path**, and a **named control preventing cross-user exposure in the misresolved
case**. If no control exists, saying so *is* the finding - and that is a
stronger answer than inventing one.

## The resolution map

External identity no longer resolves to an org record by itself. The chain:

| Step | What happens | Where it can fail |
|---|---|---|
| 1 | The user authenticates at the **external identity provider** | Wrong person authenticated |
| 2 | The IdP returns a **subject identifier** - an external principal, not a Salesforce Contact Id | Wrong subject returned |
| 3 | The site maps the subject to a **Contact** via the configured linking | **No contact found** - a new user, an unlinked account, a typo |
| 4 | The **Contact** is mapped to the related Account via the external account hierarchy | Contact exists, account relationship does not |
| 5 | The **sharing set rule** matches on the Contact - "the session contact's related records" | Matches nothing, because step 3 produced nothing |
| 6 | The records reach the page | - |

**The load-bearing dependency is step 3.** Everything downstream - the sharing
set rule, the Apex that reads the session contact, the FLS on the rendered
component - assumes a Contact was resolved. If step 3 fails, step 5 evaluates
against nothing and returns nothing. The sharing set rule is written in terms of
the Contact, so **an identity problem manifests as a permissions problem**, and
that misattribution is what makes it slow to diagnose.

The other load-bearing fact, from the Phase 9 matrix: **Apex sharing is
evaluated against the guest user, not the logged-in external person.** So any
"personalised" Apex must read the external Contact from the session explicitly,
or it will grant everything to the guest and nothing specific to the person. In
the misresolved case below, that is what turns a small problem into a large one.

## The three outcomes, tested

### Outcome 1: correct contact resolved

| | Result |
|---|---|
| **What the user sees** | Their own member records, claims and consent state. Nothing else |
| **Safe?** | Yes |
| **Observable?** | Yes - the Apex resolves a Contact and can log its Id |
| **Verdict** | The designed path. The test is that it is *demonstrable*, not inferred from configuration |

### Outcome 2: no contact resolved

The case: an external identity that authenticates successfully but matches no
Contact. A broker whose employer relationship was never set up; a member who
registered after the linking was configured.

| | Result |
|---|---|
| **What the user sees** | **An empty portal** - authenticated, no error, no records |
| **Safe?** | **Yes, and this is the important property.** The sharing set rule matches nothing, so nothing is returned. Fail-safe, not fail-open |
| **Observable to the user?** | **Barely.** An empty portal reads as a broken feature, not as a provisioning gap, so users report "the site is not working" rather than "I am not set up" |
| **Logged?** | **This is where the work is.** The resolution attempt must be logged explicitly: subject identifier, timestamp, resolution result, site. Without that log, this case is indistinguishable from a sharing misconfiguration, and support will debug the wrong thing |
| **Visible to support?** | Only if the log exists **and** someone is watching. So: a scheduled report of unresolved resolutions, and an alert when the count rises above baseline |

Safe is not the same as handled. The control set is:

1. **Explicit resolution logging** on every attempt, success or failure.
2. **A distinguishable empty state** - "we could not find your records, contact
   your organisation administrator" - rather than a blank page, so the user
   knows to ask the right person.
3. **A monitor on unresolved volume**, because a spike means a provisioning
   process is broken, not that individual users are misconfigured.

### Outcome 3: wrong contact resolved

The case that matters: the subject identifier resolves, but to the **wrong
Contact** - a data quality error in the linking table, a reused email, a test
account left in production.

| | Result |
|---|---|
| **What the user sees** | **Another person's member records.** Every record on the page belongs to someone else, and it looks entirely normal |
| **Safe?** | **No.** This is a cross-user data exposure, and it is the highest-severity outcome in the phase |
| **Observable?** | Not to the user. Observable only through the audit trail, if one exists |

**The control that prevents it**, and it must be named:

1. **A second-factor identity attribute check.** The resolution must match on
   **two** independent attributes - for example external subject **and** a
   verified date of birth or member reference held on the Contact. A
   single-attribute match on an email address is the vulnerability; a
   single-attribute match on an immutable IdP subject is weaker protection
   against a mapping error than people assume, because the mapping table itself
   is where the error lives.
2. **An ownership assertion in the Apex.** The resolving Apex must read the
   Contact from the **session** and verify the returned records belong to it,
   rather than trusting the resolved Contact. Concretely: query the record with
   the Contact Id as a filter, so a wrong Contact yields *their* records rather
   than the session user's, and refuse when the Contact does not match the
   session's asserted identity.
3. **Guest-user scope as the outer bound.** The guest permission set must not
   grant broad read, so a failure of the first two controls still leaves the
   guest user unable to see arbitrary records.
4. **An access log on every resolution**, so the exposure is detectable after
   the fact rather than only prevented.

**And if no such control exists, that is the finding**, stated as: an
identity-to-Contact mapping on a single mutable attribute, with no
second-factor check and no ownership assertion in the consuming Apex, permits
one external user to be served another external user's member records. Severity
**critical**, because it is a PHI disclosure to an authenticated but
unauthorised party, and because it produces no error.

## What the exercise establishes

**Identity resolution failure needs to be an explicit, logged, tested case -
not an assumption.** The three outcomes have different characters and need
different controls: correct needs to be demonstrable, unresolved needs logging
and a distinguishable empty state, and misresolved needs a named second-factor
check plus an ownership assertion. The failure mode that never announces itself
is the third one, which is why the exercise requires the control to be named
rather than merely asserted to exist.

`,

  /* ---------------------------------------------------------------- 20.1 --- */
  '20.1': tick`
## What a strong answer contains

A single coherent document in which **every mechanism traces to a stated
requirement**, with the **residual risk** and **evidence** sections present.
Those last two are what separate a technically correct design from one a
compliance officer can accept.

## 1. Data model

| Object | Records | Relationship | Ownership | Blast radius |
|---|---|---|---|---|
| @@Member__c | 2.4M | **Master-detail from Account** | Inherits from Account | **High** - access partly inherits from the parent, so the relationship is a security decision |
| @@Claim__c | 380k | **Master-detail from @@Member__c** - two levels down | Inherits from @@Member__c | **High** - two levels of implicit inheritance |
| @@Provider_Network__c | 85k | Lookup to Account, lookup to the health plan object | Owned by Provider Operations | Low - an object-based rule covers it |
| @@Consent_Record__c | 3.1M | Lookup to @@Member__c | Owned by the consent service | **High** - audit-critical, read-mostly |
| @@Access_Request__c | ~50k | Lookup to @@Member__c | Owned by the Privacy Office | Low |

**The two most consequential relationships**, and why:

1. **@@Member__c master-detail from Account.** This means member access
   **inherits from the Account**, and it is the single largest blast radius in
   the org: 2.4M records whose visibility is partly determined by 40,000
   Accounts. It is also what makes the "Grand Central" skew so dangerous - one
   Account owning 40,000 members means one ownership record determines access to
   40,000 rows. **A design decision that looks like data modelling and is
   actually an access decision.**
2. **@@Claim__c master-detail from @@Member__c**, two levels down. Claim access
   therefore inherits from both @@Member__c and, through it, Account. Any change
   to Account ownership propagates two levels down to claims - which is why the
   change wave moves in dependency order rather than object order.

## 2. OWD per object, with the recalculation plan

| Object | OWD | Justification | Recalculation if changed |
|---|---|---|---|
| @@Member__c | **Public Read Only** | At 2.4M records a criteria-based rules design will not hold. The boundary is carried by **FLS, roles and teams** instead of by record access | **Hours.** Largest change in the wave. Pilot, one object, monitored |
| @@Claim__c | **Private** | Clinical and financial data; the rules carry access deliberately | Hours |
| @@Provider_Network__c | **Private** with object-based rule R4 | Narrow, and one rule covers all 85,000 | Short |
| @@Consent_Record__c | **Private**, hierarchy sharing **disabled** | Audit-critical. Disabling hierarchy removes the upward flow so R5 is the only declarative path | Hours; the disabling matters as much as the OWD |
| @@Access_Request__c | **Private** | Audit record of who granted access; almost nobody edits it | Short |

**The recalculation plan, per change:** baseline export first; then the change
in a pilot window outside business hours; then monitor recalculation queue depth
hourly with an escalation trigger on sustained growth over days; then execute the
negative tests during the window, because the transitional state is where support
will meet the users; then the effective permission diff against the baseline at
deploy and again at 30 days.

## 3. Role hierarchy, and what it does not cover

Four levels, CEO to individual contributor, with Claims, Underwriting and
Provider Operations under different VPs - which creates the sibling problem
deliberately, so the rule-based mechanisms are exercised rather than theoretical.

**What it does not cover, stated explicitly** - this is the part that matters:

- **Siblings.** Nothing propagates sideways, so two managers who need each
  other's records need a rule targeting a group. This is the single most
  common omission in an access model.
- **Downward.** Roles cascade **up** only. A manager cannot see a report's
  records unless granted.
- **External users.** No role, ever. Any grant believed to be covered by the
  hierarchy is not covered externally at all.
- **Field-level access.** The hierarchy carries records, never fields.
- **Anything not positional.** A review board spanning four departments has no
  reporting relationship to hang on - hence a public group as a rule target.
- **Subtraction.** It cannot exclude. "Everyone in this role except that one
  person" is not a hierarchy answer.

## 4. Sharing rules

| # | Object | Type | Criteria | Target | Level | Expected match |
|---|---|---|---|---|---|---|
| R1 | @@Claim__c | Criteria | @@Claim_Priority__c in (Urgent, Critical) | Clinical Escalation group | Read | ~4% |
| R2 | @@Claim__c | Criteria | @@Review_State__c = 'Second Opinion' | Underwriting Review group | Read | ~1,200 |
| R3 | @@Member__c | Criteria | @@Member_Segment__c = 'Enterprise' | Broker Portal Access group | Read | ~18,000 |
| R4 | @@Provider_Network__c | Object-based | none | Provider Operations group | Read | 85,000 |
| R5 | @@Consent_Record__c | Criteria | @@Consent_Type__c = 'Research' | Research Review group | Read | ~600 |
| R6 | @@Access_Request__c | Criteria | @@Request_Status__c = 'Escalated' | Privacy Office group | Read/Write | ~400 |
| R7 | @@Claim__c | **Restriction** | @@Is_VIP__c = true | Owners in role Agency Adjuster | **Removes access** | ~9,000 |

Two disciplines visible in the table. **Criteria use picklists with defaults,
never checkboxes or formulas** - R1 and R2 depend on it, and a null criteria
field matches nothing silently. And **no rule targets a role on @@Claim__c**,
because role targets reach whole subtrees and a named group is narrower.

**R3's arithmetic, as the worked example:** 18,000 enterprise members targeted
at a group, and the observed result was 640,000 shares. That is the
criteria-to-target expansion, and it is why R3 targets a named group rather than
a broad role.

## 5. The twelve requirements, mapped

| # | Requirement | Mechanism | Why not the alternative |
|---|---|---|---|
| 1 | A member sees their own member, claim and consent records | **Sharing set rule on Contact** | The criterion is "the session contact", which no internal rule can express |
| 2 | A broker sees the members of the employer they represent | **Sharing set** | The relationship is an account relationship across many accounts |
| 3 | A provider sees their own network entry | **Sharing set rule** | It is record-scoped, not account-wide |
| 4 | A partner admin sees all accounts under one parent account | **External account hierarchy** | Purely hierarchical |
| 5 | An anonymous visitor sees a public directory | **Guest permission set + Apex gating** | No person context exists, so no sharing rule applies |
| 6 | Urgent and critical claims are visible to clinical escalation | **R1** | Criteria on a stable picklist |
| 7 | Second-opinion claims are visible to underwriting review | **R2** | As above |
| 8 | Agency adjusters cannot see VIP claims | **R7 restriction rule** | The requirement is subtraction; only restriction rules subtract |
| 9 | Legacy staff cannot see the 40,000 acquired-rival accounts | **Restriction rule plus scoping rule** | Two mechanisms, because 40,000 accounts need scoping and the rule needs to be subtractive |
| 10 | All provider network entries are visible to provider operations | **R4 object-based** | No criterion is needed, so an object rule is simplest |
| 11 | Escalated access requests are editable by the Privacy Office | **R6 criteria, Read/Write** | The only write grant on any rule |
| 12 | Research consent records are visible to research review | **R5 criteria** | ~600 records, small, and audit-relevant |

**The checklist that produced this table** is the question-shape table, read as
questions: does the requirement assert a relationship (4), a criterion (6, 7, 10,
11, 12), an exclusion (8, 9), an external identity (1, 2, 3), or the absence of
any person (5)? Every requirement resolves, which is the evidence that the
mechanism choice was derived rather than recalled.

## 6. Permissions and FLS

One permission set per coherent job function - intake agent, claims adjuster,
underwriter, claims reviewer, regional manager, compliance auditor, privacy
office, care coordinator - with assignment rules on role.

**Field tiers** - public, internal, confidential, restricted, never-external -
and the role-by-tier matrix derived from them. The cells that need explicit
justification:

| Cell | Decision | Justification |
|---|---|---|
| Underwriter x consent evidence | **No** | The Phase 11 exclusion set. Enforced by permission set **group intersection**, which is the only mechanism that subtracts within a person's own assignments |
| Claims adjuster x @@SSN_Last4__c | **No** | Identity verification is not part of the role; the entitlement is a separate custom permission |
| Any role x consent evidence blob | **No** | Binary and audit-critical; existence and status suffice |
| Compliance auditor x restricted fields | **Read** | Audit requires reading; editing does not |
| Every role x never-external tier | **No** | By definition |

**The exclusions are delivered by permission set groups, and the exclusion set
must sit inside the same group as the capability sets** - because intersection
applies within a group, and a separate set does not subtract.

## 7. Apex managed sharing

**Why necessary:** exactly one case. Consent evidence access that depends on
**another record's active state** - "this research consent record is visible
while the corresponding @@Access_Request__c is Approved" - which no declarative
criterion can express, because the condition is on a related record.

| Element | Design |
|---|---|
| **The grant** | User-mode Apex creating a share on @@Consent_Record__c when the linked request reaches Approved, scoped to the Research Review group membership |
| **The revocation** | Trigger-driven on the request status change, and a nightly reconciliation that removes grants whose condition no longer holds - because a trigger alone leaves orphaned grants |
| **The reconciliation** | Nightly batch comparing granted shares against qualifying conditions, reporting and repairing both directions. Runs as a justified system-mode service identity |
| **Why declarative was rejected** | The condition is on a related record, and criteria select on the object's own fields |
| **The risk, stated** | This is the org's only code-enforced access path, so it is invisible to every configuration review. **It is also why R7 is incomplete on @@Claim__c** - a restriction rule cannot remove Apex sharing - which is why no Apex grants exist on @@Claim__c at all |

## 8. External model, six personas

| Persona | Mechanism | Guest permission scope |
|---|---|---|
| Member | Sharing set rule on Contact | Read on @@Member__c, @@Claim__c, @@Consent_Record__c |
| Broker | Sharing set | Read on @@Member__c, @@Claim__c |
| Provider | Sharing set rule | Read on @@Provider_Network__c only |
| Partner admin | External account hierarchy | Read on Account and related |
| Anonymous | Guest permission set + Apex gating | Public directory fields only |
| Support agent impersonating | Impersonation path | **The impersonating agent's** access, logged - and this is the persona most likely to be over-scoped |

**The verification plan** is the empirical matrix: for each persona, attempt to
read one record of each type intended to be denied, **through the API, a report,
and a second UI route**, and repeat after every change to the guest permission
set, the sharing sets, or the site's configuration. Plus identity-resolution
testing per the Phase 19 outcome table, because an unresolved identity presents
as a permissions problem.

## 9. Skew, change wave, rollback

**Skew:** the Grand Central Account owns 40,000 members. Three mitigations -
distribute ownership by region so no Account dominates; monitor the skew
indicator on @@Access_Request__c; and route the @@Consent_Record__c Apex path
around it entirely, since consent records are the one place where skew would be
expensive.

**Change wave**, in order: restriction rules, FLS enforcement, User Access
Policies, OWD tightening, Apex user-mode migration, guest FLS, Profile Filtering
enforcement. **Rollback:** the first three are fully reversible; OWD and Apex
modes are reversible at a cost; manual shares need a snapshot; and **the
restriction rules are the change I would not roll back**, because they close an
active gap and reverting teaches the organisation that enforcement gets undone.

## 10. Residual risk

| Risk | Why it remains | Mitigation and owner |
|---|---|---|
| **@@Consent_Record__c access is code-enforced** | The related-record condition cannot be declarative | Reviewed as code, not as configuration. Security architect |
| **Restriction rules cannot remove Apex sharing or ownership** | Platform behaviour | Verified: no Apex grants and no VIP-owned claims. Re-verified on any change |
| **Report subscriptions produce copies outside the model** | Email delivery | Subscription restricted; **export and forwarding policy still needed** - an open item |
| **Sandboxes hold production data** | Refresh requirement | Same access model deployed; refresh on schedule, not demand |
| **The model depends on Winter '27 capabilities** | Profile filtering, masking, guest FLS | Fallback identified for the field-agent exclusion if profile filtering does not land |
| **Field-level audit is scoped to restricted fields** | Per-user licence cost | Accepted with the compliance owner, in writing |
| **A shared list view can reveal record existence** | Structural | Reviewed in the quarterly non-record sweep |
| **Volume behaviour unverified at production scale** | Refresh copies have limits | Pilot or limited release on @@Consent_Record__c first - **surfaced now, not after cutover** |

## 11. Evidence

| Control | How it is demonstrated |
|---|---|
| OWD and sharing configuration | Setup export per object, plus the effective permission diff per persona |
| Exclusion mechanisms | **Negative tests executed, not reasoned** - underwriter cannot read consent evidence, adjuster cannot read @@SSN_Last4__c, via API, report and export |
| Apex enforcement | Code review record plus the reconciliation job's own output |
| Field-level audit | Shield field audit reports for the restricted fields, retained |
| External model | The empirical persona-by-record-class matrix, re-run on every guest permission set change |
| Non-record surface | The inventory artifact, with the quarterly review record |
| Recalculation behaviour | Measured queue depth and save latency during each wave |
| Licences | The persona-to-licence map, reviewed with procurement |

## What the exercise establishes

A design is complete when **a reviewer could reconstruct the org from the
document**, and every mechanism traces to a requirement that was stated before
the mechanism was chosen. The residual risk and evidence sections are not
appendices - they are what make the document usable by the next architect, the
auditor, and the business that has to decide what to do about what this does not
protect.

`,

  /* ---------------------------------------------------------------- 20.2 --- */
  '20.2': tick`
## What a strong answer contains

The tabulated error pattern **by domain and by reason**, a plan derived from
that data rather than from the syllabus, and a re-attempt result for every
missed question. The reason column is the whole exercise - it is more useful
than the topic column, because it tells you what kind of work fixes the gap.

## The three attempts

| Attempt | Score | Time per question | Notes |
|---|---|---|---|
| 1 | 62% | 2:24 | Slow. Two flagged questions consumed 9 minutes between them |
| 2 | 71% | 2:05 | Faster, but the errors moved to Permissions |
| 3 | 68% | 2:11 | A bad day, and worth recording as one - practice data is data |
| **Mean** | **67%** | **2:13** | Comfortably above 58%, which is not the point |

## The error log, by reason

Every incorrect or guessed answer, classified. The three reasons are
distinguishable and they need different remedies:

| Reason | Meaning | Remedy |
|---|---|---|
| **Unknown mechanism** | The mechanism does not exist in your memory | Revise that phase |
| **Misread requirement** | You knew the mechanism and read the question wrong | Practise reading, not learning |
| **Unrecognised trap** | You knew it and did not see it coming | Re-read the trap table - **highest yield per hour of the three** |

## By domain, against the weighting

| Domain | Weight | Weighted questions (of 60) | Attempt errors | My error rate | Over- or under-weight |
|---|---|---|---|---|---|
| Access to Records | 39% | ~23 | 11 | 48% | **Over-weighted by me** - my weakest domain, correctly |
| Permissions to Objects and Fields | 27% | ~16 | 4 | 25% | Balanced |
| Implications of Security Model Choice | 18% | ~11 | 2 | 18% | Comfortable - the domain I over-revise |
| Access to Other Data | 16% | ~10 | 1 | 10% | **Under-weighted and under-practised** |

The comparison that matters is the last column. My hours roughly tracked the
syllabus rather than my error rate, so I spent disproportionate time on
Implications - already my strongest - while Access to Records consumed 39% of
the exam and nearly half my errors. **Weight by error rate multiplied by
weight, not by the syllabus.**

## By reason, which is the actionable view

| Reason | Count | Which phases | What it actually means |
|---|---|---|---|
| **Misread requirement** | 9 | Mostly Access to Records | I am deriving correctly from a requirement I read too quickly. **Not a knowledge gap** |
| **Unknown mechanism** | 5 | Teams, Apex sharing, permission set groups | Genuine gaps, three specific phases |
| **Unrecognised trap** | 4 | Sharing adds; roles cascade down; guest user | **Four marks recoverable from one re-read of the trap table** |

This table reframes the whole revision problem. **Nine of eighteen errors were
not knowledge errors**, so more reading would have been the wrong intervention.
Four were traps, and the trap table is one page. The genuine knowledge gaps are
five, in three phases.

Reading that the other way: **the four unrecognised traps cost four marks for
one page of revision. The five unknown mechanisms cost five marks for three
phases.** The traps are roughly five times more efficient per hour. A plan built
on the syllabus would have missed that entirely.

## The revision plan, derived from the data

| Priority | Action | Hours | Justification from the data |
|---|---|---|---|
| 1 | **Re-read the trap table, then re-attempt every missed question** | 2 | 4 errors, one page, highest yield per hour in the plan |
| 2 | **Practise the four-stroke method under time** - floor, subjects, grants, negation | 4 | 9 misread-requirement errors. The method is what prevents them, and it needs speed not knowledge |
| 3 | **Re-read Teams, Apex managed sharing, permission set groups** | 6 | The 5 genuine knowledge gaps, in the 3 phases named |
| 4 | **Deliberately over-practice Other Data** despite it being my strongest | 2 | 16% of the exam for 10% of my errors. The point is exposure to the shape, not the content |
| 5 | **Do not re-read Implications** | 0 | 18% weight, 18% error rate, already the strongest domain. Time here is wasted |
| **Total** | | **14** | Against roughly 20 hours remaining |

The zero in row 5 is the discipline. Generic advice sends you to re-read
everything, weighted by syllabus, which would have put my remaining hours into
the domain I am already best at.

## Re-attempt, three days later, timed

Every missed question, retimed:

| Question | Domain | Original reason | Now | Verdict |
|---|---|---|---|---|
| Q4 | Records | Misread | Correct, 1:40 | Closed - it was reading, not knowledge |
| Q7 | Records | Misread | Correct, 1:55 | Closed |
| Q11 | Records | Trap - sharing adds | Correct, 1:20 | **Closed by the trap re-read** |
| Q14 | Permissions | Unknown - PSGs | **Still wrong** | **Genuine gap** |
| Q19 | Records | Misread | Correct, 2:10 | Closed |
| Q23 | Records | Unknown - teams | **Still wrong** | **Genuine gap** |
| Q28 | Permissions | Misread | Correct, 1:30 | Closed |
| Q31 | Other Data | Correct on re-read | Correct | Closed |
| Q33 | Records | Trap - roles cascade down | Correct, 1:15 | Closed |
| Q37 | Records | Misread | **Still wrong** | Reading or knowledge - revisit |
| Q41 | Permissions | Trap - guest user | Correct, 1:25 | **Closed by the trap re-read** |
| Q44 | Records | Unknown - Apex sharing | **Still wrong** | **Genuine gap** |
| Q47 | Records | Misread | Correct, 1:50 | Closed |
| Q52 | Other Data | Guessed | Correct | Closed - and note it was a guess that happened to be right |
| Q58 | Records | Trap | Correct, 1:05 | Closed |
| Q61 | Permissions | Misread | Correct, 1:40 | Closed |
| Q64 | Records | Misread | Correct, 1:30 | Closed |

**16 of 18 closed, 4 still failing** - and the four are exactly the four the
reason column predicted: three unknown mechanisms and one misread that did not
resolve on repetition. The re-attempt is what separates "I have read it again"
from "I have the gap closed", and those are very different states.

## The final-week plan

**No new material.** Recognition practice only, weighted by domain, because
recognition is what runs under time pressure.

| Day | Activity | Weighting |
|---|---|---|
| 1-2 | Timed practice set, **eliminate-first** - rule out the clearly wrong option before reading all five | 60% Records |
| 3 | Question-shape drill: read the shape, name the mechanism, then choose | 40% Records, 30% Permissions |
| 4 | Trap table from memory, then the re-attempt misses again | Recognition only |
| 5 | One full timed set, **no flags revisited until the end** | Full weighting |
| 6-7 | Review flags only, classifying each as knowledge or reading | - |

**The habit to install:** eliminate before you commit. Most marks are lost by
reading all five options and being attracted by the second-best one, which is
avoidable - remove the clearly wrong answer and the question gets easier, because
you have stopped comparing against a wrong answer.

And the arithmetic worth holding: **do not leave the last ten questions.**
Unanswered is always zero. A 60-of-65 response at 58% is 92%, which is
comfortable - but only if you answer them.

## What the exercise establishes

**Generic revision advice is worth little, and a plan built from your own error
pattern is worth a great deal.** The reason column matters more than the topic
column, because it distinguishes a gap you close by reading from a gap you close
by practising. In this set, two thirds of the errors were not knowledge errors at
all - and no amount of syllabus-weighted revision would have found that.

`,

  /* ---------------------------------------------------------------- 20.3 --- */
  '20.3': tick`
## What a strong answer contains

Twelve scenarios answered under time, **a rejected alternative for each**, a
timed flag list, and a cause identified for every flag. The rejected alternative
is the mark of genuine understanding - naming why you did not choose something is
what proves you chose it deliberately.

## The weighting, and the trim

The brief asks for twenty scenarios on the full weighting, trimmed to twelve
keeping the proportion:

| Domain | Weight | Full set | Kept |
|---|---|---|---|
| Access to Records | 39% | 8 | **6** |
| Permissions to Objects and Fields | 27% | 5 | **4** |
| Implications of Security Model Choice | 18% | 4 | **2** |
| Access to Other Data | 16% | 3 | **1** |
| **Total** | | **20** | **13** |

Trimmed to twelve by cutting one further Records scenario - the domain is
already over-sampled at 50% against a 39% weighting, and the marginal Records
question was the one whose shape I found easiest.

## The twelve

### S1 - Records, 1:35

**Shape:** two managers who do not report to each other need access.
**Mechanism:** public group + criteria-based rule targeting it.
**Trap avoided:** creating a reporting line to make the hierarchy work - it
over-grants and corrupts the org chart.
**Rejected alternative:** role hierarchy, because it propagates **upward only**
and these two are siblings. Nothing sideways exists.
**Ninety-second placement:** yes.

### S2 - Records, 2:20 (flagged)

**Shape:** everyone except this one role must see these records.
**Mechanism:** restriction rule.
**Trap avoided:** assuming a sharing rule can subtract. Sharing is additive
except for restriction rules.
**Rejected alternative:** a second group with carefully inverted criteria -
rejected because it is fragile, unreadable, and still cannot subtract from
ownership or Apex grants.
**Cause of the flag:** knowledge. I hesitated between restriction and scoping
rules, which is the recognition gap, not the reading gap.

### S3 - Records, 1:20

**Shape:** access follows a relationship, no criteria.
**Mechanism:** teams - an account team or opportunity team.
**Trap avoided:** a sharing rule targeting a group, which loses the per-person
precision the relationship gives for free.
**Rejected alternative:** Apex managed sharing - correct behaviour, enormous
audit surface, and it hides a declarative capability inside code.
**Ninety-second placement:** yes.

### S4 - Records, 1:45

**Shape:** conditional on another record being active.
**Mechanism:** Apex managed sharing.
**Trap avoided:** a criteria-based rule on a field - criteria select on the
object's own fields and cannot express a related record's state.
**Rejected alternative:** duplicating the other record's state onto this one
with Apex, so a criteria rule would work. Rejected because it is denormalised
state that can drift, and the drift is invisible.
**Ninety-second placement:** yes.

### S5 - Records, 1:15

**Shape:** external users see their own records.
**Mechanism:** sharing set rule on Contact.
**Trap avoided:** role hierarchy or manual sharing to the external person. There
is no role, and no internal user to share with.
**Rejected alternative:** a criteria-based sharing rule on the member record -
rejected because the criterion would be "the session's external contact", which
no internal rule mechanism can reference.
**Ninety-second placement:** yes.

### S6 - Records, 1:50

**Shape:** a specific, temporary exception.
**Mechanism:** manual share, or a time-bound Apex grant.
**Trap avoided:** building a permanent mechanism for a temporary need - a rule
or a group that outlives the exception.
**Rejected alternative:** a sharing rule with an end date, which does not exist -
rules cannot expire. That is exactly why manual sharing plus the Winter '27
manual share retention toggle is the right answer rather than a workaround.
**Ninety-second placement:** yes.

### S7 - Permissions, 1:25

**Shape:** they can see the record but not the field.
**Mechanism:** FLS, or masking where the value must be shown as present.
**Trap avoided:** a sharing rule, which operates on records and has no effect
whatsoever on fields.
**Rejected alternative:** removing the field from the page layout - it is
presentation, the API bypasses it, and it reads as a control in a design
document.
**Ninety-second placement:** yes.

### S8 - Permissions, 2:40 (flagged, twice)

**Shape:** one role must not see a capability another role has.
**Mechanism:** permission set group intersection, containing the exclusion set
alongside the capability sets.
**Trap avoided:** removing the permission from the profile - a permission set
grants independently of the profile, so the profile is not where it lives.
**Rejected alternative:** Winter '27 Profile Filtering, which is the tempting
modern answer. Rejected because it scopes **assignment** by profile, not
permissions within an assignment; if both users share a profile it does nothing
at all. **This is the flag worth examining most** - twice is a signal that the
distinction between assignment scoping and permission intersection is not yet
automatic.
**Cause of the flag:** knowledge, and the most valuable one on the list.

### S9 - Permissions, 1:40

**Shape:** the code bypasses permissions.
**Mechanism:** declare @@WITH USER_MODE on the class; under Summer '26,
undeclared code defaults to user mode.
**Trap avoided:** assuming the declared keyword is what runs - flows and
scheduled Apex still run in system context, and the console always does.
**Rejected alternative:** relying on the API 67.0 default alone, with no
declarations. Rejected because the list of undeclared code is then the audit
surface, whereas explicit declarations make the audit list readable. Also
rejected: fixing it by querying with @@Security.stripInaccessible, which handles
FLS on one operation and leaves sharing, ownership and CRUD unaddressed.
**Ninety-second placement:** yes.

### S10 - Permissions, 1:30

**Shape:** this change is expensive.
**Mechanism:** a permission-based alternative - FLS, a permission set group
exclusion, or field masking.
**Trap avoided:** raising org limits, which is the answer to "make it faster"
and not to "avoid the recalculation".
**Rejected alternative:** the narrowest declarative mechanism that meets the need
- chosen over View All, which would remove sharing as a boundary for that user
and cannot be undone except by another permission change.
**Ninety-second placement:** yes.

### S11 - Implications, 1:55

**Shape:** given this new requirement, determine the design.
**Mechanism:** ask what **action** the user takes on the data. Brokers reading
claim history is a reporting requirement, so a summary object or a report -
not 380,000 share rows.
**Trap avoided:** building record-level access for a display need, paying a
permanent scaling cost for a one-off view.
**Rejected alternative:** a sharing set on @@Claim__c. It works, it is simple,
and it is the distractor - it produces share rows proportional to broker client
counts, recalculating on every new claim, to deliver something a report already
delivered.
**Ninety-second placement:** yes.

### S12 - Other Data, 1:10

**Shape:** access to data that is not standard or custom objects.
**Mechanism:** an answer that names the surface - report folder sharing and
**run-as** identity, file access independent of its parent record, custom
metadata Viewer access, or object permission alone for Big Objects.
**Trap avoided:** treating settings, metadata and files as protected by the
record model. None of them are.
**Rejected alternative:** "no access, because nothing is exposed" - rejected
because a report shared to a folder renders per its **owner's** access, which is
a disclosure surface, and Big Objects have no sharing model at all so object
permission is the entire answer.
**Ninety-second placement:** yes.

## The flag list, and the cause for each

| # | Question | Time | Cause | Action |
|---|---|---|---|---|
| 2 | Records - subtraction | 2:20 | **Knowledge** | Re-read restriction vs scoping rules; the difference is scope of what they subtract from |
| 8 | Permissions - exclusion | 2:40, flagged twice | **Knowledge** | Re-read permission set group intersection vs Profile Filtering. **Highest priority** |
| 11 | Implications - cost | 1:55 | **Boundary** - borderline, kept in the list | Accepted. It is slow but placed |

Two knowledge flags, both on **subtraction and exclusion** - the two places
where the platform's additive-only nature creates an exception, and therefore
the two places where recognition is hardest. Neither is a reading problem: I read
both questions correctly and still reached for the wrong mechanism.

## The eight things to re-read, in priority order

1. **Restriction rules and scoping rules** - what each subtracts from, and that
   neither removes Apex sharing, ownership, CRUD or FLS.
2. **Permission set group intersection** - that it applies *within* a group, and
   the contrast with Profile Filtering, which scopes assignment by profile.
3. **The additive-only table** - read as a list, not a table, because it is a
   recognition aid rather than a reference.
4. **The guest user facts** - one guest per site; Apex sharing evaluated against
   the guest, not the person; no role externally.
5. **Execution modes** - what runs in system mode regardless of declaration:
   flows, scheduled Apex, the console, and triggers.
6. **Criteria arithmetic** - null criteria matching nothing; a group target
   multiplying share rows, as in R3's 18,000 to 640,000.
7. **The relationship traversal rules** - implicit sharing direction, and that
   master-detail from Account propagates access two levels down to claims.
8. **Non-record surfaces** - the run-as identity, and files shared independently
   of their parent.

## What the exercise establishes

**At speed you are not retrieving mechanisms, you are recognising shapes and
eliminating.** The twelve scenarios took an average of 1:38, and the two flags
were both recognition failures on subtraction and exclusion - which is exactly
where the exam places its traps. Practising recognition is the skill the exam
actually tests, and it is trainable in a way that re-reading mechanisms is not.

`,
};
