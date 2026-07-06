import{j as e}from"./iframe-2AUyTjm6.js";import{S as n,a as o}from"./sync-status-DpX6qX9_.js";import"./preload-helper-PPVm8Dsz.js";import"./format-j5mEuQpa.js";import"./IconCircleCheckFilled-DdnNLw4k.js";import"./createReactComponent-DMGfW0P5.js";const s={state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},i={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100},d={state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"Indexer unreachable",unreachable:!0},g={component:n,args:{sync:s}},r={render:()=>e.jsxs("div",{className:"flex flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(n,{sync:null}),e.jsx(n,{sync:s}),e.jsx(n,{sync:i}),e.jsx(n,{sync:d})]})},c={render:()=>e.jsx("div",{className:"w-64 rounded-2xl bg-ink p-6",children:e.jsx(o,{sync:s})})},a={render:()=>e.jsxs("div",{className:"flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(n,{sync:s}),e.jsx(o,{sync:s})]})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={null} />
      <SyncChip sync={syncing} />
      <SyncChip sync={synced} />
      <SyncChip sync={errored} />
    </div>
}`,...r.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-64 rounded-2xl bg-ink p-6">
      <SyncBar sync={syncing} />
    </div>
}`,...c.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={syncing} />
      <SyncBar sync={syncing} />
    </div>
}`,...a.parameters?.docs?.source}}};const u=["Chip","Bar","Card"];export{c as Bar,a as Card,r as Chip,u as __namedExportsOrder,g as default};
