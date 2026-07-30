import{j as u}from"./iframe-CqQLRfC7.js";import"./preload-helper-PPVm8Dsz.js";const f=240,c=56,g=5;function x(r){const i=Math.max(...r),a=Math.min(...r),l=i-a||1,m=r.length,s=e=>e/(m-1)*f,p=e=>g+(c-g*2)*(1-(e-a)/l);let d=`M ${s(0)} ${p(r[0])}`;for(let e=1;e<m;e++)d+=` L ${s(e)} ${p(r[e-1])} L ${s(e)} ${p(r[e])}`;const h=`${d} L ${s(m-1)} ${c} L ${s(0)} ${c} Z`;return{line:d,area:h}}function $({values:r,className:i}){const{line:a,area:l}=x(r);return u.jsxs("svg",{viewBox:`0 0 ${f} ${c}`,className:`text-brand ${i??""}`,preserveAspectRatio:"none","aria-hidden":!0,children:[u.jsx("path",{d:l,fill:"currentColor",fillOpacity:"0.1"}),u.jsx("path",{d:a,fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinejoin:"round",vectorEffect:"non-scaling-stroke"})]})}$.__docgenInfo={description:"",methods:[],displayName:"Sparkline",props:{values:{required:!0,tsType:{name:"Array",elements:[{name:"number"}],raw:"number[]"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const v={component:$,args:{className:"h-14 w-60"}},n={args:{values:[0,.5,.5,1.2,1.2,1.2,2.4,3.1]}},t={args:{values:[1,3,2,4,1.5,3.5,2,5]}},o={args:{values:[0,1,1,2,2,3],className:"h-10 w-full"}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    values: [0, 0.5, 0.5, 1.2, 1.2, 1.2, 2.4, 3.1]
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    values: [1, 3, 2, 4, 1.5, 3.5, 2, 5]
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    values: [0, 1, 1, 2, 2, 3],
    className: "h-10 w-full"
  }
}`,...o.parameters?.docs?.source}}};const y=["Rising","Volatile","Wide"];export{n as Rising,t as Volatile,o as Wide,y as __namedExportsOrder,v as default};
