import{j as e,r as d}from"./iframe-DAfY7uON.js";import"./preload-helper-PPVm8Dsz.js";function u({value:a,onChange:t,options:r,tone:i="brand"}){const c=Math.max(0,r.findIndex(n=>n.value===a)),p=i==="brand"?"bg-brand":"bg-white/10",v=i==="brand"?"text-brand-foreground":"text-white";return e.jsxs("div",{className:"relative grid w-full rounded-full border border-ink-line bg-ink-soft p-1",style:{gridTemplateColumns:`repeat(${r.length}, 1fr)`},children:[e.jsx("span",{"aria-hidden":!0,className:`pointer-events-none absolute inset-y-1 left-1 rounded-full ${p} ease-out-soft motion-safe:transition-transform motion-safe:duration-200`,style:{width:`calc((100% - 0.5rem) / ${r.length})`,transform:`translateX(${c*100}%)`}}),r.map(n=>e.jsx("button",{type:"button","aria-pressed":a===n.value,onClick:()=>t(n.value),className:`relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${a===n.value?v:"text-white/55 hover:text-white/80"}`,children:n.label},n.value))]})}u.__docgenInfo={description:"",methods:[],displayName:"Segmented",props:{value:{required:!0,tsType:{name:"T"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(v: T) => void",signature:{arguments:[{type:{name:"T"},name:"v"}],return:{name:"void"}}},description:""},options:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:"{ value: T; label: string }",signature:{properties:[{key:"value",value:{name:"T",required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"{ value: T; label: string }[]"},description:""},tone:{required:!1,tsType:{name:"union",raw:'"brand" | "neutral"',elements:[{name:"literal",value:'"brand"'},{name:"literal",value:'"neutral"'}]},description:"",defaultValue:{value:'"brand"',computed:!1}}}};const{fn:b}=__STORYBOOK_MODULE_TEST__,h={component:u,args:{value:"month",onChange:b(),options:[{value:"week",label:"Week"},{value:"month",label:"Month"},{value:"year",label:"Year"}]}};function m({tone:a}){const[t,r]=d.useState("month");return e.jsx("div",{className:"w-80 rounded-2xl bg-ink p-6",children:e.jsx(u,{value:t,onChange:r,tone:a,options:[{value:"week",label:"Week"},{value:"month",label:"Month"},{value:"year",label:"Year"}]})})}const l={render:()=>e.jsx(m,{tone:"brand"})},s={render:()=>e.jsx(m,{tone:"neutral"})},o={render:()=>{const[a,t]=d.useState("full");return e.jsx("div",{className:"w-64 rounded-2xl bg-ink p-6",children:e.jsx(u,{value:a,onChange:t,options:[{value:"full",label:"Full node"},{value:"light",label:"Lightwallet"}]})})}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <Demo tone="brand" />
}`,...l.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <Demo tone="neutral" />
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}};const x=["Brand","Neutral","TwoOptions"];export{l as Brand,s as Neutral,o as TwoOptions,x as __namedExportsOrder,h as default};
