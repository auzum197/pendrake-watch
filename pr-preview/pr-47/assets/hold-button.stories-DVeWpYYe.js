import{r as s,j as n}from"./iframe-u8QP6QJa.js";import{a as _}from"./utils-DclmTqRz.js";import"./preload-helper-PPVm8Dsz.js";const k=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;function d({onConfirm:t,durationMs:l=1200,children:m,className:w}){const[j,h]=s.useState(0),r=s.useRef(null),x=s.useRef(0),i=s.useRef(null),f=s.useRef(!1);function g(e){const o=e-x.current,p=Math.min(o/l,1);h(p);const b=i.current;if(b&&!f.current){const C=1-.03*k(Math.min(o/500,1)),v=p*.8,M=(Math.sin(o/23)+Math.sin(o/31))*.5*v,N=(Math.sin(o/19)+Math.sin(o/29))*.5*v,H=Math.sin(o/37)*v*.3;b.style.transform=`translate3d(${M}px, ${N}px, 0) scale(${C}) rotate(${H}deg)`}if(p>=1){r.current=null,t();return}r.current=requestAnimationFrame(g)}function y(){r.current===null&&(f.current=window.matchMedia("(prefers-reduced-motion: reduce)").matches,x.current=performance.now(),i.current&&!f.current&&(i.current.style.transition="none"),r.current=requestAnimationFrame(g))}function a(){r.current!==null&&(cancelAnimationFrame(r.current),r.current=null),h(0);const e=i.current;e&&(e.style.transition="",e.style.transform="")}return n.jsxs("button",{ref:i,type:"button",onPointerDown:y,onPointerUp:a,onPointerLeave:a,onPointerCancel:a,onKeyDown:e=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),e.repeat||y())},onKeyUp:e=>{(e.key===" "||e.key==="Enter")&&a()},onBlur:a,className:_("relative h-11 w-full overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive transition-[transform,background-color] duration-150 ease-out select-none hover:bg-destructive/20 motion-safe:hover:scale-[1.02] focus-visible:border-destructive/40 focus-visible:ring-3 focus-visible:ring-destructive/20 focus-visible:outline-none",w),children:[n.jsx("span",{"aria-hidden":!0,className:"absolute inset-y-0 left-0 bg-destructive/25",style:{width:`${j*100}%`}}),n.jsx("span",{className:"relative",children:m})]})}d.__docgenInfo={description:"",methods:[],displayName:"HoldButton",props:{onConfirm:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},durationMs:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"1200",computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{fn:B}=__STORYBOOK_MODULE_TEST__,T={component:d,args:{onConfirm:B(),children:"Hold to confirm"}},c={render:()=>{const[t,l]=s.useState(0);return n.jsxs("div",{className:"flex w-72 flex-col gap-3",children:[n.jsx(d,{onConfirm:()=>l(m=>m+1),children:"Hold to remove wallet"}),n.jsxs("p",{className:"text-sm text-muted-foreground",children:["Confirmed ",t," time",t===1?"":"s"]})]})}},u={render:()=>n.jsx("div",{className:"w-72",children:n.jsx(d,{durationMs:600,onConfirm:()=>{},children:"Hold to delete"})})};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [confirmed, setConfirmed] = useState(0);
    return <div className="flex w-72 flex-col gap-3">
        <HoldButton onConfirm={() => setConfirmed(n => n + 1)}>
          Hold to remove wallet
        </HoldButton>
        <p className="text-sm text-muted-foreground">
          Confirmed {confirmed} time{confirmed === 1 ? "" : "s"}
        </p>
      </div>;
  }
}`,...c.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-72">
      <HoldButton durationMs={600} onConfirm={() => {}}>
        Hold to delete
      </HoldButton>
    </div>
}`,...u.parameters?.docs?.source}}};const q=["Default","Quick"];export{c as Default,u as Quick,q as __namedExportsOrder,T as default};
