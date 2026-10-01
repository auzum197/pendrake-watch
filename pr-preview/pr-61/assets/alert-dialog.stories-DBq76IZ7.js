import{j as e}from"./iframe-BI4DPKI4.js";import{A as a,h as c,b as m,c as d,d as p,e as h,f as u,g,i as x}from"./alert-dialog-BZq13sA-.js";import{B as v}from"./button-D3mpBaB4.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DCADjnpI.js";import"./index-Bdf2ZQKe.js";import"./index-B9__DGRb.js";import"./index-igVRi2Pk.js";import"./index-BIMc03as.js";import"./index-CTyuaMHn.js";import"./index-DLNgd2Fq.js";import"./index-tCYHZ4Pr.js";import"./index-D7czeIrx.js";const{expect:D,userEvent:w,within:o}=__STORYBOOK_MODULE_TEST__,V={component:a};function s(){return e.jsxs(a,{children:[e.jsx(c,{asChild:!0,children:e.jsx(v,{variant:"destructive",children:"Remove wallet"})}),e.jsxs(m,{children:[e.jsxs(d,{children:[e.jsx(p,{children:"Remove this Wallet?"}),e.jsx(h,{children:"The synced history is erased. It's watch-only, so re-importing the UFVK restores it."})]}),e.jsxs(u,{children:[e.jsx(g,{children:"Cancel"}),e.jsx(x,{children:"Remove"})]})]})]})}const t={render:()=>e.jsx(s,{})},r={render:()=>e.jsx(s,{}),play:async({canvasElement:i})=>{const n=o(i);await w.click(n.getByRole("button",{name:/remove wallet/i}));const l=o(document.body);await D(await l.findByText(/remove this wallet\?/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
