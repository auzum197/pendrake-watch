import{R as i}from"./remove-dialog-CRzXo9a3.js";import{w as s}from"./with-router-B99xF6zG.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-Y1P2rZSU.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-Bal-Ysft.js";import"./alert-dialog-BfhagHPg.js";import"./utils-DCADjnpI.js";import"./button-BpoS4ru0.js";import"./index-CCXP94Y5.js";import"./index-VKUx1rey.js";import"./index-6rFbSKwi.js";import"./index-DSOWHuMQ.js";import"./index-Dc2VGqh2.js";import"./index-Cpmxs1Ac.js";import"./index-F_uM81JR.js";import"./index-Dr4HX5xZ.js";import"./lifehash-f6iRJE1K.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-BWwxOikK.js";import"./IconEye-DGZ9a_0_.js";import"./createReactComponent-CtQXmasm.js";import"./with-selector-NqkDHb_i.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
