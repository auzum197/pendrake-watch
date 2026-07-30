import{j as e}from"./iframe-CqQLRfC7.js";import{S as n,a as i}from"./sync-status-Da0tyiyV.js";import"./preload-helper-PPVm8Dsz.js";import"./format-AImXp767.js";import"./IconCircleCheckFilled-BwDnRo-T.js";import"./createReactComponent-Bh-5iB9K.js";const r={state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},o={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100},d={state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"Indexer unreachable",unreachable:!0},t={state:"error",syncedHeight:239e4,chainTip:251e3,percent:62,error:"your Indexer is serving a different chain than this Wallet synced",wrongChain:!0},h={component:n,args:{sync:r}},s={render:()=>e.jsxs("div",{className:"flex flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(n,{sync:null}),e.jsx(n,{sync:r}),e.jsx(n,{sync:o}),e.jsx(n,{sync:d}),e.jsx(n,{sync:t})]})},c={render:()=>e.jsx("div",{className:"w-64 rounded-2xl bg-ink p-6",children:e.jsx(i,{sync:r})})},a={render:()=>e.jsxs("div",{className:"flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6",children:[e.jsx(n,{sync:r}),e.jsx(i,{sync:r})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source}}};const u=["Chip","Bar","Card"];export{c as Bar,a as Card,s as Chip,u as __namedExportsOrder,h as default};
