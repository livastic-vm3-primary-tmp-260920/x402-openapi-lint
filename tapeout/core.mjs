/**
 * TapeOut X Layer Risk Lens — all addresses are public on-chain references.
 * No wallet connection or signing. Do NOT use this tool to infer that a contract is audited.
 */
export const CHAIN_ID = 196n;
export const RPC_URLS = Object.freeze(['https://rpc.xlayer.tech','https://xlayerrpc.okx.com']);
export const FACTORY = '0x1f09daefa827f02cbb40967cc91b259763760761';
export const MARKET = '0xd89f358c48a7B632c9845af2a02A32eB90DD75DB';
export const IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const SELECTOR = Object.freeze({
 deployFee:'0xeb2a5d2c', protocolFee:'0xb0e21e8a',
 cpuCount:'0xa94da8a7',isSealed:'0x631f9852',owner:'0x8da5cb5b',
 cpuAt:'0x4bc7cbbd',transistorBeacon:'0xb3746a25',circuitBeacon:'0xddcb22fa',
 tapeoutFee:'0xadfb2b69',nextId:'0x61b8ce8c',supplyCap:'0x8f770ad0',
 minted:'0x4f02c420',mintPrice:'0x6817c76c',feeBps:'0x24a9d853',
 nextListingId:'0xaaccf1ec',transistors:'0x6fbd1719',creator:'0x02d05d3f'
});
export function asWord(value) {
 if (typeof value !== 'string' || !/^0x[0-9a-f]*$/i.test(value) ||
     value.length !== 66) throw new Error('Invalid 32-byte ABI word');
 return value.toLowerCase();
}
export function uintFromWord(value) { return BigInt(asWord(value)); }
export function boolFromWord(value) {
 const n=uintFromWord(value); if(n!==0n && n!==1n) throw new Error('Invalid boolean');
 return n===1n;
}
export function addressFromWord(value) {
 const s=asWord(value);
 if (!/^0{24}[0-9a-f]{40}$/.test(s.slice(2))) throw new Error('Noncanonical ABI address');
 return '0x'+s.slice(-40);
}
export function addressFromStorage(value) {
 const s=asWord(value);
 return '0x'+s.slice(-40);
}
export function encodeIndex(index) {
 const n=BigInt(index);
 if (n<0n || n>=(1n<<256n)) throw new RangeError('Index must be nonnegative uint256');
 return n.toString(16).padStart(64,'0');
}
export function decimalUnits(wei,places=18,maxFraction=6) {
 const n=BigInt(wei),dec=BigInt(10)**BigInt(places);
 const whole=n/dec;
 const fraction=(n%dec).toString().padStart(places,'0').slice(0,maxFraction).replace(/0+$/,'');
 return whole.toString()+(fraction?'.'+fraction:'');
}
export function diagnostics(snapshot) {
 const list=[];
 if(snapshot.chainId!==196) list.push({level:'critical',note:'Unexpected chain; refusing to interpret data.'});
 if(snapshot.factory?.isSealed===false)
   list.push({level:'warning',note:'Factory is not sealed: owner may change deployment or protocol configuration.'});
 if(snapshot.market?.isSealed===false)
   list.push({level:'warning',note:'Market is not sealed: do not assume current fee/settings remain fixed.'});
 if(snapshot.factory?.implementation && snapshot.factory.implementation!=='0x0000000000000000000000000000000000000000')
   list.push({level:'caution',note:'Factory runs through an EIP-1967 implementation slot; verify upgrades independently.'});
 if(snapshot.market?.implementation && snapshot.market.implementation!=='0x0000000000000000000000000000000000000000')
   list.push({level:'caution',note:'Market is a proxy; listing terms could change after an upgrade.'});
 if(snapshot.market?.feeBps!==null && snapshot.market?.feeBps!==undefined && snapshot.market.feeBps>300)
   list.push({level:'warning',note:'Market fee exceeds the 3% value documented by an external integration guide.'});
 if(snapshot.partial)
   list.push({level:'unknown',note:'Some contract views failed; missing values are not evidence of safety.'});
 if(snapshot.processor?.supplyCap!==null && snapshot.processor?.minted!==null &&
    snapshot.processor?.supplyCap!==undefined && snapshot.processor?.minted!==undefined &&
    snapshot.processor.minted>snapshot.processor.supplyCap)
   list.push({level:'warning',note:'Processor minted count exceeds supplied cap; independently verify interpretation.'});
 list.push({level:'info',note:'This read-only view does not verify contract audits, wallet ownership, escrow, or a sale.'});
 return list;
}
export function quoteMint(mintAmount,mintPrice,protocolFee){
 const n=BigInt(mintAmount);
 if(n<=0n || n>1000000000n) throw new RangeError('Mint quantity must be 1–1,000,000,000');
 const price=BigInt(mintPrice),fee=BigInt(protocolFee);
 if(price<0n||fee<0n) throw new RangeError('Negative fee');
 return {quantity:n,transistorCost:n*price,protocolFee:fee,msgValue:n*price+fee};
}
export function publicJson(snapshot){
 return JSON.stringify(snapshot,(k,v)=>typeof v==='bigint'?v.toString():v,2);
}
