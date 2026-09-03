import{j as w,r as T}from"./iframe-BqPm5GPo.js";import{B as E}from"./BalanceChart-D6E37UvD.js";import"./preload-helper-PPVm8Dsz.js";import"./chart-CcJyknVK.js";import"./utils-DCADjnpI.js";import"./index-B6ERYhEG.js";import"./index-Cvky-sGi.js";import"./with-selector-DDZl_lIQ.js";import"./discreet-value-EdLYmB_0.js";import"./use-wallet-data-BhDCaPwA.js";import"./ipc-cooBBgp-.js";import"./format-d3jQKD7n.js";import"./addYears-Bhde3fRX.js";const Y=Date.UTC(2026,0,15)/1e3,b=86400;function v(e){let s=e>>>0;return()=>{s|=0,s=s+1831565813|0;let r=Math.imul(s^s>>>15,1|s);return r=r+Math.imul(r^r>>>7,61|r)^r,((r^r>>>14)>>>0)/4294967296}}function j(e,s){return new Date(e*1e3).toLocaleDateString(void 0,{month:"short",...s>540?{year:"numeric"}:{day:"numeric"}})}function k(e,s,r){switch(e){case"hodl":return r()<.85?r()*r()*2+.05:-Math.min(s*r()*.3,s);case"trader":return r()<.5?r()*4+.1:-Math.min(s*(.1+r()*.5),s);case"dust":return r()<.97?1e-4+r()*.01:r()*.5;case"whale":return r()<.7?100+r()*r()*4900:-Math.min(s*(.2+r()*.6),s)}}function C({transactions:e,years:s,style:r,seed:o}){const u=v(o),n=s*365*b,l=Y-n,d=n/b,c=Array.from({length:e},()=>l+u()*n).sort((a,m)=>a-m);let t=0,p=2e6;const i=[{key:"start",t:l-n*.03,value:0,label:""}];return c.forEach((a,m)=>{t=Math.max(0,t+k(r,t,u)),p+=50+Math.floor(u()*4e3),i.push({key:`tx-${m}`,t:a,value:t,label:j(a,d),height:p})}),i}function P(e,s){const r=v(s^2654435769),o=e[0].t,u=e[e.length-1].t-o,n=u/b,l=Math.min(260,Math.max(60,Math.round(n)));let d=30+r()*20,c=1,t=0;const p=[];for(let i=0;i<=l;i++){const a=o+u*i/l;d=Math.max(5,d*(1+(r()-.485)*.06));let m=0;for(;c<e.length&&e[c].t<=a;)m+=Math.abs(e[c].value-t)*d,t=e[c].value,c++;p.push({key:`d-${i}`,t:a,value:t*d,label:j(a,n),zec:t,change:m>0,jump:m})}return p}function U({denom:e,...s}){const r=T.useMemo(()=>{const o=C(s);return e==="usd"?P(o,s.seed):o},[e,s.transactions,s.years,s.style,s.seed]);return w.jsx(E,{points:r,denom:e})}const G={component:U,decorators:[e=>w.jsx("div",{className:"w-[900px] rounded-2xl border border-border bg-card p-6",children:w.jsx(e,{})})],argTypes:{transactions:{control:{type:"range",min:1,max:2e3,step:1}},years:{control:{type:"range",min:.25,max:8,step:.25}},style:{control:"select",options:["hodl","trader","dust","whale"]},seed:{control:{type:"number",min:1}},denom:{control:"radio",options:["zec","usd"]}},args:{transactions:40,years:1,style:"hodl",seed:7,denom:"zec"}},y={},h={args:{transactions:350,years:5}},g={args:{transactions:2e3,years:3,style:"trader"}},x={args:{transactions:40,years:8,style:"whale",seed:3}},M={args:{transactions:600,years:1,style:"dust"}},f={args:{transactions:150,years:1,style:"trader"}},S={args:{transactions:1,years:.25}},D={args:{transactions:200,years:4,denom:"usd"}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:"{}",...y.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    transactions: 350,
    years: 5
  }
}`,...h.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    transactions: 2000,
    years: 3,
    style: "trader"
  }
}`,...g.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    transactions: 40,
    years: 8,
    style: "whale",
    seed: 3
  }
}`,...x.parameters?.docs?.source}}};M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    transactions: 600,
    years: 1,
    style: "dust"
  }
}`,...M.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    transactions: 150,
    years: 1,
    style: "trader"
  }
}`,...f.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    transactions: 1,
    years: 0.25
  }
}`,...S.parameters?.docs?.source}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    transactions: 200,
    years: 4,
    denom: "usd"
  }
}`,...D.parameters?.docs?.source}}};const J=["Playground","MultiYear","DenseHistory","Whale","DustStorm","Trader","FirstTransaction","UsdMultiYear"];export{g as DenseHistory,M as DustStorm,S as FirstTransaction,h as MultiYear,y as Playground,f as Trader,D as UsdMultiYear,x as Whale,J as __namedExportsOrder,G as default};
