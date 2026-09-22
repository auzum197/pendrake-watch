import{R as i}from"./remove-dialog-D_kVq941.js";import{w as s}from"./with-router-DyKcgiOZ.js";import{n,j as m,p}from"./ipc-BdlnfMXN.js";import"./iframe-_2ylhKB9.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-CSaeGBJ5.js";import"./alert-dialog-BbVpHRXl.js";import"./utils-DCADjnpI.js";import"./button-DnsIGRdu.js";import"./index-BrbaG4_l.js";import"./index-CPbyqx1t.js";import"./index-Dwon02-9.js";import"./index-RRvIHWKj.js";import"./index-28H-stTA.js";import"./index-w8hLHEa3.js";import"./index-B_MOOdge.js";import"./index-Dnf-N7NW.js";import"./lifehash-bAbtiYOZ.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-B40OC8H5.js";import"./IconEye-D8d2-GMs.js";import"./createReactComponent-BiUich46.js";import"./with-selector-CMGcPZg2.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
