// Same-owner VM2 MIT static analyzer, wrapper for ORIGINAL VM5 paid x402 merchant.
// Reject invalid customer data BEFORE payment. No workflow execution/network/secret logging.
import {scan} from "./report.mjs";
export const PUBLIC_SYNTHETIC_YAML="name: test\non: pull_request\npermissions: {contents: read}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n";
export const MAX_INPUT_BYTES=48_000;
const KEYS=new Set(["workflowYaml","filename","includeSarif"]);
const bad=(reason)=>({ok:false,charged:false,reason});
export function inspectWorkflow(input){
  if(!input||typeof input!=="object"||Array.isArray(input))return bad("Provide one JSON input object.");
  const keys=Object.keys(input);
  if(keys.length<1||keys.some(k=>!KEYS.has(k)))return bad("Only workflowYaml, filename and includeSarif fields are allowed.");
  if(typeof input.workflowYaml!=="string"||!input.workflowYaml.trim())return bad("Supply a nonempty GitHub Actions workflowYaml string.");
  if(Buffer.byteLength(input.workflowYaml,"utf8")>MAX_INPUT_BYTES)return bad("Workflow YAML exceeds 48,000 UTF-8 bytes.");
  if(input.filename!==undefined&&(typeof input.filename!=="string"||!/^(?!\.)(?!.*\.\.)[a-zA-Z0-9_.-]{1,88}\.ya?ml$/.test(input.filename)))return bad("Filename must be a safe .yml or .yaml basename.");
  if(input.includeSarif!==undefined&&typeof input.includeSarif!=="boolean")return bad("includeSarif must be boolean.");
  // Original same-owner MIT analyzer parses only, never executes or fetches references.
  // Its raw YAML parser error may contain content fragments; intentionally redact.
  let report;
  try{report=scan(input);}catch{return bad("Unable to parse workflow source. No payment required.");}
  if(!report?.ok)return bad("Malformed or unsupported workflow YAML. No payment required.");
  return report;
}
