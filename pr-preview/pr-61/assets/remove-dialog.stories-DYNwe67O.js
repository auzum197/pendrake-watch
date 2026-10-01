import{R as i}from"./remove-dialog-DbaBk08o.js";import{w as s}from"./with-router--7fKJLgO.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-BI4DPKI4.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-CeyFgR_f.js";import"./alert-dialog-BZq13sA-.js";import"./utils-DCADjnpI.js";import"./button-D3mpBaB4.js";import"./index-B9__DGRb.js";import"./index-Bdf2ZQKe.js";import"./index-igVRi2Pk.js";import"./index-BIMc03as.js";import"./index-CTyuaMHn.js";import"./index-DLNgd2Fq.js";import"./index-tCYHZ4Pr.js";import"./index-D7czeIrx.js";import"./lifehash-B7UkUJLU.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-DpH6rIvg.js";import"./IconEye-DiFMKZLD.js";import"./createReactComponent-D6A4bnUY.js";import"./with-selector-BTA-tIEj.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
