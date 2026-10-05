# Phase 9: External Users and Experience Cloud

This phase is tagged **Access to Records**, the 39% domain, with material
overlap into **Permissions to Objects and Fields**. It covers the objective
*explain the capabilities and limitations of user-based and permission-based
access* as it applies to people outside your internal user base, plus the
territory-based sharing objective.

External access is the phase where the mental model has to change most sharply,
because the person you are designing for is not a user. They are a request
running as a shared credential.

## Learning Objectives

By the end of this phase you will be able to:

- Explain the guest user model: one guest user per Experience Cloud site, sharing the same profile and permission set.
- Choose correctly among sharing sets, external account hierarchy, account sharing rules and the guest-user permission set.
- Reason about the difference between internal and external sharing evaluation, and why it changes your design.
- Design external access that is broad enough to work and narrow enough to be defensible.

---

## 1. The guest user, precisely

There is no separate external licence per user in most Experience Cloud designs.
Instead, **each Experience Cloud site has a guest user**, and every external
visitor to that site runs as that single guest user with elevated system
permissions.

> **Elevated.** This is the point that decides every external design. The guest
> user typically runs with **Modify All Data** or **View All Data** because it
> must be able to create and query records for people it has never seen. The
> security boundary is therefore **not** the guest user's permissions - it is the
> per-record sharing configuration beneath it.

### Two consequences that follow immediately

1. **If you get the sharing wrong, the guest user still executes the query.** The record-level filter is the only thing standing between the external user and the data.
2. **Record visibility for all external users of a site is the union of every sharing mechanism you have configured for that guest user.** There is no per-external-user permission layer beyond sharing.

### The correct mental model

The guest user is a **shared credential with superuser powers**, and your entire
external security design is the set of rules that decide which records it is
allowed to touch on behalf of the person currently logged in.

| Fact | Detail | Consequence for design |
|---|---|---|
| One guest user per site | Not per external user, not per person | The guest user is a chokepoint you can inspect |
| Profile is the Agentforce Guest User profile | Often modified org-wide | Changing it affects every external site - treat as critical |
| Permission set is Guest User Sharing | Holds the actual external permissions | Scope it precisely; it is the object boundary |
| Often Modify All Data | Needed to bootstrap | Per-record sharing is the only real control |
| Site URL is the boundary | Different sites, different guest users, different exposure | **Separate sites for separate trust levels** |

### Checkpoint

The guest user has Modify All Data. Is that a vulnerability?

**Answer.** Not by itself - it is the standard pattern, and the system cannot
bootstrap access otherwise. The vulnerability would be **relying on it**. Your
design must make per-record sharing the effective boundary, which means
verifying empirically what a real external user can query, not reading the
permission set. If you cannot demonstrate that empirically, you do not know what
you have.

---

## 2. Internal versus external sharing evaluation

This is the concept most likely to appear in a scenario question, and it explains
several behaviours that look like bugs.

| | Internal users | External users via guest |
|---|---|---|
| Sharing rules evaluated | Yes | Yes |
| Role hierarchy | Yes | **No** - no role |
| OWD | Yes | Yes |
| Owner-based access | Yes | Yes |
| Apex sharing | Yes | **Yes - evaluated against the guest user** |
| Manual sharing to the person | Yes | **No** - there is no internal user to share with |
| Sharing sets | No | **Yes** |
| External account hierarchy | No | **Yes** |
| Account sharing rules | Yes | Partially - depends on configuration |
| Territory sharing | Yes | Yes |
| Role-based rules naming roles | Yes | **No** - evaluates to nothing |

> **Two rows cause real incidents.** Role-hierarchy access never applies to an
> external user, so any grant you believed was covered by the hierarchy is **not
> covered at all** externally. And Apex sharing is evaluated against the **guest
> user**, not the logged-in external person - which means your "personalised"
> Apex logic must read the external contact from the session, or it will grant
> everything to the guest and nothing specific to the person.

### The practical method

**Empirical, and it should be part of your definition of done.** Log in as a real
external user and try to read a record you did not intend them to have. Attempt
the query. Anything that returns is a finding, regardless of what the
configuration appears to say.

Write the findings down as a matrix of **persona versus record type**. That
matrix is the deliverable for this phase, and it is the artifact a compliance
reviewer will ask for.

### Checkpoint

An internal user sees a Claim__c through the role hierarchy. An external user
with what appears to be the same relationship cannot see it. Name the reason, and
name the design implication.

**Answer.** The external user has no role, so the role hierarchy and any
rule targeting a role evaluate to nothing. The design implication is that **any
grant you believed was covered by the hierarchy must be re-implemented for the
external path** - usually as a sharing set or a sharing set rule. External access
is designed separately, not inherited.

---

## 3. The four external mechanisms, side by side

Four mechanisms grant external access, and each solves a different problem.
Choosing wrong is common because they all appear under the same heading in Setup.

| Mechanism | Grants to | Best for | Does **not** do |
|---|---|---|---|
| **Sharing set** | Everyone related to a set of accounts, via a sharing set rule | Partners or providers who need a slice of many customers' records | Per-person scoping; every member of the set sees the same records |
| **Sharing set rule** | A group of contacts, on records matching a criterion | Member portal users seeing their own member records | Anything outside the criteria; it is not a rule on the Contact object |
| **External account hierarchy** | Contacts at the same external Account | Anything where the account relationship is the boundary | Work across accounts; it is hierarchical, not selective |
| **Account sharing rules** | Groups on Account records | Granting a partner group access to specific accounts | Per-contact precision within the account |
| **Guest user permission set** | The guest user, org-wide | Defining the object boundary - what is reachable at all | Record-level scoping of any kind |

> **The decisive question.** What identifies the person whose records they should
> see?
>
> - An **account relationship** - external account hierarchy, or a sharing set.
> - **A record with my name on it** - a sharing set rule.
> - **A specific account** - an account sharing rule.
> - **Any object at all** - you are choosing the permission set.

---

## 4. The Vantage external requirements, mapped

| Requirement | Mechanism | Why |
|---|---|---|
| A member sees their own Member__c, Claims and Consent_Record__c records | **Sharing set rule** on Contact | The criterion is "contact equals the session contact" |
| A broker sees the members of the employer they represent | **Sharing set** | The relationship is an account relationship across many accounts |
| A provider in the network sees their own Provider_Network__c entry | **Sharing set rule** | It is record-scoped, not account-wide |
| A partner admin sees all accounts under one parent account | **External account hierarchy** | Purely hierarchical |
| An anonymous visitor sees a public directory | **Guest user permission set + Apex gating** | No person context, so no sharing rule applies |

> **The last row is where designs go wrong.** With no authenticated contact, **no
> sharing set rule can match**, so anything the guest user can query is available
> to everyone who loads the page. Public content therefore has to be separated
> **by object**, not by rule.

### Checkpoint

A provider should see their own `Provider_Network__c` entry and nothing else.
Sharing set, or sharing set rule?

**Answer.** A **sharing set rule**. A sharing set grants access to a slice of many
accounts, which is broader than needed and would expose other providers' data if
the set were shared. A sharing set rule targets records matching a criterion -
`Provider_Network__c where Related_Contact__c equals the session contact` - which
is exactly the shape of the requirement.

---

## 5. The guest user permission set

The object boundary. This is where you decide what is reachable at all, before
sharing decides for whom.

### Scoping rules

- **Read** on the objects the persona legitimately needs, and nothing more.
- **Create** on Contact and on the persona's own submission object, because the guest user must bootstrap a record for a person it has never seen.
- **No Update or Delete** on anything the guest user did not create. This is enforced by Apex logic, not by permissions - see below.
- **Nothing** on internal objects, at all. If `Member__c` is reachable, every external persona on that site is a potential leak away.

### The Apex pattern

Because permissions cannot express "update only records this guest user created",
the guest-user Apex must enforce it:

```apex
// Gate writes to records this guest user created.
private static void assertOwnership(List<SObject> records) {
    for (SObject r : records) {
        if (r.get('CreatedById') != UserInfo.getUserId()) {
            throw new SecurityException('Guest user may only modify records it created.');
        }
    }
}
```

Write that check once, in a base class every guest-facing entry point extends.
Enforcement that lives in each caller is enforcement that will be missed in one
caller.

---

## 6. Territories and field-service externals

Territory-based sharing deserves separate treatment because it is the one
declarative mechanism that works for external users based on a spatial or
hierarchical model.

A **territory** is a hierarchical structure of accounts and contacts. A
**territory-based sharing rule** grants access to records based on territory
membership, and it evaluates for external users through the guest user.

> **The trap.** Territory rules are evaluated against the guest user for external
> requests, and **the guest user is not in any territory**. If you assume
> territory rules scope external access, you may be relying on them for internal
> access only. **Verify the external behaviour empirically** rather than reasoning
> from the configuration.

### Territory management costs

Territories support assignment rules, and assignment rules recalculate when
territory membership changes. At Vantage, with 1,200 agents across overlapping
metro areas, that is a Phase 15 conversation.

### Where the standard objects stop helping

Sharing sets and sharing set rules work on standard objects **and on custom
objects**, which is convenient at Vantage. What they do not do is express a
condition across several related records in a way the sharing-set-rule UI can
hold.

Where your requirement involves computation, you are back to **Apex evaluated
against the guest user** - which means your Apex must read the external contact
from the current context, or it will operate on the wrong identity.

---

## 7. Verifying external access properly

External access is verified empirically or not at all. The method matters as much
as the result.

1. **Enumerate the external personas.** Anonymous, member, broker, provider, partner admin, support agent impersonating a member.
2. **For each persona, write down the objects and fields you intend them to reach.** This is the design, stated positively.
3. **Log in as that persona and attempt to read one record of each type you intend to deny.** Attempt the query; do not reason about it.
4. **Record anything that returns.** Every finding is either a permission-scope gap or a sharing gap.
5. **Repeat after every change** to the guest user permission set, the sharing sets, or the site's configuration.

> **Test the boundary cases, not the happy path.** A member whose Contact has no
> related `Member__c`. A broker whose employer account has been deleted. A
> provider with a deactivated Contact. An anonymous request to a page that
> requires context. **Broken references and missing context are where external
> designs leak.**

Keep the persona-versus-record-type matrix in version control next to the
permission set. When someone asks "can a broker see a member's clinical notes" a
year from now, the answer should be a lookup, not an investigation.

### Checkpoint

An external user can query `Member__c` directly through the site's API. The guest
user permission set grants Read on `Member__c`. What is wrong?

**Answer.** Nothing about the permission set is wrong - but Read on `Member__c` at
the object level means the guest user can attempt **any** `Member__c` query, and
if a sharing set rule fails to match, the record may be returned. **Object
permission defines reachability; sharing defines scope.**

Verify empirically with a real external user, and check specifically that the
sharing set rule is actually matching. A Contact with a broken or missing
relationship is the usual cause of a rule that silently matches nothing.

---

## 8. The site-per-trust-level rule

One architectural recommendation, because it is the one most often missed:

**Separate Experience Cloud sites by trust level, not by department.**

| Site | Personas | Guest user scope |
|---|---|---|
| Public | Anonymous directory visitors | Read on a public-content object only |
| Member | Members | Member's own records via sharing set rule |
| Partner | Brokers and providers | Their account-related records via sharing sets |

Three guest users, three permission sets, three blast radii. A single site with
every persona in it has one guest user whose union of access is the sum of every
persona's needs, which means the least-privileged persona inherits the
union - and any single misconfiguration exposes all of it.

The cost is three configurations to maintain instead of one. The benefit is that
the anonymous user cannot reach `Member__c` at all, even if everything else is
wrong.

---

## Checkpoint

A stakeholder wants all six personas on one site to simplify administration.
What is your response?

**Answer.** Push back, with the specific failure mode. On one site, the guest
user's permission set is the union of what every persona needs, so Read on
`Member__c` for the member portal means an anonymous visitor's session can attempt
`Member__c` queries. The sharing rules then become the only barrier, and one
malformed sharing set rule exposes 2.4M member records to the public. With three
sites, the anonymous guest user has no Read on `Member__c` and the exposure is
structurally impossible rather than merely unlikely. The extra administration is
one extra permission set per site.

---

## What's next

Phase 9 finished the record side for external users. Phase 10 moves to the
permission side, and to the question that trips up almost every candidate: what
happens when permissions and sharing disagree.
