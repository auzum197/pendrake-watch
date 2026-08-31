import{r as u,j as n}from"./iframe-D_NN_1gN.js";import{t as g}from"./index-tmVPE2Ix.js";import{d as v}from"./ipc-BPuKzjyu.js";import{c as d,d as k}from"./format-DGOEn-zF.js";import{a as o,I as q}from"./IconCircleCheckFilled-CcbvZsXF.js";import{c as w}from"./createReactComponent-21_2WyET.js";const j=[["path",{d:"M12 9v4",key:"svg-0"}],["path",{d:"M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0",key:"svg-1"}],["path",{d:"M12 16h.01",key:"svg-2"}]],f=w("outline","alert-triangle","AlertTriangle",j);const N=[["path",{d:"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4",key:"svg-0"}],["path",{d:"M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",key:"svg-1"}]],C=w("outline","refresh","Refresh",N),A=e=>Math.min(100,Math.max(0,e));function h(e){return!!e&&e.state!=="error"&&!d(e)&&e.state==="syncing"}function _(e,t){const[s,r]=u.useState(0),i=u.useRef({shown:0,anchor:0,atMs:0,eta:0,active:!1});return u.useEffect(()=>{if(!e)return;const l=A(e.percent),a=i.current;if(!t){a.active=!1,a.shown=0,r(0);return}a.active||(a.active=!0,a.shown=l),a.anchor=Math.max(a.shown,l),a.atMs=performance.now(),a.eta=e.etaSeconds??0;const S=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;let c=0;const y=()=>{const x=(performance.now()-a.atMs)/1e3,p=S&&a.eta>0?Math.min(x/a.eta,.97):0,m=a.anchor+(100-a.anchor)*p;a.shown+=(m-a.shown)*.12;const b=m-a.shown<.05;b&&(a.shown=m),r(a.shown),(!b||p<.97)&&(c=requestAnimationFrame(y))};return c=requestAnimationFrame(y),()=>cancelAnimationFrame(c)},[e,t]),s}function T({sync:e}){const[t,s]=u.useState(!1),r="inline-flex shrink-0 items-center gap-1 text-[0.625rem] font-medium leading-none";async function i(){if(!t){s(!0);try{await v()}catch(l){g.error(String(l))}finally{s(!1)}}}return e?e.state==="error"&&e.wrongChain?n.jsxs("span",{className:`${r} text-red-400`,children:[n.jsx(f,{className:"size-3"}),"Wrong chain"]}):e.state==="error"?n.jsxs("button",{type:"button",onClick:i,disabled:t,className:`${r} cursor-pointer text-amber-400 hover:underline disabled:opacity-60`,title:"Retry sync",children:[t?n.jsx(o,{className:"size-3 motion-safe:animate-spin"}):n.jsx(f,{className:"size-3"}),t?"Starting…":"Retry sync"]}):d(e)?n.jsxs("span",{className:`${r} text-emerald-400`,children:[n.jsx(q,{className:"size-3"}),"Synced"]}):e.state==="syncing"||h(e)?n.jsxs("span",{className:`${r} text-white/70`,children:[n.jsx(o,{className:"size-3 motion-safe:animate-spin"}),"Syncing"]}):n.jsxs("button",{type:"button",onClick:i,disabled:t,className:`${r} cursor-pointer text-brand hover:underline disabled:opacity-60`,title:"Sync this wallet to the chain tip",children:[t?n.jsx(o,{className:"size-3 motion-safe:animate-spin"}):null,t?"Starting…":"Sync"]}):n.jsxs("span",{className:`${r} text-white/45`,children:[n.jsx(o,{className:"size-3 motion-safe:animate-spin"}),"Connecting"]})}function I({sync:e}){const[t,s]=u.useState(!1);async function r(){if(!t){s(!0);try{await v()}catch(a){g.error(String(a))}finally{s(!1)}}}const i=t||!e||e.state==="syncing"||h(e),l=e?e.state==="error"?e.wrongChain?"Wrong chain":"Retry sync":d(e)?"Synced":i?"Syncing":"Sync this wallet to the chain tip":"Connecting";return n.jsx("button",{type:"button",onClick:r,disabled:t,"aria-label":l,title:l,className:"flex shrink-0 cursor-pointer items-center text-white/45 transition-colors hover:text-white/80 disabled:opacity-60",children:n.jsx(C,{className:`size-3.5 ${i?"motion-safe:animate-spin":""}`})})}function M({sync:e}){const t=h(e),s=_(e,t),r=e?k(e.etaSeconds):null;return n.jsxs("div",{className:"flex flex-col gap-1.5",children:[n.jsxs("div",{className:"flex items-center justify-between text-[0.625rem] tabular-nums text-white/45",children:[n.jsxs("span",{children:[Math.round(s),"%"]}),r?n.jsx("span",{className:"truncate pl-2",children:r}):null]}),n.jsx("div",{className:"h-1 w-full overflow-hidden rounded-full bg-white/10",children:n.jsx("div",{className:"relative h-full overflow-hidden rounded-full bg-brand",style:{width:`${s}%`},children:n.jsx("span",{className:"absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent motion-safe:animate-[sync-sheen_1.8s_linear_infinite]"})})})]})}T.__docgenInfo={description:"",methods:[],displayName:"SyncChip",props:{sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
  state: SyncState;
  syncedHeight: number;
  chainTip: number;
  percent: number;
  phase?: SyncPhase;
  scannedOutputs?: number;
  totalOutputs?: number;
  etaSeconds?: number;
  error?: string;
  // Set only when the sync error was the Indexer being unreachable, gating the
  // "Change server" CTA. Absent reads as false.
  unreachable?: boolean;
  // Set only when the Indexer is serving a chain without this Wallet's Anchor
  // (ADR-0010). The daemon keeps it mutually exclusive with \`unreachable\`.
  wrongChain?: boolean;
  lastSyncedAt?: number;
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""}}};I.__docgenInfo={description:"",methods:[],displayName:"SyncGlyph",props:{sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
  state: SyncState;
  syncedHeight: number;
  chainTip: number;
  percent: number;
  phase?: SyncPhase;
  scannedOutputs?: number;
  totalOutputs?: number;
  etaSeconds?: number;
  error?: string;
  // Set only when the sync error was the Indexer being unreachable, gating the
  // "Change server" CTA. Absent reads as false.
  unreachable?: boolean;
  // Set only when the Indexer is serving a chain without this Wallet's Anchor
  // (ADR-0010). The daemon keeps it mutually exclusive with \`unreachable\`.
  wrongChain?: boolean;
  lastSyncedAt?: number;
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""}}};M.__docgenInfo={description:"",methods:[],displayName:"SyncBar",props:{sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
  state: SyncState;
  syncedHeight: number;
  chainTip: number;
  percent: number;
  phase?: SyncPhase;
  scannedOutputs?: number;
  totalOutputs?: number;
  etaSeconds?: number;
  error?: string;
  // Set only when the sync error was the Indexer being unreachable, gating the
  // "Change server" CTA. Absent reads as false.
  unreachable?: boolean;
  // Set only when the Indexer is serving a chain without this Wallet's Anchor
  // (ADR-0010). The daemon keeps it mutually exclusive with \`unreachable\`.
  wrongChain?: boolean;
  lastSyncedAt?: number;
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""}}};export{f as I,T as S,M as a,I as b};
