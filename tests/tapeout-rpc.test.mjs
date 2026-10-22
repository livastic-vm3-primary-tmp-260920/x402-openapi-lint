import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicRpc} from '../tapeout/rpc.mjs';
import {FACTORY,MARKET,SELECTOR,IMPL_SLOT} from '../tapeout/core.mjs';
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const addr=a=>word(BigInt(a));
const processor='0x'+'1'.repeat(40);
const transistor='0x'+'2'.repeat(40);
const owner='0x'+'3'.repeat(40);
const fake=(which=null)=>async(url,init)=>{
 const req=JSON.parse(init.body);
 const [obj]=req.params;
 let result='0x';
 if(req.method==='eth_chainId')result='0xc4';
 else if(req.method==='eth_blockNumber')result='0x8e8';
 else if(req.method==='eth_getStorageAt')result=word(123);
 else if(req.method==='eth_call'){
  assert.equal(req.params[1],'0x8e8','must pin all calls to one read block');
  const k=obj.data.slice(0,10),to=obj.to.toLowerCase();
  if(to===FACTORY.toLowerCase()){
   if(k===SELECTOR.cpuCount)result=word(10);
   else if(k===SELECTOR.deployFee)result=word(6600000000000000n);
   else if(k===SELECTOR.protocolFee)result=word(660000000000000n);
   else if(k===SELECTOR.isSealed)result=word(0);
   else if(k===SELECTOR.owner)result=addr(owner);
   else if(k===SELECTOR.cpuAt)result=addr(processor);
  }else if(to===MARKET.toLowerCase()){
   if(k===SELECTOR.feeBps)result=word(100);
   else if(k===SELECTOR.isSealed)result=word(0);
   else if(k===SELECTOR.owner)result=addr(owner);
   else if(k===SELECTOR.nextListingId)result=word(4);
  }else if(to===processor.toLowerCase()){
   if(k===SELECTOR.nextId)result=word(5);
   else if(k===SELECTOR.tapeoutFee)result=word(1300000000000000n);
   else if(k===SELECTOR.transistors)result=addr(transistor);
  }else if(to===transistor.toLowerCase()){
   if(k===SELECTOR.mintPrice)result=word(10n**13n);
   else if(k===SELECTOR.minted)result=word(100);
   else if(k===SELECTOR.supplyCap)result=word(1000);
   else if(k===SELECTOR.protocolFee)result=word(660000000000000n);
   else if(k===SELECTOR.creator)result=addr(owner);
  }
 }
 if(which==='malformed' && req.method==='eth_call' && obj.data.slice(0,10)===SELECTOR.mintPrice)
   result='0x00';
 if(which==='bad-chain' && req.method==='eth_chainId')result='0x1';
 return {ok:true,status:200,json:async()=>({jsonrpc:'2.0',id:req.id,result})};
};
test('reads complete pinned snapshot with no wallet access',async()=>{
 const rpc=new PublicRpc(['https://rpc.example.invalid'],fake());
 const s=await rpc.snapshot(2);
 assert.equal(s.blockNumber,'2280');
 assert.equal(s.chainId,196);
 assert.equal(s.partial,false);
 assert.equal(s.factory.cpuCount,10n);
 assert.equal(s.processor.circuits,processor);
 assert.equal(s.processor.mintPrice,10n**13n);
 assert.equal(s.market.feeBps,100);
 assert.equal(s.market.implementation,'0x'+'0'.repeat(38)+'7b');
});
test('rejects off-chain ID and out-of-range CPU',async()=>{
 const rpc=new PublicRpc(['https://rpc.example.invalid'],fake('bad-chain'));
 await assert.rejects(()=>rpc.snapshot(),/Wrong RPC chain/);
 const good=new PublicRpc(['https://rpc.example.invalid'],fake());
 await assert.rejects(()=>good.snapshot(12),/out of range/);
});
test('partial reads never silently present as complete',async()=>{
 const rpc=new PublicRpc(['https://rpc.example.invalid'],fake('malformed'));
 const s=await rpc.snapshot(1);
 assert.equal(s.partial,true);
 assert.equal(s.processor.mintPrice,null);
 assert.ok(s.errors.some(e=>e.includes('mintPrice')));
});
test('read-only RPC allowlist rejects any wallet or transactional writes',async()=>{
 const rpc=new PublicRpc(['https://rpc.example.invalid'],fake());
 await assert.rejects(()=>rpc.request('eth_sendRawTransaction',[]),/Read-only methods only/);
 await assert.rejects(()=>rpc.request('personal_sign',[]),/Read-only methods only/);
 await assert.rejects(()=>rpc.request('eth_sendTransaction',[]),/Read-only methods only/);
});
test('does not evade throttle via second endpoint',async()=>{
 let seen=0;
 const rpc=new PublicRpc(['https://rpc1.example.invalid','https://rpc2.example.invalid'],
   async()=>{seen++;return{ok:false,status:429};});
 await assert.rejects(()=>rpc.request('eth_chainId'),/Rate limited/);
 assert.equal(seen,1);
});
test('network failure may use a legitimate second public RPC',async()=>{
 let seen=0;
 const rpc=new PublicRpc(['https://rpc1.example.invalid','https://rpc2.example.invalid'],
   async(...args)=>{seen++;if(seen===1)throw Error('network down');return fake()(...args);});
 assert.equal(await rpc.request('eth_chainId'),'0xc4');
 assert.equal(seen,2);
});
