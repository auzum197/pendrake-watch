import{r as o,j as e}from"./iframe-BeH4qff3.js";import{w as pe}from"./with-router-C8Y0O3UK.js";import{t as he}from"./fixtures-DQttaGX3.js";import{D as J,h as Q}from"./discreet-value-64jyB5wp.js";import{k as ae,u as Z,v as ne,d as re,t as fe}from"./ipc-D91hTTIc.js";import{u as ge}from"./useNavigate-4sX3UacZ.js";import{S as X}from"./segmented-DgMXv5LQ.js";import{D as ye}from"./discreet-eye-zxLCLg4y.js";import{S as l}from"./skeleton-Chkn4poe.js";import{T as xe}from"./tx-list-C9lfsGL4.js";import{D as be}from"./dither-area-BkY8FRxK.js";import{F as we}from"./fiat-consent-dialog-CXLdT9SI.js";import{s as ve}from"./use-wallet-data-DBQx8mJM.js";import{l as Se,m as je,n as Ne,c as Ee,o as ke,i as oe,d as _e,e as De,s as Te}from"./format-D7WNpwjP.js";import{a as Ce}from"./motion-C2GgtDZe.js";import{I as ce}from"./IconLoader2-0N47Nq8O.js";import{I as Ue}from"./IconCircleCheckFilled-Cw5FgCng.js";import{I as Be}from"./IconAlertTriangle-4Q5Riik1.js";import"./preload-helper-PPVm8Dsz.js";import"./index-GRUXWKsM.js";import"./index-CGcD_WS9.js";import"./IconEye-BY8SQSbQ.js";import"./createReactComponent-dT2RDldy.js";import"./utils-DCADjnpI.js";import"./block-display-toggle-C45Gdh2j.js";import"./alert-dialog-D5SbmdgC.js";import"./button-DFuur8Gm.js";import"./index-DEGslSdo.js";import"./index-B5porSP6.js";import"./index-Sx6EDAlf.js";import"./index-CuBMNswK.js";import"./index-CfxU7Qmz.js";import"./index-CclXp1yU.js";import"./addYears-Cm1OKrbP.js";const m={spot:null,history:[]};function Re(t){const[s,a]=o.useState(m.spot),[n,d]=o.useState(m.history),[c,P]=o.useState(m.spot!==null);return o.useEffect(()=>{if(!t)return;let i=!0;async function g(){const[r,p]=await Promise.all([ne().catch(()=>null),Z().catch(()=>[])]);i&&(r&&(m.spot=r,a(r)),p.length>0&&(m.history=p,d(p)),P(!0))}g();const V=ae(r=>{!i||r.event!=="priceUpdate"||(m.spot=r.spot,a(r.spot))}),y=setInterval(()=>{Z().then(r=>{i&&r.length>0&&(m.history=r,d(r))}).catch(()=>{})},6e4);return()=>{i=!1,clearInterval(y),V.then(r=>r()).catch(()=>{})}},[t]),{spot:s,history:n,loaded:c}}function ie({wallet:t,balance:s,txs:a,sync:n,switching:d}){return d?e.jsx(He,{}):e.jsxs(e.Fragment,{children:[e.jsx(Oe,{wallet:t,balance:s,txs:a,sync:n}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Recent Activity"}),e.jsx(xe,{txs:a,limit:5})]})]})}function He(){return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(l,{className:"h-4 w-28"}),e.jsx(l,{className:"h-7 w-24 rounded-full"})]}),e.jsx(l,{className:"mt-4 h-9 w-48"}),e.jsx(l,{className:"mt-6 h-48 w-full rounded-xl"})]}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx(l,{className:"h-5 w-36"}),e.jsx("div",{className:"mt-4 space-y-3",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(l,{className:"size-9 rounded-full"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx(l,{className:"h-3 w-32"}),e.jsx(l,{className:"h-3 w-20"})]}),e.jsx(l,{className:"h-3 w-16"})]},t))})]})]})}const Ae=[{value:"all",label:"All"},{value:"year",label:"1Y"},{value:"month",label:"1M"},{value:"week",label:"1W"},{value:"day",label:"1D"}],ee={all:"all-time high",year:"1-year high",month:"1-month high",week:"1-week high",day:"1-day high"};function Ie({sync:t}){const s=oe(t),a=t?.state==="error",n=t?.state==="syncing"&&!s;if(!s&&!a&&!n)return null;const d=s?Ue:a?Be:ce,c=s?"text-brand":a?"text-amber-400":"text-brand motion-safe:animate-spin";return e.jsxs("span",{className:"inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground",children:[e.jsx(d,{className:`size-3.5 shrink-0 ${c}`}),Te(t)]})}let te=!1;function Pe(t){const[s]=o.useState(()=>!te&&Ce());return o.useEffect(()=>{t&&(te=!0)},[t]),s}function Ve({series:t,usd:s}){const a=t.length>=2,n=Pe(a);return e.jsxs("div",{className:"mt-4 grid text-muted-foreground",children:[e.jsx("div",{className:"col-start-1 row-start-1",children:e.jsx("div",{"aria-hidden":a,style:{opacity:a?0:1},className:"flex aspect-900/240 items-center justify-center text-sm text-muted-foreground transition-opacity duration-360 ease-[cubic-bezier(0.23,1,0.32,1)]",children:"No confirmed activity yet"})}),a&&e.jsx("div",{className:`col-start-1 row-start-1 ${n?"balance-chart-enter":""}`,children:e.jsx(be,{points:t,usd:s,animate:n,className:"aspect-900/240 w-full"})})]})}function Oe({wallet:t,balance:s,txs:a,sync:n}){const d=ge(),[c,P]=o.useState("all"),[i,g]=o.useState("zec"),[V,y]=o.useState(!1),[r,p]=o.useState(!1),F=r||!!t?.fiatEnabled,h=Re(F),x=Se(s),b=o.useMemo(()=>je(a,s),[a,s]),w=h.spot?.usdPerZec??null,$=o.useMemo(()=>i==="usd"?Ne(b,h.history,w,c,Date.now()):[],[i,b,h.history,w,c]),q=i==="usd"&&$.length>=2,O=q?"usd":"zec",de=o.useMemo(()=>Ee(b,c),[b,c]),Y=q?$:de;function me(S){if(S==="usd"&&!F){y(!0);return}g(S)}async function ue(){const S=await re(!0);ve(S),p(!0),g("usd")}const G=x!==null&&w!==null?Number(x)/1e8*w:null,v=ke(Y),K=n?.state==="syncing"&&!oe(n);return e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-base font-medium text-muted-foreground",children:"Total Balance"}),e.jsx(ye,{}),e.jsx(Ie,{sync:n})]}),O==="usd"?e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[G===null?"…":e.jsx(J,{kind:"usd",children:_e(G)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"USD"})]}):e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[x===null?"…":e.jsx(J,{kind:"zec",children:De(x)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"ZEC"})]}),e.jsx("div",{className:"h-4",children:O==="usd"&&h.spot&&e.jsx(Ze,{spot:h.spot})})]}),e.jsxs("div",{className:"flex shrink-0 flex-col items-end gap-3",children:[e.jsx("div",{className:"w-44",children:e.jsx(X,{tone:"neutral",value:i,onChange:me,options:[{value:"zec",label:"ZEC"},{value:"usd",label:"USD"}]})}),e.jsx("button",{type:"button",onClick:()=>d({to:"/pools"}),className:"w-44 rounded-lg border border-border bg-muted/40 px-6 py-2.5 text-sm font-medium text-foreground transition-[background-color,border-color,transform] duration-150 ease-out hover:border-muted-foreground/40 hover:bg-muted active:scale-[0.98]",children:"Pools"})]})]}),e.jsx("hr",{className:"my-6 border-border"}),e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-0.5",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Balance over time"}),v&&e.jsxs("span",{className:"flex items-center gap-1.5 text-xs",children:[e.jsx("span",{className:v.atPeak&&!K?"font-medium text-brand":"text-muted-foreground",children:v.atPeak?`At your ${ee[c]}`:`${v.pct}% of ${ee[c]}`}),K&&e.jsx(ce,{className:"size-3.5 text-muted-foreground motion-safe:animate-spin","aria-label":"Still calculating"})]})]}),e.jsx("div",{className:"w-[24rem] max-w-[60%]",children:e.jsx(X,{tone:"neutral",value:c,onChange:P,options:Ae})})]}),e.jsx(Ve,{series:Y,usd:O==="usd"}),e.jsx(we,{open:V,onOpenChange:y,onAccept:ue})]})}function Ze({spot:t}){const s=Date.now()-t.fetchedAt*1e3,a=Math.max(0,Math.round(s/6e4)),n=a<1?"updated just now":a<60?`updated ${a}m ago`:`updated ${Math.round(a/60)}h ago`;return e.jsx("span",{className:`text-xs ${t.stale?"text-amber-400":"text-muted-foreground"}`,children:n})}ie.__docgenInfo={description:"",methods:[],displayName:"DashboardView",props:{wallet:{required:!0,tsType:{name:"union",raw:"WalletState | null",elements:[{name:"Wire.WalletState"},{name:"null"}]},description:""},balance:{required:!0,tsType:{name:"union",raw:"Balance | null",elements:[{name:"Wire.Balance"},{name:"null"}]},description:""},txs:{required:!0,tsType:{name:"Array",elements:[{name:"Wire.Tx"}],raw:"Tx[]"},description:""},sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"Wire.SyncStatus"},{name:"null"}]},description:""},switching:{required:!0,tsType:{name:"boolean"},description:""}}};const{expect:M,mocked:f,userEvent:W,waitFor:z,within:I}=__STORYBOOK_MODULE_TEST__,L={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},le=86400,u=Math.floor(Date.now()/1e3),se={syncing:{state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},synced:{state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:u},unreachable:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"connection refused",unreachable:!0},wrongChain:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"anchor not found",wrongChain:!0},syncError:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"scan failed: bad block"}},Le={empty:{orchard:{confirmed:"0",total:"0"}},small:{orchard:{confirmed:"123450000",total:"123450000"}},large:{orchard:{confirmed:"12000000000",total:"12000000000"},sapling:{confirmed:"998184475",total:"998184475"}}};function Me(){const t=[];for(let s=0;s<40;s++){const a=s%3===2?"sent":"received",n=String(5e7+s*7919e3%8e8);t.push({txid:`${s.toString(16).padStart(4,"0")}b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6`,datetime:u-(s*9+1)*le,blockHeight:24e5-s*1e4,kind:a,valueZat:n,netZat:a==="sent"?`-${n}`:n,status:"confirmed",notes:[{pool:"orchard",direction:a,outputIndex:0,valueZat:n}]})}return[{txid:"ffffaabbccdd",datetime:u-600,kind:"received",valueZat:"5000000",netZat:"5000000",status:"pending",notes:[{pool:"orchard",direction:"received",outputIndex:0,valueZat:"5000000"}]},...t]}const We={none:[],few:he,year:Me()};function ze(){const t=[];for(let s=400;s>=0;s--){const a=new Date((u-s*le)*1e3).toISOString().slice(0,10);t.push({date:a,usdPerZec:30+12*Math.sin(s/40)+s/50,confidence:s%50===0?"low":"high"})}return t}const Fe={fresh:{usdPerZec:41.37,fetchedAt:u-20,sources:["coingecko","kraken"]},stale:{usdPerZec:41.37,fetchedAt:u-3*3600,sources:["coingecko"],stale:!0}};function $e(t){o.useEffect(()=>(Q(t.discreet),()=>Q(!1)),[t.discreet]);const s=t.sync==="closed"?null:t.sync==="syncing"?{...se.syncing,percent:t.syncPercent}:se[t.sync];return e.jsx("div",{className:"flex flex-col gap-6",children:e.jsx(ie,{wallet:{...L,fiatEnabled:t.fiatEnabled},balance:t.balance==="loading"?null:Le[t.balance],txs:We[t.history],sync:s,switching:t.switching})})}const _t={title:"App/Home",component:$e,decorators:[pe],parameters:{layout:"padded"},beforeEach:({args:t})=>{f(ae).mockResolvedValue(()=>{}),f(fe).mockResolvedValue(L),f(re).mockResolvedValue({...L,fiatEnabled:!0}),f(ne).mockResolvedValue(t.price==="none"?null:Fe[t.price]),f(Z).mockResolvedValue(t.price==="none"?[]:ze())},argTypes:{switching:{control:"boolean",description:"Another Wallet is being selected"},sync:{control:"select",options:["syncing","synced","unreachable","wrongChain","syncError","closed"]},syncPercent:{control:{type:"range",min:0,max:100,step:1},if:{arg:"sync",eq:"syncing"}},balance:{control:"select",options:["loading","empty","small","large"]},history:{control:"select",options:["none","few","year"]},fiatEnabled:{control:"boolean",description:"USD consent already given"},price:{control:"select",options:["none","fresh","stale"]},discreet:{control:"boolean"}},args:{switching:!1,sync:"synced",syncPercent:62,balance:"small",history:"few",fiatEnabled:!1,price:"none",discreet:!1}},j={},N={args:{sync:"syncing"}},E={args:{sync:"unreachable"}},k={args:{sync:"wrongChain"}},_={args:{sync:"syncError"}},D={args:{sync:"closed",balance:"loading",history:"none"}},T={args:{balance:"empty",history:"none"}},C={args:{switching:!0}},U={args:{balance:"large",history:"year"}},B={args:{discreet:!0}},R={args:{fiatEnabled:!0,price:"fresh",balance:"large",history:"year"},play:async({canvasElement:t})=>{const s=I(t);await W.click(s.getByRole("button",{name:"USD"})),await z(()=>M(s.getByText("updated just now")).toBeVisible())}},H={args:{fiatEnabled:!0,price:"stale",balance:"large",history:"year"},play:async({canvasElement:t})=>{const s=I(t);await W.click(s.getByRole("button",{name:"USD"})),await z(()=>M(s.getByText("updated 3h ago")).toBeVisible())}},A={args:{fiatEnabled:!1,price:"fresh",history:"year"},play:async({canvasElement:t})=>{const s=I(t);await W.click(s.getByRole("button",{name:"USD"})),await z(()=>M(I(document.body).getByText("Show balances in USD?")).toBeVisible())}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:"{}",...j.parameters?.docs?.source}}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "syncing"
  }
}`,...N.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "unreachable"
  }
}`,...E.parameters?.docs?.source}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "wrongChain"
  }
}`,...k.parameters?.docs?.source}}};_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "syncError"
  }
}`,..._.parameters?.docs?.source}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "closed",
    balance: "loading",
    history: "none"
  }
}`,...D.parameters?.docs?.source}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    balance: "empty",
    history: "none"
  }
}`,...T.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    switching: true
  }
}`,...C.parameters?.docs?.source}}};U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  args: {
    balance: "large",
    history: "year"
  }
}`,...U.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    discreet: true
  }
}`,...B.parameters?.docs?.source}}};R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
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
}`,...R.parameters?.docs?.source}}};H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
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
}`,...H.parameters?.docs?.source}}};A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
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
}`,...A.parameters?.docs?.source}}};const Dt=["Synced","Syncing","Unreachable","WrongChain","SyncError","Loading","Empty","Switching","LongHistory","Discreet","Usd","UsdStale","UsdConsent"];export{B as Discreet,T as Empty,D as Loading,U as LongHistory,C as Switching,_ as SyncError,j as Synced,N as Syncing,E as Unreachable,R as Usd,A as UsdConsent,H as UsdStale,k as WrongChain,Dt as __namedExportsOrder,_t as default};
