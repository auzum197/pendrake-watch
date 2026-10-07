import{j as o}from"./iframe-BsAOtjPO.js";import{t}from"./index-dwZPm7Gp.js";import{B as e}from"./button-Cfz7aL4x.js";import{T as r}from"./sonner-BYyTFQiC.js";import"./preload-helper-PPVm8Dsz.js";import"./index-BbqeRg1I.js";import"./index-COZcPIa7.js";import"./utils-DCADjnpI.js";import"./index-D099EosU.js";const x={component:r},n={render:()=>o.jsxs("div",{className:"flex flex-wrap gap-2",children:[o.jsx(e,{onClick:()=>t("Wallet synced"),children:"Message"}),o.jsx(e,{onClick:()=>t.success("Copied to clipboard"),children:"Success"}),o.jsx(e,{onClick:()=>t.error("Indexer unreachable"),children:"Error"}),o.jsx(e,{onClick:()=>t("Notifications enabled",{action:{label:"Undo",onClick:()=>{}}}),children:"With action"}),o.jsx(r,{})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast("Wallet synced")}>Message</Button>
      <Button onClick={() => toast.success("Copied to clipboard")}>
        Success
      </Button>
      <Button onClick={() => toast.error("Indexer unreachable")}>Error</Button>
      <Button onClick={() => toast("Notifications enabled", {
      action: {
        label: "Undo",
        onClick: () => {}
      }
    })}>
        With action
      </Button>
      <Toaster />
    </div>
}`,...n.parameters?.docs?.source}}};const f=["Default"];export{n as Default,f as __namedExportsOrder,x as default};
