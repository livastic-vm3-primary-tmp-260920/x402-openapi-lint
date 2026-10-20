import { analyzeWorkflow } from "./analyzer.mjs";

const MAX_BYTES = 48_000;
const MAX_FINDINGS = 70;
const URI = "https://json.schemastore.org/sarif-2.1.0.json";
const NO_AUDIT = "Heuristic preflight only: false positives/negatives; not an audit, verified exploit, security certification, or review of runtime context.";

function validBasename(file) {
  return typeof file === "string" && /^(?!\.)(?!.*\.\.)[a-zA-Z0-9_.-]{1,88}\.ya?ml$/.test(file);
}
function sarifReport(file, findings) {
  const ids = new Map();
  for (const f of findings) if(!ids.has(f.id)) ids.set(f.id, { id:f.id, name:f.title, shortDescription:{text:f.title}, helpUri:f.source });
  return {
    version:"2.1.0", $schema:URI,
    runs:[{
      tool:{driver:{name:"Workflow Guard CI Risk Preflight", version:"0.1.0", informationUri:"https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/", rules:[...ids.values()]}},
      results:findings.map(f=>({
        ruleId:f.id,
        level:f.severity==="high"?"error":f.severity==="medium"?"warning":"note",
        message:{text:f.description+" Suggested mitigation: "+f.recommendation},
        locations:[{physicalLocation:{artifactLocation:{uri:file},region:{startLine:Math.max(1,f.line||1)}}}]
      }))
    }]
  };
}
export function scan(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {ok:false,error:"Expected a JSON input object."};
  const file = input.filename ?? "ci.yml";
  if(!validBasename(file)) return {ok:false,error:"Filename must be a single .yml or .yaml basename (without paths)."};
  const yaml = input.workflowYaml;
  if (typeof yaml !== "string" || !yaml.trim()) return {ok:false,error:"Supply a nonempty workflowYaml string."};
  const bytes=Buffer.byteLength(yaml,"utf8");
  if(bytes>MAX_BYTES) return {ok:false,error:"Workflow YAML exceeds 48,000 UTF-8 bytes."};
  if(input.includeSarif!==undefined && typeof input.includeSarif!=="boolean") return {ok:false,error:"includeSarif must be boolean."};
  const r=analyzeWorkflow(yaml,file);
  if(r.error) return {ok:false,error:r.error};
  const findings=r.findings.slice(0,MAX_FINDINGS);
  const result={
    ok:true,sourceFile:file,staticOnly:true,workflowEvents:r.events,
    counts:r.counts,findings,findingsTruncated:r.findings.length>=MAX_FINDINGS,
    limitations:NO_AUDIT,
    source:"https://github.com/livastic-vm2-primary-20260911/apify-workflow-guard"
  };
  if(input.includeSarif!==false) result.sarif=sarifReport(file,findings);
  return result;
}
