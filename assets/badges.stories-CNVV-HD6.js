import{j as s}from"./iframe-2AUyTjm6.js";import{P as p,a as c,C as l,M as m,S as n}from"./badges-DJsPsk2c.js";import"./preload-helper-PPVm8Dsz.js";const d=["orchard","sapling","transparent"],x={component:p,args:{pool:"orchard"}},a={render:()=>s.jsx("div",{className:"flex gap-2",children:d.map(e=>s.jsx(p,{pool:e},e))})},o={render:()=>s.jsxs("div",{className:"flex gap-2",children:[s.jsx(n,{status:"unspent"}),s.jsx(n,{status:"spent"}),s.jsx(n,{status:"pending"})]})},r={render:()=>s.jsxs("div",{className:"flex gap-2",children:[s.jsx(l,{}),s.jsx(m,{})]})},t={render:()=>s.jsx("div",{className:"flex items-center gap-3",children:d.map(e=>s.jsx(c,{pool:e},e))})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-2">
      {pools.map(pool => <PoolBadge key={pool} pool={pool} />)}
    </div>
}`,...a.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-2">
      <StatusBadge status="unspent" />
      <StatusBadge status="spent" />
      <StatusBadge status="pending" />
    </div>
}`,...o.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-2">
      <ChangeBadge />
      <MempoolBadge />
    </div>
}`,...r.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex items-center gap-3">
      {pools.map(pool => <PoolDot key={pool} pool={pool} />)}
    </div>
}`,...t.parameters?.docs?.source}}};const j=["Pools","Statuses","Flags","Dots"];export{t as Dots,r as Flags,a as Pools,o as Statuses,j as __namedExportsOrder,x as default};
