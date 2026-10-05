# force-app — the scenario lab

This directory is deliberately **empty**. The course is a study site first: everything
you need to learn lives in [`../docs/`](../docs/) and needs no org.

`../manifest/package.xml` describes the **target** architecture for the *Vantage Health Group*
scenario org — the metadata you would build while working through the phases:

| Folder | What the course builds there |
|---|---|
| `classes/` | `ClaimShareService` (Apex sharing in `with sharing` transactions), `ClaimAccessGuard` (`Security.stripInaccessible` / user mode) and their tests |
| `objects/` | `Claim__c`, `Member__c`, `Provider_Network__c` and their sharing models |
| `sharing/` | `Claim.ClinicalPeerReadWrite`, `Member__c.BrokerReadOnly`, `Account.AcquiredEntityIsolation` |
| `permissionsets/` | `Vantage_Clinical_Reviewer`, `Vantage_Broker_Reviewer`, `Vantage_Consumer_Reviewer`, `Vantage_DataSteward` and the minimum-access set |
| `experiences/` | the `BrokerPortal` Experience Cloud site for external partner users |

Use it as your scratch pad. Then, once you have implemented something:

```bash
npm install
sf org create scratch --definition-file ../config/scratch-def.json --alias svas --duration-days 7
sf project deploy start --source-dir . --target-org svas --wait 20
sf apex run test --target-org svas --test-level RunLocalTests --code-coverage --wait 30
```

The `org` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) currently *previews*
the manifest rather than deploying it, precisely because these files do not exist yet. When they
do, switch that job to `sf project deploy start --source-dir force-app` plus the Apex test run.

The folders above exist here in your working copy but Git cannot store empty directories — this
README is what keeps the structure visible and tracked.