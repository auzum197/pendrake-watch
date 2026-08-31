import{r as E,j as r}from"./iframe-D_NN_1gN.js";/* empty css                 */import"./preload-helper-PPVm8Dsz.js";const m=8,v=4,j=200,l=78,b=12,$=10,_=12;function C(){const n=(l-$-_)/(v-1),g=(j-2*b)/(m-1),s=[];for(let o=0;o<v;o++){const y=m>>o,h=l-_-o*n,p=[];for(let a=0;a<y;a++){const u=o===0?b+a*g:(s[o-1][a*2].x+s[o-1][a*2+1].x)/2;p.push({x:u,y:h})}s.push(p)}return s}function N({committing:n,frac:g}){const s=E.useMemo(C,[]),o=n?Math.max(0,Math.min(m,Math.round(g*m))):0,y=Math.min(o,m-1),h=s[0][y].x/j*100,p=(l-_)/l*100,a=(t,e)=>e+1<<t<=o,u=[];for(let t=1;t<v;t++)s[t].forEach((e,c)=>{for(const i of[c*2,c*2+1]){const w=s[t-1][i];u.push({x1:e.x,y1:e.y,x2:w.x,y2:w.y,on:a(t,c)&&a(t-1,i)})}});return r.jsxs("div",{className:"relative",children:[r.jsxs("svg",{viewBox:`0 0 ${j} ${l}`,className:"w-full","aria-hidden":!0,children:[u.map((t,e)=>r.jsx("line",{x1:t.x1,y1:t.y1,x2:t.x2,y2:t.y2,className:t.on?"text-violet-500 opacity-70":"text-border opacity-50",stroke:"currentColor",strokeWidth:1},`e${e}`)),s.slice(1).flatMap((t,e)=>t.map((c,i)=>r.jsx("circle",{cx:c.x,cy:c.y,r:2.6,className:a(e+1,i)?"text-violet-500":"text-muted-foreground opacity-30",fill:"currentColor",style:{transition:"opacity 250ms var(--ease-out-strong)"}},`n${e}-${i}`))),s[0].map((t,e)=>r.jsx("rect",{x:t.x-4,y:t.y-4,width:8,height:8,rx:1.5,className:e<o?e===o-1?"text-violet-400":"text-violet-500 opacity-85":"text-muted-foreground opacity-25",fill:"currentColor",style:{transition:"opacity 250ms var(--ease-out-strong)"}},`l${e}`))]}),n?r.jsx("span",{className:"sync-drop pointer-events-none absolute h-2 w-2 rounded-[2px] bg-violet-400 shadow-[0_0_5px_1px_rgba(167,139,250,0.6)]",style:{left:`calc(${h}% - 4px)`,top:`calc(${p}% - 16px)`,transition:"left 220ms var(--ease-out-strong)"}}):r.jsx("div",{className:"sync-bob pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 gap-1",children:Array.from({length:4}).map((t,e)=>r.jsx("span",{className:"h-2 w-2 rounded-[2px] bg-violet-500/60"},e))})]})}N.__docgenInfo={description:"",methods:[],displayName:"BatchCommitViz",props:{committing:{required:!0,tsType:{name:"boolean"},description:""},frac:{required:!0,tsType:{name:"number"},description:""}}};const A={component:N,args:{committing:!0,frac:.6},decorators:[n=>r.jsx("div",{className:"w-64",children:r.jsx(n,{})})]},x={args:{committing:!1,frac:0}},d={args:{committing:!0,frac:.6}},f={args:{committing:!0,frac:1}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    committing: false,
    frac: 0
  }
}`,...x.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    committing: true,
    frac: 0.6
  }
}`,...d.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    committing: true,
    frac: 1
  }
}`,...f.parameters?.docs?.source}}};const D=["Waiting","Committing","Done"];export{d as Committing,f as Done,x as Waiting,D as __namedExportsOrder,A as default};
