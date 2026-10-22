import {
 CHAIN_ID,RPC_URLS,FACTORY,MARKET,IMPL_SLOT,SELECTOR,
 uintFromWord,boolFromWord,addressFromWord,addressFromStorage,encodeIndex
} from './core.mjs';

export class PublicRpc {
 constructor(endpoints=RPC_URLS,fetchFn=(...args)=>fetch(...args)){
  this.endpoints=[...endpoints];this.fetchFn=fetchFn;this.requestCount=0;
 }
 async request(method,params=[],endpoint){
  if(!['eth_chainId','eth_blockNumber','eth_getBlockByNumber','eth_call','eth_getStorageAt','eth_getCode'].includes(method))
    throw new Error('Read-only methods only');
  const targets=endpoint?[endpoint]:this.endpoints;
  let last;
  for(const url of targets){
   const ctrl=new AbortController();
   const timer=setTimeout(()=>ctrl.abort(),8000);
   try{
    this.requestCount++;
    const r=await this.fetchFn(url,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:this.requestCount,method,params}),
      signal:ctrl.signal
    });
    if(!r.ok) {
      if(r.status===429) throw new Error('Rate limited (429); stop and retry later');
      throw new Error('HTTP '+r.status);
    }
    const json=await r.json();
    if(json.error) throw new Error(json.error.message || 'RPC error');
    if(typeof json.result!=='string')throw new Error('Missing RPC result');
    return json.result;
   }catch(e){
    last=e;
    // Do not switch endpoints to bypass provider throttling or a contract execution error.
    if(/rate limited|execution reverted/i.test(e.message))throw e;
   }finally{clearTimeout(timer);}
  }
  throw new Error('RPC read unavailable: '+(last?.message||'unknown'));
 }
 async call(address,selector,block){
  if(!/^0x[0-9a-f]{40}$/i.test(address))throw new Error('Invalid read contract address');
  if(!/^0x[0-9a-f]{8}([0-9a-f]{64})?$/i.test(selector))throw new Error('Invalid selector');
  return this.request('eth_call',[{to:address,data:selector},block]);
 }
 async word(address,selector,block,type='uint'){
  const out=await this.call(address,selector,block);
  if(type==='uint')return uintFromWord(out);
  if(type==='bool')return boolFromWord(out);
  if(type==='address')return addressFromWord(out);
  throw new Error('Unsupported ABI primitive');
 }
 async implementation(address,block){
  const out=await this.request('eth_getStorageAt',[address,IMPL_SLOT,block]);
  return addressFromStorage(out);
 }
 async snapshot(index=0){
  const chainId=Number(BigInt(await this.request('eth_chainId')));
  if(BigInt(chainId)!==CHAIN_ID) throw new Error('Wrong RPC chain ID: '+chainId);
  const blockTag=await this.request('eth_blockNumber');
  if(!/^0x[0-9a-f]+$/i.test(blockTag)) throw new Error('Bad block tag');
  const at=blockTag;
  const failed=[];
  const safe=async (name,fn)=>{try{return await fn()}catch(e){failed.push(name+': '+e.message);return null}};
  const read=(address,name,type='uint')=>safe(name,()=>this.word(address,SELECTOR[name],at,type));
  const [count,deployFee,protocolFee,factorySeal,owner,factoryImpl,
         marketFee,marketSeal,marketOwner,marketImpl,nextListing]=await Promise.all([
   read(FACTORY,'cpuCount'),read(FACTORY,'deployFee'),read(FACTORY,'protocolFee'),
   read(FACTORY,'isSealed','bool'),read(FACTORY,'owner','address'),
   safe('factoryImpl',()=>this.implementation(FACTORY,at)),
   read(MARKET,'feeBps'),read(MARKET,'isSealed','bool'),read(MARKET,'owner','address'),
   safe('marketImpl',()=>this.implementation(MARKET,at)),
   read(MARKET,'nextListingId')
  ]);
  const snap={
   schema:'TapeOutXLayerRiskLens/v1',
   timestamp:new Date().toISOString(),chainId,blockNumber:BigInt(at).toString(),
   rpcSources:this.endpoints.map(u=>new URL(u).hostname),
   factory:{address:FACTORY,cpuCount:count,deployFee,protocolFee,
            isSealed:factorySeal,owner,implementation:factoryImpl},
   market:{address:MARKET,feeBps:marketFee===null?null:Number(marketFee),
           isSealed:marketSeal,owner:marketOwner,implementation:marketImpl,
           nextListingId:nextListing},
   processor:null,partial:false,errors:failed
  };
  if(count!==null && count>0n){
   const number=BigInt(index);
   if(number<0n||number>=count)throw new Error('Processor index out of range: '+number+' / '+count);
   const address=await safe('cpuAt',()=>this.word(FACTORY,SELECTOR.cpuAt+encodeIndex(number),at,'address'));
   if(address){
    const [nextId,tapeoutFee,transistors]=await Promise.all([
     read(address,'nextId'),read(address,'tapeoutFee'),read(address,'transistors','address')
    ]);
    const processor={index:number.toString(),circuits:address,nextId,tapeoutFee,transistors};
    if(transistors){
     const [mintPrice,minted,supplyCap,transistorFee,creator]=await Promise.all([
       read(transistors,'mintPrice'),read(transistors,'minted'),read(transistors,'supplyCap'),
       read(transistors,'protocolFee'),read(transistors,'creator','address')
     ]);
     Object.assign(processor,{mintPrice,minted,supplyCap,protocolFee:transistorFee,creator});
    }
    snap.processor=processor;
   }
  }
  snap.partial=failed.length>0;
  return snap;
 }
}
