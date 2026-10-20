/**
 * VM5 original paid hosted convenience wrapper for previously published
 * MIT-licensed same-owner client-only invoice/CSV reconciliation engine.
 * Buyer-provided CSV travels to this hosted API: NONCONFIDENTIAL/SYNTHETIC ONLY.
 * No chain RPC, invoice truth, payment status or accounting conclusions.
 * Rejected inputs NEVER incur x402 charge (preflight before middleware).
 */
import {reconcile,SYNTHETIC} from './invoice-engine.mjs';
export const INVOICE_DEMO=SYNTHETIC;
export const INVOICE_API_LIMITS=Object.freeze({maxBytesPerCsv:65536,maxDataRows:500});
const INVALID='Use two nonconfidential UTF-8 CSV strings with the exact documented Base mainnet Circle USDC invoice and reported transfer columns. Invalid schema, amount, chain, event ID or status.';
export function inspectInvoicePair(input){
 const bad=()=>({ok:false,error:'INVALID_CSV_PAIR',reason:INVALID});
 if(!input||typeof input!=='object'||Array.isArray(input))return bad();
 const keys=Object.keys(input);
 if(keys.length!==2||!keys.includes('invoicesCsv')||!keys.includes('transfersCsv'))return bad();
 for(const key of ['invoicesCsv','transfersCsv']){
  const value=input[key];
  if(typeof value!=='string'||!value||Buffer.byteLength(value,'utf8')>INVOICE_API_LIMITS.maxBytesPerCsv||value.includes('\u0000'))return bad();
 }
 try{
  const r=reconcile(input.invoicesCsv,input.transfersCsv);
  return {
   ok:true,
   kind:'base_usdc_self_reported_invoice_transfer_csv_candidate_reconciliation',
   summary:r.summary,
   invoices:r.invoices,
   manualReview:r.manualReview.map((row,index)=>({
     reviewOrdinal:index+1,
     kind:row.kind,
     candidateInvoiceIds:row.candidateInvoiceIds
   })),
   originalEventCount:r.summary.transferRows,
   noRawWalletOrTxHash:true,
   noRawCSVReturned:true,
   blockchainFinalityVerified:false,
   paymentIntentVerified:false,
   walletSigning:false,
   onlySelfReportedData:true,
   limitation:'CSV candidate comparison only. Even reported_exact is not proof of blockchain finality, payment ownership, booked customer revenue, invoice settlement, accounting or tax compliance. Never submit secrets, customer identity or sensitive business files to the hosted API; use the separate free browser-local tool instead.'
  };
 }catch(_){
  // Deliberately refuse to reflect source CSV, private user data, raw
  // transaction hashes, embedded formulae or dynamic error messages.
  return bad();
 }
}
