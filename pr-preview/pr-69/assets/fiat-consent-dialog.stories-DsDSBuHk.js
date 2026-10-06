import{r as a,j as e}from"./iframe-B0jUypf_.js";import{B as i}from"./button-DL-2Txz_.js";import{F as s}from"./fiat-consent-dialog-f6iVsMcS.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DCADjnpI.js";import"./index-BbN8JOql.js";import"./alert-dialog-C1RfXkqi.js";import"./index-D9xkj0N6.js";import"./index-ClNJGhaM.js";import"./index-CuHFkm_y.js";import"./index-DKpjmLqt.js";import"./index-CQdiPIc2.js";import"./index-XqNXHo60.js";import"./index-CkeBFMR1.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,A={component:s,args:{open:!0,onOpenChange:p(),onAccept:p()}},t={render:()=>{const[r,n]=a.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(i,{onClick:()=>n(!0),children:"Show balances in USD"}),e.jsx(s,{open:r,onOpenChange:n,onAccept:()=>new Promise(c=>setTimeout(c,800))})]})}},o={render:()=>{const[r,n]=a.useState(!0);return e.jsx(s,{open:r,onOpenChange:n,onAccept:async()=>{}})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
