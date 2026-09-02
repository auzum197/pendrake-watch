import{j as e}from"./iframe-DAfY7uON.js";import{S as n,a as i}from"./sync-status-DZK7SZqO.js";import"./preload-helper-PPVm8Dsz.js";import"./index-BwpIYO4N.js";import"./index-B6Zg1S3p.js";import"./index-Cy0nPEeW.js";import"./ipc-BUrFCM8o.js";import"./format-BqzWNPBJ.js";import"./IconCircleCheckFilled-CT9izvBf.js";import"./createReactComponent-D3XjCNQN.js";const r={state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},o={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100},t={state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"Indexer unreachable",unreachable:!0},d={state:"error",syncedHeight:239e4,chainTip:251e3,percent:62,error:"your Indexer is serving a different chain than this Wallet synced",wrongChain:!0},f={component:n,args:{sync:r}},s={render:()=>e.jsxs("div",{className:"flex flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(n,{sync:null}),e.jsx(n,{sync:r}),e.jsx(n,{sync:o}),e.jsx(n,{sync:t}),e.jsx(n,{sync:d})]})},c={render:()=>e.jsx("div",{className:"w-64 rounded-2xl bg-ink p-6",children:e.jsx(i,{sync:r})})},a={render:()=>e.jsxs("div",{className:"flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(n,{sync:r}),e.jsx(i,{sync:r})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={null} />
      <SyncChip sync={syncing} />
      <SyncChip sync={synced} />
      <SyncChip sync={errored} />
      <SyncChip sync={wrongChain} />
    </div>
}`,...s.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-64 rounded-2xl bg-ink p-6">
      <SyncBar sync={syncing} />
    </div>
}`,...c.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={syncing} />
      <SyncBar sync={syncing} />
    </div>
}`,...a.parameters?.docs?.source}}};const j=["Chip","Bar","Card"];export{c as Bar,a as Card,s as Chip,j as __namedExportsOrder,f as default};
