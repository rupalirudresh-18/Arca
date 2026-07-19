"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LayoutDashboard, PlusCircle, Bookmark, Zap } from "lucide-react";

const nav = [
  { href:"/",                    label:"New Project",   icon:PlusCircle,    accent:true  },
  { href:"/dashboard",           label:"Dashboard",     icon:LayoutDashboard             },
  { href:"/dashboard?tab=saved", label:"Saved Outputs", icon:Bookmark                    },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding:"28px 20px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"34px", height:"34px", borderRadius:"10px", background:"var(--gradient-brand)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <p className="font-display gradient-text" style={{ fontSize:"18px", fontWeight:900, letterSpacing:"-0.5px" }}>ARCA</p>
        </div>
        <p style={{ fontSize:"11px", color:"var(--text-3)", marginTop:"6px", paddingLeft:"44px", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>Brand Intelligence</p>
      </div>

      <div className="divider" style={{ margin:"0 16px" }} />

      {/* Nav */}
      <nav style={{ padding:"14px 10px", flex:1 }}>
        <p className="label" style={{ padding:"0 12px", marginBottom:"10px" }}>Navigation</p>
        {nav.map(item => {
          const active = item.href==="/" ? path==="/" : path.startsWith(item.href.split("?")[0]);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration:"none" }}>
              <div style={{
                display:"flex", alignItems:"center", gap:"9px",
                padding:"9px 12px", borderRadius:"10px", marginBottom:"2px",
                background: active ? "var(--indigo-soft)" : "transparent",
                border: active ? "1px solid var(--indigo-border)" : "1px solid transparent",
                color: active ? "#a09cff" : "var(--text-2)",
                fontWeight: active ? 700 : 500, fontSize:"13px",
                transition:"all 0.18s", cursor:"pointer",
              }}>
                <Icon size={15} />
                <span>{item.label}</span>
                {item.accent && !active && (
                  <span style={{ marginLeft:"auto", background:"var(--amber-soft)", color:"var(--amber)", fontSize:"10px", fontWeight:700, padding:"2px 7px", borderRadius:"99px", border:"1px solid rgba(251,191,36,0.2)" }}>New</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom card */}
      <div style={{ padding:"12px 10px 24px" }}>
        <div style={{ background:"var(--indigo-soft)", borderRadius:"12px", padding:"14px", border:"1px solid var(--indigo-border)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"6px" }}>
            <Zap size={12} color="var(--amber)" />
            <span style={{ fontSize:"10px", fontWeight:800, color:"var(--amber)", textTransform:"uppercase", letterSpacing:"0.1em" }}>AI Powered</span>
          </div>
          <p style={{ fontSize:"12px", color:"var(--text-2)", lineHeight:1.55 }}>
            Upload your product and get a complete marketing strategy in seconds.
          </p>
        </div>
      </div>
    </aside>
  );
}
