import{R as i}from"./remove-dialog-D3bplgmN.js";import{w as s}from"./with-router-CeyY0gi0.js";import{n,j as m,p}from"./ipc-w0xuYYD3.js";import"./iframe-DjWij6O_.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DNt9LMBa.js";import"./alert-dialog-B88E9v6F.js";import"./utils-DCADjnpI.js";import"./button-0d6amHUF.js";import"./index-DNvtL9iC.js";import"./index-ZFMZR_nl.js";import"./index-CaEFhZTu.js";import"./index-CuSYIKGN.js";import"./index-Ck__evfS.js";import"./index-HNC6iCUd.js";import"./index-BaSN_m-p.js";import"./index-DgEOPQ3F.js";import"./lifehash-B0eF4XF8.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-CGP2ybo3.js";import"./IconEye-C8GYogbt.js";import"./createReactComponent-FH3VvFag.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,C={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue(void 0)}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole("button", {
      name: /continue/i
    }));
    await userEvent.type(await body.findByPlaceholderText(/enter your passphrase/i), "nope");
    await userEvent.click(body.getByRole("button", {
      name: /remove wallet/i
    }));
    await expect(await body.findByText(/doesn't match/i)).toBeVisible();
  }
}`,...o.parameters?.docs?.source}}};const I=["Explain","WrongPassphrase"];export{t as Explain,o as WrongPassphrase,I as __namedExportsOrder,C as default};
