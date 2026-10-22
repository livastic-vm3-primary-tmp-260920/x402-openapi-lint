/**
 * Shared operator's original VM1 MetaMask receives ONLY this NEW route's
 * native Circle Base USDC. Never change pre-existing VM5 merchant payTo.
 *
 * This code reads X Layer only. A full, complete, block-pinned report is
 * computed BEFORE presenting an x402 payment requirement, cached briefly,
 * and returned solely after independent buyer-signed x402 settlement.
 */
import {PublicRpc} from './rpc.mjs';
import {diagnostics,publicJson} from './core.mjs';

export const TAPEOUT_PAYOUT='0x4e3106520E40af30870caFE78da1B1e7110eD98E';
export const TAPEOUT_PRICE_USDC='0.005';
const CACHE_MS=30000;
let cache=null, inFlight=null;

function makeRpc(){
  const u=process.env.TAPEOUT_XLAYER_RPC_TEST_ONLY;
  if(process.env.NODE_ENV==='test' && /^http:\/\/127\.0\.0\.1:\d+$/.test(u||'')){
    return new PublicRpc([u]);
  }
  return new PublicRpc();
}

export async function getCurrentTapeoutEvidence() {
  if(cache && Date.now()-cache.cachedAt<CACHE_MS) return cache.report;
  if(inFlight) return inFlight;
  inFlight=(async()=>{
    const rpc=makeRpc();
    const s=await rpc.snapshot(0);
    if(s.partial || !s.processor || s.factory.cpuCount===null) throw Error('TapeOut public RPC complete-read check failed');
    if(s.chainId!==196 || s.factory.cpuCount<1n) throw Error('Unexpected TapeOut chain or empty registry');
    const report=JSON.parse(publicJson({
      ...s,
      kind:'xlayer_tapeout_genesis_cpu_onchain_snapshot',
      cpuIndex:0,
      diagnostics:diagnostics(s),
      reportDisclosure:{
        publicCode:'https://github.com/livastic-vm5-primary-20260911/tapeout-xlayer-integrity-lens',
        liveFreeInspector:'https://livastic-vm5-primary-20260911.github.io/tapeout-xlayer-integrity-lens/',
        dataSource:'Public X Layer chain 196, pinned RPC block; independent RPC provider reads',
        feeNotice:'Quote/contract fees are not network gas, proof of custody or guaranteed future prices.',
        security:'Not a formal audit, investment advice, independent chain-consensus proof, authorization check or escrow attestation.'
      }
    }));
    cache={cachedAt:Date.now(),report};
    return report;
  })();
  try {return await inFlight;} finally {inFlight=null;}
}
