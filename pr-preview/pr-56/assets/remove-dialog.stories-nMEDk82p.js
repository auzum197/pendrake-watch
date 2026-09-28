import{R as i}from"./remove-dialog-tSbqf8fC.js";import{w as s}from"./with-router-Dq1DKXJA.js";import{n,j as m,p}from"./ipc-g7VmqW7I.js";import"./iframe-1-_Hjrnf.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-BsGUGNC_.js";import"./alert-dialog-CikAZxsS.js";import"./utils-DCADjnpI.js";import"./button-x9h4ZqtC.js";import"./index-phchmh7r.js";import"./index-BpcjW6iD.js";import"./index-DSH3Ju8G.js";import"./index-ig035O2Y.js";import"./index-HL84VBya.js";import"./index-B_mtQrK8.js";import"./index-ps3hcNDx.js";import"./index-Bwjoiivy.js";import"./lifehash-B2wqNZ-I.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-dIePfYkP.js";import"./IconEye-B9nNmNKX.js";import"./createReactComponent-B9SGokvn.js";import"./with-selector-24modjmp.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
