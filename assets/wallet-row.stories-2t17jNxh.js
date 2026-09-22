import{j as r,r as S}from"./iframe-WvSYpc3X.js";import{W as B,a as T}from"./inline-name-D3haWZJI.js";import{W}from"./wallet-row-CHfl9wQV.js";import"./preload-helper-PPVm8Dsz.js";import"./app-toast-B-NpvEpn.js";import"./index-BrSti5jc.js";import"./index-D3nEufUq.js";import"./index-viyhfdCR.js";import"./use-wallet-data-BcdzC9W_.js";import"./ipc-g7VmqW7I.js";import"./switch-wallet-B655xa9q.js";import"./wallet-recency-DIIncMpp.js";import"./createReactComponent-BUOeJnn6.js";import"./IconPencil-DdXSnN8u.js";import"./index-Q8P8ziXW.js";import"./index-Dvn7gCtL.js";import"./index-Ch9S4h05.js";import"./index-jhXtxEBj.js";import"./index-C-I8FC1h.js";import"./index-DeT-gJGy.js";import"./index-C8T5C1wT.js";import"./index-Dal0UDBT.js";import"./index-OPCCL5KB.js";import"./format-BSD6YbAO.js";import"./addYears-DH8pj9JL.js";import"./lifehash-avatar-Gfb4bdk_.js";import"./lifehash-9ovGMtFc.js";import"./discreet-value-D2IB8CYq.js";import"./mirage-BbPm28Q7.js";import"./IconAlertTriangle-gUzLjows.js";const{expect:N,fn:C,screen:_,userEvent:k,waitFor:P,within:F}=__STORYBOOK_MODULE_TEST__,f="a1b2c3d4e5f6a7b8",I={synced:{state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:17e8},syncing:{state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},error:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"connection refused",unreachable:!0},wrongChain:{state:"error",syncedHeight:239e4,chainTip:251e3,percent:62,error:"your Indexer is serving a different chain than this Wallet synced",wrongChain:!0}};function O({state:e,selected:a,named:w,hasBalance:x}){return{id:f,label:w?"Cold storage":f.slice(0,8),fingerprint:f,network:"mainnet",birthdayHeight:419200,selected:a,lastBalance:x?"897091655":null,notificationsEnabled:!0,indexerUri:"https://zec.rocks:443",sync:e==="unavailable"||e==="closed"?void 0:I[e],unavailable:e==="unavailable"?"wallet file could not be read":void 0}}const n=C();function s(e){const a=O(e);return r.jsx(W,{wallet:a,disabled:e.disabled,onPick:e.onPick,name:e.renaming?r.jsx(T,{value:a.label,placeholder:f.slice(0,8),onCommit:n,onCancel:n}):void 0,avatarOverlay:e.menu?r.jsx(B,{wallet:a,onRename:n,onRemove:n,onClose:n}):void 0})}const ge={component:s,decorators:[e=>r.jsx("div",{className:"w-64 rounded-[1rem] border border-white/10 bg-ink-soft",children:r.jsx("ul",{role:"listbox",className:"divide-y divide-white/[0.06]",children:r.jsx(e,{})})})],argTypes:{state:{control:"radio",options:["synced","syncing","error","wrongChain","unavailable","closed"]},onPick:{control:!1}},args:{state:"synced",selected:!1,named:!0,hasBalance:!0,disabled:!1,menu:!1,renaming:!1,onPick:C()}},t={},o={args:{selected:!0}},c={args:{state:"syncing"}},i={args:{state:"error"}},l={args:{state:"wrongChain"}},m={args:{state:"unavailable"}},d={args:{state:"closed"}},p={args:{named:!1}},u={args:{menu:!0},play:async({canvasElement:e})=>{const a=F(e);await k.click(a.getByRole("button",{name:"Cold storage actions"})),await P(()=>N(_.getByRole("menuitem",{name:"Rename…"})).toBeVisible())}},g={args:{menu:!0,renaming:!0}},y={args:{state:"closed",hasBalance:!1}},U=["synced","syncing","error","syncing","wrongChain","unavailable"];function b({states:e,every:a,...w}){const[x,R]=S.useState(0);return S.useEffect(()=>{const j=setInterval(()=>R(E=>E+1),a);return()=>clearInterval(j)},[a]),r.jsx(s,{...w,state:e[x%e.length]})}const h={render:e=>r.jsxs(r.Fragment,{children:[r.jsx(b,{...e,states:["synced","syncing"],every:1600}),r.jsx(b,{...e,states:U,every:1600,named:!1})]})},v={render:e=>r.jsxs(r.Fragment,{children:[r.jsx(s,{...e,state:"synced",selected:!0}),r.jsx(s,{...e,state:"syncing"}),r.jsx(s,{...e,state:"error"}),r.jsx(s,{...e,state:"wrongChain"}),r.jsx(s,{...e,state:"unavailable"}),r.jsx(s,{...e,state:"closed",named:!1})]})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...o.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    state: "syncing"
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    state: "error"
  }
}`,...i.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    state: "wrongChain"
  }
}`,...l.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    state: "unavailable"
  }
}`,...m.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    state: "closed"
  }
}`,...d.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    named: false
  }
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    menu: true
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Cold storage actions"
    }));
    await waitFor(() => expect(screen.getByRole("menuitem", {
      name: "Rename…"
    })).toBeVisible());
  }
}`,...u.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    menu: true,
    renaming: true
  }
}`,...g.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    state: "closed",
    hasBalance: false
  }
}`,...y.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: args => <>
      <Cycling {...args} states={["synced", "syncing"]} every={1600} />
      <Cycling {...args} states={CYCLE} every={1600} named={false} />
    </>
}`,...h.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: args => <>
      <Row {...args} state="synced" selected />
      <Row {...args} state="syncing" />
      <Row {...args} state="error" />
      <Row {...args} state="wrongChain" />
      <Row {...args} state="unavailable" />
      <Row {...args} state="closed" named={false} />
    </>
}`,...v.parameters?.docs?.source}}};const ye=["Playground","Selected","Syncing","SyncError","WrongChain","Unavailable","Closed","Unnamed","WithMenu","Renaming","NeverSynced","Live","Gallery"];export{d as Closed,v as Gallery,h as Live,y as NeverSynced,t as Playground,g as Renaming,o as Selected,i as SyncError,c as Syncing,m as Unavailable,p as Unnamed,u as WithMenu,l as WrongChain,ye as __namedExportsOrder,ge as default};
