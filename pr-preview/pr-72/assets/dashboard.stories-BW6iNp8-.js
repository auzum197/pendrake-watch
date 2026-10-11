import{r as o,j as e}from"./iframe-CQ14j71F.js";import{w as fe}from"./with-router-DIyrJM0p.js";import{t as ge}from"./fixtures-DQttaGX3.js";import{D as X,h as ee}from"./discreet-value-B7n1td5T.js";import{k as re,u as M,v as oe,d as ce,t as ye}from"./ipc-D91hTTIc.js";import{u as xe}from"./useNavigate-BGXAAgyg.js";import{S as te}from"./segmented-CnWrh3PG.js";import{D as be}from"./discreet-eye-BpzpbZvF.js";import{S as l}from"./skeleton-Bh-KTfZw.js";import{T as we}from"./tx-list-Bs3sWF1z.js";import{D as ve}from"./dither-area-DyynfAwN.js";import{F as Se}from"./fiat-consent-dialog-BATk0Z3Q.js";import{s as je}from"./use-wallet-data-C3Iy6ipE.js";import{l as Ne,m as Ee,n as ke,d as _e,o as De,i as ie,c as Te,e as Ce,s as Ue}from"./format-tHgiSO0x.js";import{a as Be}from"./motion-C2GgtDZe.js";import{I as le}from"./IconLoader2-DuXPf8JT.js";import{I as Re}from"./IconCircleCheckFilled-BUHiTgNU.js";import{I as He}from"./IconAlertTriangle-nm2ume4-.js";import"./preload-helper-PPVm8Dsz.js";import"./with-selector-q96RF6Ww.js";import"./index-qri4qiTQ.js";import"./index-CSkjZJv4.js";import"./IconEye-pJMgDVit.js";import"./createReactComponent-DfoL5IdI.js";import"./utils-DclmTqRz.js";import"./block-display-toggle-DCg1_XqD.js";import"./alert-dialog-B5JMa9YU.js";import"./button-BMcs1b0B.js";import"./index-iZDYuQOZ.js";import"./index-euHoao68.js";import"./index-N4sm20tf.js";import"./index-DWQqQYhj.js";import"./index-DuS2KT3e.js";import"./index-CNWdihGt.js";import"./addYears-Cm1OKrbP.js";const m={spot:null,history:[]};function Ae(t){const[s,a]=o.useState(m.spot),[n,d]=o.useState(m.history),[c,V]=o.useState(m.spot!==null);return o.useEffect(()=>{if(!t)return;let i=!0;async function y(){const[r,p]=await Promise.all([oe().catch(()=>null),M().catch(()=>[])]);i&&(r&&(m.spot=r,a(r)),p.length>0&&(m.history=p,d(p)),V(!0))}y();const O=re(r=>{!i||r.event!=="priceUpdate"||(m.spot=r.spot,a(r.spot))}),x=setInterval(()=>{M().then(r=>{i&&r.length>0&&(m.history=r,d(r))}).catch(()=>{})},6e4);return()=>{i=!1,clearInterval(x),O.then(r=>r()).catch(()=>{})}},[t]),{spot:s,history:n,loaded:c}}function de({wallet:t,balance:s,txs:a,sync:n,switching:d}){return d?e.jsx(Ie,{}):e.jsxs(e.Fragment,{children:[e.jsx(Oe,{wallet:t,balance:s,txs:a,sync:n}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Recent Activity"}),e.jsx(we,{txs:a,limit:5})]})]})}function Ie(){return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(l,{className:"h-4 w-28"}),e.jsx(l,{className:"h-7 w-24 rounded-full"})]}),e.jsx(l,{className:"mt-4 h-9 w-48"}),e.jsx(l,{className:"mt-6 h-48 w-full rounded-xl"})]}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx(l,{className:"h-5 w-36"}),e.jsx("div",{className:"mt-4 space-y-3",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(l,{className:"size-9 rounded-full"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx(l,{className:"h-3 w-32"}),e.jsx(l,{className:"h-3 w-20"})]}),e.jsx(l,{className:"h-3 w-16"})]},t))})]})]})}const Pe=[{value:"all",label:"All"},{value:"year",label:"1Y"},{value:"month",label:"1M"},{value:"week",label:"1W"},{value:"day",label:"1D"}],se={all:"all-time high",year:"1-year high",month:"1-month high",week:"1-week high",day:"1-day high"};function Ve({sync:t}){const s=ie(t),a=t?.state==="error",n=t?.state==="syncing"&&!s;if(!s&&!a&&!n)return null;const d=s?Re:a?He:le,c=s?"text-brand":a?"text-amber-400":"text-brand motion-safe:animate-spin";return e.jsxs("span",{className:"inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground",children:[e.jsx(d,{className:`size-3.5 shrink-0 ${c}`}),Ue(t)]})}let ae=!1;function Oe({wallet:t,balance:s,txs:a,sync:n}){const d=xe(),[c,V]=o.useState("all"),[i,y]=o.useState("zec"),[O,x]=o.useState(!1),[r,p]=o.useState(!1),q=r||!!t?.fiatEnabled,h=Ae(q),b=Ne(s),w=o.useMemo(()=>Ee(a,s),[a,s]),v=h.spot?.usdPerZec??null,Y=o.useMemo(()=>i==="usd"?ke(w,h.history,v,c,Date.now()):[],[i,w,h.history,v,c]),G=i==="usd"&&Y.length>=2,Z=G?"usd":"zec",ue=o.useMemo(()=>_e(w,c),[w,c]),L=G?Y:ue,f=L.length>=2,[K]=o.useState(()=>!ae&&Be());o.useEffect(()=>{f&&(ae=!0)},[f]);function pe(j){if(j==="usd"&&!q){x(!0);return}y(j)}async function he(){const j=await ce(!0);je(j),p(!0),y("usd")}const J=b!==null&&v!==null?Number(b)/1e8*v:null,S=De(L),Q=n?.state==="syncing"&&!ie(n);return e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-base font-medium text-muted-foreground",children:"Total Balance"}),e.jsx(be,{}),e.jsx(Ve,{sync:n})]}),Z==="usd"?e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[J===null?"…":e.jsx(X,{kind:"usd",children:Te(J)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"USD"})]}):e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[b===null?"…":e.jsx(X,{kind:"zec",children:Ce(b)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"ZEC"})]}),e.jsx("div",{className:"h-4",children:Z==="usd"&&h.spot&&e.jsx(Ze,{spot:h.spot})})]}),e.jsxs("div",{className:"flex shrink-0 flex-col items-end gap-3",children:[e.jsx("div",{className:"w-44",children:e.jsx(te,{tone:"neutral",value:i,onChange:pe,options:[{value:"zec",label:"ZEC"},{value:"usd",label:"USD"}]})}),e.jsx("button",{type:"button",onClick:()=>d({to:"/pools"}),className:"w-44 rounded-lg border border-border bg-muted/40 px-6 py-2.5 text-sm font-medium text-foreground transition-[background-color,border-color,transform] duration-150 ease-out hover:border-muted-foreground/40 hover:bg-muted active:scale-[0.98]",children:"Pools"})]})]}),e.jsx("hr",{className:"my-6 border-border"}),e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-0.5",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Balance over time"}),S&&e.jsxs("span",{className:"flex items-center gap-1.5 text-xs",children:[e.jsx("span",{className:S.atPeak&&!Q?"font-medium text-brand":"text-muted-foreground",children:S.atPeak?`At your ${se[c]}`:`${S.pct}% of ${se[c]}`}),Q&&e.jsx(le,{className:"size-3.5 text-muted-foreground motion-safe:animate-spin","aria-label":"Still calculating"})]})]}),e.jsx("div",{className:"w-[24rem] max-w-[60%]",children:e.jsx(te,{tone:"neutral",value:c,onChange:V,options:Pe})})]}),e.jsxs("div",{className:"mt-4 grid text-muted-foreground",children:[e.jsx("div",{className:"col-start-1 row-start-1",children:e.jsx("div",{"aria-hidden":f,style:{opacity:f?0:1},className:"flex aspect-900/240 items-center justify-center text-sm text-muted-foreground transition-opacity duration-360 ease-[cubic-bezier(0.23,1,0.32,1)]",children:"No confirmed activity yet"})}),f&&e.jsx("div",{className:`col-start-1 row-start-1 ${K?"balance-chart-enter":""}`,children:e.jsx(ve,{points:L,usd:Z==="usd",animate:K,className:"aspect-900/240 w-full"})})]}),e.jsx(Se,{open:O,onOpenChange:x,onAccept:he})]})}function Ze({spot:t}){const s=Date.now()-t.fetchedAt*1e3,a=Math.max(0,Math.round(s/6e4)),n=a<1?"updated just now":a<60?`updated ${a}m ago`:`updated ${Math.round(a/60)}h ago`;return e.jsx("span",{className:`text-xs ${t.stale?"text-amber-400":"text-muted-foreground"}`,children:n})}de.__docgenInfo={description:"",methods:[],displayName:"DashboardView",props:{wallet:{required:!0,tsType:{name:"union",raw:"WalletState | null",elements:[{name:"Wire.WalletState"},{name:"null"}]},description:""},balance:{required:!0,tsType:{name:"union",raw:"Balance | null",elements:[{name:"Wire.Balance"},{name:"null"}]},description:""},txs:{required:!0,tsType:{name:"Array",elements:[{name:"Wire.Tx"}],raw:"Tx[]"},description:""},sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"Wire.SyncStatus"},{name:"null"}]},description:""},switching:{required:!0,tsType:{name:"boolean"},description:""}}};const{expect:z,mocked:g,userEvent:F,waitFor:$,within:P}=__STORYBOOK_MODULE_TEST__,W={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},me=86400,u=Math.floor(Date.now()/1e3),ne={syncing:{state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},synced:{state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:u},unreachable:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"connection refused",unreachable:!0},wrongChain:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"anchor not found",wrongChain:!0},syncError:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"scan failed: bad block"}},Le={empty:{orchard:{confirmed:"0",total:"0"}},small:{orchard:{confirmed:"123450000",total:"123450000"}},large:{orchard:{confirmed:"12000000000",total:"12000000000"},sapling:{confirmed:"998184475",total:"998184475"}}};function Me(){const t=[];for(let s=0;s<40;s++){const a=s%3===2?"sent":"received",n=String(5e7+s*7919e3%8e8);t.push({txid:`${s.toString(16).padStart(4,"0")}b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6`,datetime:u-(s*9+1)*me,blockHeight:24e5-s*1e4,kind:a,valueZat:n,netZat:a==="sent"?`-${n}`:n,status:"confirmed",notes:[{pool:"orchard",direction:a,outputIndex:0,valueZat:n}]})}return[{txid:"ffffaabbccdd",datetime:u-600,kind:"received",valueZat:"5000000",netZat:"5000000",status:"pending",notes:[{pool:"orchard",direction:"received",outputIndex:0,valueZat:"5000000"}]},...t]}const We={none:[],few:ge,year:Me()};function ze(){const t=[];for(let s=400;s>=0;s--){const a=new Date((u-s*me)*1e3).toISOString().slice(0,10);t.push({date:a,usdPerZec:30+12*Math.sin(s/40)+s/50,confidence:s%50===0?"low":"high"})}return t}const Fe={fresh:{usdPerZec:41.37,fetchedAt:u-20,sources:["coingecko","kraken"]},stale:{usdPerZec:41.37,fetchedAt:u-3*3600,sources:["coingecko"],stale:!0}};function $e(t){o.useEffect(()=>(ee(t.discreet),()=>ee(!1)),[t.discreet]);const s=t.sync==="closed"?null:t.sync==="syncing"?{...ne.syncing,percent:t.syncPercent}:ne[t.sync];return e.jsx("div",{className:"flex flex-col gap-6",children:e.jsx(de,{wallet:{...W,fiatEnabled:t.fiatEnabled},balance:t.balance==="loading"?null:Le[t.balance],txs:We[t.history],sync:s,switching:t.switching})})}const Dt={title:"App/Home",component:$e,decorators:[fe],parameters:{layout:"padded"},beforeEach:({args:t})=>{g(re).mockResolvedValue(()=>{}),g(ye).mockResolvedValue(W),g(ce).mockResolvedValue({...W,fiatEnabled:!0}),g(oe).mockResolvedValue(t.price==="none"?null:Fe[t.price]),g(M).mockResolvedValue(t.price==="none"?[]:ze())},argTypes:{switching:{control:"boolean",description:"Another Wallet is being selected"},sync:{control:"select",options:["syncing","synced","unreachable","wrongChain","syncError","closed"]},syncPercent:{control:{type:"range",min:0,max:100,step:1},if:{arg:"sync",eq:"syncing"}},balance:{control:"select",options:["loading","empty","small","large"]},history:{control:"select",options:["none","few","year"]},fiatEnabled:{control:"boolean",description:"USD consent already given"},price:{control:"select",options:["none","fresh","stale"]},discreet:{control:"boolean"}},args:{switching:!1,sync:"synced",syncPercent:62,balance:"small",history:"few",fiatEnabled:!1,price:"none",discreet:!1}},N={},E={args:{sync:"syncing"}},k={args:{sync:"unreachable"}},_={args:{sync:"wrongChain"}},D={args:{sync:"syncError"}},T={args:{sync:"closed",balance:"loading",history:"none"}},C={args:{balance:"empty",history:"none"}},U={args:{switching:!0}},B={args:{balance:"large",history:"year"}},R={args:{discreet:!0}},H={args:{fiatEnabled:!0,price:"fresh",balance:"large",history:"year"},play:async({canvasElement:t})=>{const s=P(t);await F.click(s.getByRole("button",{name:"USD"})),await $(()=>z(s.getByText("updated just now")).toBeVisible())}},A={args:{fiatEnabled:!0,price:"stale",balance:"large",history:"year"},play:async({canvasElement:t})=>{const s=P(t);await F.click(s.getByRole("button",{name:"USD"})),await $(()=>z(s.getByText("updated 3h ago")).toBeVisible())}},I={args:{fiatEnabled:!1,price:"fresh",history:"year"},play:async({canvasElement:t})=>{const s=P(t);await F.click(s.getByRole("button",{name:"USD"})),await $(()=>z(P(document.body).getByText("Show balances in USD?")).toBeVisible())}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:"{}",...N.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}};U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  args: {
    switching: true
  }
}`,...U.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    balance: "large",
    history: "year"
  }
}`,...B.parameters?.docs?.source}}};R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
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
}`,...H.parameters?.docs?.source}}};A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
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
}`,...A.parameters?.docs?.source}}};I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
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
}`,...I.parameters?.docs?.source}}};const Tt=["Synced","Syncing","Unreachable","WrongChain","SyncError","Loading","Empty","Switching","LongHistory","Discreet","Usd","UsdStale","UsdConsent"];export{R as Discreet,C as Empty,T as Loading,B as LongHistory,U as Switching,D as SyncError,N as Synced,E as Syncing,k as Unreachable,H as Usd,I as UsdConsent,A as UsdStale,_ as WrongChain,Tt as __namedExportsOrder,Dt as default};
