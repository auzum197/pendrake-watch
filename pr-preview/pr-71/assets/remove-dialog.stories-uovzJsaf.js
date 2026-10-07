import{R as i}from"./remove-dialog-CtvW94di.js";import{w as s}from"./with-router-CC0k7jgv.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-CO8E7vAZ.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-tCt-WpYi.js";import"./alert-dialog-Bn6VAxHQ.js";import"./utils-DCADjnpI.js";import"./button-D1OY41cG.js";import"./index-BClxySWM.js";import"./index-BqzEbos6.js";import"./index-CY-Y1jWB.js";import"./index-DYxF-MoJ.js";import"./index-D_GuTNJq.js";import"./index-Df0ry4Ix.js";import"./index-DdG8uXAU.js";import"./index-DaMwXXo-.js";import"./lifehash-CIdi9ypZ.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-DYE-UCSm.js";import"./IconEye-CHjGkIzM.js";import"./createReactComponent-Byfse4Dl.js";import"./with-selector-CTd6R3Zi.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
