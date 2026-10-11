import{j as a}from"./iframe-CQ14j71F.js";import{I as k,a as c,D as p}from"./dither-area-DyynfAwN.js";import{D as b,U as m,a as u}from"./fake-data-DHgKuiGW.js";import"./preload-helper-PPVm8Dsz.js";import"./discreet-value-B7n1td5T.js";import"./use-wallet-data-C3Iy6ipE.js";import"./ipc-D91hTTIc.js";import"./motion-C2GgtDZe.js";import"./format-tHgiSO0x.js";import"./addYears-Cm1OKrbP.js";import"./utils-DclmTqRz.js";function v({dataset:e,ink:g,...f}){const h=e==="usd"?m:u[e];return a.jsx("div",{className:"w-225 rounded-2xl border border-border bg-card p-6",children:a.jsx(p,{points:h,usd:e==="usd",ink:c[g],className:"aspect-900/240 w-full",...f})})}const H={title:"Prototype/Dither chart",component:v,argTypes:{dataset:{control:"select",options:[...b,"usd"]},ink:{control:"select",options:k},variant:{control:"radio",options:["gradient","dotted","hatched","solid"]},kind:{control:"radio",options:["area","line","bars"]},curve:{control:"radio",options:["step","linear"]},cell:{control:{type:"range",min:1,max:8,step:1}},bloom:{control:"radio",options:["off","low","high","aura"]}},args:{dataset:"hodl",ink:"brand",variant:"gradient",kind:"area",curve:"step",cell:2,bloom:"low",sparkles:!0,animate:!0,interactive:!0,axes:!0}},r={args:{curve:"linear"},name:"Playground"},o={name:"1 · Gradient bloom",args:{variant:"gradient",cell:2,bloom:"low",sparkles:!0}},s={name:"2 · Hatched blueprint",args:{variant:"hatched",cell:2,bloom:"off",sparkles:!1,curve:"step"}},t={name:"3 · Dotted halftone",args:{dataset:"trader",ink:"ironwood",variant:"dotted",cell:3,bloom:"aura",sparkles:!0,curve:"linear"}},n={name:"4 · Chunky pixels",args:{dataset:"whale",ink:"transparent",variant:"gradient",cell:5,bloom:"off",sparkles:!1,curve:"step"}},l={name:"5 · Line aura",args:{dataset:"usd",kind:"line",cell:2,bloom:"high",sparkles:!0,curve:"linear"}},i={args:{dataset:"dense",kind:"bars",bloom:"low",sparkles:!1}},x=[{title:"1 · Gradient bloom",data:"hodl",look:{}},{title:"2 · Hatched blueprint",data:"hodl",look:{variant:"hatched",bloom:"off",sparkles:!1}},{title:"3 · Dotted halftone",data:"trader",look:{ink:c.ironwood,variant:"dotted",cell:3,bloom:"aura",curve:"linear"}},{title:"4 · Chunky pixels",data:"whale",look:{ink:c.transparent,cell:5,bloom:"off",sparkles:!1}},{title:"5 · Line aura",data:"usd",look:{kind:"line",bloom:"high",curve:"linear"}}],d={render:()=>a.jsx("div",{className:"grid w-300 grid-cols-2 gap-6",children:x.map(e=>a.jsxs("figure",{className:"flex flex-col gap-3 rounded-2xl border border-border bg-card p-5",children:[a.jsx("figcaption",{className:"font-heading text-sm font-semibold",children:e.title}),a.jsx(p,{points:e.data==="usd"?m:u[e.data],usd:e.data==="usd",className:"aspect-900/240 w-full",...e.look})]},e.title))})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    curve: "linear"
  },
  name: "Playground"
}`,...r.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "1 · Gradient bloom",
  args: {
    variant: "gradient",
    cell: 2,
    bloom: "low",
    sparkles: true
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "2 · Hatched blueprint",
  args: {
    variant: "hatched",
    cell: 2,
    bloom: "off",
    sparkles: false,
    curve: "step"
  }
}`,...s.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  name: "3 · Dotted halftone",
  args: {
    dataset: "trader",
    ink: "ironwood",
    variant: "dotted",
    cell: 3,
    bloom: "aura",
    sparkles: true,
    curve: "linear"
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "4 · Chunky pixels",
  args: {
    dataset: "whale",
    ink: "transparent",
    variant: "gradient",
    cell: 5,
    bloom: "off",
    sparkles: false,
    curve: "step"
  }
}`,...n.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "5 · Line aura",
  args: {
    dataset: "usd",
    kind: "line",
    cell: 2,
    bloom: "high",
    sparkles: true,
    curve: "linear"
  }
}`,...l.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    dataset: "dense",
    kind: "bars",
    bloom: "low",
    sparkles: false
  }
}`,...i.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-300 grid-cols-2 gap-6">
      {GALLERY.map(g => <figure key={g.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <figcaption className="font-heading text-sm font-semibold">
            {g.title}
          </figcaption>
          <DitherArea points={g.data === "usd" ? USD : DATASETS[g.data]} usd={g.data === "usd"} className="aspect-900/240 w-full" {...g.look} />
        </figure>)}
    </div>
}`,...d.parameters?.docs?.source}}};const T=["Playground_","GradientBloom","HatchedBlueprint","DottedHalftone","ChunkyPixels","LineAura","Bars","Gallery"];export{i as Bars,n as ChunkyPixels,t as DottedHalftone,d as Gallery,o as GradientBloom,s as HatchedBlueprint,l as LineAura,r as Playground_,T as __namedExportsOrder,H as default};
