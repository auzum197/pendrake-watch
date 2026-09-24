import{R as i}from"./remove-dialog-CAba0HjV.js";import{w as s}from"./with-router-DB7_yc6y.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-BtoT7ZUj.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DZpjMYba.js";import"./alert-dialog-AuZrvBQB.js";import"./utils-DCADjnpI.js";import"./button-C2b_yo5t.js";import"./index-DVjyfrVx.js";import"./index-C0ZGI2nx.js";import"./index-DxHT6NfL.js";import"./index-DSQcck3W.js";import"./index-BXAruaMZ.js";import"./index-Bo8dB-nS.js";import"./index-B4Wyn7gZ.js";import"./index-kt1t6oDZ.js";import"./lifehash-D3cvoxNM.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-kBQn_9Vy.js";import"./IconEye-IFoVlC5N.js";import"./createReactComponent-iy7V8Uex.js";import"./with-selector-CYHIkBjK.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
