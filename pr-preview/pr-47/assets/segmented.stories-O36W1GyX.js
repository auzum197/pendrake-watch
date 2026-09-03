import{j as e,r as s}from"./iframe-BqPm5GPo.js";import{S as l}from"./segmented-BULdspqp.js";import"./preload-helper-PPVm8Dsz.js";const{fn:c}=__STORYBOOK_MODULE_TEST__,v={component:l,args:{value:"month",onChange:c(),options:[{value:"week",label:"Week"},{value:"month",label:"Month"},{value:"year",label:"Year"}]}};function u({tone:o}){const[t,d]=s.useState("month");return e.jsx("div",{className:"w-80 rounded-2xl bg-ink p-6",children:e.jsx(l,{value:t,onChange:d,tone:o,options:[{value:"week",label:"Week"},{value:"month",label:"Month"},{value:"year",label:"Year"}]})})}const a={render:()=>e.jsx(u,{tone:"brand"})},n={render:()=>e.jsx(u,{tone:"neutral"})},r={render:()=>{const[o,t]=s.useState("full");return e.jsx("div",{className:"w-64 rounded-2xl bg-ink p-6",children:e.jsx(l,{value:o,onChange:t,options:[{value:"full",label:"Full node"},{value:"light",label:"Lightwallet"}]})})}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <Demo tone="brand" />
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <Demo tone="neutral" />
}`,...n.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = useState("full");
    return <div className="w-64 rounded-2xl bg-ink p-6">
        <Segmented value={value} onChange={setValue} options={[{
        value: "full",
        label: "Full node"
      }, {
        value: "light",
        label: "Lightwallet"
      }]} />
      </div>;
  }
}`,...r.parameters?.docs?.source}}};const g=["Brand","Neutral","TwoOptions"];export{a as Brand,n as Neutral,r as TwoOptions,g as __namedExportsOrder,v as default};
