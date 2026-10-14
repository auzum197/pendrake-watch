import{R as i}from"./remove-dialog-DW1OvLtX.js";import{w as s}from"./with-router-DLtR-TSE.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-wsUWzrSO.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-BApXc4oo.js";import"./alert-dialog-CwRcTV2b.js";import"./utils-DCADjnpI.js";import"./button-DFnI1Wyg.js";import"./index-D6ls1od8.js";import"./index-DVU0WATN.js";import"./index-C_JcdmMO.js";import"./index-Uz5WfMbS.js";import"./index-DjYeupB5.js";import"./index-DliSW3_3.js";import"./index-D0jFEfXm.js";import"./index-D7bzd21m.js";import"./lifehash-BXUxV8uu.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-C1ydxaRm.js";import"./IconEye-D3T66mHq.js";import"./createReactComponent-B909NOtX.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,U={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
