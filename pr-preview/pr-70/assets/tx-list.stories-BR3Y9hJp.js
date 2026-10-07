import{j as e,r as v}from"./iframe-BsAOtjPO.js";import{a as j,h as b,i as N}from"./discreet-value-M3xutT9P.js";import{T as m}from"./tx-list-BM94Lda4.js";import{w}from"./with-router-CI9nhIWD.js";import{t as u}from"./fixtures-DQttaGX3.js";import"./preload-helper-PPVm8Dsz.js";import"./use-wallet-data-B3_76QIi.js";import"./ipc-D91hTTIc.js";import"./motion-C2GgtDZe.js";import"./useNavigate-35gCA7en.js";import"./block-display-toggle-BoKokFAF.js";import"./index-BbqeRg1I.js";import"./index-COZcPIa7.js";import"./utils-DCADjnpI.js";import"./createReactComponent-Hk74hMyK.js";import"./format-D3wpGM-y.js";import"./addYears-Cm1OKrbP.js";import"./IconLoader2-Dh7KmL1Y.js";import"./with-selector-DMmv8S7w.js";const B={component:m,decorators:[w],args:{txs:u}},s={args:{limit:5}},o={render:r=>e.jsx("div",{"data-scroll-restoration-id":"app-main",className:"h-96 overflow-y-auto",children:e.jsx(m,{...r})})},a={args:{txs:[],limit:5}},c="rounded-lg border border-border px-3 py-1.5 text-xs font-medium";function y(){const[r,h]=v.useState(u);function d(p,x){const g=2400200+r.reduce((l,f)=>Math.max(l,f.blockHeight??0),0)-24e5,t=String(1e6+Math.floor(Math.random()*9e7));h(l=>[...l,{txid:Math.random().toString(16).slice(2).padEnd(64,"0"),datetime:Math.floor(Date.now()/1e3),blockHeight:x==="confirmed"?g:void 0,kind:p,valueZat:t,netZat:p==="received"?t:`-${t}`,status:x,notes:[{pool:"orchard",direction:p,outputIndex:0,valueZat:t}]}])}return e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{type:"button",className:c,onClick:()=>d("received","confirmed"),children:"Receive"}),e.jsx("button",{type:"button",className:c,onClick:()=>d("sent","confirmed"),children:"Send"}),e.jsx("button",{type:"button",className:c,onClick:()=>d("received","pending"),children:"Pending"})]}),e.jsx(m,{txs:r,limit:100})]})}const i={render:()=>e.jsx(y,{})};function D(){const r=j();return e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{type:"button",className:c,"aria-pressed":r,onClick:()=>b(!N()),children:r?"Show values":"Hide values"}),e.jsx("span",{className:"text-xs text-muted-foreground",children:"Hold a pool stack to peek."})]}),e.jsx(m,{txs:u,limit:10})]})}const n={render:()=>e.jsx(D,{})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    limit: 5
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: args => <div data-scroll-restoration-id="app-main" className="h-96 overflow-y-auto">
      <TxList {...args} />
    </div>
}`,...o.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    txs: [],
    limit: 5
  }
}`,...a.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <InteractiveDemo />
}`,...i.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <DiscreetDemo />
}`,...n.parameters?.docs?.source}}};const G=["Preview","Full","Empty","Interactive","Discreet"];export{n as Discreet,a as Empty,o as Full,i as Interactive,s as Preview,G as __namedExportsOrder,B as default};
