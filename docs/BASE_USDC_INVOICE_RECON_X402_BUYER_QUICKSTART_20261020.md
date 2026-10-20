# Base USDC invoice ↔ reported-transfer CSV candidate matching (x402 v2)

> **Deployment status — 2026-10-20:** This is currently a **source-ready API candidate only**, NOT yet available on the public Render server. First-party GitHub code and local mocked payment tests exist; the original public hosted /v1/invoice-reconcile-sample returned **HTTP404** when checked. The Render service uses MANUAL deploys. A previously blocked unrelated receipt-route deployment must NOT be reattempted or silently bundled into a deployment of this new functionality. DO NOT send a wallet payment or assume this new API is accessible until its actual public GET preview and unsigned POST quote are independently verified after an authorized deployment. Price and examples below are intended terms, not existing live checkout.


One-machine-call service for agents that need to review **two nonconfidential, invented or explicitly authorized public CSV files**. The original same-owner free browser-local version is at:

https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/usdc-invoice-bridge/

The browser version processes files **locally without uploading them**. This paid API necessarily receives both CSV strings over HTTPS. **Do not send private payroll, customer identifiers, personal invoices, API keys, wallet seeds, bank statements or confidential client data.** Use only synthetic or expressly permitted nonsecret records.

## Value and limitations

The paid server returns a machine-readable candidate exception report covering reported exact matches, under/overpayments, pending event rows, duplicate `chain:txHash:logIndex` keys, unknown references, missing invoice IDs and shared recipient-wallet ambiguity. It **never** automatically allocates an unreferenced transfer by recipient address alone.

A reported status is **not independently confirmed onchain**, even when the input field says `reported_finalized`. No live Base RPC call, wallet signing, client transaction verification, accounting/tax advice, or merchant-customer intent conclusion is included. The output omits raw tx hashes and recipient-wallet addresses. Nonsecret invoice IDs and numeric aggregates are retained so users can review the report.

**Price:** 0.005000 native Circle USDC on Base (chain ID 8453), an exact 5,000-atomic-unit **x402 v2** payment request for each successful authorized POST. Price and recipient are shown in the `PAYMENT-REQUIRED` header. The payment signer must be an independently authorized, lawful buyer-controlled wallet. **Merely fetching the free preview or receiving HTTP402 does not spend money.**

## First try: no wallet, no charge

```sh
curl -sS https://vm5-openapi-x402.onrender.com/v1/invoice-reconcile-sample
```

This shows four fully fictitious invoices and events with an intentionally partial payment, one pending row and a shared-wallet ambiguous unreferenced event. The response includes `inventedRequest` (the exact two CSV strings) to adapt safely.

## Quote a valid POST without paying

Get the *inventedRequest* strings from the free sample. Send exactly two JSON fields:

```json
{
  "invoicesCsv": "invoice_id,recipient,amount_usdc,chain,token\nINV-001,0x1111111111111111111111111111111111111111,1.000000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913",
  "transfersCsv": "invoice_id,tx_hash,log_index,recipient,amount_usdc,chain,token,status\nINV-001,0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,0,0x1111111111111111111111111111111111111111,1.000000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,reported_finalized"
}
```

POST it to:

`https://vm5-openapi-x402.onrender.com/v1/invoice-reconcile`

without `PAYMENT-SIGNATURE`. Valid input gets `HTTP402` with a **Base USDC 0.005** exact requirement; malformed CSVs, wrong chain/token, duplicate invalid IDs, oversized inputs and wrong JSON fields fail **before** the payment middleware. Do not copy secrets into CLI history. Maximum **64 KiB per CSV**, at most **500 data rows** each, canonical Circle Base USDC contract only. Paid clients submit the exact same authorized JSON after signing their own x402 authorization.

## Buyer output after a real successful payment

```json
{
  "ok": true,
  "paid": true,
  "chargedUSDC": "0.005",
  "network": "eip155:8453",
  "summary": {"invoiceCount": 4, "reportedExact": 1, "reportedPartial": 1, "unreferencedEvents": 1, "pendingReported": 1},
  "blockchainFinalityVerified": false,
  "noRawWalletOrTxHash": true,
  "confirmedIndependentPaidInvoiceBuyers": 0
}
```

Illustrative, not a previously paid real user. Actual response has bounded per-invoice candidate statuses and an explicit manual review queue; a human must independently verify authoritative ledger/chain evidence before treating any invoice as paid.

## Commercial truth

Same one-human-owner MIT reference implementation, AI-assisted source disclosed. Historical 0.010 and 0.005 Base-USDC x402 transfers bought earlier *different products* from the **same outside automated scout**. This new invoice-matching route has **zero independently verified paying clients** until a distinct real payment and successful service delivery are confirmed. Market/catalog indexing, test-facilitator 200 and generated fixtures do not count as sales. There are no subscriptions, guarantee of profits, rented CPU/GPU/VPS capacity or token-investment offers.
