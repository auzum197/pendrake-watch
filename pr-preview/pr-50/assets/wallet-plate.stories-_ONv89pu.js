import{h,q as b,r as f,c as R}from"./ipc-D91hTTIc.js";import{w as E}from"./with-router-DB7_yc6y.js";import{W as k}from"./wallet-plate-JMHVq4K1.js";import"./iframe-BtoT7ZUj.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DZpjMYba.js";import"./with-selector-CYHIkBjK.js";import"./index-BXAruaMZ.js";import"./index-Bo8dB-nS.js";import"./button-C2b_yo5t.js";import"./utils-DCADjnpI.js";import"./index-DVjyfrVx.js";import"./switch-aiUMk0H0.js";import"./index-C0ZGI2nx.js";import"./index-DP07Keec.js";import"./index-CbZ_LF0H.js";import"./index-DSQcck3W.js";import"./discreet-value-C2rUO6CK.js";import"./use-wallet-data-kBQn_9Vy.js";import"./lifehash-avatar-D5qiXFHD.js";import"./lifehash-D3cvoxNM.js";import"./inline-name-JTZItyPX.js";import"./createReactComponent-iy7V8Uex.js";import"./switch-wallet-Dmzwz9qK.js";import"./wallet-recency-DIIncMpp.js";import"./app-toast-Bs8UkpeG.js";import"./index-C3dIfnBn.js";import"./format-DAOk0-W0.js";import"./addYears-Cm1OKrbP.js";import"./remove-dialog-CAba0HjV.js";import"./alert-dialog-AuZrvBQB.js";import"./index-DxHT6NfL.js";import"./index-B4Wyn7gZ.js";import"./index-kt1t6oDZ.js";import"./IconEye-IFoVlC5N.js";import"./IconCheck-Bm7mue84.js";import"./IconPencil-CCMiMw_y.js";const{expect:o,fn:_,mocked:n,userEvent:a,within:i}=__STORYBOOK_MODULE_TEST__,s="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",x=`uview1${"qpzry9x8gf2tvdw0s3jn54khce6mua7l".repeat(8)}`,B={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:17e8},v={id:s,label:"Cold storage",fingerprint:s,network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655",sync:B,notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},u={exists:!0,locked:!1,sessionHeld:!0,walletId:s,fingerprint:s,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},de={component:k,decorators:[E],args:{wallet:v,onChanged:_()},beforeEach:()=>{n(f).mockResolvedValue(x),n(h).mockResolvedValue(u),n(R).mockResolvedValue(u),n(b).mockResolvedValue(u)}},c={},l={args:{wallet:{...v,label:s.slice(0,8),selected:!1,sync:{...B,state:"syncing",percent:42}}}},d={args:{wallet:{...v,selected:!1,sync:void 0,unavailable:"wallet file could not be read"}}},m={play:async({canvasElement:t})=>{const e=i(t);await a.click(e.getByRole("button",{name:/cold storage/i}));const r=await e.findByRole("textbox",{name:/wallet name/i});await a.clear(r),await a.type(r,"Rainy day{enter}"),await o(n(h)).toHaveBeenCalledWith(s,"Rainy day")}},p={play:async({canvasElement:t,args:e})=>{const r=i(t);await a.click(r.getByRole("button",{name:/rescan…/i}));const g=i(await i(document.body).findByRole("alertdialog"));await o(g.getByText(/from block 419,200/i)).toBeVisible(),await a.click(g.getByRole("button",{name:/^rescan$/i})),await o(n(b)).toHaveBeenCalledWith(s),await o(e.onChanged).toHaveBeenCalled()}},w={play:async({canvasElement:t})=>{const e=i(t);await a.click(e.getByRole("button",{name:/show…/i})),await a.type(await e.findByPlaceholderText("Passphrase"),"hunter2{enter}"),await o(await e.findByRole("button",{name:/hide/i})).toBeVisible(),await o(e.getByText(/^uview1$/)).toBeVisible()}},y={beforeEach:()=>{n(f).mockRejectedValue(new Error("wrong passphrase"))},play:async({canvasElement:t})=>{const e=i(t);await a.click(e.getByRole("button",{name:/show…/i})),await a.type(await e.findByPlaceholderText("Passphrase"),"nope{enter}"),await o(await e.findByText(/doesn't match/i)).toBeVisible()}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:"{}",...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    wallet: {
      ...WALLET,
      selected: false,
      sync: undefined,
      unavailable: "wallet file could not be read"
    }
  }
}`,...d.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
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
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: /rescan…/i
    }));
    const dialog = within(await within(document.body).findByRole("alertdialog"));
    await expect(dialog.getByText(/from block 419,200/i)).toBeVisible();
    await userEvent.click(dialog.getByRole("button", {
      name: /^rescan$/i
    }));
    await expect(mocked(rescanWallet)).toHaveBeenCalledWith(FINGERPRINT);
    await expect(args.onChanged).toHaveBeenCalled();
  }
}`,...p.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
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
}`,...y.parameters?.docs?.source}}};const me=["Selected","Other","Unavailable","Rename","Rescan","UnlockViewingKey","WrongPassphrase"];export{l as Other,m as Rename,p as Rescan,c as Selected,d as Unavailable,w as UnlockViewingKey,y as WrongPassphrase,me as __namedExportsOrder,de as default};
