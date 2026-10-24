import test from 'node:test';
import assert from 'node:assert/strict';
import {echoCanonicalX402ChallengeOnFunding} from '../funding/x402-challenge-body-compat.mjs';
import {FUNDING_PAYOUT_BASE,FUNDING_PRICE_USDC} from '../funding/four-venue.mjs';
import fs from 'node:fs';

const ROUTE='http://127.0.0.1:8765/v1/btc-funding-four-venues';
const CIRCLE='0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913';
function quote(){return {
  x402Version:2,resource:{url:ROUTE},
  accepts:[{scheme:'exact',network:'eip155:8453',payTo:FUNDING_PAYOUT_BASE,
    asset:CIRCLE,amount:'10000',maxTimeoutSeconds:300,
    extra:{name:'USD Coin',version:'2'}}],
  extensions:{bazaar:{info:{input:{type:'http',method:'GET',queryParams:{}},output:{type:'json'}}}}
};}
function run(original,opts={}){
 const headers=new Map();
 if(opts.wire)headers.set('payment-required',opts.wire);
 let body;
 const res={statusCode:opts.status??402,
   getHeader:(k)=>headers.get(k.toLowerCase()),
   setHeader:(k,v)=>{headers.set(k.toLowerCase(),v);},
   type:(v)=>{headers.set('content-type',v==='json'?'application/json':v);return res;},
   send(v){body=v;return res;}};
 let proceeded=0;
 echoCanonicalX402ChallengeOnFunding({},res,()=>{proceeded++;res.send(original)});
 return {body,headers,proceeded};
}
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64');

test('Valid BASE USDC x402v2 HTTP402 quote mirrors canonical header exactly for legacy directory; no payment',()=>{
 const q=quote();const wire=b64(q);const r=run('{}',{wire});
 assert.equal(r.proceeded,1);
 assert.deepEqual(JSON.parse(r.body),q);
 assert.equal(r.headers.get('payment-required'),wire);
 assert.equal(r.headers.get('x-payment-required'),wire);
 assert.equal(r.headers.get('content-type'),'application/json');
 assert.match(r.headers.get('access-control-expose-headers'),/X-Payment-Required/);
 assert.equal(q.accepts[0].amount,'10000');
 assert.equal(q.accepts[0].payTo.toLowerCase(),'0x4e3106520e40af30870cafe78da1b1e7110ed98e');
 assert.equal(FUNDING_PRICE_USDC,'0.01');
});

test('Invalid public challenge property MUST NOT create legacy alias or replace native x402 middleware answer',()=>{
 const mutations={
    'wrong Base token':q=>{q.accepts[0].asset='0x'+'11'.repeat(20)},
    'wrong owner payee':q=>{q.accepts[0].payTo='0x'+'22'.repeat(20)},
    'wrong amount':q=>{q.accepts[0].amount='5000'},
    'wrong network':q=>{q.accepts[0].network='eip155:1'},
    'wrong scheme':q=>{q.accepts[0].scheme='upto'},
    'missing accepted price':q=>{delete q.accepts[0].amount},
    'multiple accepts':q=>{q.accepts.push({...q.accepts[0]})},
    'missing accepts':q=>{q.accepts=[]},
    'bad version':q=>{q.x402Version=1},
    'wrong route':q=>{q.resource.url='http://127.0.0.1:8765/v1/tapeout-cpu0-report'},
    'query injection':q=>{q.resource.url+='?payTo=other'},
    'fragment injection':q=>{q.resource.url+='#other'},
    'bad resource URL':q=>{q.resource.url='not-a-url'}
 };
 for(const [label,mutate] of Object.entries(mutations)){
   const q=quote();mutate(q);const r=run('{}',{wire:b64(q)});
   assert.equal(r.body,'{}',label);
   assert.equal(r.headers.get('x-payment-required'),undefined,label);
   assert.equal(r.headers.get('payment-required'),b64(q),label);
 }
});

test('Malformed, absent or unbounded quote preserves original payment middleware body (fail closed)',()=>{
 for(const wire of [undefined,'not_valid_base64_json',Buffer.from('undefined').toString('base64'),'A'.repeat(22000)]){
   const r=run('{}',{wire});assert.equal(r.body,'{}');
   assert.equal(r.headers.get('x-payment-required'),undefined);
 }
});

test('Any 200 after actual payment middleware remains unmodified, 400/503 also remain unchanged',()=>{
 for(const status of [200,400,503]){
   const original=JSON.stringify({ok:status===200,code:status,paid:status===200});
   const r=run(original,{wire:b64(quote()),status});
   assert.equal(r.body,original);
   assert.equal(r.headers.get('x-payment-required'),undefined);
 }
});

test('Exact path applies ONLY after successful four-source live preflight and before SAME payment middleware',()=>{
 const s=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const snippet=s.slice(s.indexOf('app.get("/v1/btc-funding-four-venues"'),s.indexOf('app.get("/v1/tapeout-cpu0-diff-sample"'));
 assert.match(snippet,/res\.locals\.fundingSnapshot=await readLiveFourVenueFunding\(\);/);
 assert.match(snippet,/echoCanonicalX402ChallengeOnFunding,payment,/);
 assert.ok(snippet.indexOf('res.locals.fundingSnapshot=await readLiveFourVenueFunding()')<snippet.indexOf('echoCanonicalX402ChallengeOnFunding,payment'));
 assert.match(snippet,/return res\.status\(503\)\.json/);
 assert.match(snippet,/return res\.status\(400\)\.json/);
 assert.doesNotMatch(snippet,/wallet\.sign|sendTransaction|walletClient/);
});
