# GitHub Actions workflow risk preflight — buyer guide

**Original one-owner VM2 MIT static analyzer, hosted on the existing VM5 x402 paid software merchant.**

- Free example: `GET https://vm5-openapi-x402.onrender.com/v1/workflow-risk-sample`
- For *your* nonsecret workflow: `POST https://vm5-openapi-x402.onrender.com/v1/workflow-risk`
- Price: **0.20 native Circle USDC on Base**, network `eip155:8453`, exact 200000 atomic USDC units per valid completed independently authorized x402 v2 request.
- Original seller wallet: unchanged from existing VM5 merchant, as embedded in the actual 402 `PAYMENT-REQUIRED` header.
- Client signs payment independently with its own eligible x402-compatible wallet; **never paste wallet seeds, recovery phrases, private keys or customer credentials here**.
- **No subscription, no fake purchases, no promise of net savings or security certification.** This product currently has **ZERO verified paid customers**.

## What a legitimate buyer gets

A read-only static heuristic scan of one GitHub Actions YAML document, **48,000 UTF-8 bytes maximum**. It checks dangerous `pull_request_target` head execution, mutable/unpinned action refs, excessively broad GITHUB_TOKEN write permissions, unsafe event interpolation, potentially dangerous self-hosted PR workflows, remote-shell pipe patterns, and related review prompts. It returns severity-ranked findings, original YAML line coordinates, suggested remediations, and optionally SARIF 2.1.0 JSON. Input YAML is **not executed or used to reach GitHub / any repository**.

Static checks can be wrong and are not a security audit, vulnerability finding, malware scan, secure CI certification, legal compliance advice, or a production deployment review. **Do not submit secret, internal, regulated, or customer-confidential workflow contents.** Avoid secrets even in comments. The service performs no app-side persistence or raw YAML logging; the hosting proxy and facilitator are distinct providers with their own infrastructure/logging rules.

### Free, synthetic illustration (no wallet)

```sh
curl -fsS https://vm5-openapi-x402.onrender.com/v1/workflow-risk-sample
```

You can inspect the input fixture and what a report looks like without paying; the free sample has **no charge** and is not a paid customer transaction.

### See the live price — unsigned, **no money transferred**

```sh
curl -i https://vm5-openapi-x402.onrender.com/v1/workflow-risk \
  -X POST -H 'Content-Type: application/json' \
  --data '{"filename":"ci.yml","includeSarif":true,"workflowYaml":"on: pull_request\npermissions: {contents: read}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n"}'
```

A valid unsigned request should return **HTTP 402** and `PAYMENT-REQUIRED` describing **200000 atomic Circle Base USDC**. Only an independent buyer's *genuine* x402 client, if they voluntarily authorize the payment, can retry with a signed `PAYMENT-SIGNATURE` and receive the full response plus `PAYMENT-RESPONSE`. There is no username/password payment flow or custodial checkout.

For malformed YAML, empty/oversized input, unsupported input fields, invalid filename path, or invalid JSON, the request returns HTTP 400/413 **before a payment challenge**. No results are delivered as a chargeable success when the local test fixture's signature is invalid.

## Boundaries and evidence

The rule engine comes from the **same original beneficial owner VM2**, MIT-licensed at [apify-workflow-guard](https://github.com/livastic-vm2-primary-20260911/apify-workflow-guard), reused with its complete copyright notice and license file in `workflow-risk/LICENSE`. Original source logic is static only; VM5 added input validation, HTTP pre-payment rejection, x402 v2 payment metadata, and local synthetic test integration.

The test suite uses only **localhost fake facilitator messages**, not real wallet signatures, actual Base token transfers or third-party money. Passing tests or a 402 quote is not a paid sale. Old actual VM5 x402 receipts belong to **different products**; do not count them as Workflow Risk buyers.

The merchant uses original production x402 PayAI facilitator and original Circle native Base recipient. Existing CSV, template, ping and other paid API routes retain their historical prices and payment requirements. This product does not require a separate paid Apify account or pretend its unmonetized Apify Actor has generated revenue.

Report bugs or request a scoped commercial adaptation through the original [VM5 Delivery Lab](https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/). A bespoke B2B engagement requires separate written agreement identifying the true eligible contracting party, scope, acceptance and payment terms. No editable private customer source is transferred by this document.
