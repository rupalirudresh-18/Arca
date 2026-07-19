"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import { getProjects } from "@/lib/api";
import { Plus, Sparkles, Bookmark, BarChart3, ArrowRight, ImageIcon, Clock, CheckCircle, TrendingUp, FileText, Target, Award } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api","") || "http://localhost:5000";

type Project = {
  id:string; brandName:string; productDescription:string; imagePath:string|null;
  createdAt:string; hasContent:boolean; hasCreative:boolean; hasReport:boolean;
  marketingScore:number|null; industry:string;
  savedOutputs:Array<{id:string;type:string;label:string}>;
};

function ScoreBadge({ score }:{score:number}) {
  const color = score>=85?"var(--emerald)":score>=70?"var(--amber)":"var(--coral)";
  return (
    <div style={{ width:"38px",height:"38px",borderRadius:"50%",background:`${color}18`,border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
      <span style={{ fontSize:"10px",fontWeight:900,color,letterSpacing:"-0.5px" }}>{score}%</span>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"projects"|"saved">(searchParams.get("tab")==="saved"?"saved":"projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(()=>{
    const n=localStorage.getItem("brandai_user_name"); if(n) setUserName(n);
    (async()=>{ try{ const d=await getProjects(); setProjects(d.projects); } catch{} finally{ setLoading(false); } })();
  },[]);

  const allSaved   = projects.flatMap(p=>(p.savedOutputs||[]).map(s=>({...s,brandName:p.brandName,projectId:p.id})));
  const avgScore   = projects.filter(p=>p.marketingScore).length>0
    ? Math.round(projects.filter(p=>p.marketingScore).reduce((a,p)=>a+(p.marketingScore||0),0)/projects.filter(p=>p.marketingScore).length) : null;

  const hour=new Date().getHours();
  const greet=hour<12?"Good Morning":hour<17?"Good Afternoon":"Good Evening";

  const stats=[
    { label:"Projects",       value:projects.length,                              icon:BarChart3,  color:"var(--indigo)"  },
    { label:"Content Kits",   value:projects.filter(p=>p.hasContent).length,      icon:Sparkles,   color:"var(--coral)"   },
    { label:"Creative Kits",  value:projects.filter(p=>p.hasCreative).length,     icon:TrendingUp, color:"var(--amber)"   },
    { label:"Reports",        value:projects.filter(p=>p.hasReport).length,       icon:FileText,   color:"var(--emerald)" },
    { label:"Saved Outputs",  value:allSaved.length,                              icon:Bookmark,   color:"var(--sky)"     },
    { label:"Avg Score",      value:avgScore?`${avgScore}%`:"—",                  icon:Award,      color:"var(--amber)"   },
  ];

  return (
    <div style={{ display:"flex" }}>
      <Sidebar/>
      <main className="main-content">
        {/* Top bar */}
        <div style={{ background:"var(--bg-surface)",borderBottom:"1px solid var(--border)",padding:"20px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10 }}>
          <div>
            <p style={{ fontSize:"13px",color:"var(--text-3)",fontWeight:600,marginBottom:"2px" }}>{greet}{userName?`, ${userName}`:""} 👋</p>
            <h1 className="font-display" style={{ fontSize:"22px",fontWeight:900,letterSpacing:"-0.5px" }}>Dashboard</h1>
          </div>
          <Link href="/" style={{ textDecoration:"none" }}><button className="btn-primary"><Plus size={14}/>New Project</button></Link>
        </div>

        <div style={{ padding:"32px 40px" }}>
          {/* Stats */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px",marginBottom:"32px" }}>
            {stats.map(s=>{
              const Icon=s.icon;
              return (
                <div key={s.label} className="card" style={{ padding:"18px 22px" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px" }}>
                    <p className="label">{s.label}</p>
                    <div style={{ width:"28px",height:"28px",borderRadius:"8px",background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Icon size={13} color={s.color}/>
                    </div>
                  </div>
                  <p className="stat-number gradient-text">{s.value}</p>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="tab-bar" style={{ marginBottom:"24px",display:"inline-flex" }}>
            <button className={`tab-item ${tab==="projects"?"active":""}`} onClick={()=>setTab("projects")}><BarChart3 size={13}/>Projects ({projects.length})</button>
            <button className={`tab-item ${tab==="saved"?"active":""}`}    onClick={()=>setTab("saved")}><Bookmark size={13}/>Saved ({allSaved.length})</button>
          </div>

          {/* Projects */}
          {tab==="projects" && (
            loading ? (
              <div style={{ display:"grid",gap:"10px" }}>{[1,2,3].map(i=><div key={i} className="card shimmer" style={{ height:"88px" }}/>)}</div>
            ) : projects.length===0 ? (
              <div className="card" style={{ padding:"64px",textAlign:"center" }}>
                <div style={{ width:"52px",height:"52px",borderRadius:"16px",background:"var(--indigo-soft)",border:"1px solid var(--indigo-border)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
                  <Sparkles size={22} color="var(--indigo)"/>
                </div>
                <h3 className="font-display" style={{ fontSize:"18px",fontWeight:900,marginBottom:"8px" }}>No projects yet</h3>
                <p style={{ color:"var(--text-2)",marginBottom:"20px",fontSize:"13px" }}>Create your first AI marketing project.</p>
                <Link href="/" style={{ textDecoration:"none" }}><button className="btn-primary"><Plus size={14}/>Create First Project</button></Link>
              </div>
            ) : (
              <div style={{ display:"grid",gap:"10px" }}>
                {projects.map(p=>(
                  <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration:"none" }}>
                    <div className="card card-hover" style={{ padding:"16px 20px",display:"flex",gap:"14px",alignItems:"center",cursor:"pointer" }}>
                      {p.imagePath ? (
                        <img src={`${API_BASE}${p.imagePath}`} alt="" style={{ width:"48px",height:"48px",borderRadius:"10px",objectFit:"cover",flexShrink:0,border:"1px solid var(--border)" }}/>
                      ) : (
                        <div style={{ width:"48px",height:"48px",borderRadius:"10px",background:"var(--bg-overlay)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid var(--border)" }}>
                          <ImageIcon size={17} color="var(--text-3)"/>
                        </div>
                      )}
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px" }}>
                          <p style={{ fontWeight:800,fontSize:"14px",color:"var(--text-1)" }}>{p.brandName}</p>
                          {p.industry&&<span className="badge badge-ghost" style={{ fontSize:"10px" }}>{p.industry}</span>}
                        </div>
                        <p style={{ fontSize:"12px",color:"var(--text-3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"7px" }}>{p.productDescription}</p>
                        <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
                          <span className="badge badge-emerald"><CheckCircle size={9}/>Analyzed</span>
                          {p.hasContent   &&<span className="badge badge-indigo"><Sparkles size={9}/>Content</span>}
                          {p.hasCreative  &&<span className="badge badge-amber"><TrendingUp size={9}/>Creative</span>}
                          {p.hasReport    &&<span className="badge badge-sky"><FileText size={9}/>Report</span>}
                          {(p.savedOutputs?.length||0)>0&&<span className="badge badge-ghost"><Bookmark size={9}/>{p.savedOutputs.length} saved</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:"14px",flexShrink:0 }}>
                        {p.marketingScore&&<ScoreBadge score={p.marketingScore}/>}
                        <div style={{ display:"flex",alignItems:"center",gap:"4px",color:"var(--text-3)",fontSize:"11px" }}>
                          <Clock size={11}/>{new Date(p.createdAt).toLocaleDateString()}
                        </div>
                        <ArrowRight size={15} color="var(--text-3)"/>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* Saved */}
          {tab==="saved" && (
            allSaved.length===0 ? (
              <div className="card" style={{ padding:"64px",textAlign:"center" }}>
                <Bookmark size={28} color="var(--text-3)" style={{ margin:"0 auto 12px" }}/>
                <h3 className="font-display" style={{ fontSize:"18px",fontWeight:900,marginBottom:"8px" }}>Nothing saved yet</h3>
                <p style={{ color:"var(--text-2)",fontSize:"13px" }}>Open a project and save content pieces you like.</p>
              </div>
            ) : (
              <div style={{ display:"grid",gap:"10px" }}>
                {allSaved.map(item=>(
                  <div key={item.id} className="card" style={{ padding:"14px 18px",display:"flex",gap:"12px",alignItems:"center" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",gap:"6px",marginBottom:"3px" }}>
                        <span className="badge badge-amber">{item.type.replace(/_/g," ")}</span>
                        <span style={{ fontSize:"11px",color:"var(--text-3)" }}>from {item.brandName}</span>
                      </div>
                      <p style={{ fontSize:"13px",fontWeight:700,color:"var(--text-1)" }}>{item.label}</p>
                    </div>
                    <Link href={`/project/${item.projectId}`} style={{ textDecoration:"none" }}>
                      <button className="btn-ghost" style={{ fontSize:"12px" }}><ArrowRight size={12}/>View</button>
                    </Link>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"var(--text-2)" }}>Loading...</div>}>
      <DashboardContent/>
    </Suspense>
  );
}
