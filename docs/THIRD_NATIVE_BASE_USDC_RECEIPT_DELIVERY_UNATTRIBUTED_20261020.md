# Third VM5 genuine on-chain USDC receipt — delivery still unattributed (20 Oct 2026)

**This is genuinely received money, not a third independently proved API delivery.**

VM5's original **native Circle USDC** recipient on Base mainnet received a
**third distinct inbound USDC transfer of 0.005000 USDC**, finalised in block
52,825,878 at 2026-10-19 20:18:23 UTC. Our existing original strict read-only
64+-confirmation chain watcher found a newly distinct ERC-20 Transfer on
2026-10-20 at 05:26 KST, and the independent explorer confirms success.

- [BaseScan payment transaction](https://basescan.org/tx/0x31c05f6ee783aea8a73733b49c406c69d24cc712503926a840ebb424f0e2ecca)
- Unique event: `0x31c05f6ee783aea8a73733b49c406c69d24cc712503926a840ebb424f0e2ecca:524`.
- Chain ID: **8453**. Token: **native Circle Base USDC**
  (`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`), not bridged USDbC.
- Recipient: `0x6b01efa0705e91a7aca54271510bf9e594717f34`.
- Exact value: **5,000 atomic units = 0.005000 USDC**.
- ERC-20 transfer payer: `0xa1d1c0cf717402ff3651aa4873ccf96410b01978`.
  This payer address differs from the original NoHumans verification
  buyer. That does **not**, by itself, prove a second independent legal
  business or human customer.
- Transaction gas sender: `0xb2bd29925cbbcea7628279c91945ca5b98bf371b`
  (identified in third-party listings as a PayAI x402 Base facilitator).
  An intermediary sending the chain transaction is **not** the token payer.

## What can and cannot be concluded

At the time of this public check the [actual PayAI facilitator]
(https://facilitator.payai.network/developers) also published an
aggregate **two settlements** for this merchant's
`https://vm5-openapi-x402.onrender.com/v1/csv-report` paid GET resource
(0.005 USDC each), compared with the one historical first-party NoHumans
paid/delivered CSV report documented separately. Its template GET had
one settled purchase and nine other paid routes each had zero
in the same summary. This **suggests** the new transfer was a second paid
CSV GET, but the public aggregates do **not** bind this transaction hash to
an exact endpoint path or successful delivered HTTP 200 response.

The original independent NoHumans scout previously bought and actually
received **two** separate paid API outputs (OpenAPI template 0.010000 and
static CSV report 0.005000 USDC), both [documented here]
(SECOND_ACTUAL_PAID_CSV_SALE_20261019.md).
Those remain the ONLY TWO **independently verified delivered API calls**.
This additional 0.005 USDC receipt is real, but successful paid API
output delivery and precise product attribution remain **unverified**.

### Accounting once, without double counting

- Three distinct finalized VM5 incoming USDC transfers:
  **0.010000 + 0.005000 + 0.005000 = 0.020000 native Circle Base USDC**
  *received*, the last 0.005000 newly seen on 20 Oct 2026.
- Same actual human owner's separate old VM1 HashN on-chain 1.000000 native
  Base Circle USDC has already been booked once; overall four unique
  original fleet receipts therefore total **1.020000 gross received USDC**.
- Other VM2 human-approved coding bounties are **not yet paid**.
- Fiat bank cashout: **0 USD**. Electricity, API hosting, labor,
  merchant accounting, taxes and net operating profit are not established.
- Don't treat this as a consumer subscription, retained client, a
  second delivered paid CSV customer, or a second payout of the two old
  independent NoHumans scout transactions.

The business sells hosted **software API results**, not raw CPU/GPU/server
capacity. The receiving address and transaction proof are public;
no payment credentials, wallet seeds, customer-owned private data or
signed authorizations are included here.
