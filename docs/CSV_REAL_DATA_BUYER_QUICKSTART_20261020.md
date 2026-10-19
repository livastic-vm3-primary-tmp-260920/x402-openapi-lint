# CSV import preflight: verify YOUR CSV before import (0.005 Base Circle USDC)

**A working paid service, not a promise of customers.** Use an existing x402 v2
client to authorize payment to the original VM5 published merchant address.
For an invalid CSV request, the service returns a free HTTP 400/415/429
before any 402 payment requirement. For valid input, it returns a real
HTTP 402 quote for exactly 5,000 atomic native Circle Base USDC units
(0.005 USDC on chain 8453); the customer chooses whether to sign.

## Correct endpoint for buyer data

**POST https://vm5-openapi-x402.onrender.com/v1/csv-preflight**

Send `Content-Type: application/json` with:

```json
{
  "csvText": "email,amount,date,note\na@example.com,19.25,2026-10-19,invoice\nnot-an-email,broken,2026-25-99,=1+1",
  "expectedColumns": ["email", "amount", "date", "note"]
}
```

The example is **synthetic**. Don't submit confidential data, real email
addresses, passwords, API keys, seeds, tax records or personal identifiers.

The API checks structural anomalies (headers/field count, duplicate rows,
missing values, simple email/date/amount forms and spreadsheet formula-injection
risk). A successful x402-paid report includes counts and row/column locations,
**not raw buyer row cell values**. This is a deterministic heuristic preflight,
not business-truth verification, malware scanning, compliance certification,
guaranteed clean import or an endorsement of the provided CSV.

The original source is publicly auditable at
[CSV validator](../csv-preflight.mjs). The service has explicit limits: 32 KB
CSV text, up to 40 expected headers, at most 500 data rows and 12
preflight attempts/minute/IP. Paid and unpaid errors have separate semantics.

## Inspect for free before deciding to pay

1. [GET the synthetic preview](https://vm5-openapi-x402.onrender.com/v1/csv-sample):
   contains the demonstration CSV and an exact `buyerOwnedCsv` request example.
2. With a nonsecret synthetic sample, run a plain HTTP POST to the buyer-data
   endpoint. A **valid request** should receive HTTP 402 and
   `PAYMENT-REQUIRED` with amount 5000, network `eip155:8453`, exact
   USDC contract `0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913` and
   recipient `0x6b01efA0705E91a7aca54271510bf9e594717f34`.
   This unpaid first request does **not** send tokens or prove a purchase.
3. A buyer with a supported x402 v2 wallet/client can **voluntarily**
   authorize payment using their own custody, then repeat the same POST
   with `PAYMENT-SIGNATURE`. Only successfully verified and settled payments
   unlock the report and yield `PAYMENT-RESPONSE`. VM5 never receives
   the customer's signing key.
4. For a fully static hosted sample without private buyer input,
   [GET /v1/csv-report](https://vm5-openapi-x402.onrender.com/v1/csv-report)
   is a distinct 0.005 USDC paid endpoint. Do not confuse a synthetic
   report purchase with customer CSV processing.

Example safe **unpaid** quote inspection (no transaction signing):

```bash
curl -i -X POST 'https://vm5-openapi-x402.onrender.com/v1/csv-preflight' \
  -H 'Content-Type: application/json' \
  --data '{"csvText":"email,amount,date,note\na@example.com,19.25,2026-10-19,ok","expectedColumns":["email","amount","date","note"]}'
```

Never paste or upload secrets to third-party CSV validators. This merchant
applies heuristics in application memory and does not intentionally persist
or re-echo customer CSV cells; infrastructure and facilitator may have their
own metadata/transport logging.

## Real receipts versus claims

One independent NoHumans automated testing buyer **paid and received** the
static GET CSV report on 19 Oct 2026 (0.005 USDC), alongside an earlier
independent 0.010 USDC paid/delivered x402 template call. On 20 Oct, a
**different payer wallet** finalized a further 0.005 native Circle Base USDC
transfer to the same merchant through the PayAI facilitator, on-chain
[receipt](https://basescan.org/tx/0x31c05f6ee783aea8a73733b49c406c69d24cc712503926a840ebb424f0e2ecca).
PayAI public aggregate data suggests it may have been a second static CSV
GET sale, **but the specific URL and successful report delivery remain
unverified**. There is **no verified buyer-paid POST CSV report yet**.
Do not claim organic subscriptions or a verified paid buyer-owned dataset.
The combined one-owner, multi-VM historical **gross native Base Circle
USDC receipts** including the separate VM1 HashN payment are 1.020 USDC
across four unique transfers, not bank cashout or after-cost profit.
