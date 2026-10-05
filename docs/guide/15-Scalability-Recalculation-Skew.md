# Phase 15: Scalability, Recalculation and Skew

This phase is tagged **Records**, the 39% domain, and it covers the objectives on
*sharing design at scale* and *scalable sharing designs*. Everything in the
previous fourteen phases was about being correct. This phase is about staying
correct when the volume makes correctness expensive.

The framing: **sharing is a maintained derived state, not a calculation performed
at read time.** That one idea explains every performance characteristic of the
model.

## Learning Objectives

By the end of this phase you will be able to:

- Explain why record access is maintained state, and what that implies for recalculation cost.
- Distinguish asynchronous, scheduled and developer-initiated recalculation, and choose between them.
- Identify and mitigate access skew on high-volume objects.
- Design a sharing model for Vantage that survives 2.4M members, 380k claims and 1,200 agents.

---

## 1. Why record access is maintained state

When you evaluate who can see a `Claim__c`, you are not computing anything. You
are looking up rows in `ClaimShare` - or relying on the fact that the object is
Public Read Only so no rows are needed at all.

| Access source | Stored where | Recalculated when |
|---|---|---|
| Role hierarchy | `setup__HierarchyHistory` and denormalised role membership | Role or user changes |
| Sharing rules | `ObjectShare` / `RuleRow` | Rule changes, and **data changes** that affect criteria |
| Manual shares | `ObjectShare` | Explicit user action |
| Apex sharing | `ObjectShare` | Your code |
| OWD Public | Nothing to store | Never - there is nothing to compute |

> **The consequence that drives everything else.** Access is evaluated against
> stored state, so **the correctness of your access model depends on that state
> being current.** Recalculation is the mechanism that makes it current, and it is
> the mechanism that costs you.

This is why access-related errors cluster around *timing*. A sharing rule is
correct, and the data is correct, and the user still cannot see the record - because
the share rows have not been built yet.

### Asynchronous versus synchronous recalculation

| | Asynchronous | Developer-initiated |
|---|---|---|
| Triggered by | Data or config change | You, from Setup |
| Runs | In the background | On demand |
| Duration | Minutes to hours | Can run for hours |
| Available | Configurable | **Org-wide / partial, with limits** |
| Right for | Normal operation | Recovery after a bulk change |

> **Choose asynchronous for normal operation, developer-initiated for recovery.**
> Developer-initiated recalculation is a repair tool, not an operating mode. It
> holds locks, it is slow, and running it while users are working is a
> self-inflicted incident.

### Checkpoint

A bulk update changes 200,000 `Claim__c` records' `Status__c`, and a sharing rule
keys on `Status__c`. Describe what happens to access.

**Answer.** The rule's criteria no longer match those 200,000 records, so access
**changes** - and access is stored state, so the share rows must be rebuilt.

Asynchronous recalculation is triggered, and **for a period the share rows
represent the old status**. Users see records they should no longer see, and
cannot see records they now should. The window is minutes to hours at this volume,
which means it is not a bug to be explained afterwards - it is expected behaviour
to be communicated.

**The design mitigation** is to avoid criteria that change frequently on
high-volume objects. A rule keyed on `Status__c` recalculates on every status
change; a rule keyed on a stable attribute such as region or owning business unit
does not. **That is a design decision, made at data-modelling time, and it is
invisible until the volume arrives.**

---

## 2. What triggers recalculation

Knowing the triggers tells you where the cost is.

| Trigger | What is recalculated |
|---|---|
| A record's fields change, affecting rule criteria | That record's shares |
| A record is inserted or deleted | That record's shares |
| A user changes role | That user's access across the hierarchy |
| A group membership changes | Access for all members of that group |
| A role or group changes | Broadly, potentially org-wide |
| OWD changes | **Everything, on that object** |
| Apex sharing is added or removed | Affected records |

> **Group membership is the underappreciated one.** Adding one user to a
> group of 500 recalculates access for **500 users**, not one. At Vantage, with
> groups organised by region and specialty, a single membership change is a
> moderate operation, and a bulk membership load is an incident.

### The Spring '27 change

**Spring '27 introduces asynchronous recalculation** - the platform begins
moving recalculation work off the request path and into background processing.

| | Before | After (Spring '27) |
|---|---|---|
| Recalculation | Largely synchronous within the transaction | Asynchronous where supported |
| User experience | A save that triggers recalculation may be slow or time out | Saves complete faster; access settles afterwards |
| Immediate consistency after a change | Closer to immediate | **A window where access is not yet updated** |

> **The design implication is about testing and communication, not about
> configuration.** Any test or process that assumes access is correct immediately
> after a save becomes unreliable. The compensating pattern is to **verify access
> empirically, with a wait and a retry**, rather than asserting once - which is
> exactly how you should have been testing external access in Phase 9 anyway.

### Checkpoint

An automated test creates a claim, then asserts that a broker can see it, and it
fails intermittently. What is the most likely explanation under Spring '27?

**Answer.** **Asynchronous recalculation.** The save completed and the test's
assertion ran before the share rows were built. It is intermittent because the
race window is short and sometimes the recalculation wins.

The fix is in the test, and the shape of the fix is the lesson: poll for the
expected access with a timeout rather than asserting once. That makes the test
honest about the platform's behaviour instead of encoding a timing assumption.

If it also fails in production integrations, the same pattern applies to any code
that creates a record and immediately reads it back **as a different user**.

---

## 3. Access skew

**Access skew** is a load pattern: a small number of records are accessed by a
very large number of users, at high frequency.

| Skew type | Example at Vantage |
|---|---|
| **Record skew** | One `Member__c` with 400 associated claims, all accessed by the same panel daily |
| **Field skew** | A formula field on a high-volume object recomputed on every access |
| **Sharing skew** | A rule granting access to a broad set matched by nearly every record |
| **Parent skew** | One large account with thousands of child records |
| **Role skew** | A role with an enormous subtree - 600 of 1,200 agents under one manager |

> **Skew is not inherently bad.** Concentrated access to a small set of data is
> efficient. The problem is concentrated access to a large set, or concentrated
> *writes* to skewed records.

### Why skew hurts

| Effect | Explanation |
|---|---|
| Row-lock contention | Concurrent edits to the same rows queue behind each other |
| Share row explosion | One popular record shared with 1,000 users is 1,000 `ObjectShare` rows, recalculated on every change |
| Cache pressure | Hot records evict working data |
| Recalculation amplification | A change to a skewed record triggers disproportionate work |
| Page load variance | One component waiting on a locked row makes the page slow for everyone |

### The mitigations that exist

| Mitigation | Effect | Cost |
|---|---|---|
| Reduce share volume on skewed records | Fewer rows, less recalculation | Requires OWD or rules that do not fan out to everyone |
| Use OWD Public Read Only where defensible | **No share rows at all** | Requires FLS and field masking to carry the field-level boundary |
| Introduce a **skew indicator field** on `AccessRequest__c` | Filters queries away from unassigned work, reducing reads | An extra write per assignment change |
| Partition hot data by team or region | Spreads contention | More objects to manage |
| Batch Apex with careful scoping | Fewer row locks per transaction | Requires idempotent, restartable logic |
| Move heavy processing to **platform events and subscribers** | Decouples write load from user transactions | Eventual consistency |

> **The skew indicator is the one specific, actionable design element here**, and
> it is worth understanding precisely because it works by *avoiding reads* rather
> than by optimising them.

`AccessRequest__c` is the queue every agent works from. Each agent's dashboard
queries "requests assigned to me". With 1,200 agents polling and thousands of rows
in that queue, you have a read-hot table that grows without bound.

An `Is_Assigned__c` indicator, set true when a request is assigned and false when
it is closed, lets the dashboard query `WHERE Is_Assigned__c = TRUE AND
OwnerId = :UserInfo.getUserId()`. The query returns a small, stable result set
instead of a large filtered scan of the whole queue.

> **Note what this does and does not fix.** It reduces **read** pressure
> dramatically. It does not reduce write pressure, because every assignment change
> is now two writes - the assignment, and the indicator. **It is a read
> optimisation, and its cost is a write amplification that stays small because
> assignment changes are far rarer than dashboard refreshes.**

---

## 4. The recalculation decision

| Approach | Cost | Recalculation | Use when |
|---|---|---|---|
| Role hierarchy | Lowest - maintained by the platform | Automatic on role change | The access model genuinely is positional |
| OWD Public Read Only | **Lowest - nothing to compute** | **None** | Everyone can see everything and FLS carries the boundary |
| Teams | Moderate | On team membership change | Access is membership-based, not positional |
| Sharing rules | **High** - share rows per record per user | On data **and** config change | Access is genuinely attribute-based |
| Apex sharing | **Highest** - your code and your transactions | Only when your code runs | Logic cannot be expressed declaratively |
| External sharing sets | Moderate, per guest user | On rule and data change | External personas with account relationships |

> **The performance ordering to remember.** Role hierarchy and OWD Public are
> cheap because they maintain almost nothing. **Sharing rules are expensive
> because each matching record produces a share row.** Apex sharing is the most
> expensive because it runs in your transaction and holds locks while it does.
>
> The architect's job is to **push access up this list** - to find a design where
> the answer is "they can see it because of their role" rather than "because a rule
> matched and a row was written".

### The ordering that makes sharing expensive

Each record in a criteria-based sharing rule can produce **one share row per
matching user or group member**. A rule whose criteria match 380,000 claims for
800 users is not 380,000 rows.

| Scenario | Rows written |
|---|---|
| Rule targets a **group** of 800 users matching 380,000 claims | 380,000 rows - **the group is the unit** |
| Rule targets **individual users** matching the same claims | Potentially 304,000,000 rows - **not viable** |

> **Target groups, never individual users, in a criteria-based rule.** This is
> the single highest-leverage performance decision in the whole phase, and it is
> purely about the target of the rule rather than its criteria.

### Checkpoint

A sharing rule grants `Vantage_Compliance_Auditor` group members read on
`Claim__c` where `Requires_Review__c = true`. 380,000 claims match, and the group
has 800 members. How many share rows, and what is the fix if it is too many?

**Answer.** **380,000 rows** - one per matching record, with the group as the unit.
This is correct and viable.

Had the rule been built by naming individual users, or had the criteria matched
everything, it would be 304 million rows - not viable, and it would degrade every
save on the object.

The general rule: **target the broadest unit that expresses the intent** - a
group, a queue, or a role. Every narrowing of the target unit multiplies the row
count by the number of users.

---

## 5. Volume thresholds and where the design breaks

There is no magic number, but the shape of the failure is predictable.

| Volume | What starts to matter |
|---|---|
| Under ~50k records | Almost anything works; rules and Apex sharing are fine |
| ~50k-200k | Rule criteria changes trigger noticeable recalculation; share row counts start to matter |
| ~200k-1M | **Sharply expensive.** Apex sharing in transactions becomes a bottleneck. Criteria churn is painful. |
| Over 1M | Only role hierarchy, teams and OWD Public scale comfortably. Rules and Apex sharing need careful design and may need rethinking |

Vantage's 2.4M members and 380k claims put `Member__c` firmly in the last row.
**That is the single most consequential number in this phase**, and it dictates
the whole access architecture.

### What that means for Vantage concretely

| Object | Volume | Access approach |
|---|---|---|
| `Member__c` | 2.4M | **OWD Public Read Only + FLS + role hierarchy + teams.** No criteria-based sharing rules on this object. |
| `Claim__c` | 380k | Criteria-based rules acceptable **if** they target groups and use stable criteria |
| `Consent_Record__c` | ~1M | **OWD Private, access via Apex sharing or a narrow rule.** High sensitivity, high volume - a bad combination for rules |
| `Provider_Network__c` | 12k | Rules fine; volume is not a factor |
| `Access_Request__c` | ~5k active | Rules fine; skew indicator handles the read load |

> **Why `Member__c` cannot use criteria-based sharing rules.** At 2.4M records, a
> rule whose criteria change - for any reason - triggers a recalculation over a
> large proportion of the org. This is not a slow query; it is sustained
> background load on every save to the object. **At that volume, access must come
> from OWD, roles, teams and FLS - the mechanisms that maintain almost no state.**

### Checkpoint

`Member__c` holds 2.4M records. A requirement says "region managers in the
Northeast can read members in their region". Which mechanism?

**Answer.** **The role hierarchy**, with regions as roles. Region membership is
positional, and role hierarchy maintains access without per-record share rows.

Criteria-based sharing rules would require a share row per matching record per
matching user, and any criteria change - a member moving region - triggers
recalculation across a large proportion of 2.4M records. **This is the same access
policy expressed in a way that scales.**

If "region" is a field on the member rather than a property of the person's role,
that is a **data-modelling correction**, not a technical workaround: move the
region to the user or the role, and the cheap mechanism becomes available again.

---

## 6. Designing for the volume

Six practices, each tied to a mechanism above.

1. **Push access to OWD and roles.** Use Public Read Only where the object is not sensitive, and roles where the policy is positional. This is the highest-leverage decision.
2. **Target groups, not users.** In every rule. The row-count multiplier.
3. **Use stable criteria.** Rules keyed on attributes that do not change - region, business unit, a classification flag set once. **Avoid criteria on fields that change in normal operation.**
4. **Keep Apex sharing out of user transactions.** Where Apex sharing is unavoidable, run it in batch with idempotent, restartable logic.
5. **Design for eventual consistency.** Under Spring '27 asynchronous recalculation, verify with retry rather than asserting immediately. This is a testing change and a communication change.
6. **Instrument the hot paths.** Dashboard query counts, recalculation queue depth, and per-object save latency are the signals that tell you a design is under strain before users report it.

### The Apex sharing discipline

Where Apex sharing is genuinely required - and at Vantage it is, for
`Consent_Record__c`:

```apex
public with sharing class ConsentAccessService {
    private static Set<Id> consented(Set<Id> memberIds, Set<Id> consentIds) {
        Set<Id> allowed = new Set<Id>();
        for (Consent_Record__c c : [
            SELECT Id FROM Consent_Record__c
            WHERE Member__c IN :memberIds AND Id IN :consentIds
            WITH USER_MODE
        ]) {
            allowed.add(c.Id);
        }
        return allowed;
    }
}
```

| Discipline | Why |
|---|---|
| One method owns the sharing decision | Otherwise it is spread across callers and missed in one |
| Declare user mode explicitly | Even where it is now the default |
| Keep the query narrow - `IN` on ids already in hand | Avoids loading the object to filter in code |
| No DML inside the loop | Row locks and partial-failure risk |

### Checkpoint

Which single decision at Vantage reduces sharing cost the most, and why?

**Answer.** **Making `Member__c` OWD Public Read Only and carrying the boundary with
FLS, roles and teams instead of rules.**

At 2.4M records, criteria-based rules on `Member__c` mean share rows maintained
across the whole object and recalculation triggered by criteria churn. OWD Public
Read Only maintains **no share rows at all**, and roles and teams maintain their
state efficiently. FLS - which Phase 12 has already designed - then carries the
field-level boundary, with field masking for the presence-not-content cases.

It is the right trade because the alternative is not "slower sharing" but a design
that degrades as the org grows, and Vantage is already past the volume where that
is acceptable.

---

## Checkpoint

The business asks for three more sharing rules on `Member__c` - by region, by
plan tier, and by care programme - to support three new dashboards. What is your
response?

**Answer.** Push back on the mechanism, and propose the alternative concretely.

**The problem.** `Member__c` holds 2.4M records. Three more criteria-based rules
means three more sets of share rows across that object, and each rule's criteria
becomes a recalculation trigger on every relevant save. Plan tier in particular
changes when a member upgrades - so that rule recalculates on a business event,
continuously, across a large share of the org.

**The proposal.** Model each of the three as what it actually is:

- **Region** is positional - it is a property of the user's role. Role hierarchy. No rows.
- **Care programme** is membership-based - teams. Minimal rows, recalculated only when team membership changes.
- **Plan tier** is a data attribute - and this is the one that genuinely needs a data-model change. Either it belongs on the user, where a role or team can express it cheaply, or the dashboards should filter by tier in the report rather than by access, because **the dashboard does not need a share row to filter**.

That last point is the strongest argument: **a dashboard filter is not an access
requirement.** If the only purpose is to show a subset, filter in the report. Share
rows are for access boundaries, and using them for presentation creates cost with
no security benefit.

If the business genuinely needs a new access boundary, that is a legitimate
requirement and I will design it - but as a role or team, and after checking
whether it can be expressed on a lower-volume object.

---

## What's next

Phase 15 handled scale inside the record model. Phase 16 moves to everything
outside it: licences, sandboxes, test data, tooling and the environment
constraints that decide what you can actually build.
