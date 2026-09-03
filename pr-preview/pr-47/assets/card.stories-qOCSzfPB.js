import{j as a}from"./iframe-BqPm5GPo.js";import{c as t}from"./utils-DCADjnpI.js";import{B as l}from"./button-3es8Fj9-.js";import"./preload-helper-PPVm8Dsz.js";import"./index-Blmv-jCN.js";function n({className:e,size:r="default",...u}){return a.jsx("div",{"data-slot":"card","data-size":r,className:t("group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",e),...u})}function o({className:e,...r}){return a.jsx("div",{"data-slot":"card-header",className:t("group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",e),...r})}function i({className:e,...r}){return a.jsx("div",{"data-slot":"card-title",className:t("font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm",e),...r})}function c({className:e,...r}){return a.jsx("div",{"data-slot":"card-description",className:t("text-sm text-muted-foreground",e),...r})}function m({className:e,...r}){return a.jsx("div",{"data-slot":"card-content",className:t("px-(--card-spacing)",e),...r})}function p({className:e,...r}){return a.jsx("div",{"data-slot":"card-footer",className:t("flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",e),...r})}n.__docgenInfo={description:"",methods:[],displayName:"Card",props:{size:{required:!1,tsType:{name:"union",raw:'"default" | "sm"',elements:[{name:"literal",value:'"default"'},{name:"literal",value:'"sm"'}]},description:"",defaultValue:{value:'"default"',computed:!1}}}};o.__docgenInfo={description:"",methods:[],displayName:"CardHeader"};p.__docgenInfo={description:"",methods:[],displayName:"CardFooter"};i.__docgenInfo={description:"",methods:[],displayName:"CardTitle"};c.__docgenInfo={description:"",methods:[],displayName:"CardDescription"};m.__docgenInfo={description:"",methods:[],displayName:"CardContent"};const j={component:n},d={render:()=>a.jsxs(n,{className:"w-72",children:[a.jsxs(o,{children:[a.jsx(i,{children:"Balance"}),a.jsx(c,{children:"Mainnet"})]}),a.jsx(m,{className:"font-mono text-2xl tabular-nums",children:"1.2345 ZEC"})]})},s={render:()=>a.jsxs(n,{className:"w-72",children:[a.jsxs(o,{children:[a.jsx(i,{children:"Replace this Wallet?"}),a.jsx(c,{children:"The synced history is erased."})]}),a.jsxs(p,{className:"gap-2",children:[a.jsx(l,{variant:"ghost",children:"Cancel"}),a.jsx(l,{variant:"destructive",children:"Replace"})]})]})};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Card className="w-72">
      <CardHeader>
        <CardTitle>Balance</CardTitle>
        <CardDescription>Mainnet</CardDescription>
      </CardHeader>
      <CardContent className="font-mono text-2xl tabular-nums">
        1.2345 ZEC
      </CardContent>
    </Card>
}`,...d.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <Card className="w-72">
      <CardHeader>
        <CardTitle>Replace this Wallet?</CardTitle>
        <CardDescription>The synced history is erased.</CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button variant="destructive">Replace</Button>
      </CardFooter>
    </Card>
}`,...s.parameters?.docs?.source}}};const N=["Balance","WithFooter"];export{d as Balance,s as WithFooter,N as __namedExportsOrder,j as default};
