import{R as i}from"./remove-dialog-DQxMWIrq.js";import{w as s}from"./with-router-DIyrJM0p.js";import{n,j as m,p}from"./ipc-D91hTTIc.js";import"./iframe-CQ14j71F.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-BGXAAgyg.js";import"./alert-dialog-B5JMa9YU.js";import"./utils-DclmTqRz.js";import"./button-BMcs1b0B.js";import"./index-iZDYuQOZ.js";import"./index-euHoao68.js";import"./index-N4sm20tf.js";import"./index-DWQqQYhj.js";import"./index-qri4qiTQ.js";import"./index-CSkjZJv4.js";import"./index-DuS2KT3e.js";import"./index-CNWdihGt.js";import"./lifehash-DYIr7XIW.js";import"./wallet-recency-DIIncMpp.js";import"./use-wallet-data-C3Iy6ipE.js";import"./IconEye-pJMgDVit.js";import"./createReactComponent-DfoL5IdI.js";import"./with-selector-q96RF6Ww.js";const{expect:c,fn:d,mocked:a,userEvent:r,within:l}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:d(),walletId:"a1b2c3d4e5f6",fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{a(n).mockResolvedValue(!1),a(m).mockResolvedValue([]),a(p).mockResolvedValue({exists:!1,locked:!1,sessionHeld:!0,fingerprint:null,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:0,indexerUri:"",notificationsEnabled:!0})}},t={},o={play:async()=>{const e=l(document.body);await r.click(e.getByRole("button",{name:/continue/i})),await r.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await r.click(e.getByRole("button",{name:/remove wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
