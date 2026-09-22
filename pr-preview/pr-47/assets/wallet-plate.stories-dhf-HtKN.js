import{h as v,q as h,c as g}from"./ipc-BdlnfMXN.js";import{w as b}from"./with-router-DyKcgiOZ.js";import{W as E}from"./wallet-plate-Ci1YfxtF.js";import"./iframe-_2ylhKB9.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-CSaeGBJ5.js";import"./with-selector-CMGcPZg2.js";import"./index-28H-stTA.js";import"./index-w8hLHEa3.js";import"./button-DnsIGRdu.js";import"./utils-DCADjnpI.js";import"./index-BrbaG4_l.js";import"./switch-DWZmaa1_.js";import"./index-CPbyqx1t.js";import"./index-B0qmgOHf.js";import"./index-DuuBpEFp.js";import"./index-RRvIHWKj.js";import"./discreet-value-F6q7Ec1r.js";import"./use-wallet-data-B40OC8H5.js";import"./lifehash-avatar-2yCW-v0q.js";import"./lifehash-bAbtiYOZ.js";import"./switch-wallet-Do00Wnr6.js";import"./wallet-recency-DIIncMpp.js";import"./app-toast-BzLTaUEE.js";import"./index-BgYuLrsR.js";import"./format-BSD6YbAO.js";import"./addYears-DH8pj9JL.js";import"./remove-dialog-D_kVq941.js";import"./alert-dialog-BbVpHRXl.js";import"./index-Dwon02-9.js";import"./index-B_MOOdge.js";import"./index-Dnf-N7NW.js";import"./IconEye-D8d2-GMs.js";import"./createReactComponent-BiUich46.js";import"./IconCheck-DKOhVlzg.js";import"./IconPencil-DiViFmAI.js";const{expect:m,fn:R,mocked:s,userEvent:a,within:d}=__STORYBOOK_MODULE_TEST__,t="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",B=`uview1${"qpzry9x8gf2tvdw0s3jn54khce6mua7l".repeat(8)}`,f={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:17e8},w={id:t,label:"Cold storage",fingerprint:t,network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655",sync:f,notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},y={exists:!0,locked:!1,sessionHeld:!0,walletId:t,fingerprint:t,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},re={component:E,decorators:[b],args:{wallet:w,onChanged:R()},beforeEach:()=>{s(h).mockResolvedValue(B),s(v).mockResolvedValue(y),s(g).mockResolvedValue(y)}},o={},r={args:{wallet:{...w,label:t.slice(0,8),selected:!1,sync:{...f,state:"syncing",percent:42}}}},i={args:{wallet:{...w,selected:!1,sync:void 0,unavailable:"wallet file could not be read"}}},c={play:async({canvasElement:n})=>{const e=d(n);await a.click(e.getByRole("button",{name:/cold storage/i}));const u=await e.findByRole("textbox",{name:/wallet name/i});await a.clear(u),await a.type(u,"Rainy day{enter}"),await m(s(v)).toHaveBeenCalledWith(t,"Rainy day")}},l={play:async({canvasElement:n})=>{const e=d(n);await a.click(e.getByRole("button",{name:/show…/i})),await a.type(await e.findByPlaceholderText("Passphrase"),"hunter2{enter}"),await m(await e.findByRole("button",{name:/hide/i})).toBeVisible(),await m(e.getByText(/^uview1$/)).toBeVisible()}},p={beforeEach:()=>{s(h).mockRejectedValue(new Error("wrong passphrase"))},play:async({canvasElement:n})=>{const e=d(n);await a.click(e.getByRole("button",{name:/show…/i})),await a.type(await e.findByPlaceholderText("Passphrase"),"nope{enter}"),await m(await e.findByText(/doesn't match/i)).toBeVisible()}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:"{}",...o.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    wallet: {
      ...WALLET,
      label: FINGERPRINT.slice(0, 8),
      selected: false,
      sync: {
        ...SYNCED,
        state: "syncing",
        percent: 42
      }
    }
  }
}`,...r.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    wallet: {
      ...WALLET,
      selected: false,
      sync: undefined,
      unavailable: "wallet file could not be read"
    }
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: /cold storage/i
    }));
    const field = await canvas.findByRole("textbox", {
      name: /wallet name/i
    });
    await userEvent.clear(field);
    await userEvent.type(field, "Rainy day{enter}");
    await expect(mocked(setWalletLabel)).toHaveBeenCalledWith(FINGERPRINT, "Rainy day");
  }
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: /show…/i
    }));
    await userEvent.type(await canvas.findByPlaceholderText("Passphrase"), "hunter2{enter}");
    await expect(await canvas.findByRole("button", {
      name: /hide/i
    })).toBeVisible();
    await expect(canvas.getByText(/^uview1$/)).toBeVisible();
  }
}`,...l.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    mocked(exportUfvk).mockRejectedValue(new Error("wrong passphrase"));
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: /show…/i
    }));
    await userEvent.type(await canvas.findByPlaceholderText("Passphrase"), "nope{enter}");
    await expect(await canvas.findByText(/doesn't match/i)).toBeVisible();
  }
}`,...p.parameters?.docs?.source}}};const ie=["Selected","Other","Unavailable","Rename","UnlockViewingKey","WrongPassphrase"];export{r as Other,c as Rename,o as Selected,i as Unavailable,l as UnlockViewingKey,p as WrongPassphrase,ie as __namedExportsOrder,re as default};
