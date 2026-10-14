import { DESK_NODES, DESK_EDGES } from "./connect.js";
// Fixed graph, normalized demand and conductance. Not a fitted biological solver.
// D is connection strength (not anatomical diameter); conductance = D / length.
export const FLOW_EDGES=Object.freeze(DESK_EDGES.filter(edge=>["SJ","JB","JC","BC"].includes(edge.id)));
export const FLOW_RULE=Object.freeze({floor:0.18,gain:0.3,rate:0.25,maxRounds:12,lowFlow:0.6});
export function solveDeskFlow(strengths,demands){
 if(!["B","C"].every(id=>Number.isFinite(demands[id])&&demands[id]>=0))throw Error("Invalid demand");
 if(!FLOW_EDGES.every(edge=>Number.isFinite(strengths[edge.id])&&strengths[edge.id]>0))throw Error("Invalid strength");
 const nodes=DESK_NODES.map(node=>node.id),free=nodes.filter(id=>id!=="S");
 const supply={S:demands.B+demands.C,J:0,B:-demands.B,C:-demands.C};
 const matrix=free.map((id)=>[...free.map(()=>0),supply[id]]);
 for(const edge of FLOW_EDGES){
  const conductance=strengths[edge.id]/edge.length;
  for(const [a,b] of [[edge.a,edge.b],[edge.b,edge.a]]){
   const i=free.indexOf(a),j=free.indexOf(b);
   if(i<0)continue;
   matrix[i][i]+=conductance;if(j>=0)matrix[i][j]-=conductance;
  }
 }
 for(let col=0;col<free.length;col++){
  let pivot=col;
  for(let row=col+1;row<free.length;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;
  if(Math.abs(matrix[pivot][col])<1e-14)throw Error("Singular teaching graph");
  [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
  const factor=matrix[col][col];matrix[col]=matrix[col].map(value=>value/factor);
  for(let row=0;row<free.length;row++)if(row!==col){
   const multiple=matrix[row][col];matrix[row]=matrix[row].map((value,j)=>value-multiple*matrix[col][j]);
  }
 }
 const pressure={S:0,...Object.fromEntries(free.map((id,i)=>[id,matrix[i][free.length]]))};
 const flows=Object.fromEntries(FLOW_EDGES.map(edge=>[edge.id,strengths[edge.id]/edge.length*(pressure[edge.a]-pressure[edge.b])]));
 const net=Object.fromEntries(nodes.map(id=>[id,0]));
 for(const edge of FLOW_EDGES){net[edge.a]+=flows[edge.id];net[edge.b]-=flows[edge.id];}
 const residual=Math.max(...nodes.map(id=>Math.abs(net[id]-supply[id])));
 return {strengths:{...strengths},demands:{...demands},flows,pressure,residual};
}
export function stepDeskFlow(frame){
 const strengths=Object.fromEntries(FLOW_EDGES.map(edge=>{
  const target=FLOW_RULE.floor+FLOW_RULE.gain*Math.abs(frame.flows[edge.id]);
  return [edge.id,Math.max(FLOW_RULE.floor,frame.strengths[edge.id]+FLOW_RULE.rate*(target-frame.strengths[edge.id]))];
 }));
 return solveDeskFlow(strengths,frame.demands);
}
export function baselineFlow(demands){
 let frame=solveDeskFlow({SJ:1,JB:1,JC:1,BC:0.3},demands);
 for(let i=0;i<80;i++)frame=stepDeskFlow(frame);
 return frame;
}
export function newDynamics(kind){
 if(!["005","006"].includes(kind))throw Error("Unknown dynamics lesson");
 const before=baselineFlow(kind==="005"?{B:2,C:2}:{B:5,C:1});
 return {kind,before,history:[],target:"B",prediction:"",inspected:[],immediateSeen:false,
  cursor:0,selected:"SJ",overlay:true,interpretation:""};
}
export function applyDemand(s){
 if(s.history.length || !FLOW_EDGES.some(edge=>edge.id===s.prediction))return false;
 if(s.kind==="005"&&!["B","C"].includes(s.target))return false;
 const demands=s.kind==="005"?{...s.before.demands,[s.target]:5}:{B:1,C:5};
 s.history=[solveDeskFlow(s.before.strengths,demands)];
 s.cursor=0;s.inspected=[];s.immediateSeen=false;s.interpretation="";return true;
}
export function advanceDynamics(s,count=1){
 if(!Number.isInteger(count)||count<1||count>FLOW_RULE.maxRounds)return false;
 if(!s.history.length||s.history.length>FLOW_RULE.maxRounds)return false;
 for(let i=0;i<count&&s.history.length<=FLOW_RULE.maxRounds;i++)s.history.push(stepDeskFlow(s.history.at(-1)));
 s.cursor=s.history.length-1;s.inspected=[];s.interpretation="";return true;
}
export function viewDynamics(s,cursor){
 if(!Number.isInteger(cursor)||cursor<0||cursor>=s.history.length)return false;
 s.cursor=cursor;return true;
}
export function inspectDynamics(s,id){
 if(!FLOW_EDGES.some(edge=>edge.id===id))return false;
 s.selected=id;
 if(s.history.length && s.cursor===0 && id==="SJ")s.immediateSeen=true;
 if(s.history.length && s.cursor===s.history.length-1 && !s.inspected.includes(id))s.inspected.push(id);
 return true;
}
export function dynamicsFrame(s){return s.history[s.cursor]||s.before;}
export function edgeChange(s,id){
 const now=dynamicsFrame(s);
 return {before:s.before.strengths[id],after:now.strengths[id],
  delta:now.strengths[id]-s.before.strengths[id],flow:Math.abs(now.flows[id]),
  low:Math.abs(now.flows[id])<FLOW_RULE.lowFlow,retained:now.strengths[id]>=FLOW_RULE.floor};
}
export function dynamicsEvidence(s){
 const rounds=s.history.length-1;
 if(rounds<3 || s.cursor!==rounds)return null;
 const now=s.history.at(-1),prediction=FLOW_EDGES.findIndex(edge=>edge.id===s.prediction);
 if(s.kind==="005"){
  if(!s.immediateSeen||!s.inspected.includes("SJ"))return null;
  return {model:1,target:s.target==="B"?0:1,prediction,rounds,
   flowBefore:Math.abs(s.before.flows.SJ),flowChanged:Math.abs(s.history[0].flows.SJ),flowFinal:Math.abs(now.flows.SJ),
   strengthBefore:s.before.strengths.SJ,strengthAfter:now.strengths.SJ};
 }
 const change=edgeChange(s,s.selected);
 if(!s.inspected.includes(s.selected)||change.delta>=-0.03||s.interpretation!=="retained")return null;
 return {model:1,prediction,rounds,edge:FLOW_EDGES.findIndex(edge=>edge.id===s.selected),
  strengthBefore:change.before,strengthAfter:change.after,flow:change.flow,
  lowCount:FLOW_EDGES.filter(edge=>Math.abs(now.flows[edge.id])<FLOW_RULE.lowFlow).length,retained:FLOW_EDGES.length};
}
