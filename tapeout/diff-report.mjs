/**
 * Independent one-owner TapeOut X Layer *paid* state-change report.
 * Different product from one-block CPU0 snapshot: compare all 20 fixed
 * contract fields between actual read-only RPC block pins, return changes.
 * No transaction/signing/asset movement. No paid quote unless both complete.
 */
import {PublicRpc} from './rpc.mjs';
import {CHAIN_ID,FACTORY,MARKET,diagnostics,publicJson} from './core.mjs';
import {TAPEOUT_PAYOUT} from './paid-report.mjs';

export const DIFF_PRICE_USDC='0.01';
export const DIFF_BASELINE_BLOCK=73915245n; // recorded public X Layer October 23, 2026
export const DIFF_FIELDS=Object.freeze([
 ['factory.cpuCount','Registered CPU processor count','uint'],
 ['factory.deployFee','Factory deploy fee (wei)','uint'],
 ['factory.protocolFee','Factory protocol fee (wei)','uint'],
 ['factory.isSealed','Factory immutable sealing flag','bool'],
 ['factory.owner','Factory owner address','address'],
 ['factory.implementation','Factory EIP-1967 implementation','address'],
 ['market.feeBps','Marketplace fee (basis points)','uint'],
 ['market.isSealed','Marketplace sealing flag','bool'],
 ['market.owner','Marketplace owner','address'],
 ['market.implementation','Marketplace EIP-1967 implementation','address'],
 ['market.nextListingId','Next market listing ID','uint'],
 ['processor.circuits','CPU0 circuit contract address','address'],
 ['processor.transistors','CPU0 transistor ERC20 address','address'],
 ['processor.creator','CPU0 creator','address'],
 ['processor.nextId','CPU0 next circuit ID','uint'],
 ['processor.tapeoutFee','CPU0 tapeout fee (wei)','uint'],
 ['processor.mintPrice','CPU0 transistor mint price (wei)','uint'],
 ['processor.minted','CPU0 transistors minted','uint'],
 ['processor.supplyCap','CPU0 transistor cap','uint'],
 ['processor.protocolFee','CPU0 transistor protocol fee (wei)','uint']
]);
export {TAPEOUT_PAYOUT};
function toUint(v){
  if(typeof v!=='string'&&typeof v!=='bigint'&&!(typeof v==='number'&&Number.isSafeInteger(v)))throw Error('Invalid numeric chain field');
  const s=String(v);
  if(!/^(0|[1-9][0-9]*)$/.test(s))throw Error('Invalid unsigned chain value');
  const n=BigInt(s);
  if(n>=1n<<256n)throw Error('Value exceeds uint256');
  return n.toString();
}
function normalize(v,type){
  if(type==='uint')return toUint(v);
  if(type==='bool'){if(typeof v!=='boolean')throw Error('Malformed flag');return String(v);}
  if(type==='address'){if(typeof v!=='string'||!/^0x[0-9a-f]{40}$/i.test(v))throw Error('Malformed address');return v.toLowerCase();}
  throw Error('Unknown comparison type');
}
function field(snapshot,path){const [cat,key]=path.split('.');return snapshot?.[cat]?.[key];}
export function compareVerifiedTapeoutSnapshots(before,after){
  for(const s of [before,after]){
    if(!s || s.schema!=='TapeOutXLayerRiskLens/v1'||s.chainId!==Number(CHAIN_ID)||
       s.partial!==false||!Array.isArray(s.errors)||s.errors.length!==0||
       normalize(s.factory?.address,'address')!==FACTORY.toLowerCase()||
       normalize(s.market?.address,'address')!==MARKET.toLowerCase()||
       !s.processor||toUint(s.processor.index)!=='0')throw Error('Chain evidence not complete');
  }
  const a=toUint(before.blockNumber),b=toUint(after.blockNumber);
  if(BigInt(a)>=BigInt(b))throw Error('Comparison blocks not strictly increasing');
  const changes=[];
  for(const [path,label,type] of DIFF_FIELDS){
    const old=normalize(field(before,path),type);
    const current=normalize(field(after,path),type);
    if(old!==current)changes.push({field:path,label,before:old,after:current});
  }
  return {
    kind:'xlayer_tapeout_cpu0_pinned_state_diff',
    schema:'TapeOutXLayerRiskLens/paid-diff-v1',
    chainId:Number(CHAIN_ID),cpuIndex:0,network:'eip155:196',
    baselineBlock:a,liveBlock:b,fieldsCompared:DIFF_FIELDS.length,
    changes,changeCount:changes.length,unchangedCount:DIFF_FIELDS.length-changes.length,
    cpuIdentityChanged:changes.some(x=>x.field==='processor.circuits'||x.field==='processor.transistors'),
    // State diffs are derived from two individually pinned reads, but public
    // upstream JSON-RPC providers are NOT independent cryptographic consensus proofs.
    warning:'Public X Layer RPC snapshots at two pinned blocks. Not a formal audit, trade recommendation, consensus proof, guarantee of unchanged intermediate states, or proof that a third-party customer paid.',
    source:{factory:FACTORY,market:MARKET,method:'public JSON-RPC eth_call and eth_getStorageAt at each exact block',readOnly:true},
    noWalletKeysRequired:true,noTransactionSent:true,
    olderFullSnapshotDiagnostics:diagnostics(before),latestFullSnapshotDiagnostics:diagnostics(after)
  };
}
let cache=null,inFlight=null;
const FRESH_MS=30000;
function makeRpc(){
 const u=process.env.TAPEOUT_XLAYER_RPC_TEST_ONLY;
 if(process.env.NODE_ENV==='test'&&/^http:\/\/127\.0\.0\.1:\d+$/.test(u||''))return new PublicRpc([u]);
 return new PublicRpc();
}
export async function getLiveTapeoutStateDiff(){
 if(cache && Date.now()-cache.time<FRESH_MS)return cache.data;
 if(inFlight)return inFlight;
 inFlight=(async()=>{
    const rpc=makeRpc();
    // This test-only earlier tag preserves the unchanged original fake RPC
    // server's latest block 2280 and exercises historical reads offline.
    const baseline=(process.env.NODE_ENV==='test' ? 2279n : DIFF_BASELINE_BLOCK);
    const live=await rpc.snapshot(0);
    if(live.partial||!live.processor||live.chainId!==196)throw Error('Incomplete latest TapeOut chain state');
    if(BigInt(live.blockNumber)<=baseline)throw Error('Latest X Layer block predates baseline');
    const older=await rpc.snapshot(0,baseline);
    if(older.partial||!older.processor||older.chainId!==196||BigInt(older.blockNumber)!==baseline)
      throw Error('Incomplete baseline TapeOut chain state');
    const diff=compareVerifiedTapeoutSnapshots(older,live);
    const report=JSON.parse(publicJson(diff));
    cache={time:Date.now(),data:report};
    return report;
 })();
 try{return await inFlight;}finally{inFlight=null;}
}
