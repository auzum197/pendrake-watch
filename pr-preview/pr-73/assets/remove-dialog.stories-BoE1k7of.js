import{R as i}from"./remove-dialog-BH2zEc5K.js";import{w as s}from"./with-router-BSYFj3oe.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-C26jXw6C.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DR530WvI.js";import"./alert-dialog-BkSw8ogq.js";import"./utils-DCADjnpI.js";import"./button-5wpprGyR.js";import"./index-3ELthau-.js";import"./index-D9JY2ItI.js";import"./index-DjlpTeVZ.js";import"./index-D8XA4fpq.js";import"./index-TqyZ_HEm.js";import"./index-CD5ppEGG.js";import"./index-B3ak98vI.js";import"./index-B3U2X7wV.js";import"./lifehash-DQZgej2o.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-DyntElN9.js";import"./IconEye-CWJjD_TC.js";import"./createReactComponent-BI95fFwg.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,U={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
