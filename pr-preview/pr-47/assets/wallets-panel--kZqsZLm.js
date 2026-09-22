import{r as u,j as n}from"./iframe-_2ylhKB9.js";import{u as p}from"./useNavigate-CSaeGBJ5.js";import{L as b}from"./lifehash-avatar-2yCW-v0q.js";import{l as y}from"./lifehash-bAbtiYOZ.js";import{k as v,j as x}from"./ipc-BdlnfMXN.js";import{c as k}from"./app-toast-BzLTaUEE.js";import{W as q}from"./wallet-plate-Ci1YfxtF.js";import{I as j}from"./IconPlus-CwqDK314.js";function P(a){const[r,o]=u.useState([]),s=u.useRef(()=>{});return u.useEffect(()=>{if(!a)return;let i=!0;const l=()=>x().then(t=>{i&&o(t)}).catch(()=>{i&&o([])});s.current=l,l();const d=v(t=>{(t.event==="finished"||t.event==="transaction")&&l()});return()=>{i=!1,s.current=()=>{},d.then(t=>t()).catch(()=>{})}},[a]),{wallets:r,refresh:()=>s.current()}}function S({wallets:a,focusWallet:r,refresh:o}){const s=p(),i=a.find(e=>e.selected)??a[0],[l,d]=u.useState(r),[t,g]=u.useState(r);r!==t&&(g(r),r&&d(r));const m=a.find(e=>e.id===l)??i;function f(){k(),s({to:"/onboarding",search:{mode:"add"}})}return n.jsxs("section",{className:"wallets-panel",children:[n.jsxs("ul",{className:"wallets-list",role:"listbox","aria-label":"Wallets",children:[a.map(e=>{const c=e.fingerprint?e.fingerprint.slice(0,8):"",h=e.fingerprint?e.label!==c:e.label.length>0;return n.jsx("li",{children:n.jsxs("button",{type:"button",role:"option","aria-selected":e.id===m?.id,className:"wallets-item",style:{"--accent":e.fingerprint?y(e.fingerprint):"var(--color-brand)"},onClick:()=>d(e.id),children:[e.fingerprint&&n.jsx(b,{fingerprint:e.fingerprint,className:"size-7 shrink-0 rounded-full",ringed:e.selected}),n.jsxs("span",{className:"min-w-0 flex-1",children:[n.jsx("span",{className:`block truncate text-sm ${h?"font-medium":"font-mono text-muted-foreground"}`,children:e.label}),n.jsxs("span",{className:"flex gap-2 truncate font-mono text-[10px] text-muted-foreground",children:[c&&n.jsx("span",{children:c}),n.jsx("span",{className:"capitalize",children:e.network})]})]})]})},e.id)}),n.jsx("li",{children:n.jsxs("button",{type:"button",className:"wallets-item",onClick:f,children:[n.jsx("span",{className:"flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-muted-foreground",children:n.jsx(j,{className:"size-3.5"})}),n.jsx("span",{className:"text-sm text-muted-foreground",children:"Add wallet"})]})})]}),m&&n.jsx(q,{wallet:m,onChanged:o},m.id)]})}S.__docgenInfo={description:"",methods:[],displayName:"WalletsPanel",props:{wallets:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  id: string;
  // Resolved display name: custom label, or short fingerprint when unset.
  label: string;
  fingerprint: string | null;
  network: Network;
  birthdayHeight: number;
  selected: boolean;
  // Last-synced confirmed balance in zatoshis (stringified), or null before a Wallet
  lastBalance: string | null;
  sync?: SyncStatus;
  unavailable?: string;
  // Per-Wallet settings surfaced in Settings > Wallets. A daemon predating them
  // omits both; the UI reads absent as "alerts on" and an empty Indexer.
  notificationsEnabled?: boolean;
  indexerUri?: string;
}`,signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"fingerprint",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!0}},{key:"network",value:{name:"union",raw:'"mainnet" | "regtest"',elements:[{name:"literal",value:'"mainnet"'},{name:"literal",value:'"regtest"'}],required:!0}},{key:"birthdayHeight",value:{name:"number",required:!0}},{key:"selected",value:{name:"boolean",required:!0}},{key:"lastBalance",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!0}},{key:"sync",value:{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"state",value:{name:"union",raw:'"idle" | "syncing" | "error"',elements:[{name:"literal",value:'"idle"'},{name:"literal",value:'"syncing"'},{name:"literal",value:'"error"'}],required:!0}},{key:"syncedHeight",value:{name:"number",required:!0}},{key:"chainTip",value:{name:"number",required:!0}},{key:"percent",value:{name:"number",required:!0}},{key:"phase",value:{name:"union",raw:'"scanning" | "committing"',elements:[{name:"literal",value:'"scanning"'},{name:"literal",value:'"committing"'}],required:!1}},{key:"scannedOutputs",value:{name:"number",required:!1}},{key:"totalOutputs",value:{name:"number",required:!1}},{key:"etaSeconds",value:{name:"number",required:!1}},{key:"error",value:{name:"string",required:!1}},{key:"unreachable",value:{name:"boolean",required:!1}},{key:"wrongChain",value:{name:"boolean",required:!1}},{key:"lastSyncedAt",value:{name:"number",required:!1}}]},required:!1}},{key:"unavailable",value:{name:"string",required:!1}},{key:"notificationsEnabled",value:{name:"boolean",required:!1}},{key:"indexerUri",value:{name:"string",required:!1}}]}}],raw:"WalletSummary[]"},description:""},focusWallet:{required:!0,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""},refresh:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{S as W,P as u};
