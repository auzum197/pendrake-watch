import{R as i}from"./replace-dialog-uT-aNKnn.js";import{w as s}from"./with-router-zr6vVZry.js";import{n,p}from"./ipc-BUrFCM8o.js";import"./iframe-DAfY7uON.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-Cz0362eO.js";import"./alert-dialog-CFJCESh3.js";import"./utils-DclmTqRz.js";import"./button-Dv-zXNtB.js";import"./index-BjIlDGoY.js";import"./index-B_QWBJst.js";import"./index-BDU21AiA.js";import"./index-DM-xPU9e.js";import"./index-B6Zg1S3p.js";import"./index-Cy0nPEeW.js";import"./index-CQrIJYyI.js";import"./index-C8X3__Sy.js";import"./lifehash-BK-IX7Et.js";import"./IconEye-BUg-YVpg.js";import"./createReactComponent-D3XjCNQN.js";import"./with-selector-C-VZR1iO.js";const{expect:c,fn:m,mocked:r,userEvent:a,within:d}=__STORYBOOK_MODULE_TEST__,W={component:i,decorators:[s],args:{open:!0,onOpenChange:m(),fingerprint:"a1b2c3d4e5f6",network:"mainnet"},beforeEach:()=>{r(n).mockResolvedValue(!1),r(p).mockResolvedValue()}},t={},o={play:async()=>{const e=d(document.body);await a.click(e.getByRole("button",{name:/continue/i})),await a.type(await e.findByPlaceholderText(/enter your passphrase/i),"nope"),await a.click(e.getByRole("button",{name:/replace wallet/i})),await c(await e.findByText(/doesn't match/i)).toBeVisible()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole("button", {
      name: /continue/i
    }));
    await userEvent.type(await body.findByPlaceholderText(/enter your passphrase/i), "nope");
    await userEvent.click(body.getByRole("button", {
      name: /replace wallet/i
    }));
    await expect(await body.findByText(/doesn't match/i)).toBeVisible();
  }
}`,...o.parameters?.docs?.source}}};const C=["Explain","WrongPassphrase"];export{t as Explain,o as WrongPassphrase,C as __namedExportsOrder,W as default};
