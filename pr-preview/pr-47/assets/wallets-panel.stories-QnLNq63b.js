import{q as s}from"./ipc-BdlnfMXN.js";import{w as c}from"./with-router-DyKcgiOZ.js";import{W as l}from"./wallets-panel--kZqsZLm.js";import"./iframe-_2ylhKB9.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-CSaeGBJ5.js";import"./with-selector-CMGcPZg2.js";import"./index-28H-stTA.js";import"./index-w8hLHEa3.js";import"./lifehash-avatar-2yCW-v0q.js";import"./lifehash-bAbtiYOZ.js";import"./app-toast-BzLTaUEE.js";import"./index-BgYuLrsR.js";import"./use-wallet-data-B40OC8H5.js";import"./wallet-plate-Ci1YfxtF.js";import"./button-DnsIGRdu.js";import"./utils-DCADjnpI.js";import"./index-BrbaG4_l.js";import"./switch-DWZmaa1_.js";import"./index-CPbyqx1t.js";import"./index-B0qmgOHf.js";import"./index-DuuBpEFp.js";import"./index-RRvIHWKj.js";import"./discreet-value-F6q7Ec1r.js";import"./switch-wallet-Do00Wnr6.js";import"./wallet-recency-DIIncMpp.js";import"./format-BSD6YbAO.js";import"./addYears-DH8pj9JL.js";import"./remove-dialog-D_kVq941.js";import"./alert-dialog-BbVpHRXl.js";import"./index-Dwon02-9.js";import"./index-B_MOOdge.js";import"./index-Dnf-N7NW.js";import"./IconEye-D8d2-GMs.js";import"./createReactComponent-BiUich46.js";import"./IconCheck-DKOhVlzg.js";import"./IconPencil-DiViFmAI.js";import"./IconPlus-CwqDK314.js";const{expect:p,fn:m,mocked:d,userEvent:b,within:f}=__STORYBOOK_MODULE_TEST__,o={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:17e8},i=[{id:"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",label:"Cold storage",fingerprint:"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655",sync:o,notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},{id:"9f8e7d6c5b4a39281706f5e4d3c2b1a0",label:"9f8e7d6c",fingerprint:"9f8e7d6c5b4a39281706f5e4d3c2b1a0",network:"mainnet",birthdayHeight:21e5,selected:!1,lastBalance:"1200000",sync:{...o,state:"syncing",percent:37},notificationsEnabled:!1,indexerUri:"https://na.zec.rocks:443"},{id:"0011223344556677889900aabbccddee",label:"Regtest bench",fingerprint:"0011223344556677889900aabbccddee",network:"regtest",birthdayHeight:1,selected:!1,lastBalance:null,unavailable:"wallet file could not be read",indexerUri:"http://127.0.0.1:9067"}],$={component:l,decorators:[c],args:{wallets:i,focusWallet:null,refresh:m()},beforeEach:()=>{d(s).mockResolvedValue("uview1qqqqqqqqqqqqqqqq")}},e={},t={args:{focusWallet:i[2].id}},a={play:async({canvasElement:n})=>{const r=f(n);await b.click(r.getByRole("option",{name:/regtest bench/i})),await p(await r.findByRole("button",{name:/use this wallet/i})).toBeVisible()}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    focusWallet: WALLETS[2].id
  }
}`,...t.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("option", {
      name: /regtest bench/i
    }));
    await expect(await canvas.findByRole("button", {
      name: /use this wallet/i
    })).toBeVisible();
  }
}`,...a.parameters?.docs?.source}}};const ee=["Default","FocusedWallet","PickAnother"];export{e as Default,t as FocusedWallet,a as PickAnother,ee as __namedExportsOrder,$ as default};
