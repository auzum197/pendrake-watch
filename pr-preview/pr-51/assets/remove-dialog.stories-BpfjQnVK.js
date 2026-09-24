import{R as i}from"./remove-dialog-T9AzCE2m.js";import{w as s}from"./with-router-CSZog7WG.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-Ckh9-2z5.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-SbY0oTGL.js";import"./alert-dialog-RHGRABVu.js";import"./utils-DCADjnpI.js";import"./button-CcVVJlYq.js";import"./index-Da5Q1FaO.js";import"./index-hYJE8adZ.js";import"./index-Bim23spH.js";import"./index-DmXA01dE.js";import"./index-Bvaxk20x.js";import"./index-D22R0Pv4.js";import"./index-i0BdIJb0.js";import"./index-D6DHKXe9.js";import"./lifehash-DJKOCUfv.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-CPiNROmf.js";import"./IconEye-wrRkIZ1y.js";import"./createReactComponent-aa_Ew39X.js";import"./with-selector-CwoHKwz7.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
