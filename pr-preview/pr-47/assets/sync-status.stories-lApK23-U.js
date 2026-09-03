import{j as e,r as h}from"./iframe-BqPm5GPo.js";import{i as w,f as q}from"./format-d3jQKD7n.js";import{I as b,a as C}from"./IconCircleCheckFilled-CQ8U7fnT.js";import{I as v}from"./IconAlertTriangle-ucYkuTJ1.js";import"./preload-helper-PPVm8Dsz.js";import"./addYears-Bhde3fRX.js";import"./createReactComponent-BNaYxCWq.js";const N=n=>Math.min(100,Math.max(0,n));function A(n){return!!n&&n.state!=="error"&&!w(n)&&n.state==="syncing"}function T(n,r){const[l,t]=h.useState(0),S=h.useRef({shown:0,anchor:0,atMs:0,eta:0,active:!1});return h.useEffect(()=>{if(!n)return;const y=N(n.percent),a=S.current;if(!r){a.active=!1,a.shown=0,t(0);return}a.active||(a.active=!0,a.shown=y),a.anchor=Math.max(a.shown,y),a.atMs=performance.now(),a.eta=n.etaSeconds??0;const k=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;let m=0;const g=()=>{const j=(performance.now()-a.atMs)/1e3,f=k&&a.eta>0?Math.min(j/a.eta,.97):0,d=a.anchor+(100-a.anchor)*f;a.shown+=(d-a.shown)*.12;const x=d-a.shown<.05;x&&(a.shown=d),t(a.shown),(!x||f<.97)&&(m=requestAnimationFrame(g))};return m=requestAnimationFrame(g),()=>cancelAnimationFrame(m)},[n,r]),l}function s({sync:n}){const r="inline-flex shrink-0 items-center gap-1 text-[0.625rem] font-medium leading-none";return n?n.state==="error"&&n.wrongChain?e.jsxs("span",{className:`${r} text-red-400`,children:[e.jsx(v,{className:"size-3"}),"Wrong chain"]}):n.state==="error"?e.jsxs("span",{className:`${r} text-amber-400`,title:n.error,children:[e.jsx(v,{className:"size-3"}),"Retrying"]}):w(n)?e.jsxs("span",{className:`${r} text-emerald-400`,children:[e.jsx(C,{className:"size-3"}),"Synced"]}):e.jsxs("span",{className:`${r} text-white/70`,children:[e.jsx(b,{className:"size-3 motion-safe:animate-spin"}),"Syncing"]}):e.jsxs("span",{className:`${r} text-white/45`,children:[e.jsx(b,{className:"size-3 motion-safe:animate-spin"}),"Connecting"]})}function p({sync:n}){const r=A(n),l=T(n,r),t=n?q(n.etaSeconds):null;return e.jsxs("div",{className:"flex flex-col gap-1.5",children:[e.jsxs("div",{className:"flex items-center justify-between text-[0.625rem] tabular-nums text-white/45",children:[e.jsxs("span",{children:[Math.round(l),"%"]}),t?e.jsx("span",{className:"truncate pl-2",children:t}):null]}),e.jsx("div",{className:"h-1 w-full overflow-hidden rounded-full bg-white/10",children:e.jsx("div",{className:"relative h-full overflow-hidden rounded-full bg-brand",style:{width:`${l}%`},children:e.jsx("span",{className:"absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent motion-safe:animate-[sync-sheen_1.8s_linear_infinite]"})})})]})}s.__docgenInfo={description:"",methods:[],displayName:"SyncChip",props:{sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""}}};p.__docgenInfo={description:"",methods:[],displayName:"SyncBar",props:{sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""}}};const i={state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},I={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100},M={state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"Indexer unreachable",unreachable:!0},O={state:"error",syncedHeight:239e4,chainTip:251e3,percent:62,error:"your Indexer is serving a different chain than this Wallet synced",wrongChain:!0},F={component:s,args:{sync:i}},c={render:()=>e.jsxs("div",{className:"flex flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(s,{sync:null}),e.jsx(s,{sync:i}),e.jsx(s,{sync:I}),e.jsx(s,{sync:M}),e.jsx(s,{sync:O})]})},o={render:()=>e.jsx("div",{className:"w-64 rounded-2xl bg-ink p-6",children:e.jsx(p,{sync:i})})},u={render:()=>e.jsxs("div",{className:"flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(s,{sync:i}),e.jsx(p,{sync:i})]})};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={null} />
      <SyncChip sync={syncing} />
      <SyncChip sync={synced} />
      <SyncChip sync={errored} />
      <SyncChip sync={wrongChain} />
    </div>
}`,...c.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-64 rounded-2xl bg-ink p-6">
      <SyncBar sync={syncing} />
    </div>
}`,...o.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={syncing} />
      <SyncBar sync={syncing} />
    </div>
}`,...u.parameters?.docs?.source}}};const P=["Chip","Bar","Card"];export{o as Bar,u as Card,c as Chip,P as __namedExportsOrder,F as default};
