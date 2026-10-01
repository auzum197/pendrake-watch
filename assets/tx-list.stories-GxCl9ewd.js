import{j as e,r as v}from"./iframe-BtpyxMOn.js";import{b as j,h as b,i as N}from"./discreet-value-B23XFzj7.js";import{T as m}from"./tx-list-BpwOfjBY.js";import{w}from"./with-router-BMwgj1MA.js";import{t as u}from"./fixtures-PxoleTY_.js";import"./preload-helper-PPVm8Dsz.js";import"./use-wallet-data-Bqqbmr5H.js";import"./ipc-D91hTTIc.js";import"./useNavigate-CvK5gizE.js";import"./index-B6FSe79N.js";import"./index-CqTDTN_b.js";import"./index-CKfKtJsq.js";import"./format-DAOk0-W0.js";import"./addYears-Cm1OKrbP.js";import"./createReactComponent-BRwFOo_P.js";import"./IconLoader2-4_n5sj_t.js";import"./with-selector-BH-OjoO6.js";const z={component:m,decorators:[w],args:{txs:u}},s={args:{limit:5}},o={render:r=>e.jsx("div",{"data-scroll-restoration-id":"app-main",className:"h-96 overflow-y-auto",children:e.jsx(m,{...r})})},a={args:{txs:[],limit:5}},c="rounded-lg border border-border px-3 py-1.5 text-xs font-medium";function y(){const[r,h]=v.useState(u);function d(l,x){const g=2400200+r.reduce((p,f)=>Math.max(p,f.blockHeight??0),0)-24e5,t=String(1e6+Math.floor(Math.random()*9e7));h(p=>[...p,{txid:Math.random().toString(16).slice(2).padEnd(64,"0"),datetime:Math.floor(Date.now()/1e3),blockHeight:x==="confirmed"?g:void 0,kind:l,valueZat:t,netZat:l==="received"?t:`-${t}`,status:x,notes:[{pool:"orchard",direction:l,outputIndex:0,valueZat:t}]}])}return e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{type:"button",className:c,onClick:()=>d("received","confirmed"),children:"Receive"}),e.jsx("button",{type:"button",className:c,onClick:()=>d("sent","confirmed"),children:"Send"}),e.jsx("button",{type:"button",className:c,onClick:()=>d("received","pending"),children:"Pending"})]}),e.jsx(m,{txs:r,limit:100})]})}const i={render:()=>e.jsx(y,{})};function D(){const r=j();return e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{type:"button",className:c,"aria-pressed":r,onClick:()=>b(!N()),children:r?"Show values":"Hide values"}),e.jsx("span",{className:"text-xs text-muted-foreground",children:"Hold a pool stack to peek."})]}),e.jsx(m,{txs:u,limit:10})]})}const n={render:()=>e.jsx(D,{})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source}}};const A=["Preview","Full","Empty","Interactive","Discreet"];export{n as Discreet,a as Empty,o as Full,i as Interactive,s as Preview,A as __namedExportsOrder,z as default};
