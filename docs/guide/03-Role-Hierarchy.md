# Phase 3: The Role Hierarchy and Implicit Sharing

This phase is tagged **Access to Records**, the 39% domain. It covers two of its
objectives directly: *explain the role hierarchy and its implicit sharing*, and
*recommend the appropriate sharing mechanism*.

The role hierarchy is the mechanism candidates underuse, because it is the one
that requires no rules, no criteria and no target groups. It is also the only
mechanism that grants access purely by organisational position, which makes it
both the cheapest to maintain and the most dangerous to extend.

## Learning Objectives

By the end of this phase you will be able to:

- Explain how the role hierarchy produces implicit sharing, and enumerate everything it affects beyond the obvious records.
- Use **Grant Access Using Hierarchies** deliberately, per object, instead of accepting the default.
- Predict exactly which records a user at any level can see, and explain the propagation direction.
- Recognise the requirements a role hierarchy structurally cannot serve, and name the mechanism that can.

---

## 1. Roles as the org's nervous system

A role answers *where does this person sit*. A role hierarchy answers *who is
above whom*. Every internal user has exactly one role; a role can hold many
users; roles form a single tree.

At Vantage this is not optional. With Account set to Private org-wide default,
the role hierarchy is the only thing giving a manager visibility of their team's
accounts. Remove it and 200 managers lose their pipeline view in a single step.

A role does five things, and only the first is usually discussed:

1. **Grants record access upward**, by default, for objects configured to allow it.
2. **Is a sharing rule target.** A rule naming a role grants to everyone in that
   role *and everyone below them*.
3. **Supplies the manager field** used by approval processes, escalation rules
   and hierarchical reports.
4. **Scopes some dashboards and reports** by role, independently of record access.
5. **Provides the hierarchy that teammate implicit sharing walks.**

> **Architect's warning.** Roles are for structure, not capability. A role should
> answer an access question only when the answer is genuinely "they report to
> them". The moment a role is named `Regional Claims Access`, someone has started
> building a permissions group out of the wrong primitive - and it is a public
> group plus a sharing rule.

### Checkpoint

A colleague proposes creating a role called `Regional Claims Access` for the
Northeast. What is wrong with it, and what should you build instead?

**Answer.** Two problems. First, role hierarchy propagates: anyone *above* that
role inherits the grant, which is not what "regional" means. Second, roles model
reporting lines, so you now have a fabricated reporting line that will confuse
every future access question. Use a public group named `Claims Review -
Northeast` as the sharing rule target.

---

## 2. The implicit sharing list nobody memorises

When people say "the role hierarchy shares records upward" they mean one
specific rule. The full picture is broader, and the broader parts are
examinable.

| What is shared implicitly | Direction | Notes |
|---|---|---|
| Records owned by users below you | Upward | The core behaviour. Controlled per object by Grant Access Using Hierarchies. |
| Parents of child records you can see | Both ways | A child you can see pulls in its parent. |
| Ancestors - the parent chain | Both ways | See a child, get the account above it. |
| Related lists and roll-up data | Via parent | Not a separate grant; it arrives with the parent record. |
| Dashboards and reports scoped by role | Configurable | Independent of record access. A trap. |
| Territories the user belongs to | Configurable | Territory-based, not role-based. Phase 9. |
| Teammates' reports | Both ways | See a colleague and you also see their Tasks and Events. |

The last three rows are where marks are lost.

**Teammate implicit sharing.** See a colleague's Account because they report to
you, and you also see their Tasks and Events. Correct, expected, and almost
never mentioned in a design document until a user notices.

**Role-scoped dashboards.** A dashboard can be configured to show a manager only
the data for their own role. That is independent of record access, so a manager
can see a number they cannot drill into. This arrives as "my report is wrong",
not as an access ticket.

**Territories.** Territory membership is a separate structure from the role
hierarchy. Access can arrive by either, and the two are easy to conflate.

### Checkpoint

A manager sees their team's Cases through the hierarchy, and can now also see
the Accounts those Cases belong to. Is that a bug?

**Answer.** No. It is the parent/child implicit rule: access along a
relationship edge flows both ways. This is why "grant access to the detail
record" is never low-risk when the detail has a parent - you are granting the
parent and every sibling hanging off it.

---

## 3. Grant Access Using Hierarchies, deliberately

Each object has a **Grant Access Using Hierarchies** setting, and it is not
cosmetic. It controls whether the role hierarchy contributes record access for
that object at all. It is disabled by default on some standard objects, which is
a common cause of "a manager suddenly stopped seeing records".

| Setting | Effect | Use it when |
|---|---|---|
| Enabled | Users above in the hierarchy see records owned by users below | The record is owned by a person whose manager genuinely needs oversight |
| Disabled | The hierarchy contributes nothing for this object | Ownership is an assignment artefact, not an oversight relationship |

### The worked case: Consent_Record__c at Vantage

Every consent record is owned by whichever intake agent processed the request.
An intake agent's manager has no business reading individual consent evidence.

- **Enabled** would push evidence up to team leads who have no reason to hold it.
- **The right answer:** disable Grant Access Using Hierarchies on
  `Consent_Record__c`, and grant access through a sharing rule to a named
  compliance group.
- The manager can still see *how many* consent records their team processed, via
  a role-scoped dashboard, without being able to read the evidence.

### The cost

Changing this setting triggers a sharing recalculation for that object, exactly
like an OWD change. Plan it with the Phase 2 change checklist: inventory, model
before and after, size the window, define rollback.

### Checkpoint

A manager can see their reports' Accounts but not their Claims. Nothing else
changed. What are the candidate causes, in the order you would check them?

**Answer.** (1) Grant Access Using Hierarchies is disabled on Claim__c - check
Setup first, it is the most common cause and costs nothing to verify. (2) The
Claims are owned by users in a different subtree - check whether the reports
actually hold the claims. (3) The claims are related to accounts the manager
cannot see, so parent/child access never arrives. (4) A restriction rule removes
the access. The point is the order: the cheapest, most common cause first.

---

## 4. Propagation direction, and the sibling problem

Sharing propagates **upward only**. A manager sees their reports' records; a
report never sees their manager's. This asymmetry is worth stating explicitly
because scenario questions lean on it.

### The sibling problem

Two managers at the same level cannot see each other's records through the
hierarchy. This is the single most common reason a role hierarchy is not enough:

- **Cross-functional review** - an underwriter needs a clinician's claims. Different branches of the tree.
- **Peer collaboration** - two regional managers cover the same national account.
- **Project membership** - a six-person review board spanning four departments, with no reporting relationship.
- **Matrixed coverage** - a field agent reports to an area manager but works across three regions.

All four are solved by sharing rules with a group target (Phase 4), teams
(Phase 5) or Apex (Phase 7). Recognising *which* situation you are looking at is
the skill.

> **Heuristic.** If the requirement can be phrased "they work for them", the
> hierarchy is right. If it is phrased "they need to see them", it is not. The
> exam phrases almost everything as "need to see", which is why the hierarchy
> answers fewer questions than candidates expect.

### Structural limits

Hierarchies have practical depth limits, and very deep trees carry performance
cost because the implicit-sharing calculation walks the path. Design the tree to
match the organisation, not to model every dotted line. A hierarchy that models
the real reporting structure is defensible; one that models access requirements
is not.

---

## 5. Roles as sharing rule targets

Roles have a second job that is easy to underrate. A sharing rule can name a role
as its target, and the grant then applies to everyone in that role **and everyone
below them in the hierarchy**.

| Target | Who receives the grant | Maintains itself? |
|---|---|---|
| A role | Everyone in the role and below it in the hierarchy | Yes - follows the org chart |
| A public group | Exactly the group members | No - someone must add people |
| A queue | Whoever is in the queue now | No - follows ownership, not membership |

**Efficient:** one rule target covers a whole subtree, so you never maintain a
group against the org chart.

**Also a trap**, because the grant is broader than the role name suggests. A rule
granting read to the role *VP Claims* also reaches every claims processor beneath
that VP.

### The Vantage decision

- **Role target is right** where the requirement genuinely is "everyone in this
  function at every level". Example: read access to `Provider_Network__c` for
  everyone in the Provider Operations tree.
- **Role target is wrong** for "the six people on the utilisation review board",
  where it hands access to several hundred people who sit below the same VP.

> **Rule of thumb.** When you choose a role target, write down who *else*
> receives the grant by virtue of being below that role. That sentence belongs in
> the model documentation; it is the most commonly omitted fact in a real access
> review.

---

## 6. Where the role hierarchy cannot help

Knowing the limits is worth as much as knowing the capability, because scenario
questions are usually built around the limits.

| Requirement | Why the hierarchy fails | Correct mechanism |
|---|---|---|
| Sibling managers see each other's Accounts | Sharing only propagates upward | Criteria-based rule with a public group target |
| A review board spanning four departments | No reporting relationship to hang it on | Public group as a rule target |
| Only records matching a business condition | The hierarchy has no criteria concept | Criteria-based rule |
| A named set of users per record | The hierarchy is per-org, not per-record | Account / Opportunity / Case team |
| A grant computed by business logic | The hierarchy is static configuration | Apex managed sharing |
| External users | External users have no internal role | Sharing sets, external account hierarchy |
| Subtracting access from a group | The hierarchy only ever adds | Restriction rule |

Read the last row carefully. It is the one that catches people: **the role
hierarchy is purely additive.** No configuration of a hierarchy can remove
access from a record.

### Checkpoint

A requirement states: "everyone in Claims can read every Claim, *except* agency
adjusters." Which mechanisms, and in what order?

**Answer.** Two, and the order matters for planning. First, a criteria-based
sharing rule granting read to the `Claims Operations` public group - that is the
additive layer. Second, a restriction rule removing access where the owner is in
the `Agency Adjuster` role. The restriction rule cannot remove Apex sharing or
ownership, so if any Apex grants exist on Claim__c, the control is incomplete and
that must be stated.

---

## 7. Vantage role hierarchy design

The shape proposed for the scenario org, and the reasoning for each decision.

```
CEO
├── VP Claims
│   ├── Regional Manager - Northeast
│   │   ├── Claims Team Lead - NE
│   │   └── Claims Team Lead - NE (overflow)
│   ├── Regional Manager - Southeast
│   │   └── Claims Team Lead - SE
│   └── Underwriting Lead
│       └── Senior Underwriter
├── VP Care Services
│   ├── Care Coordinator Lead
│   │   └── Care Coordinator
│   └── Clinical Escalation Lead
├── VP Provider Operations
│   └── Provider Relations
└── VP Revenue Cycle
    └── Collections Lead
```

| Decision | Reasoning |
|---|---|
| Claims, Underwriting and Provider Operations under different VPs | Creates the sibling problem deliberately, so the rule-based mechanisms are exercised rather than theoretical |
| Care Coordinators placed under VP Care Services, not Claims | Access to members follows the care relationship, which is an operational fact, not an access workaround |
| Depth limited to four levels | Every extra level costs recalculation time and makes the sibling problem worse |
| No regional access roles | Regions are served by public groups as rule targets, keeping the org chart honest |

### Checkpoint

A new region opens. Someone proposes adding a `Regional Claims Access - West`
role under VP Claims so Western agents inherit claims visibility. What is the
correct response?

**Answer.** Reject it. Every claims processor beneath that role would inherit the
grant, including the entire Northeast and Southeast teams if the role sits at
the wrong depth, and the org chart now carries a node that means nothing. Add a
`Claims Review - West` public group, name it as the target of the existing
criteria-based rule, and add the named agents. Same effective access, no
fabricated reporting line, and the grant no longer leaks upward.

---

## 8. Reading an org's role posture in five minutes

For an inherited org, this is the fastest useful diagnostic in the model.

1. **Export the role tree.** Setup, then Roles. Look for roles named after
   permissions or access rather than after functions.
2. **Check each object's Grant Access Using Hierarchies setting.** Any object
   with it disabled on a standard object is worth a sentence in your findings.
3. **Count users per role.** A role with three thousand users is functioning as a
   group, whatever its name.
4. **List the sharing rules that target a role.** Each one reaches everyone below
   that role, which may be far more than the rule's name implies.
5. **Look for duplicate sibling grants.** If two roles at the same level both
   need access to the same records, the hierarchy was probably already
   supplemented with rules - find those rules.

### Checkpoint

You find a role named `Data Steward` holding 2,800 users, all with implicit
access to every Account beneath the Chief Data Officer. What is your finding,
and what is the migration?

**Answer.** The role is functioning as a public group, and it grants far more
than stewardship requires - everyone in it can see every account in the division,
which includes 2.4M member records through parent access. Migration: create a
`Data Stewards` public group with the 40 people who actually steward data, point
the existing sharing rules at the group, migrate the 2,800 users to roles that
match their real function, and demote `Data Steward` to the handful of people who
genuinely oversee the function. Effective access is preserved for the 40; the
2,760 others get what their real jobs require.

---

## What's next

The hierarchy handles "they report to them". Everything else needs a different
tool. Phase 4 covers the workhorse: sharing rules, and the three kinds of group
you can use as their target.
