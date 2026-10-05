import{R as i}from"./remove-dialog-DpqRT3Nw.js";import{w as s}from"./with-router-B7Nyk1CZ.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-DCPqoqTI.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-BuH_Bg2U.js";import"./alert-dialog-_b76fyYE.js";import"./utils-DCADjnpI.js";import"./button-ChfA5hpR.js";import"./index-CrXZ6VyV.js";import"./index-ulhL-4Oi.js";import"./index-CLaXkewH.js";import"./index-DgL3Yi9g.js";import"./index-C86bA3yf.js";import"./index-BU-ZK3vu.js";import"./index-BxQ0UkMl.js";import"./index-BIpLwPBz.js";import"./lifehash-BVN88oe1.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-BT-DWGLk.js";import"./IconEye-CW0MGyRE.js";import"./createReactComponent-DyWLaXIP.js";import"./with-selector-BcCwBc9C.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
