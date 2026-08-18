import{j as a,r as u}from"./iframe-u8QP6QJa.js";import{i as f,f as v}from"./format-AImXp767.js";import{I as h,a as w}from"./IconCircleCheckFilled-B72ZgPf9.js";import{c as x}from"./createReactComponent-CTvqfbMj.js";const S=[["path",{d:"M12 9v4",key:"svg-0"}],["path",{d:"M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0",key:"svg-1"}],["path",{d:"M12 16h.01",key:"svg-2"}]],p=x("outline","alert-triangle","AlertTriangle",S),k=e=>Math.min(100,Math.max(0,e));function q(e){return!!e&&e.state!=="error"&&!f(e)}function j(e,r){const[s,t]=u.useState(0),y=u.useRef({shown:0,anchor:0,atMs:0,eta:0,active:!1});return u.useEffect(()=>{if(!e)return;const o=k(e.percent),n=y.current;if(!r){n.active=!1,n.shown=0,t(0);return}n.active||(n.active=!0,n.shown=o),n.anchor=Math.max(n.shown,o),n.atMs=performance.now(),n.eta=e.etaSeconds??0;const b=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;let i=0;const c=()=>{const g=(performance.now()-n.atMs)/1e3,m=b&&n.eta>0?Math.min(g/n.eta,.97):0,l=n.anchor+(100-n.anchor)*m;n.shown+=(l-n.shown)*.12;const d=l-n.shown<.05;d&&(n.shown=l),t(n.shown),(!d||m<.97)&&(i=requestAnimationFrame(c))};return i=requestAnimationFrame(c),()=>cancelAnimationFrame(i)},[e,r]),s}function N({sync:e}){const r="inline-flex shrink-0 items-center gap-1 text-[0.625rem] font-medium leading-none";return e?e.state==="error"&&e.wrongChain?a.jsxs("span",{className:`${r} text-red-400`,children:[a.jsx(p,{className:"size-3"}),"Wrong chain"]}):e.state==="error"?a.jsxs("span",{className:`${r} text-amber-400`,children:[a.jsx(p,{className:"size-3"}),"Sync error"]}):f(e)?a.jsxs("span",{className:`${r} text-emerald-400`,children:[a.jsx(w,{className:"size-3"}),"Synced"]}):a.jsxs("span",{className:`${r} text-white/70`,children:[a.jsx(h,{className:"size-3 motion-safe:animate-spin"}),"Syncing"]}):a.jsxs("span",{className:`${r} text-white/45`,children:[a.jsx(h,{className:"size-3 motion-safe:animate-spin"}),"Connecting"]})}function A({sync:e}){const r=q(e),s=j(e,r),t=e?v(e.etaSeconds):null;return a.jsxs("div",{className:"flex flex-col gap-1.5",children:[a.jsxs("div",{className:"flex items-center justify-between text-[0.625rem] tabular-nums text-white/45",children:[a.jsxs("span",{children:[Math.round(s),"%"]}),t?a.jsx("span",{className:"truncate pl-2",children:t}):null]}),a.jsx("div",{className:"h-1 w-full overflow-hidden rounded-full bg-white/10",children:a.jsx("div",{className:"relative h-full overflow-hidden rounded-full bg-brand",style:{width:`${s}%`},children:a.jsx("span",{className:"absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent motion-safe:animate-[sync-sheen_1.8s_linear_infinite]"})})})]})}N.__docgenInfo={description:"",methods:[],displayName:"SyncChip",props:{sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""}}};A.__docgenInfo={description:"",methods:[],displayName:"SyncBar",props:{sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""}}};export{p as I,N as S,A as a,q as i};
