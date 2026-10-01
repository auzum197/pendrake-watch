import{R as i}from"./remove-dialog-CHSJBkjn.js";import{w as s}from"./with-router-BACrMEMI.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-DPJRNYn3.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-D0_C1lZa.js";import"./alert-dialog-DY5k2s_u.js";import"./utils-DCADjnpI.js";import"./button-DCLEP6-H.js";import"./index-DaoF5g_P.js";import"./index-Cf1_bxL3.js";import"./index-CNYBZ9BG.js";import"./index-CwDgmO6C.js";import"./index-BOQ-_g_L.js";import"./index-BYnATEUr.js";import"./index-COBEpsgJ.js";import"./index-9jLQkI5U.js";import"./lifehash-CYzOSLJb.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-CY3dPX3M.js";import"./IconEye-c01c5aoA.js";import"./createReactComponent-S2XzoKha.js";import"./with-selector-fxUtD_89.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
