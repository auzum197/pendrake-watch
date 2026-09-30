import{R as i}from"./remove-dialog-DmlOqwnD.js";import{w as s}from"./with-router-CEw9MBWi.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-Bi5W2gA-.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-B9PNXRqX.js";import"./alert-dialog-BwqaWDl1.js";import"./utils-DCADjnpI.js";import"./button-Cx1UfN6P.js";import"./index-4Qxz25kQ.js";import"./index-MhANfomA.js";import"./index-CqiZ3xdY.js";import"./index-CTYcviGy.js";import"./index-BBLMOefO.js";import"./index-CbNF9HbQ.js";import"./index-CvBK_guc.js";import"./index-DOx33pbH.js";import"./lifehash-DPgXrgH9.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-DM8glcVl.js";import"./IconEye-CpTRhMOD.js";import"./createReactComponent-0R5LxmMx.js";import"./with-selector-R-PTH-vF.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
