import{j as a}from"./iframe-u8QP6QJa.js";import{I as r,J as n,K as s,X as i,M as o,N as l,O as c}from"./chart-DKvyVvwa.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-DclmTqRz.js";import"./index-efhN02Vl.js";import"./index-Bgk5p-bm.js";import"./with-selector-BWLEdx1X.js";const t={value:{label:"Balance",color:"var(--color-brand)"}},d=[{label:"Mon",value:.2},{label:"Tue",value:.5},{label:"Wed",value:.5},{label:"Thu",value:1},{label:"Fri",value:1.2}],x={component:r,args:{config:t,children:a.jsx("div",{})}},e={name:"Area",render:()=>a.jsx(r,{config:t,className:"aspect-video w-[36rem]",children:a.jsxs(n,{data:d,margin:{left:12,right:12},children:[a.jsx(s,{vertical:!1,strokeDasharray:"4 6"}),a.jsx(i,{dataKey:"label",tickLine:!1,axisLine:!1,tickMargin:8}),a.jsx(o,{content:a.jsx(l,{})}),a.jsx(c,{dataKey:"value",type:"stepAfter",stroke:"var(--color-brand)",fill:"var(--color-brand)",fillOpacity:.15,isAnimationActive:!1})]})})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  name: "Area",
  render: () => <ChartContainer config={config} className="aspect-video w-[36rem]">
      <AreaChart data={data} margin={{
      left: 12,
      right: 12
    }}>
        <CartesianGrid vertical={false} strokeDasharray="4 6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="value" type="stepAfter" stroke="var(--color-brand)" fill="var(--color-brand)" fillOpacity={0.15} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
}`,...e.parameters?.docs?.source}}};const u=["Area_"];export{e as Area_,u as __namedExportsOrder,x as default};
