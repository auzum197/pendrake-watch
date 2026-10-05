import{R as i}from"./remove-dialog-CdeA2hdW.js";import{w as s}from"./with-router-D9zKrsSY.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-D3GdDKTd.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DzhqPyzG.js";import"./alert-dialog-Dx7k17nM.js";import"./utils-DCADjnpI.js";import"./button-DYZBgrrr.js";import"./index-CzNhHwp0.js";import"./index-KwIv9S1q.js";import"./index-BkjV_el8.js";import"./index-hygi4iFr.js";import"./index-Bx3Vento.js";import"./index-DX63JRrw.js";import"./index-BneyrXbz.js";import"./index-DlkkeIyW.js";import"./lifehash-BJGzuqma.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-T8mpZ7jG.js";import"./IconEye-B1iKXkSX.js";import"./createReactComponent-2IoVJzn-.js";import"./with-selector-DlnULOb-.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
