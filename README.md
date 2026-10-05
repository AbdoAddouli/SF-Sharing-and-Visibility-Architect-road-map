# Sharing & Visibility Architect Academy

An interactive, self-paced course for the **Salesforce Certified Platform Sharing and Visibility Architect** exam (`Plat-Arch-205`), built for admins, architects and developers who have to answer one question for every design decision: *who is allowed to see and change this record, and how do I prove it?*

**[Open the study site &rarr;](https://abdoaddouli.github.io/SF-Sharing-and-Visibility-Architect-road-map/)**

- **20 phases**, **107 lessons**, **20 full phase guides**, **59 worked answer keys**
- Reading, lessons, model exercises and module quizzes in one browser tab
- Light/dark theme, keyboard navigation, search, bookmarks, progress tracking and a printable certificate
- **No account, no backend, no tracking.** Progress lives in `localStorage` on your device

This is the same course you will find as academy 12 inside [Abdo's Salesforce Academy](https://abdoaddouli.github.io/Abdo-s-Salesforce-Academy/); the renderer and stylesheet are shared verbatim with it, so the two experiences are identical.

---

## Table of contents

- [What is this?](#what-is-this)
- [The 20 phases](#the-20-phases)
- [How to use the site](#how-to-use-the-site)
- [Progress, bookmarks & certificate](#progress-bookmarks--certificate)
- [Repository layout](#repository-layout)
- [Local development](#local-development)
- [Regenerating the site data](#regenerating-the-site-data)
- [Deployment](#deployment)
- [Scenario lab: Vantage Health Group](#scenario-lab-vantage-health-group)
- [Additional resources](#additional-resources)
- [License](#license)

---

## What is this?

Security in Salesforce is not a checkbox in Setup. It is a graph:

```
Org-Wide Defaults  ->  Role hierarchy  ->  Sharing rules & manual/Apex sharing
                   ->  Groups, queues & teams  ->  Object & field permissions
                   ->  FLS, record types, validation rules
                   ->  External users, partner & community users
                   ->  Apex sharing, user mode, database security
```

Most certification failures — and most real incidents — come from treating one of those edges as if it does not exist. This course walks the graph once, in order, with a running scenario, and then shows the two things that separate an architect from an administrator: **reasoning about scale** (sharing skew, sharing rows, volume, limits) and **proving it** (tests, tooling, audit).

The exam itself became mandatory to deploy in production: Salesforce has been progressively enabling **Sharing Enforcement** in the Summer '26 and Winter '27 releases. When enforcement reaches an org, permissive defaults that were quietly working stop working, and the exam stops being optional. The course treats that wave as its spine rather than as a footnote.

> **Format.** Every phase has a written guide, a lesson track and a quiz. Model exercises (`ex`) are checked against a reference answer you can reveal once you have attempted them; capstone exercises (`proj`) are scored more strictly. There is no video, no Salesforce org requirement and no vendor API.

---

## The 20 phases

| # | Phase | What you get out of it |
|---|---|---|
| 1 | [The Architect's Security Mindset](docs/guide/01-Mindset.md) | How Salesforce resolves access, exam format and weighting, the enforcement-wave stakes |
| 2 | [Organization-Wide Defaults: The Access Floor](docs/guide/02-Org-Wide-Defaults.md) | Internal vs external defaults, Public Read Only vs Public Read/Write, why OWD can never grant |
| 3 | [The Role Hierarchy & Implicit Sharing](docs/guide/03-Role-Hierarchy.md) | Manager/CEO roles, implicit access via hierarchy, ownership cascades |
| 4 | [Sharing Rules, Groups & Queues](docs/guide/04-Sharing-Rules-Groups-Queues.md) | Criteria- and lookup-based rules, Read/ReadWrite, groups, queues, blind queues |
| 5 | [Teams](docs/guide/05-Teams.md) | Sharing teams, Team Access Grants, `Has Team Access` and what teams do *not* replace |
| 6 | [Relationships: Parent, Child & Ancestor Sharing](docs/guide/06-Relationships.md) | Parent-child, master-detail, `Child.Relationship` sharing and record hierarchy semantics |
| 7 | [Apex & Managed Sharing](docs/guide/07-Apex-Managed-Sharing.md) | `with sharing`, `without sharing`, `inherited sharing`, managed sharing in triggers |
| 8 | [Manual Sharing & Overrides](docs/guide/08-Manual-Sharing-Overrides.md) | Share rows, `AccessLevel`, sharing expiry, the Share object model, taking access away |
| 9 | [External Users & Experience Cloud](docs/guide/09-External-Users-Experience-Cloud.md) | External accounts, contacts, Experience Cloud vs Lightning, guest users, portal roles |
| 10 | [Object Permissions & CRUD](docs/guide/10-Object-Permissions.md) | Object vs field permissions, profiles, the licence maths of "just give Standard" |
| 11 | [Permission Set Groups](docs/guide/11-Permission-Set-Groups.md) | PSGs vs Permission Sets, combining sets, assignment rules, Update Sets |
| 12 | [Field-Level Security](docs/guide/12-Field-Level-Security.md) | Field permissions vs record-level access, field visibility, why FLS is not a filter |
| 13 | [Sensitive Data: Masking, Encryption & BYOL](docs/guide/13-Sensitive-Data.md) | Field-level security vs Shield masking, Platform Encryption vs BYOK/BYOL, audit |
| 14 | [User Mode & Enforcement](docs/guide/14-User-Mode-Enforcement.md) | `WITH USER_MODE`, `stripInaccessible`, user mode in Apex/LWC, catching bypasses |
| 15 | [Scalability, Recalculation & Skew](docs/guide/15-Scalability-Recalculation-Skew.md) | Sharing rows, skew, recalculation cost, governor limits on sharing, batch-safe patterns |
| 16 | [Licences, Testing & Verification](docs/guide/16-Licences-Testing.md) | Editions, SKU and licence maths, Apex test patterns for security, proving access |
| 17 | [Non-Record Data: Settings, Metadata & Files](docs/guide/17-Non-Record-Data.md) | Custom metadata, custom settings, static resources/files, least privilege beyond records |
| 18 | [The Enforcement Wave](docs/guide/18-Enforcement-Wave.md) | Sharing Enforcement in Summer '26 / Winter '27, remediation plan, org migration |
| 19 | [New Boundaries: Policies, Enhanced Sharing & Identity](docs/guide/19-New-Boundaries.md) | Enhanced sharing semantics, admin policies, identity and permissions direction of travel |
| 20 | [Capstone & Certification Prep](docs/guide/20-Capstone-Cert-Prep.md) | End-to-end review, exam-day checklist, question patterns, time management |

The guides are mirrored inside the site as **Phase &rarr; Guide**, and their sources live in [`docs/guide/`](docs/guide/).

---

## How to use the site

Open the site, then:

- **Dashboard (`#/`)** — pick a phase, see overall progress, jump back into the last thing you read.
- **Phase (`#/a/sharing/phase/sharing-01`)** — the phase overview: objective, lessons, exercises, module quiz.
- **Lesson (`#/a/sharing/lesson/sharing-01/0`)** — read the lesson track; progress is recorded as you move through lessons.
- **Quiz (`#/a/sharing/quiz/sharing-01`)** — the module quiz. Answers are per-question, so a mistake is a learning event rather than a lost attempt.
- **Guide (`#/a/sharing/guide/sharing-01`)** — the full written phase guide, with a table of contents and cross-links to other guides.
- **Bookmarks (`#/bookmarks`)** — anything you starred.
- **Certificate (`#/a/sharing/certificate`)** — a printable summary of your completion. **For study tracking only** — it is not a Salesforce credential and carries no certification value.

All routes are hash-based, so any screen can be bookmarked or shared. Press `/` to focus search, `Esc` to close a panel.

**Gated solutions.** Model exercise solutions are collapsed and marked as a spoiler. They unlock once you click *Reveal answer*; the site never blocks you, it just asks you to try first — which is the only way the answer is worth anything.

---

## Progress, bookmarks & certificate

- Progress = lessons completed + quizzes passed + exercises attempted. It is stored in `localStorage` under the `sfsharing-v1` key — deliberately *not* the unified site's `abdo-academy-v1` key, because every academy is served from the same `github.io` origin and sharing one key would let the two sites overwrite each other's progress.
- The theme preference is the one thing that *is* shared (`abdo-academy-theme`), so one toggle covers all twelve academies.
- Clearing site data resets progress. There is no sync, no account and no server.
- The certificate view is a self-made summary for motivation. Salesforce certification is awarded only by Salesforce after a proctored exam.

---

## Repository layout

```
.
├── build/
│   ├── markdown.mjs        shared Markdown -> HTML renderer (verbatim copy of the hub's)
│   └── site.mjs            generates docs/assets/{curricula.js,answers,guides} or --check
├── docs/                   the study site (this is what GitHub Pages publishes)
│   ├── index.html          single page shell
│   ├── .nojekyll           stop Jekyll from eating the asset folders
│   ├── assets/
│   │   ├── app.js          renderer (shared verbatim with the unified academy site)
│   │   ├── style.css       stylesheet (shared verbatim with the unified academy site)
│   │   ├── curriculum.js   ← SOURCE OF TRUTH: modules, lessons, quizzes, exercises
│   │   ├── answers.js      ← SOURCE OF TRUTH: reference answers for every exercise id
│   │   ├── curricula.js    GENERATED by build/site.mjs
│   │   ├── answers/        GENERATED
│   │   └── guides/         GENERATED
│   └── guide/              20 authored phase guides (01-…20-…md)
├── config/scratch-def.json Enterprise scratch org for the scenario lab
├── manifest/package.xml    the target metadata architecture of the scenario org
├── force-app/README.md    the scenario lab: what to build, and when to flip CI to deploy it
└── .github/workflows/     ci.yml (syntax + generated-data freshness, manual org preview)
```

**Edit `docs/assets/curriculum.js` and `docs/assets/answers.js`. Never edit `curricula.js`, `answers/` or `guides/`** — they are generated and CI fails if they drift.

---

## Local development

Requirements: **Node 18+** only. Everything below uses Node built-ins — no `npm install` needed for the site.

```bash
# 1. verify the authored data and the generated bundle agree
npm run check

# 2. regenerate docs/assets/ after editing curriculum.js or answers.js
npm run site

# 3. serve docs/ and open it
npx serve docs            # http://localhost:3000
# or, without npx
python -m http.server 8000 --directory docs
```

Any static file server works. Opening `docs/index.html` directly with `file://` also works in modern browsers, since the site is deliberately dependency-free.

For the Salesforce side (optional — the course is designed to work without an org):

```bash
npm install
sf org create scratch --definition-file config/scratch-def.json --alias svas --duration-days 7
sf project deploy preview --manifest manifest/package.xml --target-org svas
```

---

## Regenerating the site data

```bash
node build/site.mjs            # write docs/assets/curricula.js, answers/ and guides/
node build/site.mjs --check    # CI mode: exit 1 if any generated file is stale or orphaned
```

The build validates as it goes:

- every module gets a prefixed id (`sharing-01`), a quiz object and an exercise index
- every exercise id with an answer key is resolved; orphan answer keys are reported
- every module finds its guide file; guide links that point at other guides become in-site deep links
- generated guide bundles that no longer belong to a module are deleted

Output is deterministic — no timestamps in the data files — so `--check` never produces false failures.

---

## Deployment

Published with **legacy branch-based GitHub Pages**, exactly like the other academy roadmap
repositories: *Settings &rarr; Pages &rarr; Source: Deploy from a branch &rarr; `main` / `/docs`*.

`docs/.nojekyll` stops Jekyll from ignoring the asset folders, so `docs/` is published byte-for-byte
as committed — there is no build step in the publish path and no compiled artifact that could drift
from the repository. Every push to `main` publishes within a minute or two:

**<https://abdoaddouli.github.io/SF-Sharing-and-Visibility-Architect-road-map/>**

CI in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) is what keeps the published data honest:
it fails the push if `docs/assets/curriculum.js`, `docs/assets/answers.js` and the committed generated
bundle ever disagree. The scratch-org job is `workflow_dispatch`-only on purpose — a Dev Hub being
unavailable must never be a reason the study site goes dark.

---

## Scenario lab: Vantage Health Group

Every phase applies the same running scenario, so concepts compose instead of resetting:

A mid-size healthcare network with **Claims**, **Members**, **Providers** and **Partners**, an internal clinical back office, a **Broker Portal** for external partners, and a patient-facing surface. The scenario org is defined in [`config/scratch-def.json`](config/scratch-def.json) (Enterprise edition, internal and external OWD both Private, Apex and Flow sharing enabled) and the metadata target in [`manifest/package.xml`](manifest/package.xml) — custom `Claim__c`, `Member__c` and `Provider_Network__c` objects, clinical-peer and territory sharing rules, and permission set groups for clinical, broker and steward personas.

By phase 19 you should be able to defend a complete design for it: role hierarchy, sharing rules, sharing teams, permission set groups, Apex sharing for a clinical peer rule, partner-user access, and the skew and licence analysis that says whether it survives real volume.

---

## Additional resources

### Official certification

- Certification page: <https://trailhead.salesforce.com/credentials/sharingandvisibilityarchitect>
- Trailhead modules on sharing, OWD and role hierarchy (free)
- `Platform Architect` certification guide for exam weighting and delivery rules

### Reference

- [Salesforce Object Security](https://architect.salesforce.com/fundamentals/platform-security) on the Salesforce Architects site
- [OWD, roles and sharing](https://help.salesforce.com/s/articleView?id=sf.security_sharing.htm) in Salesforce Help
- [Salesforce Teams and Team Access Grants](https://help.salesforce.com/s/articleView?id=sf.team_access_grants.htm) in Salesforce Help
- [Sharing Enforcement and the Summer '26 / Winter '27 releases](https://help.salesforce.com/s/articleView?id=sf.release_notes.htm) in release notes
- Sharing-related governor limits: *Sharing Rows* and *Total Query Rows* limits
- Apex: `Security.stripInaccessible()` and `Database.queryWithBinds()` user-mode equivalents

### Verify your own org

- **Setup &gt; Sharing &gt; Sharing Hierarchy Settings** for the default posture
- **Setup &gt; Permission Sets / Permission Set Groups** for who actually has what
- **Setup &gt; Data &gt; Data Access Settings** for the single-document sharing summary of a record
- A `SELECT` in a scratch org with `WITH USER_MODE` to see what the running user's access truly returns

---

## License

Course content and code in this repository are provided for study purposes. Salesforce, Apex, Platform, Sharing and Visibility Architect and all related trademarks are the property of Salesforce, Inc. This project is not affiliated with, endorsed by or sponsored by Salesforce, Inc. The in-site certificate is a self-made study summary, not a certification.

Built by [AbdoAddouli](https://github.com/AbdoAddouli) — [Abdo's Salesforce Academy](https://abdoaddouli.github.io/Abdo-s-Salesforce-Academy/) covers 12 Salesforce academy roadmaps in one renderer.