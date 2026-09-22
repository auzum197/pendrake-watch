import{j as c}from"./iframe-_2ylhKB9.js";import{W as b}from"./wallet-card-Bpf3nJqJ.js";import{w as h}from"./with-router-DyKcgiOZ.js";import{h as B,j as E}from"./ipc-BdlnfMXN.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-CSaeGBJ5.js";import"./wallet-recency-DIIncMpp.js";import"./kbd-91jrR8-M.js";import"./use-wallet-data-B40OC8H5.js";import"./lifehash-bAbtiYOZ.js";import"./skeleton-Cn5QW5BP.js";import"./utils-DCADjnpI.js";import"./remove-dialog-D_kVq941.js";import"./alert-dialog-BbVpHRXl.js";import"./button-DnsIGRdu.js";import"./index-BrbaG4_l.js";import"./index-CPbyqx1t.js";import"./index-Dwon02-9.js";import"./index-RRvIHWKj.js";import"./index-28H-stTA.js";import"./index-w8hLHEa3.js";import"./index-B_MOOdge.js";import"./index-Dnf-N7NW.js";import"./IconEye-D8d2-GMs.js";import"./createReactComponent-BiUich46.js";import"./wallet-row-B9G_l8G_.js";import"./format-BSD6YbAO.js";import"./addYears-DH8pj9JL.js";import"./lifehash-avatar-2yCW-v0q.js";import"./discreet-value-F6q7Ec1r.js";import"./mirage-COiTxH0I.js";import"./IconAlertTriangle-DuCFw5vp.js";import"./inline-name-HSJ38TLo.js";import"./app-toast-BzLTaUEE.js";import"./index-BgYuLrsR.js";import"./switch-wallet-Do00Wnr6.js";import"./IconPencil-DiViFmAI.js";import"./index-2ChCwrJB.js";import"./index-C6wFlqla.js";import"./index-DuuBpEFp.js";import"./discreet-eye-CxxnnLqs.js";import"./IconChevronDown-BzabIoYx.js";import"./IconPlus-CwqDK314.js";import"./with-selector-CMGcPZg2.js";const{expect:n,mocked:f,screen:o,userEvent:t,waitFor:s,within:v}=__STORYBOOK_MODULE_TEST__,x={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},k=[{id:"w1",label:"Cold storage",fingerprint:"a1b2c3d4e5f6",network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655"},{id:"w2",label:"Spending",fingerprint:"0099aabbccdd",network:"mainnet",birthdayHeight:239e4,selected:!1,lastBalance:"89709165",sync:{state:"syncing",syncedHeight:21e5,chainTip:24e5,percent:12,phase:"scanning"}},{id:"w3",label:"e4608135",fingerprint:"e4608135aabb",network:"regtest",birthdayHeight:21e5,selected:!1,lastBalance:"12850000000"},{id:"w4",label:"Imported",fingerprint:"5c17fe902bd1",network:"regtest",birthdayHeight:0,selected:!1,lastBalance:"320400000",unavailable:"wallet file could not be read"}],ge={component:b,decorators:[h,a=>c.jsxs("div",{className:"flex h-[420px] w-64 flex-col bg-ink px-3 pt-4 text-white",children:[c.jsx(a,{}),c.jsxs("nav",{className:"mt-5 flex flex-col gap-1",children:[c.jsx("span",{className:"rounded-lg bg-brand px-3 py-2 text-sm font-bold text-ink",children:"Home"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Activity"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Notes"})]})]})],beforeEach:()=>{f(E).mockResolvedValue(k),f(B).mockResolvedValue(x)},argTypes:{wallet:{control:!1},switching:{control:"boolean"}},args:{wallet:x,switching:!1}},r={},l={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible())}},m={args:{switching:!0}};async function R(a){const e=v(a);return await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible()),e}const p={play:async({canvasElement:a})=>{const e=await R(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),await n(o.getByRole("menuitem",{name:"Use"})).toBeEnabled()}},d={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Cold storage actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),n(o.queryByRole("menuitem",{name:"Use"})).toBeNull()}},w={play:async({canvasElement:a})=>{const e=await R(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},u={play:async({canvasElement:a})=>{const e=await R(a);await t.pointer({keys:"[MouseRight]",target:e.getByText("Spending")}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},y={play:async({canvasElement:a})=>{const e=v(a);await t.pointer({keys:"[MouseRight]",target:e.getByRole("button",{name:"Switch wallet"})}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Cold storage"),await s(()=>n(i).toHaveFocus())}},g={play:async({canvasElement:a})=>{const e=await R(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await t.clear(i),await t.type(i,"Everyday{Enter}"),await s(()=>n(f(B)).toHaveBeenCalledWith("w2","Everyday"))}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:"{}",...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
