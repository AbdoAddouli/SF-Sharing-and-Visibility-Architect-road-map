# Phase 4: Sharing Rules, Groups and Queues

This phase is tagged **Access to Records**, the 39% domain. It covers the
objective *recommend the appropriate sharing mechanism* more thoroughly than any
other phase, because sharing rules are the mechanism scenario questions reach for
most often - and the one where confident wrong answers are most common.

## Learning Objectives

By the end of this phase you will be able to:

- Build a criteria-based sharing rule correctly, including the settings people leave at default and regret.
- Predict how multiple rules combine, and state precisely how access is unioned versus intersected.
- Choose between public groups, queues and sharing groups on the merits rather than by habit.
- Use restriction rules to take access away, which is the only declarative mechanism that can.

---

## 1. What a sharing rule actually is

A sharing rule is a declarative grant with a condition. That is the entire idea:
*if the record matches this, then these people get this access*. Everything else
is configuration surface.

### The five things every rule needs

1. **A target** - who receives access. All rules require a group or a role; queues are not valid targets for criteria-based rules.
2. **An access level** - Read Only, Read/Write, or Full Access. Full Access on a rule deserves written justification.
3. **A scope** - which records the rule looks at. Always one of the four types below.
4. **A criterion** - which of those records actually get shared.
5. **An included-record count** - whether records already owned by a target member are skipped.

> **The defining property.** Sharing rules **never reduce access**. They only
> ever add. This single fact shapes everything else in this phase: if a
> requirement says "everyone in the compliance group *except* contractors", no
> amount of sharing-rule configuration will express it.

### The four rule types

| Type | Selects records | Typical Vantage use |
|---|---|---|
| Object-based | Any record of the object, with no criterion applied | Everyone in Provider Operations reads every `Provider_Network__c` |
| Criteria-based | Only records where the criteria evaluate true | Claims with Priority = Critical go to the Clinical Escalation group |
| Territory-based | Records belonging to a territory, resolved via assignment rules | Territory access for field agents; Phase 9 |
| Manager-based | Records owned by a manager's reports | Delegation of a manager's queue during absence |

**Object-based rules are criteria-based rules with the criteria left off.** They
are the same feature with a shorter setup, and they are the fastest way to
over-share an entire object by accident.

### Checkpoint

A requirement: "all employees can read all `Provider_Network__c` records". Which
rule type, and what is the risk?

**Answer.** An object-based rule with a public group target. The risk is that it
is unconditional and permanent: every record of the object is exposed to the
group, including any not yet created, and removing the rule later removes access
for everyone with no warning. It is also a symptom - a field-level permission set
plus the rule is often sufficient, and an object-based rule on a large object is
expensive to recalculate.

---

## 2. Criteria that survive contact with real data

The criteria editor looks simple and fails in ways that produce real incidents.
Four traps account for most of them.

### Trap 1: the filter is not what you wrote

A formula filter is a string that must evaluate to true. A malformed filter does
not error visibly - it silently shares nothing, or shares everything, depending
on how it was written. This is the worst failure mode in the platform: the rule
looks configured, Setup looks fine, and the exposure or the silence is invisible
until someone tests it.

**Defence.** For every rule you create, write down the record count it should
match. Then measure it. A rule matching zero records is a bug you can catch
today; a rule matching 300,000 when you expected 30 is an incident you cannot.

### Trap 2: blank and null are not the same as false

A checkbox criterion like `Priority__c = true` does not match records where the
checkbox is empty. If half your claims never have the checkbox populated, the
rule matches half the population you expected.

### Trap 3: formula fields reference stale values

A criterion built on a formula field evaluates against the formula result at
recalculation time, not at edit time. If the formula depends on a related
record, changes on that related record will not retrigger the rule on the sharing
object - a leading cause of "access randomly disappears" reports.

### Trap 4: unindexed filters are slow at recalculation

A filter that cannot use an index performs badly when recalculation runs. Large
objects with unindexed formula filters are a Phase 15 problem arriving early.
Note it now.

| Criterion pattern | Robust? | Failure mode |
|---|---|---|
| `Priority__c = 'Critical'` | Yes | None, if every record is guaranteed a value |
| `Priority__c != null` | No | Silent zero match on a formula field |
| `Is_Escalated__c = true` | Risky | An empty checkbox is not true |
| `Member__c.Segment__c = 'Oncology'` | Risky | Depends on a lookup value, not the shared record |
| `Days_Since_Filed__c > 30` | Risky | Formula field; drifts without retriggering the rule |

> **The habit worth building.** Prefer a picklist with a guaranteed default value
> over a checkbox or a formula. A picklist value is stored data, so it is
> indexed, comparable, and never null once the field is required.

---

## 3. How multiple rules combine

This is where scenario questions live, and where confident wrong answers come
from. There are two separate combination rules, and people conflate them.

### Combination rule 1: records in, union

Within a rule, multiple criteria are ANDed. Each criterion selects records; the
rule selects the **union** of everything it selects.

And here is the trap: a criterion on a checkbox includes three populations, not
two - checked, unchecked, and empty. `Is_Escalated__c = false` matches records
where someone *explicitly cleared it*, not records that were never touched.

### Combination rule 2: rules and users, union of grants

If any rule grants a user access to a record, the user has it. Access is
**additive** across rules, across roles, across teams, across Apex and across
manual shares. There is no subtraction anywhere in the declarative model.

### Where intersection does appear

The one place access is narrowed is the user's permission set and profile, which
cap what CRUD access even reaches records. So the effective answer to "can this
user see this field" is the **intersection** of two different systems - record
access from sharing, CRUD and FLS from the permission side - and neither knows
about the other.

| Situation | Result |
|---|---|
| Rule A grants Read to group G, Rule B grants Read/Write to role R, user is in both | Read/Write, via whichever grants more |
| Two criteria in one rule select overlapping records | Shared once, no duplication, no conflict |
| Rule grants access to a record the user has no object permission for | Still granted - it surfaces the day object access is added |
| Restriction rule removes access a sharing rule granted | Restriction wins, subject to the exemptions below |
| Apex sharing grants access a sharing rule excluded | Apex grant still stands - restriction rules target declarative sources only |

> **The last two rows together are a genuine architectural trap.** A restriction
> rule removes access granted by sharing rules, roles, teams and manual shares -
> but it does **not** remove access granted by Apex managed sharing, ownership,
> CRUD or FLS. If your control depends on being unable to see a record, do not
> build it on a restriction rule alone.

### Checkpoint

Rule 1 shares Claims where Priority = Critical with group Clinical Review at
Read/Write. Rule 2 shares Claims where Status = Open with role Claims Manager at
Read Only. A user is in Clinical Review *and* holds the Claims Manager role, and
the record is both Critical and Open. What access, and why?

**Answer.** Read/Write, via Rule 1. Both rules match, and grants union - the more
permissive wins. The role does not constrain the group's grant. Had they been
only in Claims Manager, it would be Read Only.

---

## 4. Groups, queues and sharing groups

The recipient of a rule is almost always a group. Salesforce offers three group
types and they are genuinely different things, not three labels for one concept.

| | Public group | Queue | Sharing group |
|---|---|---|---|
| Purpose | A set of people for rules, reports, Einstein features | A set of people who own work | A set of people who are all customers of one Account |
| Valid rule target | Yes | **No** | Yes - account sharing rules |
| Auto-populated | No | Yes, by ownership | Yes, by the AccountMember relationship |
| Stable when ownership changes | Yes | No | Yes |
| Vantage example | Clinical Escalation - 14 named clinicians | Claims Escalation Queue | Vantage Health Group account on a Member record |

### Queues are not rule targets

This is examinable and it surprises people. You cannot point a criteria-based
sharing rule at a queue. A queue is a dynamic set whose membership is defined by
who currently owns the records - and that dynamism is exactly why it cannot be a
target. A rule granting to a queue would chase ownership as it moved.

> **The question to ask.** "Is this group a fixed set of people, or a rotating set
> of owners?" Fixed set - public group as a rule target. Rotating owners - queue
> for ownership, plus something else for visibility.

### Sharing groups earn their name

A sharing group on an Account contains every contact at that Account, across
every contact record, and can be the target of a rule. It is the mechanism for
"every contact at this customer can see this project", and it is the target that
makes account-scoped external access work. Phase 9 leans on it heavily.

### The shape of the decision

- **Public group** for humans named by the org chart.
- **Queue** for humans named by the work.
- **Sharing group** for contacts named by the customer relationship.

Confusing them is a symptom of not having decided what the membership *means*.

### Recalculation order

Group-based rules are recalculated in a predictable order: sharing rules first,
then role hierarchy, then teams. That ordering matters mainly for diagnosing why
a record is visible, which is Phase 15 territory.

---

## 5. Restriction rules: the only declarative subtraction

A restriction rule **removes** access that other mechanisms granted. It is the
exception to "sharing only ever adds", and it is the correct answer to more
requirements than candidates expect.

### What restriction rules remove

- Access granted by sharing rules, both criteria-based and object-based.
- Access granted by the role hierarchy.
- Access granted by teams.
- Access granted by manual shares placed on the record.

### What they do not remove

- Access granted by **Apex managed sharing**.
- The record owner's own access.
- Full system administrator access.
- Anything about object or field permissions - a restriction rule never removes
  CRUD or FLS.

Restriction rules were designed for a specific pattern: **grant broad access for
efficiency, then carve out a sensitive slice.** A medical org grants all agents
read on Members for coordination, then restricts records flagged as belonging to
a VIP cohort. The pattern works, and it is worth recognising on sight because
scenario questions use it heavily.

### Restrict access to

| Option | Effect | Vantage use |
|---|---|---|
| Records not related to the user | Removes everything the other mechanisms granted | Never - silently breaks the whole model |
| Records owned by specified users | Removes access where a named owner holds the record | An agent cannot see claims owned by a named senior reviewer |
| Records owned by users in specified roles | Removes access where the owner holds a named role | Claim reviewers cannot see records owned by Legal |
| Records owned by specified roles, on the Users/Groups tab | The owner-role variant | The variant to reach for when "role" is the real business rule |

Read that table carefully. Options two, three and four look almost identical and
they are not. They differ in whether you are identifying the owner by **user**,
by the **group the owner belongs to**, or by the **role the owner holds**. Picking
the wrong one produces a rule that appears correct in Setup and grants the wrong
records.

### Checkpoint

You want all field agents to read all Members, except members flagged
`VIP_Cohort__c = true`. Which mechanisms, and what are the two main weaknesses?

**Answer.** A sharing rule granting Read to the Field Agents group, plus a
restriction rule removing access to records where `VIP_Cohort__c = true` and the
owner is in a specified role. **Weakness one:** the restriction rule cannot remove
Apex-managed sharing, so any Apex grant on Member__c re-opens the record.
**Weakness two:** it cannot remove FLS, so a user who cannot see the record can
still potentially query a sensitive field. Neither mechanism alone is
sufficient.

---

## 6. Limits, and the rules that break at scale

| Limit | Value | Behaviour at the limit |
|---|---|---|
| Sharing rules per object | 50 | Cannot create more without deleting |
| Total sharing rules per org | 300 | Org-wide ceiling |
| Criteria in one rule | 10 | Must split into a second rule - which unions, so mind the overlap |
| Filter length | Limited | Long filters are unindexable and slow at recalculation |

> **Splitting a rule does not narrow access.** Ten criteria in one rule, and one
> rule per criterion, produce the same set of shared records. The split version
> costs ten times the recalculation work and loses the single filter as an
> optimisation point. **Raise the limit in the org before you split by reflex.**

And the operational reality: every sharing rule change forces a recalculation for
that object, and every recalculation on a multi-million-record object is an
expensive operation with a real user-visible cost. Treat a rule change as a
release, not as configuration.

---

## 7. Vantage sharing rule inventory

The rules proposed for the scenario org, with the match-count discipline applied.

| # | Object | Type | Criteria | Target | Level | Expected match |
|---|---|---|---|---|---|---|
| R1 | Claim__c | Criteria | `Claim_Priority__c` in (Urgent, Critical) | Clinical Escalation group | Read Only | ~4% of claims |
| R2 | Claim__c | Criteria | `Review_State__c = 'Second Opinion'` | Underwriting Review group | Read Only | ~1,200 claims |
| R3 | Member__c | Criteria | `Member_Segment__c = 'Enterprise'` | Broker Portal Access group | Read Only | ~18,000 members |
| R4 | Provider_Network__c | Object-based | none | Provider Operations group | Read Only | 85,000 (all) |
| R5 | Consent_Record__c | Criteria | `Consent_Type__c = 'Research'` | Research Review group | Read Only | ~600 records |
| R6 | Access_Request__c | Criteria | `Request_Status__c = 'Escalated'` | Privacy Office group | Read/Write | ~400 requests |
| R7 | Claim__c | Restriction | `Is_VIP__c = true` | Owners in role `Agency Adjuster` | Removes access | ~9,000 claims |

| Decision | Reasoning |
|---|---|
| Consent_Record__c hierarchy sharing disabled in Phase 3 | Removes the upward flow of consent evidence; R5 becomes the only declarative path |
| No rule targets a role on Claim__c | Role targets reach whole subtrees; a named group is narrower and auditable |
| R3 targets a group, not the sharing sets mechanism | The broker requirement is internal-to-external; sharing sets handle the external side, Phase 9 |
| R7 is a restriction rule, not a criterion | The requirement is subtraction, which only restriction rules express |
| Criteria use picklists with defaults, never checkboxes or formulas | R1 and R2 depend on this; see trap 2 and trap 3 above |

### Checkpoint

R3 grants brokers read on 18,000 enterprise members. After recalculation, 640,000
members are shared. What has happened, and how do you find out?

**Answer.** The criterion matched more than intended. The likely cause is that
`Member_Segment__c` is a formula or a picklist that is frequently blank, and the
rule's filter was written as `= 'Enterprise'` on a field that is populated by a
process with a different default. Diagnose by querying the criterion's field
distribution: `SELECT Member_Segment__c, COUNT(Id) FROM Member__c GROUP BY
Member_Segment__c`. The discipline from section 2 exists precisely so you catch
this before the window, not after.

---

## 8. Auditing an inherited rule estate

For an org you did not build, this is the fastest route to a defensible findings
list.

1. **Export every sharing rule** across all objects. Note object, type, criteria,
   target and access level in one table.
2. **Find every object-based rule.** Each one is a blanket grant and needs an
   explicit business justification or removal.
3. **Find every rule whose target is a role.** For each, write down who *else*
   receives the grant by being below that role. That sentence is almost never in
   the original design document.
4. **Check for rules with no matching records.** Either the criterion is broken
   or the business need has disappeared. Both are findings.
5. **Look for duplicate coverage.** Two rules granting the same group access to
   overlapping records is a maintenance risk with no benefit.
6. **Find the restriction rules.** Most orgs have none, which usually means a
   subtraction requirement was met with a manual share somewhere. Find those too.

### Checkpoint

Your audit finds 47 rules on Account across 12 objects, of which 19 are
object-based. A stakeholder asks whether you can simplify. What is your answer?

**Answer.** Not by consolidation alone - simplification has to preserve the
*business meaning*, and 19 object-based rules may encode 19 genuinely different
business decisions. The correct approach is to classify each by the requirement
it serves, then look for the subset that serves the *same* requirement and can be
merged with one broader rule plus a restriction rule. Present the reduction as a
table of "rules before, rules after, requirements preserved" so the stakeholder
can see that nothing was dropped rather than assumed.

---

## What's next

Sharing rules are global: every member of a target gets every shared record of
that object. Phase 5 covers teams, which are per-record and lateral - the right
answer when the requirement is "these people work on *this* thing".
