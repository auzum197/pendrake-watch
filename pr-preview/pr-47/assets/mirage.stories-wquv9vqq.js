import{j as e}from"./iframe-BqPm5GPo.js";import{M as t}from"./mirage-DM8DhT7G.js";import"./preload-helper-PPVm8Dsz.js";const p={component:t,args:{size:24,speed:2.5},argTypes:{size:{control:{type:"range",min:12,max:120,step:4}},speed:{control:{type:"range",min:.5,max:6,step:.25}},className:{control:!1}},decorators:[s=>e.jsx("div",{className:"flex items-center gap-8 rounded-2xl bg-ink p-8 text-white/45",children:e.jsx(s,{})})]},a={},r={args:{size:80}},n={render:s=>e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-white",children:e.jsx(t,{...s})}),e.jsx("span",{className:"text-brand",children:e.jsx(t,{...s})}),e.jsx("span",{className:"text-amber-400",children:e.jsx(t,{...s})})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:"{}",...a.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    size: 80
  }
}`,...r.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: args => <>
      <span className="text-white">
        <Mirage {...args} />
      </span>
      <span className="text-brand">
        <Mirage {...args} />
      </span>
      <span className="text-amber-400">
        <Mirage {...args} />
      </span>
    </>
}`,...n.parameters?.docs?.source}}};const i=["Default","Large","Tinted"];export{a as Default,r as Large,n as Tinted,i as __namedExportsOrder,p as default};
