import test from 'node:test';
import assert from 'node:assert/strict';
import {
 summarizeTapeoutSettlement,TAPEOUT_RECEIPT_PATH,TAPEOUT_RECEIPT_NETWORK
} from '../tapeout/settlement-audit.mjs';
const tx='0x'+'22'.repeat(32);
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64');
const accepted={success:true,network:TAPEOUT_RECEIPT_NETWORK,transaction:tx};
const attempt=(receipt,other={})=>summarizeTapeoutSettlement({
 method:'GET',path:TAPEOUT_RECEIPT_PATH,statusCode:200,
 paymentResponse:receipt, ...other
});

test('a locally mocked PAYMENT-RESPONSE only becomes an explicitly unverified summary',()=>{
 const entry=attempt(encode(accepted));
 assert.deepEqual(entry,{
  event:'facilitator_reported_x402_settlement_unreconciled',
  path:TAPEOUT_RECEIPT_PATH,
  network:'eip155:8453',nominalGrossUSDC:'0.005000',
  transactionHash:tx,finalizedBeneficiaryTransferVerified:false,
  independentlyIdentifiedBuyer:false
 });
 assert.ok(Object.isFrozen(entry));
});
test('no 402 challenge or preflight error is ever interpreted as a sale',()=>{
 for(const statusCode of [0,200.1,201,202,206,302,400,401,402,403,429,500,503]){
  assert.equal(attempt(encode(accepted),{statusCode}),null);
 }
 for(const method of ['POST','HEAD','OPTIONS','DELETE',undefined]){
  assert.equal(attempt(encode(accepted),{method}),null);
 }
 for(const path of ['/v1/ping','/v1/tapeout-cpu0-report?x=1','/v1/csv-report','/health']){
  assert.equal(attempt(encode(accepted),{path}),null);
 }
});
test('payload must be a real success and a public 32-byte hash on Base',()=>{
 for(const obj of [
  {...accepted,success:false},{...accepted,success:undefined},
  {...accepted,network:'eip155:1'}, {...accepted,network:'solana'},
  {...accepted,transaction:'0x123'}, {...accepted,transaction:'private_key'},
  {...accepted,transaction:null},
  {...accepted,error:'settle_failed'},
  {...accepted,invalidReason:'no_signature'},
  {success:true,network:'eip155:8453'},
  [],null
 ]){
  assert.equal(attempt(encode(obj)),null,JSON.stringify(obj));
 }
});
test('malformed, noncanonical and enormous headers are discarded, not decoded',()=>{
 for(const v of [null,undefined,42,'','AQ','%%%%',' '.repeat(150),
   encode({success:true,network:'eip155:8453',transaction:'0x'}),
   encode(accepted).replace(/.$/,'!'), 'A'.repeat(10000)]){
  assert.equal(attempt(v),null);
 }
});
test('personal payload fields, buyer signatures and payment auth never reach output',()=>{
 const obj={...accepted,
  buyerEmail:'buyer@example.invalid',paymentSignature:'very-sensitive-test-placeholder',
  authorization:{nonce:'secret-test-nonce'},payer:'0x'+'33'.repeat(20)};
 const entry=attempt(encode(obj));
 assert.ok(entry);
 const json=JSON.stringify(entry);
 for(const forbidden of ['buyer@example.invalid','very-sensitive-test-placeholder',
   'secret-test-nonce','authorization','payer','paymentSignature']){
   assert.equal(json.includes(forbidden),false,forbidden);
 }
});
test('transaction hash case canonicalized and no cross-SKU amount confused',()=>{
 const obj={...accepted,transaction:tx.toUpperCase().replace('0X','0x')};
 assert.equal(attempt(encode(obj)).transactionHash,tx);
 assert.equal(attempt(encode(obj),{path:'/v1/x402-template'}),null);
});
