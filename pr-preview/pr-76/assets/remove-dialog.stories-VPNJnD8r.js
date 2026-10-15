import{R as i}from"./remove-dialog-Bcv_9y8C.js";import{w as s}from"./with-router-DTCKV9Iq.js";import{n,j as m,p}from"./ipc-BdEm-LNG.js";import"./iframe-BJY3hGoB.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-BwrwlJgY.js";import"./alert-dialog-C43NMzcy.js";import"./utils-DCADjnpI.js";import"./button-CCwKqsYV.js";import"./index-D7-N85cz.js";import"./index-BAz_rnP6.js";import"./index-CG5pOcaH.js";import"./index-ldoH55Nq.js";import"./index-DPlR6rmG.js";import"./index-XR3X-M_l.js";import"./index-COEfg7cD.js";import"./index-i23jdeO4.js";import"./lifehash-C0dexQN-.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-B1Om7cwu.js";import"./IconEye-DwKh_PDH.js";import"./createReactComponent-BUdmsm17.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,U={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}};const W=["Explain","WrongPassphrase"];export{t as Explain,o as WrongPassphrase,W as __namedExportsOrder,U as default};
