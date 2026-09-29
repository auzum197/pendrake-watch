import{j as e,r as v}from"./iframe-Y1P2rZSU.js";import{T as p}from"./tx-list-D6loDD41.js";import{w as f}from"./with-router-B99xF6zG.js";import{t as u}from"./fixtures-C6Be4G5r.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-Bal-Ysft.js";import"./index-91DVKCnl.js";import"./index-Dc2VGqh2.js";import"./index-Cpmxs1Ac.js";import"./discreet-value-CN0I9EHs.js";import"./use-wallet-data-BWwxOikK.js";import"./ipc-D91hTTIc.js";import"./format-DAOk0-W0.js";import"./addYears-Cm1OKrbP.js";import"./createReactComponent-CtQXmasm.js";import"./IconCircleCheckFilled-rcl0zFBN.js";import"./with-selector-NqkDHb_i.js";const Z={component:p,decorators:[f],args:{txs:u}},o={args:{limit:5}},s={render:r=>e.jsx("div",{"data-scroll-restoration-id":"app-main",className:"h-96 overflow-y-auto",children:e.jsx(p,{...r})})},a={args:{txs:[],limit:5}};function b(){const[r,x]=v.useState(u);function n(m,l){const g=2400200+r.reduce((d,h)=>Math.max(d,h.blockHeight??0),0)-24e5,t=String(1e6+Math.floor(Math.random()*9e7));x(d=>[...d,{txid:Math.random().toString(16).slice(2,14),datetime:Math.floor(Date.now()/1e3),blockHeight:l==="confirmed"?g:void 0,kind:m,valueZat:t,netZat:m==="received"?t:`-${t}`,status:l,notes:[{pool:"orchard",direction:m,outputIndex:0,valueZat:t}]}])}const c="rounded-lg border border-border px-3 py-1.5 text-xs font-medium";return e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{type:"button",className:c,onClick:()=>n("received","confirmed"),children:"Receive"}),e.jsx("button",{type:"button",className:c,onClick:()=>n("sent","confirmed"),children:"Send"}),e.jsx("button",{type:"button",className:c,onClick:()=>n("received","pending"),children:"Pending"})]}),e.jsx(p,{txs:r,limit:100})]})}const i={render:()=>e.jsx(b,{})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    limit: 5
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: args => <div data-scroll-restoration-id="app-main" className="h-96 overflow-y-auto">
      <TxList {...args} />
    </div>
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    txs: [],
    limit: 5
  }
}`,...a.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <InteractiveDemo />
}`,...i.parameters?.docs?.source}}};const _=["Preview","Full","Empty","Interactive"];export{a as Empty,s as Full,i as Interactive,o as Preview,_ as __namedExportsOrder,Z as default};
