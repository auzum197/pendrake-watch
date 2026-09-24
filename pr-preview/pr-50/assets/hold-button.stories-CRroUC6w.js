import{r as a,j as e}from"./iframe-621QUQJH.js";import{H as n}from"./hold-button-D8f1BDmy.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DCADjnpI.js";const{fn:m}=__STORYBOOK_MODULE_TEST__,u={component:n,args:{onConfirm:m(),children:"Hold to confirm"}},o={render:()=>{const[t,s]=a.useState(0);return e.jsxs("div",{className:"flex w-72 flex-col gap-3",children:[e.jsx(n,{onConfirm:()=>s(d=>d+1),children:"Hold to remove wallet"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Confirmed ",t," time",t===1?"":"s"]})]})}},r={render:()=>e.jsx("div",{className:"w-72",children:e.jsx(n,{durationMs:600,onConfirm:()=>{},children:"Hold to delete"})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [confirmed, setConfirmed] = useState(0);
    return <div className="flex w-72 flex-col gap-3">
        <HoldButton onConfirm={() => setConfirmed(n => n + 1)}>
          Hold to remove wallet
        </HoldButton>
        <p className="text-sm text-muted-foreground">
          Confirmed {confirmed} time{confirmed === 1 ? "" : "s"}
        </p>
      </div>;
  }
}`,...o.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-72">
      <HoldButton durationMs={600} onConfirm={() => {}}>
        Hold to delete
      </HoldButton>
    </div>
}`,...r.parameters?.docs?.source}}};const p=["Default","Quick"];export{o as Default,r as Quick,p as __namedExportsOrder,u as default};
