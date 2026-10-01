import{r as a,j as e}from"./iframe-BI4DPKI4.js";import{B as i}from"./button-D3mpBaB4.js";import{F as s}from"./fiat-consent-dialog-BNc27oVt.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DCADjnpI.js";import"./index-B9__DGRb.js";import"./alert-dialog-BZq13sA-.js";import"./index-Bdf2ZQKe.js";import"./index-igVRi2Pk.js";import"./index-BIMc03as.js";import"./index-CTyuaMHn.js";import"./index-DLNgd2Fq.js";import"./index-tCYHZ4Pr.js";import"./index-D7czeIrx.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,A={component:s,args:{open:!0,onOpenChange:p(),onAccept:p()}},t={render:()=>{const[r,n]=a.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(i,{onClick:()=>n(!0),children:"Show balances in USD"}),e.jsx(s,{open:r,onOpenChange:n,onAccept:()=>new Promise(c=>setTimeout(c,800))})]})}},o={render:()=>{const[r,n]=a.useState(!0);return e.jsx(s,{open:r,onOpenChange:n,onAccept:async()=>{}})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
