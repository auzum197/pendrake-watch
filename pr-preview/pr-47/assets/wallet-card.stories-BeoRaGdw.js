import{j as i}from"./iframe-D_NN_1gN.js";import{W as r}from"./wallet-card-Q4g8buCi.js";import{w as s}from"./with-router-BclbfXh_.js";import{b as o}from"./ipc-BPuKzjyu.js";import"./preload-helper-PPVm8Dsz.js";import"./index-tmVPE2Ix.js";import"./index-B9Kx3e0Z.js";import"./index-CArmQkpO.js";import"./format-DGOEn-zF.js";import"./use-wallet-data-Dv-BXkqo.js";import"./lifehash-BQ5m4MgU.js";import"./lifehash-avatar-BRGXFE2j.js";import"./discreet-value-B5nPWUax.js";import"./skeleton-D8oZ7fti.js";import"./utils-DclmTqRz.js";import"./sync-status-DrfIRdPS.js";import"./IconCircleCheckFilled-CcbvZsXF.js";import"./createReactComponent-21_2WyET.js";import"./IconSelector-CoxY-4AG.js";import"./with-selector-CluozF5R.js";const{expect:c,mocked:l,userEvent:p,within:d}=__STORYBOOK_MODULE_TEST__,m={exists:!0,locked:!1,sessionHeld:!0,fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},g=[{id:"w1",label:"Cold storage",fingerprint:"a1b2c3d4e5f6",network:"mainnet",birthdayHeight:419200,active:!0,lastBalance:"897091655"},{id:"w2",label:"Spending",fingerprint:"0099aabbccdd",network:"mainnet",birthdayHeight:239e4,active:!1,lastBalance:null},{id:"w3",label:"e4608135",fingerprint:"e4608135aabb",network:"regtest",birthdayHeight:21e5,active:!1,lastBalance:"12850000000"},{id:"w4",label:"Imported",fingerprint:"5c17fe902bd1",network:"regtest",birthdayHeight:0,active:!1,lastBalance:"320400000"}],w={state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},h={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100},W={component:r,decorators:[s,a=>i.jsx("div",{className:"w-64",children:i.jsx(a,{})})],beforeEach:()=>{l(o).mockResolvedValue(g)},argTypes:{wallet:{control:!1},sync:{control:!1},switching:{control:"boolean"}},args:{wallet:m,sync:h,switching:!1}},e={args:{sync:w}},t={play:async({canvasElement:a})=>{const n=d(a);await p.click(n.getByRole("button",{name:"Switch wallet"})),await c(await n.findByText("Spending")).toBeVisible()}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
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
}`,...t.parameters?.docs?.source}}};const z=["Collapsed","Switcher"];export{e as Collapsed,t as Switcher,z as __namedExportsOrder,W as default};
