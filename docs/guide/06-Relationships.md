# Phase 6: Relationships - Parent, Child and Ancestor Sharing

This phase is tagged **Access to Records**, the 39% domain, and it covers the
objective *explain implicit sharing via hierarchies, Salesforce Sharing, and
Salesforce Sharing settings* - specifically the part of implicit sharing that
arrive because of how you modelled the data rather than because of anything you
configured.

This is the mechanism most likely to hand you more access than you intended,
because there is no Setup screen controlling it, no rule, and no record of the
grant.

## Learning Objectives

By the end of this phase you will be able to:

- Describe the parent/child and ancestor implicit-sharing rules precisely, in both directions.
- Predict the blast radius of sharing a single low-level record.
- Design relationship fields so that the implicit grants they create are acceptable.
- Explain how a roll-up and a lookup differ in the access they propagate, and why a denormalised copy is safer.

---

## 1. The rule nobody configures

Between two records joined by a relationship, access flows **both ways** without
any sharing configuration. This is implicit sharing via the data model, and it is
the mechanism most likely to over-grant.

### Parent/child

If you can see the child, you can see the parent. If you can see the parent, you
can see the children. Both directions, unconditionally, for every user type, on
every object that has the relationship.

### Ancestor

Ancestor access runs **up** the chain: see a grandchild and you get the child and
the parent.

The complementary statement is the one people get wrong: **you do not get the
descendants of an ancestor automatically**. See an Account and you do not get
every Contact on it.

That asymmetry is real, and it matters enormously:

- Granting access to a **parent** record is a bounded action. You hand over a
  known set of children.
- Granting access to a **child** record is unbounded. You hand over the parent,
  and the parent brings every sibling.

### Checkpoint

You share one `Claim__c` with a user. Name everything they now have.

**Answer.** The Claim, its `Member__c`, and everything else hanging off that
Member - sibling claims, consent records, access requests. Plus the Account, via
ancestor access up the chain. And if any of those is a child of something else,
the chain continues upward. The only things they do **not** get are the
descendants of the Account, which ancestor access does not deliver.

---

## 2. Lookup versus master-detail, from a security angle

Both relationship types propagate implicit access. They differ in whether the
child can exist without the parent, and that difference has direct security
consequences.

| | Master-detail | Lookup |
|---|---|---|
| Child can exist alone | No | Yes |
| Parent deleted | Children deleted or blocked | Children orphaned or nulled |
| Roll-up summaries | Required | Not possible |
| Implicit sharing between them | Yes, both ways | Yes, both ways |
| Cross-object security control | **Very low** - the child is inseparable | **Higher** - the link is a reference you can break |
| Vantage use | Consent evidence attached to a Member | A claim references a provider who may work for another org |

The row that matters most is the second-from-last one.

**A master-detail child cannot be secured independently of its parent**, because
it cannot be separated from it. If `Consent_Record__c` is a master-detail child
of `Member__c`, then no configuration can let a compliance auditor read one
consent without reading the member record. The isolation does not exist.

> **Design rule.** If a record must be independently securable, it cannot be a
> master-detail child of the record it must be separable from. Use a lookup plus
> explicit sharing. Conversely, if you choose master-detail for data-integrity
> reasons, you have also chosen a coupling of access - and you should document it.

For the exam, keep the two ideas separate: **implicit sharing exists either way**.
What differs is data integrity, ownership, roll-ups and therefore how
independently securable the record can be. "Lookup shares more than master-detail"
is a wrong answer.

---

## 3. Calculating the blast radius

Before you share a record, you should be able to name what comes with it. This is
a habit, and it is the difference between a controlled grant and an incident.

### The traversal method

1. Start at the record. Confirm the object and the Id.
2. Walk down every child relationship. Each child record is included.
3. From each child, walk down again. Recurse until no child relationships remain.
4. Walk up the parent and ancestor chain. Each of those records is included.
5. For each included record, note what else is reachable from it via sharing
   rules, teams or Apex that you did not intend.

Steps four and five are where the surprises live. **Upward is bounded and
predictable; downward is where record counts explode.** At Vantage, one
`Member__c` with 900 claims, 4 consent records and 3 access requests is over 900
records of consequence from a single grant.

> **Never share a child record to give someone access to a parent.** Share the
> parent. If you need to share a child without its parent, you cannot - the
> mechanism does not allow it, which is precisely why child-level shares are so
> dangerous: **you cannot make them surgical.**

### Checkpoint

An agent needs access to exactly one claim out of 900 on a member. What do you
do?

**Answer.** You cannot do it through record sharing, because sharing the claim
also shares the member and therefore its siblings. The options, in order of
preference:

1. Reconsider whether the agent needs the record at all, and whether a
   de-identified summary object would serve.
2. Use an Apex sharing grant plus FLS restriction, so the sensitive fields remain
   unreadable, accepting that record access is broader.
3. Give access to the member and control claim visibility separately.

What you must **not** do is share the single claim and assume it is scoped.

---

## 4. Denormalising when the blast radius is the problem

If the coupling of implicit sharing is unacceptable, the answer is to change the
shape of the data rather than fight the platform.

### Technique 1: the roll-up snapshot

Copy the minimum needed data from the parent onto the child as its own fields,
then sever the relationship. A `Claim_Summary__c` with a denormalised
`Member_Name__c` and a lookup used only for reporting can be shared independently
of the Member.

> **A denormalised copy is a copy, and copies drift.** You now own the problem of
> keeping it correct, and a stale summary is a wrong answer presented confidently.
> Only do it where the security benefit outweighs the integrity cost, and give it
> a named owner.

### Technique 2: the reportable relationship

Keep the lookup for reporting and integrity, but put the sensitive value on the
child as a separate field the user can see. The user reads the claim; the lookup
to the member exists but the member is not shared with them because you never
granted the child in the first place.

### The mistake to avoid

Creating a **new** relationship to solve an access problem and thereby importing
the same implicit sharing one level over. Before adding any relationship, ask what
access it will implicitly grant, and to whom.

---

## 5. Designing Vantage's object graph

Apply the lesson to the actual object graph and the design decisions fall out.

| Relationship | Choice | Security consequence you are accepting |
|---|---|---|
| Member__c to Account | **Master-detail** | Any Account access exposes every member on it |
| Member__c to Account (alternative) | Lookup | Account access no longer implies member access; more rules required |
| Claim__c to Member__c | Lookup | Sharing a claim still exposes the member - accept or denormalise |
| Consent_Record__c to Member__c | **Master-detail** | Consent is inseparable from the member; isolation is impossible |
| Claim__c to Provider_Network__c | Lookup | Provider access does not imply claim access |
| Access_Request__c to Member__c | Master-detail | Requests readable only by someone who can read the member |
| Claim__c to Broker__c | Lookup | Broker access implies only claim access, not the member |

### The highest-impact decision in the model

The Member-to-Account choice. Master-detail is the obvious choice for data
integrity and it is defensible. But it means the moment anyone sees a Vantage
Health account, they see **2.4M member records**.

That makes the Account object the most sensitive record in the org, and the one
most worth protecting with something other than sharing rules.

> **An architect-level answer, worth writing out in full.** Choose master-detail
> for integrity, then treat Account as the primary control point: protect it with
> object permissions, a clean OWD, and FLS on the member fields that matter. Do
> not try to solve Account visibility with record-level cleverness, because the
> record count makes it the wrong place to be clever.

---

## 6. The verification method

The traversal method should be run against real data, not reasoned about. This
is the procedure, and it is repeatable at any org.

```sql
-- Step 1: the record and its direct children
SELECT Id, Name FROM Member__c WHERE Id = :memberId

-- Step 2: all child claims on that member
SELECT Id, Claim_Number__c FROM Claim__c WHERE Member__c = :memberId

-- Step 3: consent records and access requests
SELECT Id FROM Consent_Record__c WHERE Member__c = :memberId
SELECT Id FROM Access_Request__c WHERE Member__c = :memberId

-- Step 4: the ancestor chain, walked up from Member
SELECT Id, Name, ParentId FROM Account WHERE Id IN (
    SELECT AccountId FROM Member__c WHERE Id = :memberId
)

-- Step 5: siblings of the shared record, reachable through the parent
SELECT COUNT(Id) FROM Claim__c WHERE Member__c = :memberId
```

Then, for each included record, add what is reachable from it by sharing rules,
teams or Apex - which is where step 5 of the traversal method earns its place.

### Checkpoint

Your traversal of one `Member__c` predicts 907 reachable records. You grant the
single claim to a test user and they report seeing 1,412. What have you missed?

**Answer.** Something reachable by a mechanism other than the relationship graph.
The usual candidates, in order: a sharing rule that targets a group the user
belongs to and whose criteria match the member; team access via an access field;
an Apex sharing grant; account-level sharing that pulls in sibling claims owned
by a different user but visible through the Account; or parent/child access from
a *different* branch of the graph - for example the user's access to the Claim's
related Provider pulling in further records. The lesson is why step 5 exists:
the relationship graph is the floor of the blast radius, not the ceiling.

---

## 7. Design review questions

Five questions to ask of any data model before you review the sharing
configuration.

1. For each master-detail relationship, can the child be independently secured? If not, is that acceptable?
2. For the highest-cardinality child object, how many records are reachable from one parent? Is that number written down anywhere?
3. If a requirement says "share one record of object X", does X have a parent with high fan-out? If so, the requirement cannot be met as written.
4. Which object in the model is the most sensitive record in the org, and is it treated as a primary control point?
5. For each denormalised copy, who owns its correctness and how is staleness detected?

### Checkpoint

A requirement asks for read access to "clinical claims only, no member details,
for external broker users". Walk through the mechanism you would propose.

**Answer.** Record-level access cannot express this: sharing a Claim__c grants its
Member__c through parent/child access. So the design must remove the record from
the broker's reach rather than restrict fields. The proposal is a
`Claim_Summary__c` object - claim number, status, dates, amount, broker-facing
segment - with no relationship to Member__c, or a relationship the brokers never
receive access to. Share that to the broker's sharing set, and keep `Claim__c`
internal. This is the Phase 13 "separate summary object" pattern arriving early,
and it is the correct answer whenever the analytics requirement and the
confidentiality requirement conflict.

---

## What's next

Phase 6 gave you the grants you did not configure. Phase 7 covers the grants you
write yourself: Apex managed sharing, which is the only mechanism that can
compute access - and the only one with no expiry.
