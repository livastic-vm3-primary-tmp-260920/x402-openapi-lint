/**
 * Noncustodial read-only log summary of a PAYAI/X402 middleware settlement
 * response after the HTTP response finishes. No request body, payment
 * signature, authorization nonce, buyer identity/IP, or entire raw header is
 * retained or logged. It is facilitator-reported, not a verified chain log.
 */
export const TAPEOUT_RECEIPT_PATH="/v1/tapeout-cpu0-report";
export const TAPEOUT_RECEIPT_NETWORK="eip155:8453";
export const TAPEOUT_NOMINAL_GROSS_USDC="0.005000";

export function summarizeTapeoutSettlement({method,path,statusCode,paymentResponse}={}){
  if(method!=="GET"||path!==TAPEOUT_RECEIPT_PATH||
     statusCode!==200)return null;
  if(typeof paymentResponse!=="string"||paymentResponse.length<24||paymentResponse.length>8192||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(paymentResponse)||
     paymentResponse.length%4!==0)return null;
  let data;
  try{
    const raw=Buffer.from(paymentResponse,"base64");
    if(raw.length>6144||raw.toString("base64")!==paymentResponse)return null;
    data=JSON.parse(raw.toString("utf8"));
  }catch{return null;}
  if(!data||typeof data!=="object"||Array.isArray(data))return null;
  if(data.success!==true||data.error!=null||data.invalidReason!=null||
     data.network!==TAPEOUT_RECEIPT_NETWORK||
     typeof data.transaction!=="string"||
     !/^0x[0-9a-fA-F]{64}$/.test(data.transaction))return null;
  return Object.freeze({
    event:"facilitator_reported_x402_settlement_unreconciled",
    path:TAPEOUT_RECEIPT_PATH,
    network:TAPEOUT_RECEIPT_NETWORK,
    nominalGrossUSDC:TAPEOUT_NOMINAL_GROSS_USDC,
    transactionHash:data.transaction.toLowerCase(),
    finalizedBeneficiaryTransferVerified:false,
    independentlyIdentifiedBuyer:false
  });
}
