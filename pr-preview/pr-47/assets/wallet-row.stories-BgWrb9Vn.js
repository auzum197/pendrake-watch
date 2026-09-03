import{j as r,r as v}from"./iframe-BqPm5GPo.js";import{W as C}from"./wallet-row-BpXTO22t.js";import"./preload-helper-PPVm8Dsz.js";import"./format-d3jQKD7n.js";import"./addYears-Bhde3fRX.js";import"./lifehash-avatar-C4O4Sbqw.js";import"./lifehash-DGWfi99f.js";import"./discreet-value-EdLYmB_0.js";import"./use-wallet-data-BhDCaPwA.js";import"./ipc-cooBBgp-.js";import"./mirage-DM8DhT7G.js";import"./IconAlertTriangle-ucYkuTJ1.js";import"./createReactComponent-BNaYxCWq.js";const{fn:j}=__STORYBOOK_MODULE_TEST__,f="a1b2c3d4e5f6a7b8",R={synced:{state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:17e8},syncing:{state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},error:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"connection refused",unreachable:!0},wrongChain:{state:"error",syncedHeight:239e4,chainTip:251e3,percent:62,error:"your Indexer is serving a different chain than this Wallet synced",wrongChain:!0}};function E({state:e,selected:s,named:y,hasBalance:h}){return{id:f,label:y?"Cold storage":f.slice(0,8),fingerprint:f,network:"mainnet",birthdayHeight:419200,selected:s,lastBalance:h?"897091655":null,sync:e==="unavailable"||e==="closed"?void 0:R[e],unavailable:e==="unavailable"?"wallet file could not be read":void 0}}function a(e){return r.jsx(C,{wallet:E(e),disabled:e.disabled,onPick:e.onPick})}const G={component:a,decorators:[e=>r.jsx("div",{className:"w-64 rounded-[1rem] border border-white/10 bg-ink-soft",children:r.jsx("ul",{role:"listbox",className:"divide-y divide-white/[0.06]",children:r.jsx(e,{})})})],argTypes:{state:{control:"radio",options:["synced","syncing","error","wrongChain","unavailable","closed"]},onPick:{control:!1}},args:{state:"synced",selected:!1,named:!0,hasBalance:!0,disabled:!1,onPick:j()}},n={},t={args:{selected:!0}},o={args:{state:"syncing"}},c={args:{state:"error"}},i={args:{state:"wrongChain"}},d={args:{state:"unavailable"}},l={args:{state:"closed"}},m={args:{named:!1}},g={args:{state:"closed",hasBalance:!1}},T=["synced","syncing","error","syncing","wrongChain","unavailable"];function S({states:e,every:s,...y}){const[h,b]=v.useState(0);return v.useEffect(()=>{const w=setInterval(()=>b(x=>x+1),s);return()=>clearInterval(w)},[s]),r.jsx(a,{...y,state:e[h%e.length]})}const p={render:e=>r.jsxs(r.Fragment,{children:[r.jsx(S,{...e,states:["synced","syncing"],every:1600}),r.jsx(S,{...e,states:T,every:1600,named:!1})]})},u={render:e=>r.jsxs(r.Fragment,{children:[r.jsx(a,{...e,state:"synced",selected:!0}),r.jsx(a,{...e,state:"syncing"}),r.jsx(a,{...e,state:"error"}),r.jsx(a,{...e,state:"wrongChain"}),r.jsx(a,{...e,state:"unavailable"}),r.jsx(a,{...e,state:"closed",named:!1})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:"{}",...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    state: "syncing"
  }
}`,...o.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    state: "error"
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    state: "wrongChain"
  }
}`,...i.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    state: "unavailable"
  }
}`,...d.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    state: "closed"
  }
}`,...l.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    named: false
  }
}`,...m.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    state: "closed",
    hasBalance: false
  }
}`,...g.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: args => <>
      <Cycling {...args} states={["synced", "syncing"]} every={1600} />
      <Cycling {...args} states={CYCLE} every={1600} named={false} />
    </>
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: args => <>
      <Row {...args} state="synced" selected />
      <Row {...args} state="syncing" />
      <Row {...args} state="error" />
      <Row {...args} state="wrongChain" />
      <Row {...args} state="unavailable" />
      <Row {...args} state="closed" named={false} />
    </>
}`,...u.parameters?.docs?.source}}};const A=["Playground","Selected","Syncing","SyncError","WrongChain","Unavailable","Closed","Unnamed","NeverSynced","Live","Gallery"];export{l as Closed,u as Gallery,p as Live,g as NeverSynced,n as Playground,t as Selected,c as SyncError,o as Syncing,d as Unavailable,m as Unnamed,i as WrongChain,A as __namedExportsOrder,G as default};
