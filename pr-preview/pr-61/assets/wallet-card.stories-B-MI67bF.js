import{j as c}from"./iframe-BI4DPKI4.js";import{W as B}from"./wallet-card-a7vFWHZp.js";import{w as h}from"./with-router--7fKJLgO.js";import{h as b,j as E}from"./ipc-D91hTTIc.js";import"./preload-helper-PPVm8Dsz.js";import"./useNavigate-CeyFgR_f.js";import"./wallet-recency-DIIncMpp.js";import"./kbd-BDlgYGiN.js";import"./use-wallet-data-DpH6rIvg.js";import"./remove-dialog-DbaBk08o.js";import"./alert-dialog-BZq13sA-.js";import"./utils-DCADjnpI.js";import"./button-D3mpBaB4.js";import"./index-B9__DGRb.js";import"./index-Bdf2ZQKe.js";import"./index-igVRi2Pk.js";import"./index-BIMc03as.js";import"./index-CTyuaMHn.js";import"./index-DLNgd2Fq.js";import"./index-tCYHZ4Pr.js";import"./index-D7czeIrx.js";import"./lifehash-B7UkUJLU.js";import"./IconEye-DiFMKZLD.js";import"./createReactComponent-D6A4bnUY.js";import"./app-toast-RlGNHAxF.js";import"./index-Cnd9C_Nj.js";import"./switch-wallet-D07G7cm7.js";import"./discreet-value-BT_KIUzd.js";import"./skeleton-BindsJf4.js";import"./inline-name-DAsrGQZm.js";import"./wallet-menu-Cr9xjxUW.js";import"./wallet-row-54_3i8Ex.js";import"./format-DAOk0-W0.js";import"./addYears-Cm1OKrbP.js";import"./lifehash-avatar-CzH_7c6-.js";import"./mirage-D1XCdAvx.js";import"./IconAlertTriangle-D6mcQeo6.js";import"./IconPencil-BCNzdYPs.js";import"./index-BclQPrAX.js";import"./index-6ftqaioF.js";import"./index-BKPmDiM3.js";import"./discreet-eye-p0at-DO3.js";import"./IconChevronDown-B5bjUZEE.js";import"./IconPlus-DHN1Tbf3.js";import"./with-selector-BTA-tIEj.js";const{expect:n,mocked:R,screen:o,userEvent:t,waitFor:s,within:v}=__STORYBOOK_MODULE_TEST__,x={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},k=[{id:"w1",label:"Cold storage",fingerprint:"a1b2c3d4e5f6",network:"mainnet",birthdayHeight:419200,selected:!0,lastBalance:"897091655",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},{id:"w2",label:"Spending",fingerprint:"0099aabbccdd",network:"mainnet",birthdayHeight:239e4,selected:!1,lastBalance:"89709165",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443",sync:{state:"syncing",syncedHeight:21e5,chainTip:24e5,percent:12,phase:"scanning"}},{id:"w3",label:"e4608135",fingerprint:"e4608135aabb",network:"regtest",birthdayHeight:21e5,selected:!1,lastBalance:"12850000000",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443"},{id:"w4",label:"Imported",fingerprint:"5c17fe902bd1",network:"regtest",birthdayHeight:0,selected:!1,lastBalance:"320400000",notificationsEnabled:!0,indexerUri:"https://zec.rocks:443",unavailable:"wallet file could not be read"}],ve={component:B,decorators:[h,a=>c.jsxs("div",{className:"flex h-[420px] w-64 flex-col bg-ink px-3 pt-4 text-white",children:[c.jsx(a,{}),c.jsxs("nav",{className:"mt-5 flex flex-col gap-1",children:[c.jsx("span",{className:"rounded-lg bg-brand px-3 py-2 text-sm font-bold text-ink",children:"Home"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Activity"}),c.jsx("span",{className:"px-3 py-2 text-sm font-medium text-white/55",children:"Notes"})]})]})],beforeEach:()=>{R(E).mockResolvedValue(k),R(b).mockResolvedValue(x)},argTypes:{wallet:{control:!1},switching:{control:"boolean"}},args:{wallet:x,switching:!1}},r={},l={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible())}},m={args:{switching:!0}};async function f(a){const e=v(a);return await t.click(e.getByRole("button",{name:"Switch wallet"})),await s(()=>n(e.getByText("Spending")).toBeVisible()),e}const p={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),await n(o.getByRole("menuitem",{name:"Use"})).toBeEnabled()}},d={play:async({canvasElement:a})=>{const e=v(a);await t.click(e.getByRole("button",{name:"Cold storage actions"})),await s(()=>n(o.getByRole("menuitem",{name:"Rename…"})).toBeVisible()),n(o.queryByRole("menuitem",{name:"Use"})).toBeNull()}},w={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},u={play:async({canvasElement:a})=>{const e=await f(a);await t.pointer({keys:"[MouseRight]",target:e.getByText("Spending")}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Spending"),await s(()=>n(i).toHaveFocus())}},y={play:async({canvasElement:a})=>{const e=v(a);await t.pointer({keys:"[MouseRight]",target:e.getByRole("button",{name:"Switch wallet"})}),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await n(i).toHaveValue("Cold storage"),await s(()=>n(i).toHaveFocus())}},g={play:async({canvasElement:a})=>{const e=await f(a);await t.click(e.getByRole("button",{name:"Spending actions"})),await t.click(await o.findByRole("menuitem",{name:"Rename…"}));const i=await e.findByRole("textbox",{name:"Wallet name"});await t.clear(i),await t.type(i,"Everyday{Enter}"),await s(()=>n(R(b)).toHaveBeenCalledWith("w2","Everyday"))}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:"{}",...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...g.parameters?.docs?.source}}};const fe=["Collapsed","Unfolded","Switching","RowMenu","HeadMenu","RenamingRow","RenamingRowFromContextMenu","RenamingHeadFromContextMenu","RenameCommits"];export{r as Collapsed,d as HeadMenu,g as RenameCommits,y as RenamingHeadFromContextMenu,w as RenamingRow,u as RenamingRowFromContextMenu,p as RowMenu,m as Switching,l as Unfolded,fe as __namedExportsOrder,ve as default};
