import{j as c}from"./iframe-WvSYpc3X.js";import{W as B}from"./wallet-card-B0W1dMYn.js";import{w as h}from"./with-router-6l-qbviS.js";import{h as b,j as E}from"./ipc-g7VmqW7I.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-DwxEUD9G.js";import"./wallet-recency-DIIncMpp.js";import"./kbd-DilgjiVf.js";import"./use-wallet-data-BcdzC9W_.js";import"./lifehash-9ovGMtFc.js";import"./skeleton-BUJDMmxq.js";import"./utils-DCADjnpI.js";import"./remove-dialog-E8Z1M_Zu.js";import"./alert-dialog-DkApUBHz.js";import"./button-jPYm70f_.js";import"./index-Dvn7gCtL.js";import"./index-Q8P8ziXW.js";import"./index-DeT-gJGy.js";import"./index-Ch9S4h05.js";import"./index-D3nEufUq.js";import"./index-viyhfdCR.js";import"./index-C-I8FC1h.js";import"./index-OPCCL5KB.js";import"./IconEye-CGkLkL-U.js";import"./createReactComponent-BUOeJnn6.js";import"./wallet-row-CHfl9wQV.js";import"./format-BSD6YbAO.js";import"./addYears-DH8pj9JL.js";import"./lifehash-avatar-Gfb4bdk_.js";import"./discreet-value-D2IB8CYq.js";import"./mirage-BbPm28Q7.js";import"./IconAlertTriangle-gUzLjows.js";import"./inline-name-D3haWZJI.js";import"./app-toast-B-NpvEpn.js";import"./index-BrSti5jc.js";import"./switch-wallet-B655xa9q.js";import"./IconPencil-DdXSnN8u.js";import"./index-jhXtxEBj.js";import"./index-C8T5C1wT.js";import"./index-Dal0UDBT.js";import"./discreet-eye-BhDZbje7.js";import"./IconChevronDown-DIe4CN1g.js";import"./IconPlus-C7D04DIo.js";import"./with-selector-DfOzPSTF.js";const{expect:n,mocked:R,screen:o,userEvent:t,waitFor:s,within:v}=__STORYBOOK_MODULE_TEST__,x={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},k=[{id:"w1",label:"Cold storage",fingerprint:"a1b2c3d4e5f6",network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},{id:"w2",label:"Spending",fingerprint:"0099aabbccdd",network:"mainnet",birthdayHeight:239e4,selected:!1,lastBalance:"89709165",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443",sync:{state:"syncing",syncedHeight:21e5,chainTip:24e5,percent:12,phase:"scanning"}},{id:"w3",label:"e4608135",fingerprint:"e4608135aabb",network:"regtest",birthdayHeight:21e5,selected:!1,lastBalance:"12850000000",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},{id:"w4",label:"Imported",fingerprint:"5c17fe902bd1",network:"regtest",birthdayHeight:0,selected:!1,lastBalance:"320400000",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443",unavailable:"wallet file could not be read"}],ge={component:B,decorators:[h,a=>c.jsxs("div",{className:"flex h-[420px] w-64 flex-col bg-ink px-3 pt-4 text-white",children:[c.jsx(a,{}),c.jsxs("nav",{className:"mt-5 flex flex-col gap-1",children:[c.jsx("span",{className:"rounded-lg bg-brand px-3 py-2 text-sm font-bold text-ink",children:"Home"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Activity"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Notes"})]})]})],beforeEach:()=>{R(E).mockResolvedValue(k),R(b).mockResolvedValue(x)},argTypes:{wallet:{control:!1},switching:{control:"boolean"}},args:{wallet:x,switching:!1}},r={},l={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible())}},m={args:{switching:!0}};async function f(a){const e=v(a);return await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible()),e}const p={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),await n(o.getByRole("menuitem",{name:"Use"})).toBeEnabled()}},d={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Cold storage actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),n(o.queryByRole("menuitem",{name:"Use"})).toBeNull()}},w={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},u={play:async({canvasElement:a})=>{const e=await f(a);await t.pointer({keys:"[MouseRight]",target:e.getByText("Spending")}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},y={play:async({canvasElement:a})=>{const e=v(a);await t.pointer({keys:"[MouseRight]",target:e.getByRole("button",{name:"Switch wallet"})}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Cold storage"),await s(()=>n(i).toHaveFocus())}},g={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await t.clear(i),await t.type(i,"Everyday{Enter}"),await s(()=>n(R(b)).toHaveBeenCalledWith("w2","Everyday"))}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:"{}",...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...g.parameters?.docs?.source}}};const ve=["Collapsed","Unfolded","Switching","RowMenu","HeadMenu","RenamingRow","RenamingRowFromContextMenu","RenamingHeadFromContextMenu","RenameCommits"];export{r as Collapsed,d as HeadMenu,g as RenameCommits,y as RenamingHeadFromContextMenu,w as RenamingRow,u as RenamingRowFromContextMenu,p as RowMenu,m as Switching,l as Unfolded,ve as __namedExportsOrder,ge as default};
