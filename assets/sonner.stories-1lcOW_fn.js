import{j as o}from"./iframe-BpOw_hR6.js";import{T as r,t}from"./sonner-BPv5SPKD.js";import{B as e}from"./button--8m6S5H4.js";import"./preload-helper-PPVm8Dsz.js";import"./index-CoRWxIGw.js";import"./index-Cyd-t8PX.js";import"./utils-DclmTqRz.js";import"./index-PIZcHuCE.js";const m={component:r},n={render:()=>o.jsxs("div",{className:"flex flex-wrap gap-2",children:[o.jsx(e,{onClick:()=>t("Wallet synced"),children:"Message"}),o.jsx(e,{onClick:()=>t.success("Copied to clipboard"),children:"Success"}),o.jsx(e,{onClick:()=>t.error("Indexer unreachable"),children:"Error"}),o.jsx(e,{onClick:()=>t("Notifications enabled",{action:{label:"Undo",onClick:()=>{}}}),children:"With action"}),o.jsx(r,{})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source}}};const x=["Default"];export{n as Default,x as __namedExportsOrder,m as default};
