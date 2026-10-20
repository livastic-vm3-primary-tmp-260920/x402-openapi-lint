import test from "node:test";
import assert from "node:assert/strict";
import {baseRpcRead,BASE_CHAIN_ID} from "../base-usdc-receipt.mjs";
const PRIMARY="https://public.1rpc.io/base", BACKUP="https://mainnet.base.org";
// The broader mock merchant suite sets BASE_RPC_URL to its private loopback.
// These public-provider tests explicitly exercise the fixed production origin.
const rpcCall=(method,params,options={})=>baseRpcRead(method,params,{rpcUrl:PRIMARY,...options});
const result=(value,status=200)=>new Response(JSON.stringify({jsonrpc:"2.0",id:1,result:value}),
  {status,headers:{"content-type":"application/json"}});
test("official documented Base8453 primary RPC succeeds without unnecessary failover",async()=>{
 const origins=[];
 const value=await rpcCall("eth_chainId",[],{transport:async(u,o)=>{
  origins.push(u);assert.equal(o.method,"POST");
  assert.equal(JSON.parse(o.body).method,"eth_chainId");
  assert.equal(o.redirect,"error");return result("0x2105");
 }});
 assert.equal(value,"0x2105");assert.deepEqual(origins,[PRIMARY]);assert.equal(BASE_CHAIN_ID,8453);
});
test("503 temporary failure retries only once to the independently pinned Base public endpoint",async()=>{
 const origins=[];
 const value=await rpcCall("eth_blockNumber",[],{transport:async(u)=>{
  origins.push(u);return u===PRIMARY?new Response("busy",{status:503}):result("0x456");
 }});
 assert.equal(value,"0x456");assert.deepEqual(origins,[PRIMARY,BACKUP]);
});
test("public read-only transport failure gets one bounded backup and no signing",async()=>{
 const origins=[];
 const value=await rpcCall("eth_getTransactionReceipt",["0x"+"ab".repeat(32)],{transport:async(u,o)=>{
  origins.push(u);assert.equal(JSON.parse(o.body).method,"eth_getTransactionReceipt");
  if(u===PRIMARY)throw TypeError("temporary");
  return result({status:"0x1",logs:[]});
 }});
 assert.equal(value.status,"0x1");assert.deepEqual(origins,[PRIMARY,BACKUP]);
});
test("explicit local NODE_ENV=test test RPC is used once; no fallback on test fixture errors",async()=>{
 const old=process.env.NODE_ENV;process.env.NODE_ENV="test";
 try{
  const seen=[];
  await assert.rejects(()=>rpcCall("eth_blockNumber",[],{
   rpcUrl:"http://127.0.0.1:8888",transport:async u=>{seen.push(u);return new Response("",{status:503})}
  }),/temporary/);
  assert.deepEqual(seen,["http://127.0.0.1:8888"]);
 }finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old}
});
test("provider access refusal HTTP403 and malformed or wrong provider data must fail closed without fallback",async()=>{
 const seen=[];
 await assert.rejects(()=>rpcCall("eth_chainId",[],{
  transport:async u=>{seen.push(u);return new Response("No Access",{status:403})}
 }),/refused/);
 assert.deepEqual(seen,[PRIMARY]);
 const seenMalformed=[];
 await assert.rejects(()=>rpcCall("eth_chainId",[],{
  transport:async u=>{seenMalformed.push(u);return new Response("not-json",{status:200})}
 }),/JSON/);
 assert.deepEqual(seenMalformed,[PRIMARY]);
});
test("never try arbitrary network, writable RPC method, token signer or arbitrary hosts",async()=>{
 const seen=[];
 for(const method of ["eth_sendTransaction","eth_sendRawTransaction","eth_getBalance","eth_sign","eth_call"]){
  await assert.rejects(()=>rpcCall(method,[],{transport:async u=>{seen.push(u)}}),/Refusing/);
 }
 await assert.rejects(()=>rpcCall("eth_chainId",[],{
  rpcUrl:"https://evil.example",transport:async u=>{seen.push(u)}
 }),/Untrusted/);
 assert.deepEqual(seen,[]);
});
test("both official providers unavailable => no data and no payment decision",async()=>{
 const seen=[];
 await assert.rejects(()=>rpcCall("eth_blockNumber",[],{transport:async u=>{
  seen.push(u);return new Response("busy",{status:503});
 }}),/temporary/);
 assert.deepEqual(seen,[PRIMARY,BACKUP]);
});
