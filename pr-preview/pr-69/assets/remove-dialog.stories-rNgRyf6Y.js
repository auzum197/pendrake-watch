import{R as i}from"./remove-dialog-TL-QOi0o.js";import{w as s}from"./with-router-hEjpxXYM.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-B0jUypf_.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DkM0ju5y.js";import"./alert-dialog-C1RfXkqi.js";import"./utils-DCADjnpI.js";import"./button-DL-2Txz_.js";import"./index-BbN8JOql.js";import"./index-D9xkj0N6.js";import"./index-ClNJGhaM.js";import"./index-CuHFkm_y.js";import"./index-DKpjmLqt.js";import"./index-CQdiPIc2.js";import"./index-XqNXHo60.js";import"./index-CkeBFMR1.js";import"./lifehash-aJYAN94a.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-CDl-S6xi.js";import"./IconEye-BapbLTdy.js";import"./createReactComponent-B8PfQ_MB.js";import"./with-selector-CVqF2FYM.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
