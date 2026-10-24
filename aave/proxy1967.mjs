// AI-assisted independent PUBLIC AaveV3 Base ERC-1967 storage observation.
// Zero secret input, transactions, RPC host injection, wallet signing, or
// arbitrary third-party contract reads. Both components are fixed against the
// primary Aave DAO first-party address book and EIP-1967 final standard.
// https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Base.sol
// https://eips.ethereum.org/EIPS/eip-1967
import {createHash} from 'node:crypto';
export const AAVE_BASE_RPC='https://mainnet.base.org';
export const BASE_CAIP='eip155:8453';
export const AAVE_COMPONENTS=Object.freeze({
  pool:Object.freeze({
    proxy:'0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    addressBookImplementation:'0xA4AbC5FcBA6D0d7E3D144d6dbF6cb6128599dFdB'
  }),
  configurator:Object.freeze({
    proxy:'0x5731a04B1E775f0fdd454Bf70f3335886e9A96be',
    addressBookImplementation:'0xFF42Ce30054dcE7dc7C1282a9a497aa58eaBCe99'
  })
});
export const EIP1967_SLOTS=Object.freeze({
  implementation:'0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  admin:'0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
  beacon:'0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'
});
const RPC_TIMEOUT_MS=7000;
const MAX_RPC_REPLY=150000;
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const HEXQ=/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;
const EMPTY='0x'+'0'.repeat(40);

export function validateComponent(query){
  if(!query||typeof query!=='object'||Array.isArray(query))return {ok:false,error:'Invalid query'};
  const keys=Object.keys(query);
  if(keys.length>1||keys.some(x=>x!=='component'))return {ok:false,error:'Only optional component=pool|configurator is permitted'};
  const component=keys.length===0?'pool':query.component;
  if(typeof component!=='string'||!Object.hasOwn(AAVE_COMPONENTS,component))
    return {ok:false,error:'Use component=pool or component=configurator'};
  return {ok:true,component};
}
function parseSlotAddress(value){
  if(typeof value!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(value)||!/^0{24}$/.test(value.slice(2,26)))
    throw Error('Noncanonical ERC-1967 storage word');
  const address='0x'+value.slice(-40).toLowerCase();
  return address===EMPTY?null:address;
}
function parseCode(value){
  if(typeof value!=='string'||!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)||value.length>130000)
    throw Error('Malformed/oversized public EVM runtime code');
  const b=Buffer.from(value.slice(2),'hex');
  return {codeBytes:b.length,codeSHA256:b.length?createHash('sha256').update(b).digest('hex'):null};
}
function asRpcResult(data,ids){
  if(!Array.isArray(data)||data.length!==ids.length)throw Error('Incomplete JSON-RPC batch');
  const seen=new Map();
  for(const item of data){
    if(!item||item.jsonrpc!=='2.0'||!Number.isSafeInteger(item.id)||seen.has(item.id)||!ids.includes(item.id)||
       Object.hasOwn(item,'error')||typeof item.result!=='string')throw Error('Invalid JSON-RPC response/identity');
    seen.set(item.id,item.result);
  }
  if(seen.size!==ids.length)throw Error('JSON-RPC response missing expected results');
  return seen;
}
export async function readAaveBaseProxy(component,{request=globalThis.fetch}={}){
  if(!Object.hasOwn(AAVE_COMPONENTS,component))throw Error('Unsupported fixed Aave component');
  const config=AAVE_COMPONENTS[component];
  let count=0;
  async function batch(spec){
    if(++count>3)throw Error('RPC batch count exceeded');
    const payload=spec.map(([id,method,params])=>({jsonrpc:'2.0',id,method,params}));
    const response=await request(AAVE_BASE_RPC,{
      method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json',
        'User-Agent':'OneCursor-original-fixed-Aave-Base-ERC1967-public-observation'},
      body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(RPC_TIMEOUT_MS)
    });
    if(!response||response.status!==200||!(response.headers?.get('content-type')||'').toLowerCase().includes('json'))
      throw Error('Public Base JSON-RPC inaccessible');
    const raw=await response.text();
    if(raw.length>MAX_RPC_REPLY)throw Error('Oversized RPC response');
    return asRpcResult(JSON.parse(raw),spec.map(x=>x[0]));
  }
  const beginning=await batch([[1,'eth_chainId',[]],[2,'eth_blockNumber',[]]]);
  if(beginning.get(1)!=='0x2105'||!HEXQ.test(beginning.get(2)))throw Error('Expected Base chainId 8453 and canonical current block');
  const blockTag=beginning.get(2); const blockNumber=BigInt(blockTag);
  if(blockNumber<=0n||blockNumber>(1n<<62n))throw Error('Implausible Base block');
  const slots=Object.entries(EIP1967_SLOTS);
  const specified=[...slots.map(([key,slot],i)=>[4+i,'eth_getStorageAt',[config.proxy,slot,blockTag]]),[7,'eth_getCode',[config.proxy,blockTag]]];
  const values=await batch(specified);
  // Intentional: fixed, source-listed proxy only; read implementation code exactly at the pinned block.
  const impl=parseSlotAddress(values.get(4));
  const admin=parseSlotAddress(values.get(5));
  const beacon=parseSlotAddress(values.get(6));
  if(!impl||beacon)throw Error('Aave component not in expected direct-implementation ERC-1967 form; no payment');
  const proxyCode=parseCode(values.get(7));
  if(proxyCode.codeBytes<100)throw Error('Proxy runtime code missing or too small; no payment');
  const data=await batch([[8,'eth_getCode',[impl,blockTag]]]);
  const implementationCode=parseCode(data.get(8));
  if(implementationCode.codeBytes<100)throw Error('Implementation runtime code missing or too small; no payment');
  return Object.freeze({
    kind:'aave_v3_base_erc1967_upgradeability_facts',component,chainId:8453,
    dataChain:BASE_CAIP,blockNumber:blockNumber.toString(),
    blockTag,proxy:config.proxy,
    implementation:impl,admin,beacon,
    aaveFirstPartyExpectedImplementation:config.addressBookImplementation,
    matchesPublishedAaveAddressBook:impl.toLowerCase()===config.addressBookImplementation.toLowerCase(),
    proxyCode,implementationCode,
    eip1967Slots:EIP1967_SLOTS,
    evidenceSources:[
      'https://eips.ethereum.org/EIPS/eip-1967',
      'https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Base.sol',
      'https://basescan.org/address/'+config.proxy,
      'https://basescan.org/address/'+impl
    ],
    publicBaseRpcHost:new URL(AAVE_BASE_RPC).hostname,
    noSignerOrTransaction:true,notAnAuditOrUpgradeAuthorizationProof:true,
    limitations:'EIP-1967 admin=empty does not prove governance-free or immutable upgrade controls. Other proxy patterns and indirect authority are not audited; SHA256 is an off-chain bytecode digest, not EVM EXTCODEHASH.'
  });
}
