import test from 'node:test';
import assert from 'node:assert/strict';
import {readAaveBaseProxy,validateComponent,AAVE_COMPONENTS,EIP1967_SLOTS,AAVE_BASE_RPC} from '../aave/proxy1967.mjs';
const POOL=AAVE_COMPONENTS.pool;
const makeAddressWord=v=>'0x'+'0'.repeat(24)+(v||'0'.repeat(40)).slice(2).toLowerCase();
const fakeRuntime='0x'+'60806040'.repeat(80);
const fakePublicResponse=(calls,state={})=>{
  const results=calls.map(item=>{
    const {id,method,params}=item;
    let result;
    switch(method){
    case 'eth_chainId':result=state.chain||'0x2105';break;
    case 'eth_blockNumber':result=state.block||'0x32907cc';break;
    case 'eth_getStorageAt':result=params[1]===EIP1967_SLOTS.implementation?makeAddressWord(state.impl||POOL.addressBookImplementation):makeAddressWord('0x'+'0'.repeat(40));break;
    case 'eth_getCode':result=state.noCode?'0x':fakeRuntime;break;
    default:throw Error('UNEXPECTED_RPC_'+method);
    }
    return {jsonrpc:'2.0',id,result};
  });
  return {status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(state.duplicate?[...results,results[0]]:state.error?results.map((x,i)=>i===0?{...x,error:{code:999,message:'disallowed'}}:x):results)};
};
const mock=(state={})=>{let count=0;const req=async (url,init)=>{
 assert.equal(url,AAVE_BASE_RPC);assert.equal(init.method,'POST');assert.ok(!String(init.body).includes('eth_send'));
 assert.ok(!String(init.body).includes('eth_getLogs'));
 assert.ok(!String(init.body).includes('private'));count++;
 return fakePublicResponse(JSON.parse(init.body),state);
};return {req,calls:()=>count};};

test('Allowed input only pool or configurator, no arbitrary address/RPC URL',()=>{
 assert.deepEqual(validateComponent({}),{ok:true,component:'pool'});
 assert.deepEqual(validateComponent({component:'configurator'}),{ok:true,component:'configurator'});
 for(const x of [{address:POOL.proxy},{component:'latest'},{component:'pool',other:'x'},{component:['pool']},{rpc:'https://evil.test'},{component:'__proto__'}])assert.equal(validateComponent(x).ok,false);
});
test('Original fixed Aave public pool proof is consistent and 3 RPC batches, no signer, no cost',async()=>{
 const {req,calls}=mock();const res=await readAaveBaseProxy('pool',{request:req});
 assert.equal(calls(),3);assert.equal(res.dataChain,'eip155:8453');assert.equal(res.proxy,POOL.proxy);
 assert.equal(res.implementation.toLowerCase(),POOL.addressBookImplementation.toLowerCase());
 assert.equal(res.admin,null);assert.equal(res.beacon,null);assert.equal(res.proxyCode.codeBytes,320);assert.equal(res.implementationCode.codeBytes,320);
 assert.equal(res.matchesPublishedAaveAddressBook,true);assert.equal(res.noSignerOrTransaction,true);
});
test('Upgraded implementation is shown honestly, not falsely claimed safe or current',async()=>{
 const other='0x'+'5'.repeat(40);const {req}=mock({impl:other});const res=await readAaveBaseProxy('pool',{request:req});
 assert.equal(res.implementation,other);assert.equal(res.matchesPublishedAaveAddressBook,false);
 assert.match(res.limitations,/not prove governance-free/);
});
test('Wrong chain, missing code, malformed duplicate RPC batch and node error fail before payment',async()=>{
 for(const variant of [{chain:'0x1'},{noCode:true},{duplicate:true},{error:true},{block:'0x0'}]){
  const {req}=mock(variant);await assert.rejects(readAaveBaseProxy('pool',{request:req}),Error);
 }
});
test('Can only select the two fixed official Aave mainnet components; bad options rejected',async()=>{
 await assert.rejects(readAaveBaseProxy('arbitrary',{request:mock().req}));
 const req=async(url,init)=>{const values=JSON.parse(init.body);const config=values.some(z=>z.method==='eth_getStorageAt'&&z.params[0]===AAVE_COMPONENTS.configurator.proxy);
  return fakePublicResponse(values,config?{impl:AAVE_COMPONENTS.configurator.addressBookImplementation}:{})};
 const res=await readAaveBaseProxy('configurator',{request:req});
 assert.equal(res.component,'configurator');assert.equal(res.matchesPublishedAaveAddressBook,true);
});
