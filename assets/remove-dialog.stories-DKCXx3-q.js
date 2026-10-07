import{R as i}from"./remove-dialog-gKP96hP1.js";import{w as s}from"./with-router-CI9nhIWD.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-BsAOtjPO.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-35gCA7en.js";import"./alert-dialog-0-o-6wcO.js";import"./utils-DCADjnpI.js";import"./button-Cfz7aL4x.js";import"./index-D099EosU.js";import"./index-DZl1Pv0F.js";import"./index-9RvNByv6.js";import"./index-CMQxFmm1.js";import"./index-BbqeRg1I.js";import"./index-COZcPIa7.js";import"./index-Dh70p8f7.js";import"./index-CbsASgiH.js";import"./lifehash-DyknHiPl.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-B3_76QIi.js";import"./IconEye-KwmGW7S-.js";import"./createReactComponent-Hk74hMyK.js";import"./with-selector-DMmv8S7w.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
