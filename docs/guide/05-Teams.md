# Phase 5: Teams

This phase is tagged **Access to Records**, the 39% domain. It covers the
objective *describe the capabilities and limitations of user-based and
permission-based access*, and the parts of *recommend the appropriate sharing
mechanism* that deal with per-record collaboration rather than global grants.

Teams are the most misremembered mechanism in the platform. Not because they are
complex - they are not - but because they require two separate things to be
configured before they do anything at all, and a half-configured team is
indistinguishable from a broken one.

## Learning Objectives

By the end of this phase you will be able to:

- Explain the two ways a user can be added to a team and how that affects the grant.
- Configure team-based sharing correctly, including the two options most orgs get wrong.
- Choose between teams and public groups on the specific axes that make teams different.
- Reason about teams at volume, and about what happens when a record changes hands.

---

## 1. The problem teams solve

A team is a group of people who need access to each other's records **without a
reporting relationship**. That is the whole definition, and it is narrower than
it first appears.

The relationship between teams and roles is the key: **members of the same team
can access each other's records regardless of where they sit in the hierarchy.**
Access is lateral. It is the one declarative mechanism that does that.

### Teams at Vantage

- A utilisation review board: six claims specialists across four departments, no reporting line.
- A regional pod: three field agents covering overlapping member populations in a metro area.
- A deal team for a large employer account: account executive, implementation lead and a service manager.
- An incident response pair: one field agent and one back-office specialist handling the same escalation.

> **The test.** If the requirement is "these people work on the same thing" and
> changes as the work changes, it is a team. If it is "these people hold the same
> job", it is a role. If it is "these people are somewhere below this person", it
> is the hierarchy.

### Checkpoint

Six specialists form a review board that rotates quarterly. Teams, public group,
or role?

**Answer.** A public group plus a criteria-based sharing rule, **not** a team.
Team-based sharing requires an access field on the shared object naming a
specific team, and the board rotates - so the access field would need a value
change for every membership change. A public group as a rule target follows
membership automatically and is the right mechanism for a rotating set.

---

## 2. Two ways in: member records and access fields

This is the mechanism candidates half-remember. It is worth being precise about
because it determines whether team-based sharing is even applicable to your
object.

### Approach 1: a team membership record

When a user is added to a team via the **Team-Related List on User**, a `Member`
record is created for that user on that team. That membership **alone grants
nothing**. It becomes a grant when the shared object has an **access field** -
typically *Access Level* on Account or Case - whose value names the team. Then
members of the named team get access to that record.

### Approach 2: an access field naming the team

You put the team name in the record's access field. Access now follows that
value. The critical consequence: **access is tied to the field, not to the person
who set it**. When the field changes, access changes - automatically, and
immediately, **without any sharing recalculation**.

> **Apex warning.** When the access field value changes, the previous team loses
> access and the new team gains it. In Apex that means **deleting the old
> `MemberAccessGrant` row and inserting a new one**. Inserting the new grant and
> leaving the old one leaves two teams reading the record and a stale sharing row
> that misleads every subsequent audit.

### Which objects have an access field

| Object | Access field | Team-based sharing applies? |
|---|---|---|
| Account | Access Level field | Yes |
| Opportunity | Access Level field | Yes |
| Case | Access Level field | Yes |
| Lead | Access Level field | Yes |
| Campaign | Access Level field | Yes |
| Your custom objects | A custom access field you create | Yes, once you create it |
| Member__c, Claim__c, Consent_Record__c, Provider_Network__c, Access_Request__c | **None** | **Not without custom development** |

That last row matters at Vantage. Team-based sharing does not work out of the
box on the healthcare objects, so a requirement phrased "these clinicians should
see each other's claims" needs either a custom access field plus Apex to maintain
it, or - more often - a public group plus a criteria rule.

**Reach for teams when the object is standard, or when you are prepared to build
the access field and its maintenance.**

### Checkpoint

You set `Case.Access_Level__c` to `Urgent Response Team`. Then the team is
renamed. What happens?

**Answer.** Nothing breaks, because the field stores the team's **Id**, not its
name - the rename moves with it. But if anyone recreates the team, or clones
records with that value, the value may point at nothing or at a deleted Id. Store
and verify by Id, and validate the field so an invalid value cannot be committed.

---

## 3. Configuring team-based sharing

Team-based sharing has two configuration elements on the object, and the
interaction between them produces the classic "some records work" bug.

| Element | What it does | If you get it wrong |
|---|---|---|
| A sharing rule on the object, based on the access field, targeting members of the named team | Creates the lateral grant | Without it, setting the access field grants nothing at all |
| Records where the access field is populated with the team | Provides the data the rule reads | Without it, the rule selects nothing |

> **Both halves are required, and either half alone is indistinguishable from a
> broken model** until you read the configuration carefully. Setting the access
> field to a team name does nothing on its own: the access field is data, and the
> sharing rule is the mechanism that reads it.

### The three things required for a grant

1. A sharing rule on the object, based on the access field, targeting members of the named team.
2. Records where the access field is populated with the team.
3. Users who are members of that team, **and** whose own CRUD permissions let them see the object at all.

Note point three. **Team sharing is additive, not a bypass.** A user with no
Read permission on Case cannot read a Case because a team shares it. Sharing
controls records; permissions control whether the object is reachable at all.
Phase 10.

### The other practical trap

Access level values that do not match any team. Set `Case.Access_Level__c` to
`High`, and no team is named, so nothing is shared - and the record looks
correctly configured in every screenshot.

---

## 4. Teams versus public groups

Both are sets of people usable as sharing targets. The difference is what the set
*means* and how it is evaluated.

| Axis | Public group | Team |
|---|---|---|
| Membership source | Manually maintained, or by Apex or flow | Maintained, or from a member record or the access field |
| Sharing basis | **Global**: every member gets every shared record of the object | **Per-record**: only records whose access field names that team |
| Object support | Any object | Only objects with an access field |
| Access changes | Adding a member grants access org-wide for that object | Changing the access field moves access for that record only |
| Recalculation on change | Yes - adding members triggers one | **No** - changing the field is immediate |
| Vantage fit | Compliance groups, review boards, rotating committees | Named deal teams on Accounts and Cases |

> **The decisive question.** Is the requirement "these people can see *all* the
> shared records of this object", or "these people can see *this specific
> record*"? Group for the first, team for the second. That distinction resolves
> almost every teams-versus-groups debate, and it is what scenario questions test.

A second question: **does the object have an access field?** If not, teams are
not available and the debate is over.

### Checkpoint

A partner organisation must be able to see a specific Vantage Health account and
its Cases. The account is a standard Account, the Cases are standard Cases, and
three people need access permanently. Teams, or a public group?

**Answer.** Teams, on this evidence. Three named people need access to *that
account's* records rather than to every record of an object, and Account and
Case both have access fields. Set `Access_Level__c` on the account and on each
case, add the three to the `Vantage Enterprise Deal Team`, and the grant is live
with no recalculation. The moment the partnership ends, remove the three from the
team and every record's access disappears at once - which is the operational
argument for teams over manual shares here.

---

## 5. Team maintenance and the ownership interaction

Teams drift. Membership is only as good as the last time somebody reviewed it,
and stale team membership is one of the most common findings in a real access
review.

- Adding or removing a user requires removing them from the **Team-Related List on User**, not just changing their role.
- Team membership **persists across role changes**, which is what makes teams useful and also what makes them stale.
- **Inactive users remain team members** until explicitly removed.
- Deleted teams leave access field values pointing at nothing - no error, just no access.
- Access field values must match the exact team name string; a typo means no grant and no warning.

### The ownership interaction

If a record's owner changes, the owner's implicit access changes and the record's
sharing rows are updated - but **team access is unaffected**, because team access
is evaluated from the access field, not from ownership. A team can therefore hold
access to a record that its members have no relationship to any more.

> That last property is a genuine risk in a long-lived org: **access granted by a
> team outlives the project that justified it.** Schedule a periodic review of team
> membership, and of access field values on records whose teams no longer exist.

For automated maintenance, Apex can add and remove team members and can write the
access field - but remember the delete-then-insert requirement, and remember that
each of those changes is a sharing change with the same recalculation implications
as any other membership change.

---

## 6. Choosing teams across the Vantage requirements

| Requirement | Object | Mechanism | Decisive reason |
|---|---|---|---|
| Utilisation review board, rotating quarterly | Claim__c | Public group + criteria rule | No access field; membership rotates |
| Enterprise deal team on the Vantage Health account | Account, Case | **Team** | Per-record access; standard object with an access field |
| Regional pod, three agents, overlapping members | Member__c | Public group + criteria rule | No access field on Member__c |
| Incident response pair on one escalation | Case | **Team** | Per-record, and both already have Case access |
| All claims reviewers see all reviewer claims | Claim__c | Public group + criteria rule | Global to the object, not per-record |
| Claims specialists see each other's second-opinion claims | Claim__c | Public group + criteria rule on `Review_State__c` | Object-wide over a business condition |

Two of eight requirements are teams. That ratio is typical, and it is the reason
teams get underused - teams solve a narrow and specific problem well, and most
requirements are not that problem.

---

## 7. Diagnosing the half-configured team

The single most useful diagnostic in this phase, because the symptom is always
the same and the cause is always one of four things.

**Symptom:** a team exists, members are assigned, the sharing rule is on the
object, and nobody can see anything new.

| # | Cause | How to confirm | Fix |
|---|---|---|---|
| 1 | Access field is empty on the records | Open the record; the access field is blank | Populate it, or fix the flow that was supposed to |
| 2 | Access field value does not exactly match a team name | Compare the string character by character; check for trailing spaces and case | Correct the value; add a validation rule to prevent it |
| 3 | No users are actually members of the team | Open the team; the member list is empty | Add users via the Team-Related List on User |
| 4 | Members lack object permissions | Check the profile and permission sets | Grant the object permission - Phase 10 |

Work the causes in that order. Number one accounts for the majority of cases.

### Checkpoint

A team-based sharing rule is created and members are added, but nothing changes.
Name the three most likely causes.

**Answer.** The access field is empty on the records, so the rule selects
nothing. The access field value does not exactly match a team name, so the rule
selects records but they name nothing. Or the users lack Read permission on the
object, so the additive grant goes somewhere they cannot reach. Check in that
order, because the first is by far the most common.

---

## What's next

Teams and sharing rules both operate on a single record at a time. Phase 6 covers
the mechanism that is not configured at all: the implicit sharing that arrives
through the data model, and how to design around it.
