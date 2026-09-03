import{R as i}from"./remove-dialog-CbAmsA8F.js";import{w as s}from"./with-router-BNlfu7Fo.js";import{n,h as m,p}from"./ipc-cooBBgp-.js";import"./iframe-BqPm5GPo.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-ZN3NAyZe.js";import"./alert-dialog-Bk89ILQ8.js";import"./utils-DCADjnpI.js";import"./button-3es8Fj9-.js";import"./index-Blmv-jCN.js";import"./index-C53dFOQZ.js";import"./index-BSxR_CfR.js";import"./index-B4VA8EEn.js";import"./index-B6ERYhEG.js";import"./index-Cvky-sGi.js";import"./index-C-pEON4W.js";import"./index-n-fLb4Y0.js";import"./lifehash-DGWfi99f.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-BhDCaPwA.js";import"./IconEye-BQOcnq-E.js";import"./createReactComponent-BNaYxCWq.js";import"./with-selector-DDZl_lIQ.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}};const C=["Explain","WrongPassphrase"];export{t as Explain,o as WrongPassphrase,C as __namedExportsOrder,W as default};
