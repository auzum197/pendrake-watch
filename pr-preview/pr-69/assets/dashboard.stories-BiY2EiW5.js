import{r as c,j as e}from"./iframe-B0jUypf_.js";import{w as pe}from"./with-router-hEjpxXYM.js";import{t as he}from"./fixtures-DQttaGX3.js";import{D as Q,h as X}from"./discreet-value--jwS9twM.js";import{k as ae,u as M,v as ne,d as re,t as ge}from"./ipc-D91hTTIc.js";import{u as fe}from"./useNavigate-DkM0ju5y.js";import{S as ee}from"./segmented-YOnBqRq4.js";import{D as ye}from"./discreet-eye-CmbBT6xJ.js";import{S as l}from"./skeleton-CbQXrf7P.js";import{T as xe}from"./tx-list--0CmWshi.js";import{B as be}from"./BalanceChart-klGTNerU.js";import{F as we}from"./fiat-consent-dialog-f6iVsMcS.js";import{s as ve}from"./use-wallet-data-CDl-S6xi.js";import{k as Se,l as je,m as Ne,n as Ee,o as ke,i as oe,j as _e,c as De,s as Te}from"./format-D3wpGM-y.js";import{a as Ce}from"./motion-C2GgtDZe.js";import{I as ce}from"./IconLoader2-DkWW-2GX.js";import{I as Be}from"./IconCircleCheckFilled-B_uzpzB7.js";import{I as Ue}from"./IconAlertTriangle-DjYLDt5A.js";import"./preload-helper-PPVm8Dsz.js";import"./with-selector-CVqF2FYM.js";import"./index-DKpjmLqt.js";import"./index-CQdiPIc2.js";import"./IconEye-BapbLTdy.js";import"./createReactComponent-B8PfQ_MB.js";import"./utils-DCADjnpI.js";import"./block-display-toggle-rXR5Lgvn.js";import"./chart-DFwy-Bhs.js";import"./alert-dialog-C1RfXkqi.js";import"./button-DL-2Txz_.js";import"./index-BbN8JOql.js";import"./index-D9xkj0N6.js";import"./index-ClNJGhaM.js";import"./index-CuHFkm_y.js";import"./index-XqNXHo60.js";import"./index-CkeBFMR1.js";import"./addYears-Cm1OKrbP.js";const m={spot:null,history:[]};function Re(t){const[s,a]=c.useState(m.spot),[n,d]=c.useState(m.history),[o,V]=c.useState(m.spot!==null);return c.useEffect(()=>{if(!t)return;let i=!0;async function f(){const[r,p]=await Promise.all([ne().catch(()=>null),M().catch(()=>[])]);i&&(r&&(m.spot=r,a(r)),p.length>0&&(m.history=p,d(p)),V(!0))}f();const O=ae(r=>{!i||r.event!=="priceUpdate"||(m.spot=r.spot,a(r.spot))}),y=setInterval(()=>{M().then(r=>{i&&r.length>0&&(m.history=r,d(r))}).catch(()=>{})},6e4);return()=>{i=!1,clearInterval(y),O.then(r=>r()).catch(()=>{})}},[t]),{spot:s,history:n,loaded:o}}function ie({wallet:t,balance:s,txs:a,sync:n,switching:d}){return d?e.jsx(He,{}):e.jsxs(e.Fragment,{children:[e.jsx(Ae,{wallet:t,balance:s,txs:a,sync:n}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Recent Activity"}),e.jsx(xe,{txs:a,limit:5})]})]})}function He(){return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(l,{className:"h-4 w-28"}),e.jsx(l,{className:"h-7 w-24 rounded-full"})]}),e.jsx(l,{className:"mt-4 h-9 w-48"}),e.jsx(l,{className:"mt-6 h-48 w-full rounded-xl"})]}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx(l,{className:"h-5 w-36"}),e.jsx("div",{className:"mt-4 space-y-3",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(l,{className:"size-9 rounded-full"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx(l,{className:"h-3 w-32"}),e.jsx(l,{className:"h-3 w-20"})]}),e.jsx(l,{className:"h-3 w-16"})]},t))})]})]})}const Ie=[{value:"all",label:"All"},{value:"year",label:"1Y"},{value:"month",label:"1M"},{value:"week",label:"1W"},{value:"day",label:"1D"}],te={all:"all-time high",year:"1-year high",month:"1-month high",week:"1-week high",day:"1-day high"};function Pe({sync:t}){const s=oe(t),a=t?.state==="error",n=t?.state==="syncing"&&!s;if(!s&&!a&&!n)return null;const d=s?Be:a?Ue:ce,o=s?"text-brand":a?"text-amber-400":"text-brand motion-safe:animate-spin";return e.jsxs("span",{className:"inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground",children:[e.jsx(d,{className:`size-3.5 shrink-0 ${o}`}),Te(t)]})}function Ae({wallet:t,balance:s,txs:a,sync:n}){const d=fe(),[o,V]=c.useState("all"),[i,f]=c.useState("zec"),[O,y]=c.useState(!1),[r,p]=c.useState(!1),q=r||!!t?.fiatEnabled,h=Re(q),x=Se(s),b=c.useMemo(()=>je(a,s),[a,s]),w=h.spot?.usdPerZec??null,Y=c.useMemo(()=>i==="usd"?Ne(b,h.history,w,o,Date.now()):[],[i,b,h.history,w,o]),G=i==="usd"&&Y.length>=2,v=G?"usd":"zec",de=c.useMemo(()=>Ee(b,o),[b,o]),Z=G?Y:de,L=Z.length>=2;function me(j){if(j==="usd"&&!q){y(!0);return}f(j)}async function ue(){const j=await re(!0);ve(j),p(!0),f("usd")}const K=x!==null&&w!==null?Number(x)/1e8*w:null,S=ke(Z),J=n?.state==="syncing"&&!oe(n);return e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-base font-medium text-muted-foreground",children:"Total Balance"}),e.jsx(ye,{}),e.jsx(Pe,{sync:n})]}),v==="usd"?e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[K===null?"…":e.jsx(Q,{kind:"usd",children:_e(K)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"USD"})]}):e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[x===null?"…":e.jsx(Q,{kind:"zec",children:De(x)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"ZEC"})]}),e.jsx("div",{className:"h-4",children:v==="usd"&&h.spot&&e.jsx(Ve,{spot:h.spot})})]}),e.jsxs("div",{className:"flex shrink-0 flex-col items-end gap-3",children:[e.jsx("div",{className:"w-44",children:e.jsx(ee,{tone:"neutral",value:i,onChange:me,options:[{value:"zec",label:"ZEC"},{value:"usd",label:"USD"}]})}),e.jsx("button",{type:"button",onClick:()=>d({to:"/pools"}),className:"w-44 rounded-lg border border-border bg-muted/40 px-6 py-2.5 text-sm font-medium text-foreground transition-[background-color,border-color,transform] duration-150 ease-out hover:border-muted-foreground/40 hover:bg-muted active:scale-[0.98]",children:"Pools"})]})]}),e.jsx("hr",{className:"my-6 border-border"}),e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-0.5",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Balance over time"}),S&&e.jsxs("span",{className:"flex items-center gap-1.5 text-xs",children:[e.jsx("span",{className:S.atPeak&&!J?"font-medium text-brand":"text-muted-foreground",children:S.atPeak?`At your ${te[o]}`:`${S.pct}% of ${te[o]}`}),J&&e.jsx(ce,{className:"size-3.5 text-muted-foreground motion-safe:animate-spin","aria-label":"Still calculating"})]})]}),e.jsx("div",{className:"w-[24rem] max-w-[60%]",children:e.jsx(ee,{tone:"neutral",value:o,onChange:V,options:Ie})})]}),e.jsxs("div",{className:"mt-4 grid text-muted-foreground",children:[e.jsx("div",{"aria-hidden":L,style:{opacity:L?0:1},className:"col-start-1 row-start-1 flex aspect-900/240 items-center justify-center text-sm text-muted-foreground transition-opacity duration-360 ease-[cubic-bezier(0.23,1,0.32,1)]",children:"No confirmed activity yet"}),L&&e.jsx("div",{className:`col-start-1 row-start-1 ${Ce()?"balance-chart-enter":""}`,children:e.jsx(be,{points:Z,denom:v})},v==="usd"?`usd-${o}`:"zec")]}),e.jsx(we,{open:O,onOpenChange:y,onAccept:ue})]})}function Ve({spot:t}){const s=Date.now()-t.fetchedAt*1e3,a=Math.max(0,Math.round(s/6e4)),n=a<1?"updated just now":a<60?`updated ${a}m ago`:`updated ${Math.round(a/60)}h ago`;return e.jsx("span",{className:`text-xs ${t.stale?"text-amber-400":"text-muted-foreground"}`,children:n})}ie.__docgenInfo={description:"",methods:[],displayName:"DashboardView",props:{wallet:{required:!0,tsType:{name:"union",raw:"WalletState | null",elements:[{name:"Wire.WalletState"},{name:"null"}]},description:""},balance:{required:!0,tsType:{name:"union",raw:"Balance | null",elements:[{name:"Wire.Balance"},{name:"null"}]},description:""},txs:{required:!0,tsType:{name:"Array",elements:[{name:"Wire.Tx"}],raw:"Tx[]"},description:""},sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"Wire.SyncStatus"},{name:"null"}]},description:""},switching:{required:!0,tsType:{name:"boolean"},description:""}}};const{expect:W,mocked:g,userEvent:$,waitFor:F,within:A}=__STORYBOOK_MODULE_TEST__,z={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},le=86400,u=Math.floor(Date.now()/1e3),se={syncing:{state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},synced:{state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:u},unreachable:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"connection refused",unreachable:!0},wrongChain:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"anchor not found",wrongChain:!0},syncError:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"scan failed: bad block"}},Oe={empty:{orchard:{confirmed:"0",total:"0"}},small:{orchard:{confirmed:"123450000",total:"123450000"}},large:{orchard:{confirmed:"12000000000",total:"12000000000"},sapling:{confirmed:"998184475",total:"998184475"}}};function Ze(){const t=[];for(let s=0;s<40;s++){const a=s%3===2?"sent":"received",n=String(5e7+s*7919e3%8e8);t.push({txid:`${s.toString(16).padStart(4,"0")}b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6`,datetime:u-(s*9+1)*le,blockHeight:24e5-s*1e4,kind:a,valueZat:n,netZat:a==="sent"?`-${n}`:n,status:"confirmed",notes:[{pool:"orchard",direction:a,outputIndex:0,valueZat:n}]})}return[{txid:"ffffaabbccdd",datetime:u-600,kind:"received",valueZat:"5000000",netZat:"5000000",status:"pending",notes:[{pool:"orchard",direction:"received",outputIndex:0,valueZat:"5000000"}]},...t]}const Le={none:[],few:he,year:Ze()};function Me(){const t=[];for(let s=400;s>=0;s--){const a=new Date((u-s*le)*1e3).toISOString().slice(0,10);t.push({date:a,usdPerZec:30+12*Math.sin(s/40)+s/50,confidence:s%50===0?"low":"high"})}return t}const ze={fresh:{usdPerZec:41.37,fetchedAt:u-20,sources:["coingecko","kraken"]},stale:{usdPerZec:41.37,fetchedAt:u-3*3600,sources:["coingecko"],stale:!0}};function We(t){c.useEffect(()=>(X(t.discreet),()=>X(!1)),[t.discreet]);const s=t.sync==="closed"?null:t.sync==="syncing"?{...se.syncing,percent:t.syncPercent}:se[t.sync];return e.jsx("div",{className:"flex flex-col gap-6",children:e.jsx(ie,{wallet:{...z,fiatEnabled:t.fiatEnabled},balance:t.balance==="loading"?null:Oe[t.balance],txs:Le[t.history],sync:s,switching:t.switching})})}const _t={title:"App/Home",component:We,decorators:[pe],parameters:{layout:"padded"},beforeEach:({args:t})=>{g(ae).mockResolvedValue(()=>{}),g(ge).mockResolvedValue(z),g(re).mockResolvedValue({...z,fiatEnabled:!0}),g(ne).mockResolvedValue(t.price==="none"?null:ze[t.price]),g(M).mockResolvedValue(t.price==="none"?[]:Me())},argTypes:{switching:{control:"boolean",description:"Another Wallet is being selected"},sync:{control:"select",options:["syncing","synced","unreachable","wrongChain","syncError","closed"]},syncPercent:{control:{type:"range",min:0,max:100,step:1},if:{arg:"sync",eq:"syncing"}},balance:{control:"select",options:["loading","empty","small","large"]},history:{control:"select",options:["none","few","year"]},fiatEnabled:{control:"boolean",description:"USD consent already given"},price:{control:"select",options:["none","fresh","stale"]},discreet:{control:"boolean"}},args:{switching:!1,sync:"synced",syncPercent:62,balance:"small",history:"few",fiatEnabled:!1,price:"none",discreet:!1}},N={},E={args:{sync:"syncing"}},k={args:{sync:"unreachable"}},_={args:{sync:"wrongChain"}},D={args:{sync:"syncError"}},T={args:{sync:"closed",balance:"loading",history:"none"}},C={args:{balance:"empty",history:"none"}},B={args:{switching:!0}},U={args:{balance:"large",history:"year"}},R={args:{discreet:!0}},H={args:{fiatEnabled:!0,price:"fresh",balance:"large",history:"year"},play:async({canvasElement:t})=>{const s=A(t);await $.click(s.getByRole("button",{name:"USD"})),await F(()=>W(s.getByText("updated just now")).toBeVisible())}},I={args:{fiatEnabled:!0,price:"stale",balance:"large",history:"year"},play:async({canvasElement:t})=>{const s=A(t);await $.click(s.getByRole("button",{name:"USD"})),await F(()=>W(s.getByText("updated 3h ago")).toBeVisible())}},P={args:{fiatEnabled:!1,price:"fresh",history:"year"},play:async({canvasElement:t})=>{const s=A(t);await $.click(s.getByRole("button",{name:"USD"})),await F(()=>W(A(document.body).getByText("Show balances in USD?")).toBeVisible())}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:"{}",...N.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "syncing"
  }
}`,...E.parameters?.docs?.source}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "unreachable"
  }
}`,...k.parameters?.docs?.source}}};_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "wrongChain"
  }
}`,..._.parameters?.docs?.source}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "syncError"
  }
}`,...D.parameters?.docs?.source}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "closed",
    balance: "loading",
    history: "none"
  }
}`,...T.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    balance: "empty",
    history: "none"
  }
}`,...C.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    switching: true
  }
}`,...B.parameters?.docs?.source}}};U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  args: {
    balance: "large",
    history: "year"
  }
}`,...U.parameters?.docs?.source}}};R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  args: {
    discreet: true
  }
}`,...R.parameters?.docs?.source}}};H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  args: {
    fiatEnabled: true,
    price: "fresh",
    balance: "large",
    history: "year"
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "USD"
    }));
    await waitFor(() => expect(canvas.getByText("updated just now")).toBeVisible());
  }
}`,...H.parameters?.docs?.source}}};I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  args: {
    fiatEnabled: true,
    price: "stale",
    balance: "large",
    history: "year"
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "USD"
    }));
    await waitFor(() => expect(canvas.getByText("updated 3h ago")).toBeVisible());
  }
}`,...I.parameters?.docs?.source}}};P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    fiatEnabled: false,
    price: "fresh",
    history: "year"
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "USD"
    }));
    await waitFor(() => expect(within(document.body).getByText("Show balances in USD?")).toBeVisible());
  }
}`,...P.parameters?.docs?.source}}};const Dt=["Synced","Syncing","Unreachable","WrongChain","SyncError","Loading","Empty","Switching","LongHistory","Discreet","Usd","UsdStale","UsdConsent"];export{R as Discreet,C as Empty,T as Loading,U as LongHistory,B as Switching,D as SyncError,N as Synced,E as Syncing,k as Unreachable,H as Usd,P as UsdConsent,I as UsdStale,_ as WrongChain,Dt as __namedExportsOrder,_t as default};
