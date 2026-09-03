import{j as e,r as i}from"./iframe-BqPm5GPo.js";import{D as s,c as l,d as m,u as p,h as o}from"./discreet-value-EdLYmB_0.js";import"./preload-helper-PPVm8Dsz.js";import"./use-wallet-data-BhDCaPwA.js";import"./ipc-cooBBgp-.js";function t(){const d=p();return e.jsxs("div",{className:"flex flex-col gap-3 font-mono text-sm",children:[e.jsx("button",{type:"button",onClick:()=>o(!d),className:"w-fit rounded-lg border border-border px-3 py-1.5 text-xs font-medium",children:d?"Show values":"Hide values"}),e.jsxs("span",{children:["Balance: ",e.jsx(s,{kind:"zec",children:"1,234.5678"})," ZEC"]}),e.jsxs("span",{children:["Fiat: ",e.jsx(s,{kind:"usd",children:"$4,521.09"})]}),e.jsxs("span",{children:["Date: ",e.jsx(s,{kind:"date",children:"Jan 5, 2026, 09:14"})]}),e.jsxs("span",{children:["Block: ",e.jsx(s,{kind:"block",children:"2,381,554"})]}),e.jsxs("span",{children:["Txid:"," ",e.jsx(s,{kind:"txid",children:"f4184fc596403b9d638783cf57adfe4c"})]}),e.jsxs("span",{children:["Address:"," ",e.jsx(s,{kind:"address",children:"u1l8xunezsvhq8fgzfl796uzsdvz9wibfidhrkf4pv"})]}),e.jsxs("span",{children:["Memo: ",e.jsx(s,{kind:"memo",children:"Thanks for lunch!"})]})]})}const g={component:s},r={args:{kind:"zec",children:"1,234.5678"},render:()=>e.jsx(t,{})};function x(){return i.useEffect(()=>{o(!0)},[]),e.jsx(t,{})}const n={args:{kind:"zec",children:"1,234.5678"},render:()=>e.jsx(x,{})},a={args:{kind:"zec",children:"1,234.5678"},render:()=>e.jsxs("span",{className:"font-mono text-sm",children:["Balance: ",e.jsx(m,{value:"1,234.5678",mask:"█████"})," ZEC"]})},c={args:{kind:"zec",children:"1,234.5678"},render:()=>e.jsx("span",{className:"discreet-peekable font-mono text-sm",children:e.jsx(l,{text:"█████"})})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    kind: "zec",
    children: "1,234.5678"
  },
  render: () => <AllKindsDemo />
}`,...r.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    kind: "zec",
    children: "1,234.5678"
  },
  render: () => <PeekDemo />
}`,...n.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    kind: "zec",
    children: "1,234.5678"
  },
  render: () => <span className="font-mono text-sm">
            Balance: <DiscreetPeek value="1,234.5678" mask="█████" /> ZEC
        </span>
}`,...a.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    kind: "zec",
    children: "1,234.5678"
  },
  render: () => <span className="discreet-peekable font-mono text-sm">
            <DiscreetMask text="█████" />
        </span>
}`,...c.parameters?.docs?.source}}};const z=["AllKinds","HoldToPeek","Peek","Mask"];export{r as AllKinds,n as HoldToPeek,c as Mask,a as Peek,z as __namedExportsOrder,g as default};
