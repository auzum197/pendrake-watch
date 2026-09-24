import{j as e,r as g}from"./iframe-621QUQJH.js";import{t as u}from"./index-Boh57zBL.js";import{B as f}from"./button-D75hWsvs.js";import{T as l}from"./sonner-Dq_B3voG.js";import{a}from"./app-toast-CRp3YbkN.js";import"./preload-helper-PPVm8Dsz.js";import"./index-iH70eQ8E.js";import"./index-Bwa81kWP.js";import"./utils-DCADjnpI.js";import"./index-Db33uM4P.js";import"./use-wallet-data-DKoJISec.js";import"./ipc-D91hTTIc.js";const d={unreachable:()=>a.unreachable(),wrongChain:()=>a.wrongChain(),daemon:()=>a.daemon("connection to the daemon socket was refused"),error:()=>a.error("Couldn't switch Wallet","failed to open wallet 33d66daa"),success:()=>a.success("Copied to clipboard"),info:()=>a.info("Notifications enabled")};function h({variant:r}){return g.useEffect(()=>(u.dismiss(),d[r](),()=>{u.dismiss()}),[r]),e.jsx(l,{position:"bottom-right"})}const B={component:h,args:{variant:"unreachable"},argTypes:{variant:{control:"radio",options:["unreachable","wrongChain","daemon","error","success","info"]}},decorators:[r=>e.jsx("div",{className:"h-64 w-full",children:e.jsx(r,{})})]},s={},o={args:{variant:"unreachable"}},n={args:{variant:"wrongChain"}},t={args:{variant:"daemon"}},c={args:{variant:"error"}},i={args:{variant:"success"}},m={args:{variant:"info"}},p={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-2",children:[Object.keys(d).map(r=>e.jsx(f,{onClick:d[r],children:r},r)),e.jsx(l,{position:"bottom-right"})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:"{}",...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "unreachable"
  }
}`,...o.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "wrongChain"
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "daemon"
  }
}`,...t.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "error"
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "success"
  }
}`,...i.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "info"
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">
      {(Object.keys(FIRE) as Variant[]).map(v => <Button key={v} onClick={FIRE[v]}>
          {v}
        </Button>)}
      <Toaster position="bottom-right" />
    </div>
}`,...p.parameters?.docs?.source}}};const F=["Playground","Unreachable","WrongChain","Daemon","ErrorToast","Success","Info","Live"];export{t as Daemon,c as ErrorToast,m as Info,p as Live,s as Playground,i as Success,o as Unreachable,n as WrongChain,F as __namedExportsOrder,B as default};
