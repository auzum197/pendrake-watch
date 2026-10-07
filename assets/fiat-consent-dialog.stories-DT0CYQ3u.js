import{r as a,j as e}from"./iframe-BsAOtjPO.js";import{B as i}from"./button-Cfz7aL4x.js";import{F as s}from"./fiat-consent-dialog-CEMTEd6w.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DCADjnpI.js";import"./index-D099EosU.js";import"./alert-dialog-0-o-6wcO.js";import"./index-DZl1Pv0F.js";import"./index-9RvNByv6.js";import"./index-CMQxFmm1.js";import"./index-BbqeRg1I.js";import"./index-COZcPIa7.js";import"./index-Dh70p8f7.js";import"./index-CbsASgiH.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,A={component:s,args:{open:!0,onOpenChange:p(),onAccept:p()}},t={render:()=>{const[r,n]=a.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(i,{onClick:()=>n(!0),children:"Show balances in USD"}),e.jsx(s,{open:r,onOpenChange:n,onAccept:()=>new Promise(c=>setTimeout(c,800))})]})}},o={render:()=>{const[r,n]=a.useState(!0);return e.jsx(s,{open:r,onOpenChange:n,onAccept:async()=>{}})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Show balances in USD</Button>
        <FiatConsentDialog open={open} onOpenChange={setOpen} onAccept={() => new Promise(resolve => setTimeout(resolve, 800))} />
      </>;
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [open, setOpen] = useState(true);
    return <FiatConsentDialog open={open} onOpenChange={setOpen} onAccept={async () => {}} />;
  }
}`,...o.parameters?.docs?.source}}};const B=["Default","Open"];export{t as Default,o as Open,B as __namedExportsOrder,A as default};
