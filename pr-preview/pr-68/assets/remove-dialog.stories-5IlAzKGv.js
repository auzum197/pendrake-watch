import{R as i}from"./remove-dialog-D5PXr53J.js";import{w as s}from"./with-router-CRlr42Ng.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-DXZRj1p2.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-BgNYbqqR.js";import"./alert-dialog-B1rCWOxq.js";import"./utils-DCADjnpI.js";import"./button-Q5NHeUoB.js";import"./index-DO_Ci4YK.js";import"./index-D2-_ZRoG.js";import"./index-Ds23Dzac.js";import"./index-B1L0T6Qy.js";import"./index-CzyQ1ON8.js";import"./index-CYLv7X5p.js";import"./index-Cw3B3M2B.js";import"./index-tB1ptxHV.js";import"./lifehash-5_H9XDa1.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-x6_MiMwt.js";import"./IconEye-BCUQ-GXB.js";import"./createReactComponent-Bt0AcPno.js";import"./with-selector-BPSZ5I0J.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
