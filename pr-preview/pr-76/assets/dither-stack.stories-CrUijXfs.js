import{j as e}from"./iframe-BJY3hGoB.js";import{D as l}from"./dither-stack-BObMO1Vz.js";import{P as m}from"./fake-data-BzivQCxG.js";import"./preload-helper-PPVm8Dsz.js";import"./discreet-value-D21uiyXc.js";import"./use-wallet-data-B1Om7cwu.js";import"./ipc-BdEm-LNG.js";import"./motion-C2GgtDZe.js";import"./utils-DCADjnpI.js";import"./dither-area-CbINlB39.js";import"./format-U69qtT0u.js";import"./addYears-Cm1OKrbP.js";function i(r){return e.jsx("div",{className:"w-225 rounded-2xl border border-border bg-card p-6",children:e.jsx(l,{series:m,className:"h-72 w-full",...r})})}const P={title:"Prototype/Dither stack",component:i,argTypes:{mode:{control:"radio",options:["stacked","share","layered"]},variant:{control:"radio",options:["gradient","dotted","hatched","solid"]},curve:{control:"radio",options:["step","linear"]},cell:{control:{type:"range",min:1,max:8,step:1}},bloom:{control:"radio",options:["off","low","high","aura"]}},args:{mode:"stacked",variant:"gradient",curve:"step",cell:2,bloom:"low",axes:!0}},a={name:"Playground"},o={name:"1 · Stacked",args:{mode:"stacked"}},s={name:"2 · Share (cohort)",args:{mode:"share"}},t={name:"3 · Layered",args:{mode:"layered",bloom:"high"}},n={name:"4 · Hatched stack",args:{mode:"stacked",variant:"hatched",bloom:"off",curve:"step"}},c={name:"5 · Chunky share",args:{mode:"share",cell:5,bloom:"off",curve:"step"}},p=[{title:"1 · Stacked",look:{}},{title:"2 · Share (cohort)",look:{mode:"share"}},{title:"3 · Layered",look:{mode:"layered",bloom:"high"}},{title:"4 · Hatched stack",look:{variant:"hatched",bloom:"off",curve:"step"}},{title:"5 · Chunky share",look:{mode:"share",cell:5,bloom:"off",curve:"step"}},{title:"6 · Dotted layered",look:{mode:"layered",variant:"dotted",bloom:"aura"}}],d={render:()=>e.jsx("div",{className:"grid w-300 grid-cols-2 gap-6",children:p.map(r=>e.jsxs("figure",{className:"flex flex-col gap-3 rounded-2xl border border-border bg-card p-5",children:[e.jsx("figcaption",{className:"font-heading text-sm font-semibold",children:r.title}),e.jsx(l,{series:m,className:"h-60 w-full",...r.look})]},r.title))})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "Playground"
}`,...a.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "1 · Stacked",
  args: {
    mode: "stacked"
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "2 · Share (cohort)",
  args: {
    mode: "share"
  }
}`,...s.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  name: "3 · Layered",
  args: {
    mode: "layered",
    bloom: "high"
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "4 · Hatched stack",
  args: {
    mode: "stacked",
    variant: "hatched",
    bloom: "off",
    curve: "step"
  }
}`,...n.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "5 · Chunky share",
  args: {
    mode: "share",
    cell: 5,
    bloom: "off",
    curve: "step"
  }
}`,...c.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-300 grid-cols-2 gap-6">
      {GALLERY.map(entry => <figure key={entry.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <figcaption className="font-heading text-sm font-semibold">
            {entry.title}
          </figcaption>
          <DitherStack series={POOL_SERIES} className="h-60 w-full" {...entry.look} />
        </figure>)}
    </div>
}`,...d.parameters?.docs?.source}}};const j=["Playground_","Stacked","Share","Layered","Hatched","Chunky","Gallery"];export{c as Chunky,d as Gallery,n as Hatched,t as Layered,a as Playground_,s as Share,o as Stacked,j as __namedExportsOrder,P as default};
