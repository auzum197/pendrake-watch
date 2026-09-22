import{R as i}from"./remove-dialog-E8Z1M_Zu.js";import{w as s}from"./with-router-6l-qbviS.js";import{n,j as m,p}from"./ipc-g7VmqW7I.js";import"./iframe-WvSYpc3X.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DwxEUD9G.js";import"./alert-dialog-DkApUBHz.js";import"./utils-DCADjnpI.js";import"./button-jPYm70f_.js";import"./index-Dvn7gCtL.js";import"./index-Q8P8ziXW.js";import"./index-DeT-gJGy.js";import"./index-Ch9S4h05.js";import"./index-D3nEufUq.js";import"./index-viyhfdCR.js";import"./index-C-I8FC1h.js";import"./index-OPCCL5KB.js";import"./lifehash-9ovGMtFc.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-BcdzC9W_.js";import"./IconEye-CGkLkL-U.js";import"./createReactComponent-BUOeJnn6.js";import"./with-selector-DfOzPSTF.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
