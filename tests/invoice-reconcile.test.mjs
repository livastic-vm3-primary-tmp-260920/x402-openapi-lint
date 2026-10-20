import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectInvoicePair,INVOICE_API_LIMITS,INVOICE_DEMO} from '../invoice-reconcile.mjs';
const run=()=>inspectInvoicePair({invoicesCsv:INVOICE_DEMO.invoices,transfersCsv:INVOICE_DEMO.transfers});
test('Four synthetic invoices expose exact partial noallocation and pending safely',()=>{
  const o=run();
  assert.equal(o.ok,true);assert.equal(o.summary.invoiceCount,4);
  assert.equal(o.summary.reportedExact,1);assert.equal(o.summary.reportedPartial,1);
  assert.equal(o.summary.unreferencedEvents,1);assert.equal(o.summary.pendingReported,1);
  assert.equal(o.manualReview[0].kind,'shared_address_ambiguous');
  assert.equal(o.noRawWalletOrTxHash,true);
  assert.equal(o.blockchainFinalityVerified,false);
  assert.doesNotMatch(JSON.stringify(o),/0x[a-f0-9]{40,64}/i);
});
test('Duplicate events are never double credited',()=>{
 const r=inspectInvoicePair({invoicesCsv:INVOICE_DEMO.invoices,transfersCsv:INVOICE_DEMO.transfers+'\n'+INVOICE_DEMO.transfers.split('\n')[1]});
 assert.equal(r.ok,true);assert.equal(r.summary.duplicateEventRows,2);
 assert.equal(r.invoices[0].reported_finalized_usdc,'0');
});
test('Only exact two fields and bounded UTF8 content pass input checks',()=>{
 for(const value of [null,{},[],{invoicesCsv:'hi',transfersCsv:'x',privateKey:'nope'},
 {invoicesCsv:'a'.repeat(65537),transfersCsv:'csv'}, {invoicesCsv:INVOICE_DEMO.invoices,transfersCsv:''}]){
  const o=inspectInvoicePair(value);assert.equal(o.ok,false);
  assert.doesNotMatch(JSON.stringify(o),/privateKey|a{40}|secret/i);
 }
 assert.equal(INVOICE_API_LIMITS.maxBytesPerCsv,65536);
});
test('Invalid client contents return no payment-eligible payload or client value echo',()=>{
 const v=inspectInvoicePair({invoicesCsv:INVOICE_DEMO.invoices.replace('INV-DEMO-A','SECRET-CUSTOMER'),transfersCsv:'contact,SECRET-CUSTOMER'});
 assert.equal(v.ok,false);assert.doesNotMatch(JSON.stringify(v),/SECRET-CUSTOMER/);
});
