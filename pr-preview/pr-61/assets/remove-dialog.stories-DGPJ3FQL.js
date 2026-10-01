import{R as i}from"./remove-dialog-DxUlfQZA.js";import{w as s}from"./with-router-CYySQiXd.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-DwVEox3y.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-C8KcTAn5.js";import"./alert-dialog-EQqzjyut.js";import"./utils-DCADjnpI.js";import"./button-D9DaeTZR.js";import"./index-D7FZS5kO.js";import"./index-BF7DMnJm.js";import"./index-BMC-UmGb.js";import"./index-CKwi4uhU.js";import"./index-BvskbvPS.js";import"./index-2p169Vov.js";import"./index-WjQUZwKy.js";import"./index-CRl9y6E4.js";import"./lifehash-jw9d5vb5.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-DSrneHKp.js";import"./IconEye-CbXWOCoU.js";import"./createReactComponent-Csszy0dq.js";import"./with-selector-BRMs3Cod.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
