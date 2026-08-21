import{j as e}from"./iframe-QZIHBPGP.js";import{A as a,h as c,a as m,b as d,c as p,d as h,e as u,f as g,g as x}from"./alert-dialog-pTAGyVAO.js";import{B as v}from"./button-D2-db446.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DclmTqRz.js";import"./index-HH7y75ab.js";import"./index-BV_ox4hJ.js";import"./index-BxlCx6OI.js";import"./index-BKRYbcsV.js";import"./index-C6zb2o0l.js";import"./index-oew8xBpk.js";import"./index-FyNau3vF.js";import"./index-Bc-tH8sm.js";const{expect:D,userEvent:w,within:o}=__STORYBOOK_MODULE_TEST__,V={component:a};function s(){return e.jsxs(a,{children:[e.jsx(c,{asChild:!0,children:e.jsx(v,{variant:"destructive",children:"Remove wallet"})}),e.jsxs(m,{children:[e.jsxs(d,{children:[e.jsx(p,{children:"Remove this Wallet?"}),e.jsx(h,{children:"The synced history is erased. It's watch-only, so re-importing the UFVK restores it."})]}),e.jsxs(u,{children:[e.jsx(g,{children:"Cancel"}),e.jsx(x,{children:"Remove"})]})]})]})}const t={render:()=>e.jsx(s,{})},r={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{const i=o(n);await w.click(i.getByRole("button",{name:/remove wallet/i}));const l=o(document.body);await D(await l.findByText(/remove this wallet\?/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <Demo />
}`,...t.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <Demo />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: /remove wallet/i
    }));
    // The dialog portals to the document body, outside the story canvas.
    const dialog = within(document.body);
    await expect(await dialog.findByText(/remove this wallet\\?/i)).toBeVisible();
  }
}`,...r.parameters?.docs?.source}}};const k=["Default","Opened"];export{t as Default,r as Opened,k as __namedExportsOrder,V as default};
