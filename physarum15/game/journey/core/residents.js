import { CITY, CITY_OPTIONS, evaluateCity } from "../content/scenes.js";

const knownOption=id=>CITY_OPTIONS.some(o=>o.id===id);
const knownResident=id=>CITY.groups.some(g=>g.id===id);
export function residentReference(s) {
  const ids=[s.residentReference,"centre","none",...CITY_OPTIONS.map(o=>o.id)];
  const id=ids.find(id=>knownOption(id)&&s.tested[id]?.option===id);
  return id?s.tested[id]:null;
}
export function residentFrame(s) {
  const reference=residentReference(s);
  const current=s.current?.option===s.choice?s.current:null;
  const historical=s.residentView==="reference"&&Boolean(reference);
  return {reference,current,historical,measured:historical||Boolean(current),
    result:historical?reference:current||evaluateCity(s.choice)};
}
export function setResidentView(s,view) {
  if(s.id!=="012"||!["current","reference"].includes(view)||(view==="reference"&&!residentReference(s)))return false;
  s.residentView=view;return true;
}
export function setResidentReference(s,id) {
  if(s.id!=="012"||!knownOption(id)||s.tested[id]?.option!==id)return false;
  s.residentReference=id;return true;
}
export function residentComparison(s) {
  const {current,reference}=residentFrame(s);
  if(!current||!reference||current.option===reference.option)return null;
  return {before:reference,after:current,rows:CITY.groups.map(g=>({
    ...g,before:reference.rows.find(r=>r.id===g.id),after:current.rows.find(r=>r.id===g.id),
  }))};
}
const junctions={WN:"北橋西端",EN:"北橋東端",ET:"東岸路口",BR:"南橋東端",R:"東岸南口"};
export function residentTrail(result,id) {
  const group=CITY.groups.find(g=>g.id===id);
  if(!group||!result.rows.find(r=>r.id===id)?.reachable)return [];
  let cursor=group.node;
  const route=[];
  const nodeName=id=>CITY.nodes.find(n=>n.id===id)?.name||junctions[id]||id;
  for(const edgeId of result.routes[id]){
    const edge=result.edges.find(e=>e.id===edgeId);
    if(!edge||![edge.a,edge.b].includes(cursor))return [];
    const next=edge.a===cursor?edge.b:edge.a;
    route.push({id:edgeId,from:nodeName(cursor),to:nodeName(next),length:edge.length});
    cursor=next;
  }
  return cursor==="S"?route:[];
}

// Only choices and observations are saved; totals and routes are recalculated.
export function cleanResidentDraft(raw) {
  if(!raw||!knownOption(raw.choice))return null;
  const tested=Array.isArray(raw.tested)?[...new Set(raw.tested.slice(-32).filter(knownOption))]:[];
  return {choice:raw.choice,resident:knownResident(raw.resident)?raw.resident:"centre",tested,
    current:raw.current===raw.choice&&tested.includes(raw.current)?raw.current:null,
    inspectedBend:raw.inspectedBend===true&&tested.includes("centre"),
    reference:tested.includes(raw.reference)?raw.reference:"",
    view:raw.view==="reference"&&tested.length?"reference":"current"};
}
export function residentDraft(s) {
  return cleanResidentDraft({choice:s.choice,resident:s.resident,tested:Object.keys(s.tested),
    current:s.current?.option===s.choice?s.choice:null,inspectedBend:s.inspectedBend,
    reference:s.residentReference,view:s.residentView});
}
export function resumeResidents(s,raw) {
  if(s.id!=="012")return s;
  const d=cleanResidentDraft(raw);if(!d)return s;
  s.choice=d.choice;s.resident=d.resident;s.inspectedBend=d.inspectedBend;
  s.tested=Object.fromEntries(d.tested.map(id=>[id,evaluateCity(id)]));
  s.current=d.current?evaluateCity(d.current):null;
  s.residentReference=d.reference;s.residentView=d.view;
  return s;
}
