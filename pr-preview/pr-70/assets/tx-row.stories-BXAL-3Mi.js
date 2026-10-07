import{j as i}from"./iframe-BsAOtjPO.js";import{a as h}from"./tx-list-BM94Lda4.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-35gCA7en.js";import"./block-display-toggle-BoKokFAF.js";import"./index-BbqeRg1I.js";import"./index-COZcPIa7.js";import"./motion-C2GgtDZe.js";import"./utils-DCADjnpI.js";import"./createReactComponent-Hk74hMyK.js";import"./discreet-value-M3xutT9P.js";import"./use-wallet-data-B3_76QIi.js";import"./ipc-D91hTTIc.js";import"./format-D3wpGM-y.js";import"./addYears-Cm1OKrbP.js";import"./IconLoader2-Dh7KmL1Y.js";function v({kind:t,status:n,memo:m,pools:p,flash:d,reveal:l}){const u=p.map((f,c)=>({pool:f,direction:t,outputIndex:c,valueZat:"73450000",memo:m&&c===0?"Coffee money":void 0})),g={txid:"a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",datetime:17012e5,blockHeight:n==="confirmed"?2400120:void 0,kind:t,valueZat:"73450000",netZat:t==="received"?"73450000":"-73450000",status:n,notes:u};return i.jsx("div",{className:"text-sm",style:{height:49},children:i.jsx(h,{tx:g,flash:d,reveal:l})})}const H={component:v,args:{kind:"received",status:"confirmed",memo:!0,pools:["orchard"],flash:!1,reveal:!1},argTypes:{kind:{control:"radio",options:["received","sent"]},status:{control:"radio",options:["confirmed","pending"]},pools:{control:"check",options:["orchard","sapling","ironwood","transparent"]}}},e={},r={args:{kind:"sent",memo:!1}},o={args:{status:"pending"}},s={args:{pools:["orchard","sapling"]}},a={args:{flash:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    kind: "sent",
    memo: false
  }
}`,...r.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    status: "pending"
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    pools: ["orchard", "sapling"]
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    flash: true
  }
}`,...a.parameters?.docs?.source}}};const I=["Received","Sent","Pending","TwoPools","ReturnFlash"];export{o as Pending,e as Received,a as ReturnFlash,r as Sent,s as TwoPools,I as __namedExportsOrder,H as default};
