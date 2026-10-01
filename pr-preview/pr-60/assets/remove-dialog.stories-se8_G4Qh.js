import{R as i}from"./remove-dialog-CKWs5iWO.js";import{w as s}from"./with-router-C6K9Bvnc.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-_c2uoIrT.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-NPIdu0L0.js";import"./alert-dialog-BfxEM4wc.js";import"./utils-DCADjnpI.js";import"./button-B8zpzLFW.js";import"./index-GuG6etb9.js";import"./index-CcGbQD5P.js";import"./index-C9-KkWnR.js";import"./index-SDpUNWM2.js";import"./index-r909SgAI.js";import"./index-CjVdxGJV.js";import"./index-5ztctnWc.js";import"./index-ClrRDkFf.js";import"./lifehash-D-s6HrzB.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-CJb5qg8o.js";import"./IconEye-CxdXVV_q.js";import"./createReactComponent-B7dLALgJ.js";import"./with-selector-CMyGzffA.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}};const j=["Explain","WrongPassphrase"];export{t as Explain,o as WrongPassphrase,j as __namedExportsOrder,W as default};
