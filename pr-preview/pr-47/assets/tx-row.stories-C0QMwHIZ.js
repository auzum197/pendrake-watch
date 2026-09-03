import{j as n}from"./iframe-BqPm5GPo.js";import{a as p}from"./tx-list-i8xZOZqj.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-ZN3NAyZe.js";import"./index-C5RXO5dO.js";import"./index-B6ERYhEG.js";import"./index-Cvky-sGi.js";import"./discreet-value-EdLYmB_0.js";import"./use-wallet-data-BhDCaPwA.js";import"./ipc-cooBBgp-.js";import"./format-d3jQKD7n.js";import"./addYears-Bhde3fRX.js";import"./createReactComponent-BNaYxCWq.js";import"./IconCircleCheckFilled-CQ8U7fnT.js";function u({kind:t,status:a,memo:i,flash:m,reveal:c}){const d={txid:"a1b2c3d4e5f6",datetime:17012e5,blockHeight:a==="confirmed"?2400120:void 0,kind:t,valueZat:"73450000",netZat:t==="received"?"73450000":"-73450000",status:a,notes:[{pool:"orchard",direction:t,outputIndex:0,valueZat:"73450000",memo:i?"Coffee money":void 0}]};return n.jsx("div",{className:"text-sm",style:{height:49},children:n.jsx(p,{tx:d,flash:m,reveal:c})})}const E={component:u,args:{kind:"received",status:"confirmed",memo:!0,flash:!1,reveal:!1},argTypes:{kind:{control:"radio",options:["received","sent"]},status:{control:"radio",options:["confirmed","pending"]}}},e={},r={args:{kind:"sent",memo:!1}},o={args:{status:"pending"}},s={args:{flash:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
    flash: true
  }
}`,...s.parameters?.docs?.source}}};const F=["Received","Sent","Pending","ReturnFlash"];export{o as Pending,e as Received,s as ReturnFlash,r as Sent,F as __namedExportsOrder,E as default};
