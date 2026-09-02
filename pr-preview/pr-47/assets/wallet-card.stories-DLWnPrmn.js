import{j as i}from"./iframe-DAfY7uON.js";import{W as r}from"./wallet-card-CoowBDl1.js";import{w as s}from"./with-router-zr6vVZry.js";import{h as o}from"./ipc-BUrFCM8o.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-Cz0362eO.js";import"./index-BwpIYO4N.js";import"./index-B6Zg1S3p.js";import"./index-Cy0nPEeW.js";import"./format-BqzWNPBJ.js";import"./discreet-value-CzLyybPw.js";import"./lifehash-BK-IX7Et.js";import"./lifehash-avatar-Biguf3q6.js";import"./skeleton-C70IzaFd.js";import"./utils-DclmTqRz.js";import"./sync-status-DZK7SZqO.js";import"./IconCircleCheckFilled-CT9izvBf.js";import"./createReactComponent-D3XjCNQN.js";import"./discreet-eye-CZnusXQO.js";import"./IconEye-BUg-YVpg.js";import"./IconSelector-CUV-oXrD.js";import"./with-selector-C-VZR1iO.js";const{expect:c,mocked:l,userEvent:p,within:m}=__STORYBOOK_MODULE_TEST__,d={exists:!0,locked:!1,sessionHeld:!0,fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},g=[{id:"w1",label:"Cold storage",fingerprint:"a1b2c3d4e5f6",network:"mainnet",birthdayHeight:419200,active:!0,lastBalance:"897091655"},{id:"w2",label:"Spending",fingerprint:"0099aabbccdd",network:"mainnet",birthdayHeight:239e4,active:!1,lastBalance:null},{id:"w3",label:"e4608135",fingerprint:"e4608135aabb",network:"regtest",birthdayHeight:21e5,active:!1,lastBalance:"12850000000"},{id:"w4",label:"Imported",fingerprint:"5c17fe902bd1",network:"regtest",birthdayHeight:0,active:!1,lastBalance:"320400000"}],w={state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},h={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100},D={component:r,decorators:[s,a=>i.jsx("div",{className:"w-64",children:i.jsx(a,{})})],beforeEach:()=>{l(o).mockResolvedValue(g)},argTypes:{wallet:{control:!1},sync:{control:!1},switching:{control:"boolean"}},args:{wallet:d,sync:h,switching:!1}},e={args:{sync:w}},t={play:async({canvasElement:a})=>{const n=m(a);await p.click(n.getByRole("button",{name:"Switch wallet"})),await c(await n.findByText("Spending")).toBeVisible()}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    sync: syncing
  }
}`,...e.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Switch wallet"
    }));
    await expect(await canvas.findByText("Spending")).toBeVisible();
  }
}`,...t.parameters?.docs?.source}}};const I=["Collapsed","Switcher"];export{e as Collapsed,t as Switcher,I as __namedExportsOrder,D as default};
