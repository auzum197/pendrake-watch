import{j as t}from"./iframe-BqPm5GPo.js";import{L as o}from"./lifehash-avatar-C4O4Sbqw.js";import"./preload-helper-PPVm8Dsz.js";import"./lifehash-DGWfi99f.js";const{useArgs:s}=__STORYBOOK_MODULE_PREVIEW_API__;function a(){let e="";for(let r=0;r<12;r++)e+=Math.floor(Math.random()*16).toString(16);return e}const m={component:o,args:{fingerprint:"a1b2c3d4e5f6",ringed:!0,className:"size-24 rounded-full"},argTypes:{fingerprint:{control:"text"},ringed:{control:"boolean"},className:{control:"text"}}},n={render:e=>{const[,r]=s();return t.jsxs("div",{className:"flex flex-col items-start gap-4",children:[t.jsx(o,{...e}),t.jsxs("div",{className:"flex items-center gap-3",children:[t.jsx("button",{type:"button",onClick:()=>r({fingerprint:a()}),className:"rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10",children:"Randomize"}),t.jsx("code",{className:"font-mono text-xs text-white/45",children:e.fingerprint})]})]})}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [, updateArgs] = useArgs();
    return <div className="flex flex-col items-start gap-4">
        <LifeHashAvatar {...args} />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => updateArgs({
          fingerprint: randomFingerprint()
        })} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10">
            Randomize
          </button>
          <code className="font-mono text-xs text-white/45">{args.fingerprint}</code>
        </div>
      </div>;
  }
}`,...n.parameters?.docs?.source}}};const p=["Playground"];export{n as Playground,p as __namedExportsOrder,m as default};
