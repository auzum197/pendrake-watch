import{R as i}from"./remove-dialog-CeX6R5UR.js";import{w as s}from"./with-router-C85Kb_c0.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-CqJNir_t.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-_woS71md.js";import"./alert-dialog-5y-69oCb.js";import"./utils-DCADjnpI.js";import"./button-CU1y8RHw.js";import"./index-DDlPZ3DM.js";import"./index-DcAjceeL.js";import"./index-D3Tn2GU6.js";import"./index-q8btMoMV.js";import"./index-CaQASp_V.js";import"./index-BXVgU7b0.js";import"./index-Cw9fDHIA.js";import"./index-BYK-sLxg.js";import"./lifehash-BpDgokn4.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-BRavebDa.js";import"./IconEye-DUOIMwIB.js";import"./createReactComponent-i9SUfz8X.js";import"./with-selector-BZBIwtcf.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
