import{j as c}from"./iframe-CQ14j71F.js";import{W as B}from"./wallet-card-B7VkwYf8.js";import{w as h}from"./with-router-DIyrJM0p.js";import{h as b,j as E}from"./ipc-D91hTTIc.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-BGXAAgyg.js";import"./wallet-recency-DIIncMpp.js";import"./wallet-palette-CXYHpKna.js";import"./use-wallet-data-C3Iy6ipE.js";import"./remove-dialog-DQxMWIrq.js";import"./alert-dialog-B5JMa9YU.js";import"./utils-DclmTqRz.js";import"./button-BMcs1b0B.js";import"./index-iZDYuQOZ.js";import"./index-euHoao68.js";import"./index-N4sm20tf.js";import"./index-DWQqQYhj.js";import"./index-qri4qiTQ.js";import"./index-CSkjZJv4.js";import"./index-DuS2KT3e.js";import"./index-CNWdihGt.js";import"./lifehash-DYIr7XIW.js";import"./IconEye-pJMgDVit.js";import"./createReactComponent-DfoL5IdI.js";import"./app-toast-B1RtkwHS.js";import"./index-DppwBAix.js";import"./switch-wallet-k4ExNTw1.js";import"./motion-C2GgtDZe.js";import"./skeleton-Bh-KTfZw.js";import"./inline-name-CRBXtBvU.js";import"./wallet-menu-mHh4gzIA.js";import"./wallet-row-DEoWJHy9.js";import"./format-tHgiSO0x.js";import"./addYears-Cm1OKrbP.js";import"./lifehash-avatar-BoNFR9jw.js";import"./discreet-value-B7n1td5T.js";import"./mirage-EueoBQ7C.js";import"./IconAlertTriangle-nm2ume4-.js";import"./IconPencil-CtYXe5Fn.js";import"./IconSettings-B_eGYIQp.js";import"./index-RF60AFAm.js";import"./index-DQ7R3HGy.js";import"./index-lOJIfiJU.js";import"./discreet-eye-BpzpbZvF.js";import"./IconChevronDown-CCP3lNbL.js";import"./IconWallet-aGLge-Zd.js";import"./IconPlus-dbtmMmVY.js";import"./with-selector-q96RF6Ww.js";const{expect:n,mocked:R,screen:o,userEvent:t,waitFor:s,within:v}=__STORYBOOK_MODULE_TEST__,x={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},k=[{id:"w1",label:"Cold storage",fingerprint:"a1b2c3d4e5f6",network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},{id:"w2",label:"Spending",fingerprint:"0099aabbccdd",network:"mainnet",birthdayHeight:239e4,selected:!1,lastBalance:"89709165",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443",sync:{state:"syncing",syncedHeight:21e5,chainTip:24e5,percent:12,phase:"scanning"}},{id:"w3",label:"e4608135",fingerprint:"e4608135aabb",network:"regtest",birthdayHeight:21e5,selected:!1,lastBalance:"12850000000",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},{id:"w4",label:"Imported",fingerprint:"5c17fe902bd1",network:"regtest",birthdayHeight:0,selected:!1,lastBalance:"320400000",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443",unavailable:"wallet file could not be read"}],xe={component:B,decorators:[h,a=>c.jsxs("div",{className:"flex h-[420px] w-64 flex-col bg-ink px-3 pt-4 text-white",children:[c.jsx(a,{}),c.jsxs("nav",{className:"mt-5 flex flex-col gap-1",children:[c.jsx("span",{className:"rounded-lg bg-brand px-3 py-2 text-sm font-bold text-ink",children:"Home"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Activity"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Notes"})]})]})],beforeEach:()=>{R(E).mockResolvedValue(k),R(b).mockResolvedValue(x)},argTypes:{wallet:{control:!1},switching:{control:"boolean"}},args:{wallet:x,switching:!1}},r={},l={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible())}},m={args:{switching:!0}};async function f(a){const e=v(a);return await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible()),e}const p={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),await n(o.getByRole("menuitem",{name:"Use"})).toBeEnabled()}},d={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Cold storage actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),n(o.queryByRole("menuitem",{name:"Use"})).toBeNull()}},w={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},u={play:async({canvasElement:a})=>{const e=await f(a);await t.pointer({keys:"[MouseRight]",target:e.getByText("Spending")}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},y={play:async({canvasElement:a})=>{const e=v(a);await t.pointer({keys:"[MouseRight]",target:e.getByRole("button",{name:"Switch wallet"})}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Cold storage"),await s(()=>n(i).toHaveFocus())}},g={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await t.clear(i),await t.type(i,"Everyday{Enter}"),await s(()=>n(R(b)).toHaveBeenCalledWith("w2","Everyday"))}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:"{}",...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Switch wallet"
    }));
    await waitFor(() => expect(canvas.getByText("Spending")).toBeVisible());
  }
}`,...l.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    switching: true
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Spending actions"
    }));
    await waitFor(() => expect(screen.getByRole("menuitem", {
      name: "Rename…"
    })).toBeVisible());
    await expect(screen.getByRole("menuitem", {
      name: "Use"
    })).toBeEnabled();
  }
}`,...p.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Cold storage actions"
    }));
    await waitFor(() => expect(screen.getByRole("menuitem", {
      name: "Rename…"
    })).toBeVisible());
    expect(screen.queryByRole("menuitem", {
      name: "Use"
    })).toBeNull();
  }
}`,...d.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Spending actions"
    }));
    await userEvent.click(await screen.findByRole("menuitem", {
      name: "Rename…"
    }));
    const field = await canvas.findByRole("textbox", {
      name: "Wallet name"
    });
    await expect(field).toHaveValue("Spending");
    await waitFor(() => expect(field).toHaveFocus());
  }
}`,...w.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByText("Spending")
    });
    await userEvent.click(await screen.findByRole("menuitem", {
      name: "Rename…"
    }));
    const field = await canvas.findByRole("textbox", {
      name: "Wallet name"
    });
    await expect(field).toHaveValue("Spending");
    await waitFor(() => expect(field).toHaveFocus());
  }
}`,...u.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByRole("button", {
        name: "Switch wallet"
      })
    });
    await userEvent.click(await screen.findByRole("menuitem", {
      name: "Rename…"
    }));
    const field = await canvas.findByRole("textbox", {
      name: "Wallet name"
    });
    await expect(field).toHaveValue("Cold storage");
    await waitFor(() => expect(field).toHaveFocus());
  }
}`,...y.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Spending actions"
    }));
    await userEvent.click(await screen.findByRole("menuitem", {
      name: "Rename…"
    }));
    const field = await canvas.findByRole("textbox", {
      name: "Wallet name"
    });
    await userEvent.clear(field);
    await userEvent.type(field, "Everyday{Enter}");
    await waitFor(() => expect(mocked(setWalletLabel)).toHaveBeenCalledWith("w2", "Everyday"));
  }
}`,...g.parameters?.docs?.source}}};const be=["Collapsed","Unfolded","Switching","RowMenu","HeadMenu","RenamingRow","RenamingRowFromContextMenu","RenamingHeadFromContextMenu","RenameCommits"];export{r as Collapsed,d as HeadMenu,g as RenameCommits,y as RenamingHeadFromContextMenu,w as RenamingRow,u as RenamingRowFromContextMenu,p as RowMenu,m as Switching,l as Unfolded,be as __namedExportsOrder,xe as default};
