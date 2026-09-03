import{r as i,j as e}from"./iframe-BqPm5GPo.js";import{w as pe}from"./with-router-BNlfu7Fo.js";import{t as ge}from"./fixtures-C6Be4G5r.js";import{D as Q,a as he,h as X}from"./discreet-value-EdLYmB_0.js";import{j as te,r as V,s as re,d as se,q as ye}from"./ipc-cooBBgp-.js";import{u as fe}from"./useNavigate-ZN3NAyZe.js";import{S as ee}from"./segmented-BULdspqp.js";import{D as be}from"./discreet-eye-B714TUPf.js";import{S as c}from"./skeleton-R9EBEREK.js";import{T as ve}from"./tx-list-i8xZOZqj.js";import{B as xe}from"./BalanceChart-D6E37UvD.js";import{F as we}from"./fiat-consent-dialog-DuOhCNdg.js";import{a as ke}from"./use-wallet-data-BhDCaPwA.js";import{h as Se,j as je,k as qe,l as Ne,m as Ee,i as oe,g as Te,c as _e,s as De}from"./format-d3jQKD7n.js";import{I as ie,a as Ce}from"./IconCircleCheckFilled-CQ8U7fnT.js";import{I as Ue}from"./IconAlertTriangle-ucYkuTJ1.js";import"./preload-helper-PPVm8Dsz.js";import"./with-selector-DDZl_lIQ.js";import"./index-B6ERYhEG.js";import"./index-Cvky-sGi.js";import"./IconEye-BQOcnq-E.js";import"./createReactComponent-BNaYxCWq.js";import"./utils-DCADjnpI.js";import"./index-C5RXO5dO.js";import"./chart-CcJyknVK.js";import"./alert-dialog-Bk89ILQ8.js";import"./button-3es8Fj9-.js";import"./index-Blmv-jCN.js";import"./index-C53dFOQZ.js";import"./index-BSxR_CfR.js";import"./index-B4VA8EEn.js";import"./index-C-pEON4W.js";import"./index-n-fLb4Y0.js";import"./addYears-Bhde3fRX.js";const d={spot:null,history:[]};function Be(n){const[a,t]=i.useState(d.spot),[r,u]=i.useState(d.history),[o,R]=i.useState(d.spot!==null);return i.useEffect(()=>{if(!n)return;let l=!0;async function y(){const[s,p]=await Promise.all([re().catch(()=>null),V().catch(()=>[])]);l&&(s&&(d.spot=s,t(s)),p.length>0&&(d.history=p,u(p)),R(!0))}y();const O=te(s=>{!l||s.event!=="priceUpdate"||(d.spot=s.spot,t(s.spot))}),f=setInterval(()=>{V().then(s=>{l&&s.length>0&&(d.history=s,u(s))}).catch(()=>{})},6e4);return()=>{l=!1,clearInterval(f),O.then(s=>s()).catch(()=>{})}},[n]),{spot:a,history:r,loaded:o}}function le({wallet:n,balance:a,txs:t,sync:r,switching:u}){return u?e.jsx(He,{}):e.jsxs(e.Fragment,{children:[e.jsx(Pe,{wallet:n,balance:a,txs:t,sync:r}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Recent Activity"}),e.jsx(ve,{txs:t,limit:5})]})]})}function He(){return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(c,{className:"h-4 w-28"}),e.jsx(c,{className:"h-7 w-24 rounded-full"})]}),e.jsx(c,{className:"mt-4 h-9 w-48"}),e.jsx(c,{className:"mt-6 h-48 w-full rounded-xl"})]}),e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsx(c,{className:"h-5 w-36"}),e.jsx("div",{className:"mt-4 space-y-3",children:[0,1,2,3,4].map(n=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(c,{className:"size-9 rounded-full"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx(c,{className:"h-3 w-32"}),e.jsx(c,{className:"h-3 w-20"})]}),e.jsx(c,{className:"h-3 w-16"})]},n))})]})]})}const Ie=[{value:"all",label:"All"},{value:"year",label:"1Y"},{value:"month",label:"1M"},{value:"week",label:"1W"},{value:"day",label:"1D"}],ne={all:"all-time high",year:"1-year high",month:"1-month high",week:"1-week high",day:"1-day high"};function Ae({sync:n}){const a=oe(n),t=n?.state==="error",r=n?.state==="syncing"&&!a;if(!a&&!t&&!r)return null;const u=a?Ce:t?Ue:ie,o=a?"text-brand":t?"text-amber-400":"text-brand motion-safe:animate-spin";return e.jsxs("span",{className:"inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground",children:[e.jsx(u,{className:`size-3.5 shrink-0 ${o}`}),De(n)]})}function Pe({wallet:n,balance:a,txs:t,sync:r}){const u=fe(),[o,R]=i.useState("all"),[l,y]=i.useState("zec"),[O,f]=i.useState(!1),[s,p]=i.useState(!1),F=s||!!n?.fiatEnabled,g=Be(F),b=Se(a),v=i.useMemo(()=>je(t,a),[t,a]),x=g.spot?.usdPerZec??null,Y=i.useMemo(()=>l==="usd"?qe(v,g.history,x,o,Date.now()):[],[l,v,g.history,x,o]),G=l==="usd"&&Y.length>=2,w=G?"usd":"zec",ue=i.useMemo(()=>Ne(v,o),[v,o]),Z=G?Y:ue,M=Z.length>=2;function de(S){if(S==="usd"&&!F){f(!0);return}y(S)}async function me(){const S=await se(!0);ke(S),p(!0),y("usd")}const K=b!==null&&x!==null?Number(b)/1e8*x:null,k=Ee(Z),J=r?.state==="syncing"&&!oe(r);return e.jsxs("section",{className:"rounded-2xl border border-border bg-card p-6",children:[e.jsxs("div",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-base font-medium text-muted-foreground",children:"Total Balance"}),e.jsx(be,{}),e.jsx(Ae,{sync:r})]}),w==="usd"?e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[K===null?"…":e.jsx(Q,{kind:"usd",children:Te(K)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"USD"})]}):e.jsxs("span",{className:"font-heading text-5xl font-bold leading-none tabular-nums",children:[b===null?"…":e.jsx(Q,{kind:"zec",children:_e(b)})," ",e.jsx("span",{className:"text-2xl font-normal text-muted-foreground",children:"ZEC"})]}),e.jsx("div",{className:"h-4",children:w==="usd"&&g.spot&&e.jsx(Re,{spot:g.spot})})]}),e.jsxs("div",{className:"flex shrink-0 flex-col items-end gap-3",children:[e.jsx("div",{className:"w-44",children:e.jsx(ee,{tone:"neutral",value:l,onChange:de,options:[{value:"zec",label:"ZEC"},{value:"usd",label:"USD"}]})}),e.jsx("button",{type:"button",onClick:()=>u({to:"/pools"}),className:"w-44 rounded-lg border border-border bg-muted/40 px-6 py-2.5 text-sm font-medium text-foreground transition-[background-color,border-color,transform] duration-150 ease-out hover:border-muted-foreground/40 hover:bg-muted active:scale-[0.98]",children:"Pools"})]})]}),e.jsx("hr",{className:"my-6 border-border"}),e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-0.5",children:[e.jsx("h2",{className:"font-heading text-base font-semibold",children:"Balance over time"}),k&&e.jsxs("span",{className:"flex items-center gap-1.5 text-xs",children:[e.jsx("span",{className:k.atPeak&&!J?"font-medium text-brand":"text-muted-foreground",children:k.atPeak?`At your ${ne[o]}`:`${k.pct}% of ${ne[o]}`}),J&&e.jsx(ie,{className:"size-3.5 text-muted-foreground motion-safe:animate-spin","aria-label":"Still calculating"})]})]}),e.jsx("div",{className:"w-[24rem] max-w-[60%]",children:e.jsx(ee,{tone:"neutral",value:o,onChange:R,options:Ie})})]}),e.jsxs("div",{className:"mt-4 grid text-muted-foreground",children:[e.jsx("div",{"aria-hidden":M,style:{opacity:M?0:1},className:"col-start-1 row-start-1 flex aspect-900/240 items-center justify-center text-sm text-muted-foreground transition-opacity duration-360 ease-[cubic-bezier(0.23,1,0.32,1)]",children:"No confirmed activity yet"}),M&&e.jsx("div",{className:`col-start-1 row-start-1 ${he()?"balance-chart-enter":""}`,children:e.jsx(xe,{points:Z,denom:w})},w==="usd"?`usd-${o}`:"zec")]}),e.jsx(we,{open:O,onOpenChange:f,onAccept:me})]})}function Re({spot:n}){const a=Date.now()-n.fetchedAt*1e3,t=Math.max(0,Math.round(a/6e4)),r=t<1?"updated just now":t<60?`updated ${t}m ago`:`updated ${Math.round(t/60)}h ago`;return e.jsx("span",{className:`text-xs ${n.stale?"text-amber-400":"text-muted-foreground"}`,children:r})}le.__docgenInfo={description:"",methods:[],displayName:"DashboardView",props:{wallet:{required:!0,tsType:{name:"union",raw:"WalletState | null",elements:[{name:"signature",type:"object",raw:`{
  exists: boolean;
  locked: boolean;
  sessionHeld: boolean;
  walletId?: string | null;
  // Optional user-facing name. Null/absent falls back to short fingerprint in the UI.
  // Masked when Discreet mode is on.
  label?: string | null;
  // The current Wallet's fingerprint, seeding its LifeHash. Null when no wallet
  // exists or it predates fingerprint persistence.
  fingerprint: string | null;
  importType: ImportType;
  viewMode: ViewMode;
  network: Network;
  birthdayHeight: number;
  // The Indexer this Wallet syncs against, editable from Settings. Empty when no
  // wallet exists.
  indexerUri: string;
  // Whether transaction and scan-complete notifications fire. The "Indexer
  // unreachable" alert is independent of this.
  notificationsEnabled: boolean;
  // Whether fiat (USD) price display is on. Off until the user consents to the price
  // egress via the toggle's modal (docs/adr/0008). Absent reads as false.
  fiatEnabled?: boolean;
  // Whether Discreet mode is on (docs/adr/0009). The UI masks sensitive values and
  // the daemon redacts notification text. Absent reads as false.
  discreet?: boolean;
  unavailable?: string;
}`,signature:{properties:[{key:"exists",value:{name:"boolean",required:!0}},{key:"locked",value:{name:"boolean",required:!0}},{key:"sessionHeld",value:{name:"boolean",required:!0}},{key:"walletId",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!1}},{key:"label",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!1}},{key:"fingerprint",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!0}},{key:"importType",value:{name:"union",raw:'"ufvk" | "seed"',elements:[{name:"literal",value:'"ufvk"'},{name:"literal",value:'"seed"'}],required:!0}},{key:"viewMode",value:{name:"union",raw:'"full" | "incoming-only"',elements:[{name:"literal",value:'"full"'},{name:"literal",value:'"incoming-only"'}],required:!0}},{key:"network",value:{name:"union",raw:'"mainnet" | "regtest"',elements:[{name:"literal",value:'"mainnet"'},{name:"literal",value:'"regtest"'}],required:!0}},{key:"birthdayHeight",value:{name:"number",required:!0}},{key:"indexerUri",value:{name:"string",required:!0}},{key:"notificationsEnabled",value:{name:"boolean",required:!0}},{key:"fiatEnabled",value:{name:"boolean",required:!1}},{key:"discreet",value:{name:"boolean",required:!1}},{key:"unavailable",value:{name:"string",required:!1}}]}},{name:"null"}]},description:""},balance:{required:!0,tsType:{name:"union",raw:"Balance | null",elements:[{name:"signature",type:"object",raw:`{
  orchard?: PoolBalance;
  sapling?: PoolBalance;
  transparent?: PoolBalance;
  ironwood?: PoolBalance;
}`,signature:{properties:[{key:"orchard",value:{name:"signature",type:"object",raw:`{
  confirmed: string;
  total: string;
}`,signature:{properties:[{key:"confirmed",value:{name:"string",required:!0}},{key:"total",value:{name:"string",required:!0}}]},required:!1}},{key:"sapling",value:{name:"signature",type:"object",raw:`{
  confirmed: string;
  total: string;
}`,signature:{properties:[{key:"confirmed",value:{name:"string",required:!0}},{key:"total",value:{name:"string",required:!0}}]},required:!1}},{key:"transparent",value:{name:"signature",type:"object",raw:`{
  confirmed: string;
  total: string;
}`,signature:{properties:[{key:"confirmed",value:{name:"string",required:!0}},{key:"total",value:{name:"string",required:!0}}]},required:!1}},{key:"ironwood",value:{name:"signature",type:"object",raw:`{
  confirmed: string;
  total: string;
}`,signature:{properties:[{key:"confirmed",value:{name:"string",required:!0}},{key:"total",value:{name:"string",required:!0}}]},required:!1}}]}},{name:"null"}]},description:""},txs:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  txid: string;
  datetime: number;
  blockHeight?: number;
  kind: TxKind;
  valueZat: string;
  // Signed net balance change in zatoshis (received +, sent/shield/self −). The
  // chart reconstructs against this; valueZat stays the display amount. Optional so
  // a daemon predating the field doesn't break the client (the chart falls back).
  netZat?: string;
  status: TxStatus;
  notes: Note[];
}`,signature:{properties:[{key:"txid",value:{name:"string",required:!0}},{key:"datetime",value:{name:"number",required:!0}},{key:"blockHeight",value:{name:"number",required:!1}},{key:"kind",value:{name:"union",raw:'"received" | "sent"',elements:[{name:"literal",value:'"received"'},{name:"literal",value:'"sent"'}],required:!0}},{key:"valueZat",value:{name:"string",required:!0}},{key:"netZat",value:{name:"string",required:!1}},{key:"status",value:{name:"union",raw:'"confirmed" | "pending"',elements:[{name:"literal",value:'"confirmed"'},{name:"literal",value:'"pending"'}],required:!0}},{key:"notes",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  pool: Pool;
  direction: NoteDirection;
  outputIndex: number;
  valueZat: string;
  memo?: string;
  recipient?: string;
}`,signature:{properties:[{key:"pool",value:{name:"union",raw:'"orchard" | "sapling" | "transparent" | "ironwood"',elements:[{name:"literal",value:'"orchard"'},{name:"literal",value:'"sapling"'},{name:"literal",value:'"transparent"'},{name:"literal",value:'"ironwood"'}],required:!0}},{key:"direction",value:{name:"union",raw:'"received" | "sent"',elements:[{name:"literal",value:'"received"'},{name:"literal",value:'"sent"'}],required:!0}},{key:"outputIndex",value:{name:"number",required:!0}},{key:"valueZat",value:{name:"string",required:!0}},{key:"memo",value:{name:"string",required:!1}},{key:"recipient",value:{name:"string",required:!1}}]}}],raw:"Note[]",required:!0}}]}}],raw:"Tx[]"},description:""},sync:{required:!0,tsType:{name:"union",raw:"SyncStatus | null",elements:[{name:"signature",type:"object",raw:`{
  state: SyncState;
  syncedHeight: number;
  chainTip: number;
  percent: number;
  phase?: SyncPhase;
  scannedOutputs?: number;
  totalOutputs?: number;
  etaSeconds?: number;
  error?: string;
  // Set only when the sync error was the Indexer being unreachable, gating the
  // "Change server" CTA. Absent reads as false.
  unreachable?: boolean;
  // Set only when the Indexer is serving a chain without this Wallet's Anchor
  // (ADR-0010). The daemon keeps it mutually exclusive with \`unreachable\`.
  wrongChain?: boolean;
  lastSyncedAt?: number;
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]}},{name:"null"}]},description:""},switching:{required:!0,tsType:{name:"boolean"},description:""}}};const{expect:z,mocked:h,userEvent:W,waitFor:$,within:P}=__STORYBOOK_MODULE_TEST__,L={exists:!0,locked:!1,sessionHeld:!0,walletId:"w1",fingerprint:"a1b2c3d4e5f6",label:"Cold storage",importType:"ufvk",viewMode:"full",network:"mainnet",birthdayHeight:419200,indexerUri:"https://zec.rocks:443",notificationsEnabled:!0},ce=86400,m=Math.floor(Date.now()/1e3),ae={syncing:{state:"syncing",syncedHeight:239e4,chainTip:24e5,percent:62,phase:"scanning",etaSeconds:540},synced:{state:"idle",syncedHeight:24e5,chainTip:24e5,percent:100,lastSyncedAt:m},unreachable:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"connection refused",unreachable:!0},wrongChain:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"anchor not found",wrongChain:!0},syncError:{state:"error",syncedHeight:239e4,chainTip:24e5,percent:62,error:"scan failed: bad block"}},Oe={empty:{orchard:{confirmed:"0",total:"0"}},small:{orchard:{confirmed:"123450000",total:"123450000"}},large:{orchard:{confirmed:"12000000000",total:"12000000000"},sapling:{confirmed:"998184475",total:"998184475"}}};function Ze(){const n=[];for(let a=0;a<40;a++){const t=a%3===2?"sent":"received",r=String(5e7+a*7919e3%8e8);n.push({txid:`${a.toString(16).padStart(4,"0")}b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6`,datetime:m-(a*9+1)*ce,blockHeight:24e5-a*1e4,kind:t,valueZat:r,netZat:t==="sent"?`-${r}`:r,status:"confirmed",notes:[{pool:"orchard",direction:t,outputIndex:0,valueZat:r}]})}return[{txid:"ffffaabbccdd",datetime:m-600,kind:"received",valueZat:"5000000",netZat:"5000000",status:"pending",notes:[{pool:"orchard",direction:"received",outputIndex:0,valueZat:"5000000"}]},...n]}const Me={none:[],few:ge,year:Ze()};function Ve(){const n=[];for(let a=400;a>=0;a--){const t=new Date((m-a*ce)*1e3).toISOString().slice(0,10);n.push({date:t,usdPerZec:30+12*Math.sin(a/40)+a/50,confidence:a%50===0?"low":"high"})}return n}const Le={fresh:{usdPerZec:41.37,fetchedAt:m-20,sources:["coingecko","kraken"]},stale:{usdPerZec:41.37,fetchedAt:m-3*3600,sources:["coingecko"],stale:!0}};function ze(n){i.useEffect(()=>(X(n.discreet),()=>X(!1)),[n.discreet]);const a=n.sync==="closed"?null:n.sync==="syncing"?{...ae.syncing,percent:n.syncPercent}:ae[n.sync];return e.jsx("div",{className:"flex flex-col gap-6",children:e.jsx(le,{wallet:{...L,fiatEnabled:n.fiatEnabled},balance:n.balance==="loading"?null:Oe[n.balance],txs:Me[n.history],sync:a,switching:n.switching})})}const Nn={title:"App/Home",component:ze,decorators:[pe],parameters:{layout:"padded"},beforeEach:({args:n})=>{h(te).mockResolvedValue(()=>{}),h(ye).mockResolvedValue(L),h(se).mockResolvedValue({...L,fiatEnabled:!0}),h(re).mockResolvedValue(n.price==="none"?null:Le[n.price]),h(V).mockResolvedValue(n.price==="none"?[]:Ve())},argTypes:{switching:{control:"boolean",description:"Another Wallet is being selected"},sync:{control:"select",options:["syncing","synced","unreachable","wrongChain","syncError","closed"]},syncPercent:{control:{type:"range",min:0,max:100,step:1},if:{arg:"sync",eq:"syncing"}},balance:{control:"select",options:["loading","empty","small","large"]},history:{control:"select",options:["none","few","year"]},fiatEnabled:{control:"boolean",description:"USD consent already given"},price:{control:"select",options:["none","fresh","stale"]},discreet:{control:"boolean"}},args:{switching:!1,sync:"synced",syncPercent:62,balance:"small",history:"few",fiatEnabled:!1,price:"none",discreet:!1}},j={},q={args:{sync:"syncing"}},N={args:{sync:"unreachable"}},E={args:{sync:"wrongChain"}},T={args:{sync:"syncError"}},_={args:{sync:"closed",balance:"loading",history:"none"}},D={args:{balance:"empty",history:"none"}},C={args:{switching:!0}},U={args:{balance:"large",history:"year"}},B={args:{discreet:!0}},H={args:{fiatEnabled:!0,price:"fresh",balance:"large",history:"year"},play:async({canvasElement:n})=>{const a=P(n);await W.click(a.getByRole("button",{name:"USD"})),await $(()=>z(a.getByText("updated just now")).toBeVisible())}},I={args:{fiatEnabled:!0,price:"stale",balance:"large",history:"year"},play:async({canvasElement:n})=>{const a=P(n);await W.click(a.getByRole("button",{name:"USD"})),await $(()=>z(a.getByText("updated 3h ago")).toBeVisible())}},A={args:{fiatEnabled:!1,price:"fresh",history:"year"},play:async({canvasElement:n})=>{const a=P(n);await W.click(a.getByRole("button",{name:"USD"})),await $(()=>z(P(document.body).getByText("Show balances in USD?")).toBeVisible())}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:"{}",...j.parameters?.docs?.source}}};q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "syncing"
  }
}`,...q.parameters?.docs?.source}}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "unreachable"
  }
}`,...N.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "wrongChain"
  }
}`,...E.parameters?.docs?.source}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "syncError"
  }
}`,...T.parameters?.docs?.source}}};_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    sync: "closed",
    balance: "loading",
    history: "none"
  }
}`,..._.parameters?.docs?.source}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    balance: "empty",
    history: "none"
  }
}`,...D.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...B.parameters?.docs?.source}}};H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
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
}`,...I.parameters?.docs?.source}}};A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
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
}`,...A.parameters?.docs?.source}}};const En=["Synced","Syncing","Unreachable","WrongChain","SyncError","Loading","Empty","Switching","LongHistory","Discreet","Usd","UsdStale","UsdConsent"];export{B as Discreet,D as Empty,_ as Loading,U as LongHistory,C as Switching,T as SyncError,j as Synced,q as Syncing,N as Unreachable,H as Usd,A as UsdConsent,I as UsdStale,E as WrongChain,En as __namedExportsOrder,Nn as default};
