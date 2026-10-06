import{r as a,j as e}from"./iframe-DXZRj1p2.js";import{B as i}from"./button-Q5NHeUoB.js";import{F as s}from"./fiat-consent-dialog-DAAmmaGG.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DCADjnpI.js";import"./index-DO_Ci4YK.js";import"./alert-dialog-B1rCWOxq.js";import"./index-D2-_ZRoG.js";import"./index-Ds23Dzac.js";import"./index-B1L0T6Qy.js";import"./index-CzyQ1ON8.js";import"./index-CYLv7X5p.js";import"./index-Cw3B3M2B.js";import"./index-tB1ptxHV.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,A={component:s,args:{open:!0,onOpenChange:p(),onAccept:p()}},t={render:()=>{const[r,n]=a.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(i,{onClick:()=>n(!0),children:"Show balances in USD"}),e.jsx(s,{open:r,onOpenChange:n,onAccept:()=>new Promise(c=>setTimeout(c,800))})]})}},o={render:()=>{const[r,n]=a.useState(!0);return e.jsx(s,{open:r,onOpenChange:n,onAccept:async()=>{}})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
