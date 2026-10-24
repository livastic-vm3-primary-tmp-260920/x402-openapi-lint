// Independent directory compatibility ONLY for the EXISTING original VM5
// BTC-USDT 4-venue funding quote route, paid to original VM1 on Base.
// No payment, verification, settlement, signature, token or price mutation.
// The canonical standard PAYMENT-REQUIRED header is the source of truth.
import {FUNDING_PAYOUT_BASE,FUNDING_PRICE_USDC} from './four-venue.mjs';

const ROUTE='/v1/btc-funding-four-venues';
const CIRCLE='0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const ATOMIC=String(Math.round(Number(FUNDING_PRICE_USDC)*1e6));
if(ATOMIC!=='10000')throw Error('Original Bitcoin funding offer price unexpectedly changed; refuse legacy compatibility');

export function echoCanonicalX402ChallengeOnFunding(_req,res,next){
  const send=res.send;
  res.send=function(body){
    const wire=res.getHeader('PAYMENT-REQUIRED');
    if(res.statusCode===402 && typeof wire==='string' && wire.length>1 && wire.length<20000){
      try{
        const quote=JSON.parse(Buffer.from(wire,'base64').toString('utf8'));
        const accepts=quote?.accepts;
        const resource=new URL(quote?.resource?.url);
        if(quote?.x402Version===2 &&
           resource.pathname===ROUTE && !resource.search && !resource.hash &&
           Array.isArray(accepts) && accepts.length===1 &&
           accepts[0]?.scheme==='exact' && accepts[0]?.network==='eip155:8453' &&
           accepts[0]?.payTo?.toLowerCase()===FUNDING_PAYOUT_BASE.toLowerCase() &&
           accepts[0]?.asset?.toLowerCase()===CIRCLE &&
           accepts[0]?.amount===ATOMIC){
          res.setHeader('X-Payment-Required',wire);
          res.setHeader('Access-Control-Expose-Headers',
                        'PAYMENT-REQUIRED,X-Payment-Required,PAYMENT-RESPONSE');
          res.type('json');
          return send.call(res,JSON.stringify(quote));
        }
      }catch{ /* Fail CLOSED: retain exact original middleware response and headers. */ }
    }
    return send.call(res,body);
  };
  next();
}
