import{h,q as b,r as f,c as R}from"./ipc-D91hTTIc.js";import{w as E}from"./with-router-CI9nhIWD.js";import{W as k}from"./wallet-plate-DVphQXXe.js";import"./iframe-BsAOtjPO.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-35gCA7en.js";import"./with-selector-DMmv8S7w.js";import"./index-BbqeRg1I.js";import"./index-COZcPIa7.js";import"./button-Cfz7aL4x.js";import"./utils-DCADjnpI.js";import"./index-D099EosU.js";import"./switch-CM-1_Tmo.js";import"./index-DZl1Pv0F.js";import"./index-Cc_N4lVR.js";import"./index-uJh-p5fs.js";import"./index-CMQxFmm1.js";import"./discreet-value-M3xutT9P.js";import"./use-wallet-data-B3_76QIi.js";import"./motion-C2GgtDZe.js";import"./lifehash-avatar-B3fSM92p.js";import"./lifehash-DyknHiPl.js";import"./inline-name-k_nQPG3E.js";import"./createReactComponent-Hk74hMyK.js";import"./switch-wallet-CbU2iTkC.js";import"./wallet-recency-DIIncMpp.js";import"./app-toast-Dhj2fd-G.js";import"./index-dwZPm7Gp.js";import"./format-D3wpGM-y.js";import"./addYears-Cm1OKrbP.js";import"./remove-dialog-gKP96hP1.js";import"./alert-dialog-0-o-6wcO.js";import"./index-9RvNByv6.js";import"./index-Dh70p8f7.js";import"./index-CbsASgiH.js";import"./IconEye-KwmGW7S-.js";import"./IconCheck-BPXs3X7l.js";import"./IconCopy-DrqSu-wG.js";import"./IconPencil-BRua56H7.js";const{expect:o,fn:_,mocked:n,userEvent:a,within:i}=__STORYBOOK_MODULE_TEST__,s="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",x=`uview1${"qpzry9x8gf2tvdw0s3jn54khce6mua7l".repeat(8)}`,B={state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:17e8},v={id:s,label:"Cold storage",fingerprint:s,network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655",sync:B,notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},u={exists:!0,locked:!1,sessionHeld:!0,walletId:s,fingerprint:s,importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},pe={component:k,decorators:[E],args:{wallet:v,onChanged:_()},beforeEach:()=>{n(f).mockResolvedValue(x),n(h).mockResolvedValue(u),n(R).mockResolvedValue(u),n(b).mockResolvedValue(u)}},c={},l={args:{wallet:{...v,label:s.slice(0,8),selected:!1,sync:{...B,state:"syncing",percent:42}}}},m={args:{wallet:{...v,selected:!1,sync:void 0,unavailable:"wallet file could not be read"}}},d={play:async({canvasElement:t})=>{const e=i(t);await a.click(e.getByRole("button",{name:/cold storage/i}));const r=await e.findByRole("textbox",{name:/wallet name/i});await a.clear(r),await a.type(r,"Rainy day{enter}"),await o(n(h)).toHaveBeenCalledWith(s,"Rainy day")}},p={play:async({canvasElement:t,args:e})=>{const r=i(t);await a.click(r.getByRole("button",{name:/rescan…/i}));const g=i(await i(document.body).findByRole("alertdialog"));await o(g.getByText(/from block 419,200/i)).toBeVisible(),await a.click(g.getByRole("button",{name:/^rescan$/i})),await o(n(b)).toHaveBeenCalledWith(s),await o(e.onChanged).toHaveBeenCalled()}},w={play:async({canvasElement:t})=>{const e=i(t);await a.click(e.getByRole("button",{name:/show…/i})),await a.type(await e.findByPlaceholderText("Passphrase"),"hunter2{enter}"),await o(await e.findByRole("button",{name:/hide/i})).toBeVisible(),await o(e.getByText(/^uview1$/)).toBeVisible()}},y={beforeEach:()=>{n(f).mockRejectedValue(new Error("wrong passphrase"))},play:async({canvasElement:t})=>{const e=i(t);await a.click(e.getByRole("button",{name:/show…/i})),await a.type(await e.findByPlaceholderText("Passphrase"),"nope{enter}"),await o(await e.findByText(/doesn't match/i)).toBeVisible()}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:"{}",...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    wallet: {
      ...WALLET,
      selected: false,
      sync: undefined,
      unavailable: "wallet file could not be read"
    }
  }
}`,...m.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
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
}`,...d.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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
}`,...y.parameters?.docs?.source}}};const we=["Selected","Other","Unavailable","Rename","Rescan","UnlockViewingKey","WrongPassphrase"];export{l as Other,d as Rename,p as Rescan,c as Selected,m as Unavailable,w as UnlockViewingKey,y as WrongPassphrase,we as __namedExportsOrder,pe as default};
