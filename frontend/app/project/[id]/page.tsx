"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { getProject, generateContent, generateCreative, generateReport, sendChat, saveOutput, updateSettings } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Sparkles, Copy, Check, Bookmark, ChevronRight, Zap, AtSign,
  Target, Hash, Lightbulb, Video, Layout, Megaphone, Calendar,
  TrendingUp, Users, Globe, Star, ArrowRight, Download,
  CheckCircle, BarChart3, FileText, MessageSquare, Settings,
  Send, RefreshCw, Award, ShieldCheck, Layers, Eye,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api","") || "http://localhost:5000";


type AnyObj = Record<string, any>;
type Project = {
  id:string; brandName:string; productDescription:string; targetAudience:string;
  imagePath:string|null; analysis:AnyObj; content:AnyObj|null;
  creativeIdeas:AnyObj|null; report:AnyObj|null;
  chatHistory:Array<{role:string;content:string;time:string}>;
  settings:AnyObj; savedOutputs:Array<{id:string;type:string;content:string;label:string;savedAt:string}>;
};

/* Helpers  */
function CopyBtn({ text }: { text: string }) {
  const [ok,setOk] = useState(false);
  return (
    <button onClick={async()=>{ await navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false),2000); }}
      className="btn-ghost copy-btn" style={{ padding:"4px 9px", fontSize:"11px", gap:"4px" }}>
      {ok ? <><Check size={10} color="var(--emerald)"/>Copied</> : <><Copy size={10}/>Copy</>}
    </button>
  );
}

function SaveBtn({ projectId, type, content, label, onSave }: { projectId:string;type:string;content:string;label:string;onSave:()=>void }) {
  const [done,setDone] = useState(false);
  return (
    <button onClick={async()=>{ await saveOutput(projectId,type,content,label); setDone(true); onSave(); toast.success("Saved!"); setTimeout(()=>setDone(false),3000); }}
      disabled={done} className="btn-ghost" style={{ padding:"4px 9px", fontSize:"11px", gap:"4px" }}>
      {done ? <><CheckCircle size={10} color="var(--emerald)"/>Saved</> : <><Bookmark size={10}/>Save</>}
    </button>
  );
}

function Block({ title, body, color, projectId, type, label, onSave }: { title:string;body:string;color:string;projectId:string;type:string;label:string;onSave:()=>void }) {
  return (
    <div className="group" style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderLeft:`3px solid ${color}`,borderRadius:"10px",padding:"13px 15px" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"7px" }}>
        <p style={{ fontSize:"10px",fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.07em" }}>{title}</p>
        <div style={{ display:"flex",gap:"4px" }}><CopyBtn text={body}/><SaveBtn projectId={projectId} type={type} content={body} label={label} onSave={onSave}/></div>
      </div>
      <p style={{ fontSize:"13px",color:"var(--text-2)",lineHeight:1.7,whiteSpace:"pre-wrap" }}>{body}</p>
    </div>
  );
}

function SectionHead({ icon:Icon, label, color }: { icon:React.ElementType;label:string;color:string }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px" }}>
      <div style={{ width:"26px",height:"26px",borderRadius:"7px",background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <Icon size={13} color={color}/>
      </div>
      <h3 style={{ fontWeight:700,fontSize:"14px",color:"var(--text-1)" }}>{label}</h3>
    </div>
  );
}

/* Score Bar */
function ScoreBar({ label, value, color }: { label:string;value:number;color:string }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
        <span style={{ fontSize:"12px",color:"var(--text-2)",fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:"12px",fontWeight:700,color }}>{value}%</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width:`${value}%`,background:color }} />
      </div>
    </div>
  );
}

/* SWOT Box */
function SwotBox({ title, items, color, bg }: { title:string;items:string[];color:string;bg:string }) {
  return (
    <div style={{ background:bg,border:`1px solid ${color}33`,borderRadius:"10px",padding:"14px" }}>
      <p style={{ fontWeight:700,fontSize:"12px",color,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>{title}</p>
      {items.map((item,i) => (
        <div key={i} style={{ display:"flex",gap:"6px",marginBottom:"5px" }}>
          <div style={{ width:"5px",height:"5px",borderRadius:"50%",background:color,marginTop:"6px",flexShrink:0 }}/>
          <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams();
  const pid    = params.id as string;
  const [project,  setProject]  = useState<Project|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"analysis"|"content"|"creative"|"chat"|"report"|"settings"|"saved">("analysis");
  const [genLoading, setGen]    = useState<string|null>(null);

  // Chat state
  const [chatMsg, setChatMsg]   = useState("");
  const [chatLoading, setChatLoad] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [sForm, setSForm] = useState<AnyObj>({});
  const [sLoading, setSLoading] = useState(false);

  const load = useCallback(async () => {
    try { const d = await getProject(pid); setProject(d.project); setSForm(d.project.settings||{}); }
    catch { toast.error("Failed to load project"); }
    finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [project?.chatHistory]);

  async function doContent()  { setGen("content");  try { await generateContent(pid);  await load(); setTab("content");  toast.success("Content ready!"); } catch(e:unknown) { toast.error(e instanceof Error?e.message:"Failed"); } finally { setGen(null); } }
  async function doCreative() { setGen("creative"); try { await generateCreative(pid); await load(); setTab("creative"); toast.success("Creative ideas ready!"); } catch(e:unknown) { toast.error(e instanceof Error?e.message:"Failed"); } finally { setGen(null); } }
  async function doReport()   { setGen("report");   try { await generateReport(pid);   await load(); setTab("report");   toast.success("Report generated!"); } catch(e:unknown) { toast.error(e instanceof Error?e.message:"Failed"); } finally { setGen(null); } }

  async function doChat() {
    if (!chatMsg.trim()) return;
    const msg = chatMsg.trim();
    setChatMsg(""); setChatLoad(true);
    try { await sendChat(pid, msg); await load(); }
    catch (e:unknown) { toast.error(e instanceof Error?e.message:"Chat failed"); }
    finally { setChatLoad(false); }
  }

  async function saveSettings() {
    setSLoading(true);
    try { await updateSettings(pid, sForm); await load(); toast.success("Settings saved!"); }
    catch { toast.error("Failed to save settings"); }
    finally { setSLoading(false); }
  }

  // Quick suggestions for chat
  const suggestions = [
    "Give me 5 campaign ideas",
    "Rewrite the best caption",
    "Suggest email subject lines",
    "Compare with my competitors",
    "What content should I post this week?",
    "Improve my brand positioning",
  ];

  if (loading) return (
    <div style={{ display:"flex" }}><Sidebar/>
      <main className="main-content" style={{ display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div className="spinner" style={{ width:"36px",height:"36px",border:"3px solid var(--bg-overlay)",borderTop:"3px solid var(--amber)",borderRadius:"50%",margin:"0 auto 12px" }}/>
          <p style={{ color:"var(--text-2)",fontSize:"13px" }}>Loading project…</p>
        </div>
      </main>
    </div>
  );

  if (!project) return (
    <div style={{ display:"flex" }}><Sidebar/>
      <main className="main-content" style={{ padding:"48px 40px" }}>
        <div className="card" style={{ padding:"48px",textAlign:"center" }}><p style={{ color:"var(--text-2)" }}>Project not found</p></div>
      </main>
    </div>
  );

  const A  = project.analysis;
  const BP = A.brandProfile || {};
  const C  = project.content;
  const CR = project.creativeIdeas;
  const R  = project.report;
  const MS = A.marketingScore || {};

  const tabs = [
    { key:"analysis",  label:"Analysis",  icon:BarChart3      },
    { key:"content",   label:"Content",   icon:Sparkles       },
    { key:"creative",  label:"Creative",  icon:Lightbulb      },
    { key:"chat",      label:"AI Chat",   icon:MessageSquare  },
    { key:"report",    label:"Report",    icon:FileText       },
    { key:"settings",  label:"Settings",  icon:Settings       },
    { key:"saved",     label:`Saved (${project.savedOutputs?.length||0})`, icon:Bookmark },
  ];

  return (
    <div style={{ display:"flex" }}>
      <Sidebar/>
      <main className="main-content">

        {/* ── Top bar ── */}
        <div style={{ background:"var(--bg-raised)",borderBottom:"1px solid var(--border)",padding:"0 40px",position:"sticky",top:0,zIndex:10 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:"14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
              {project.imagePath ? (
                <img src={`${API_BASE}${project.imagePath}`} alt="" style={{ width:"42px",height:"42px",borderRadius:"10px",objectFit:"cover",border:"1px solid var(--border)",flexShrink:0 }}/>
              ) : (
                <div style={{ width:"42px",height:"42px",borderRadius:"10px",background:"var(--amber-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <Sparkles size={17} color="var(--amber)"/>
                </div>
              )}
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                  <h1 className="font-display" style={{ fontSize:"19px",fontWeight:600,letterSpacing:"-0.3px" }}>{project.brandName}</h1>
                  {BP.premiumLevel && <span className="badge badge-amber">{BP.premiumLevel}</span>}
                  {BP.industry     && <span className="badge badge-ink">{BP.industry}</span>}
                  {MS.overall      && <span className="badge badge-sage"><Award size={9}/> {MS.overall}% Score</span>}
                </div>
                <p style={{ fontSize:"11px",color:"var(--text-2)",marginTop:"2px" }}>
                  {project.productDescription.length>85 ? project.productDescription.slice(0,85)+"…" : project.productDescription}
                </p>
              </div>
            </div>
            <div style={{ display:"flex",gap:"7px",flexShrink:0 }}>
              {!C  && <button onClick={doContent}  disabled={!!genLoading} className="btn-primary"  style={{ fontSize:"12px",padding:"8px 14px" }}>{genLoading==="content"  ? "Generating…" : <><Zap size={12}/>Content</>}</button>}
              {!CR && <button onClick={doCreative} disabled={!!genLoading} className="btn-ghost"  style={{ fontSize:"12px",padding:"8px 14px" }}>{genLoading==="creative" ? "Generating…" : <><Lightbulb size={12}/>Creative</>}</button>}
              {!R  && <button onClick={doReport}   disabled={!!genLoading} className="btn-primary" style={{ fontSize:"12px",padding:"8px 14px" }}>{genLoading==="report"   ? "Generating…" : <><FileText size={12}/>Report</>}</button>}
            </div>
          </div>

          {/* Tab row */}
          <div className="tab-bar" style={{ marginTop:"12px" }}>
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={()=>setTab(t.key as typeof tab)}
                  className={`tab-item ${tab===t.key?"active":""}`}
                  style={{ display:"flex",alignItems:"center",gap:"5px" }}>
                  <Icon size={12}/>{t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/*  Content area */}
        <div style={{ padding:"28px 40px", maxWidth:"900px" }}>

          {/* ANALYSIS */}
          {tab==="analysis" && (
            <div className="fade-up" style={{ display:"grid",gap:"16px" }}>

              {/* Brand Profile Card */}
              {BP.usp && (
                <div className="card" style={{ padding:"22px" }}>
                  <SectionHead icon={Eye} label="Smart Brand Profile" color="var(--amber)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px",marginBottom:"16px" }}>
                    {[
                      { l:"Category",     v:BP.category      },
                      { l:"Industry",     v:BP.industry      },
                      { l:"Premium Level",v:BP.premiumLevel  },
                      { l:"Luxury Score", v:BP.luxuryScore ? `${BP.luxuryScore}/10` : null },
                      { l:"Packaging",    v:BP.packagingStyle },
                      { l:"Campaign Idea",v:BP.campaignIdea  },
                    ].filter(x=>x.v).map((x,i) => (
                      <div key={i}>
                        <p className="label" style={{ marginBottom:"3px" }}>{x.l}</p>
                        <p style={{ fontSize:"13px",color:"var(--text-1)",fontWeight:500 }}>{x.v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop:"1px solid var(--border)",paddingTop:"12px" }}>
                    <p className="label" style={{ marginBottom:"6px" }}>USP</p>
                    <p style={{ fontSize:"14px",fontWeight:600,color:"var(--amber)" }}>{BP.usp}</p>
                  </div>
                  {BP.suggestedColors?.length > 0 && (
                    <div style={{ marginTop:"12px" }}>
                      <p className="label" style={{ marginBottom:"6px" }}>Suggested Brand Colors</p>
                      <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                        {(BP.suggestedColors as string[]).map((c,i) => <span key={i} className="badge badge-ink">{c}</span>)}
                      </div>
                    </div>
                  )}
                  {BP.keywords?.length > 0 && (
                    <div style={{ marginTop:"12px" }}>
                      <p className="label" style={{ marginBottom:"6px" }}>Brand Keywords</p>
                      <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
                        {(BP.keywords as string[]).map((k,i) => <span key={i} className="badge badge-amber">{k}</span>)}
                      </div>
                    </div>
                  )}
                  {BP.competitors?.length > 0 && (
                    <div style={{ marginTop:"12px" }}>
                      <p className="label" style={{ marginBottom:"6px" }}>Competitors</p>
                      <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
                        {(BP.competitors as string[]).map((c,i) => <span key={i} className="badge badge-rose">{c}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Marketing Score */}
              {MS.overall && (
                <div className="card" style={{ padding:"22px" }}>
                  <SectionHead icon={Award} label="AI Marketing Score" color="var(--emerald)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr",gap:"24px",alignItems:"start" }}>
                    {/* Big score */}
                    <div style={{ textAlign:"center",padding:"20px",background:"var(--emerald-soft)",borderRadius:"14px",border:"1px solid var(--emerald)33" }}>
                      <p className="stat-number" style={{ color:"var(--emerald)",fontSize:"48px" }}>{MS.overall}%</p>
                      <p style={{ fontSize:"12px",color:"var(--emerald)",fontWeight:600,marginTop:"4px" }}>Overall Score</p>
                      <div style={{ display:"flex",justifyContent:"center",gap:"2px",marginTop:"8px" }}>
                        {[1,2,3,4,5].map(s => <Star key={s} size={14} color={s<=Math.round(MS.overall/20)?"var(--amber)":"var(--text-3)"} fill={s<=Math.round(MS.overall/20)?"var(--amber)":"transparent"}/>)}
                      </div>
                      <p style={{ fontSize:"11px",color:"var(--text-2)",marginTop:"6px" }}>Brand Readiness: {MS.brandReadiness}%</p>
                    </div>
                    {/* Score bars */}
                    <div>
                      <ScoreBar label="Audience Match"    value={MS.audienceMatch    ||0} color="var(--indigo)"/>
                      <ScoreBar label="Content Potential" value={MS.contentPotential ||0} color="var(--amber)"/>
                      <ScoreBar label="Platform Fit"      value={MS.platformFit      ||0} color="var(--emerald)"/>
                      <ScoreBar label="Viral Potential"   value={MS.viralPotential   ||0} color="var(--coral)"/>
                      <ScoreBar label="SEO Strength"      value={MS.seoStrength      ||0} color="var(--indigo)"/>
                      <ScoreBar label="Competitive Edge"  value={MS.competitiveEdge  ||0} color="var(--amber)"/>
                    </div>
                  </div>
                </div>
              )}

              {/* Brand + Voice */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px" }}>
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Star} label="Brand Personality" color="var(--amber)"/>
                  <p style={{ fontSize:"13px",color:"var(--text-2)",lineHeight:1.75 }}>{A.brandPersonality}</p>
                  {A.brandVoice && (
                    <div style={{ marginTop:"12px",paddingTop:"12px",borderTop:"1px solid var(--border)" }}>
                      <p className="label" style={{ marginBottom:"5px" }}>Brand Voice</p>
                      <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.65 }}>{A.brandVoice}</p>
                    </div>
                  )}
                </div>
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Target} label="Positioning" color="var(--coral)"/>
                  <p style={{ fontSize:"13px",color:"var(--text-2)",lineHeight:1.75,marginBottom:"10px" }}>{A.brandPositioning}</p>
                  <div style={{ borderTop:"1px solid var(--border)",paddingTop:"10px" }}>
                    <p className="label" style={{ marginBottom:"4px" }}>Marketing Angle</p>
                    <p style={{ fontSize:"12px",color:"var(--coral)",fontWeight:600 }}>{A.marketingAngle}</p>
                  </div>
                  <div style={{ marginTop:"10px" }}>
                    <p className="label" style={{ marginBottom:"4px" }}>Competitive Advantage</p>
                    <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{A.competitiveAdvantage}</p>
                  </div>
                </div>
              </div>

              {/* Customer Persona */}
              {A.customerPersona && (
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Users} label="Customer Persona" color="var(--indigo)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"auto 1fr",gap:"20px",alignItems:"start" }}>
                    <div style={{ width:"60px",height:"60px",borderRadius:"50%",background:"var(--indigo-soft)",border:"2px solid var(--indigo)33",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <p style={{ fontSize:"22px" }}>👤</p>
                    </div>
                    <div>
                      <p style={{ fontWeight:700,fontSize:"16px",marginBottom:"2px" }}>{A.customerPersona.name}</p>
                      <p style={{ fontSize:"12px",color:"var(--text-2)",marginBottom:"10px" }}>{A.customerPersona.age} • {A.customerPersona.occupation}</p>
                      <p style={{ fontSize:"13px",color:"var(--indigo)",fontStyle:"italic",marginBottom:"12px",background:"var(--indigo-soft)",padding:"8px 12px",borderRadius:"10px" }}>
                        "{A.customerPersona.quote}"
                      </p>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
                        <div>
                          <p className="label" style={{ marginBottom:"6px" }}>Goals</p>
                          {(A.customerPersona.goals||[]).map((g:string,i:number) => (
                            <div key={i} style={{ display:"flex",gap:"5px",marginBottom:"3px" }}>
                              <CheckCircle size={11} color="var(--emerald)" style={{ marginTop:"2px",flexShrink:0 }}/>
                              <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{g}</p>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="label" style={{ marginBottom:"6px" }}>Frustrations</p>
                          {(A.customerPersona.frustrations||[]).map((f:string,i:number) => (
                            <div key={i} style={{ display:"flex",gap:"5px",marginBottom:"3px" }}>
                              <div style={{ width:"9px",height:"9px",borderRadius:"50%",background:"var(--coral)",marginTop:"3px",flexShrink:0 }}/>
                              <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{f}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Audience */}
              {A.targetAudience && (
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Users} label="Audience Profile" color="var(--indigo)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px",marginBottom:"16px" }}>
                    {[
                      { l:"Age",       v:A.targetAudience.primaryAge },
                      { l:"Gender",    v:A.targetAudience.gender     },
                      { l:"Location",  v:A.targetAudience.location   },
                      { l:"Income",    v:A.targetAudience.income     },
                      { l:"Lifestyle", v:A.targetAudience.lifestyle  },
                    ].map((x,i) => (
                      <div key={i}>
                        <p className="label" style={{ marginBottom:"3px" }}>{x.l}</p>
                        <p style={{ fontSize:"12px",color:"var(--text-1)",fontWeight:500 }}>{x.v}</p>
                      </div>
                    ))}
                  </div>
                  {A.audienceInsights && (
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"20px" }}>
                      {["interests","painPoints","motivations"].map(k => {
                        const items:string[] = A.audienceInsights?.[k] || [];
                        const cols: Record<string,string> = { interests:"var(--indigo)", painPoints:"var(--coral)", motivations:"var(--emerald)" };
                        const labs: Record<string,string> = { interests:"Interests", painPoints:"Pain Points", motivations:"Motivations" };
                        return (
                          <div key={k}>
                            <p className="label" style={{ color:cols[k],marginBottom:"8px" }}>{labs[k]}</p>
                            {items.map((item,i) => (
                              <div key={i} style={{ display:"flex",gap:"6px",marginBottom:"4px" }}>
                                <div style={{ width:"5px",height:"5px",borderRadius:"50%",background:cols[k],marginTop:"6px",flexShrink:0 }}/>
                                <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{item}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SWOT */}
              {A.swot && (
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={ShieldCheck} label="SWOT Analysis" color="var(--text-2)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px" }}>
                    <SwotBox title="Strengths"    items={A.swot.strengths    ||[]} color="var(--emerald)"   bg="var(--emerald-soft)"/>
                    <SwotBox title="Weaknesses"   items={A.swot.weaknesses   ||[]} color="var(--coral)"   bg="var(--coral-soft)"/>
                    <SwotBox title="Opportunities"items={A.swot.opportunities||[]} color="var(--indigo)" bg="var(--indigo-soft)"/>
                    <SwotBox title="Threats"      items={A.swot.threats      ||[]} color="var(--amber)"  bg="var(--amber-soft)"/>
                  </div>
                </div>
              )}

              {/* Marketing Funnel */}
              {A.marketingFunnel && (
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Layers} label="Marketing Funnel Strategy" color="var(--indigo)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px" }}>
                    {[
                      { stage:"Awareness",     data:A.marketingFunnel.awareness,     color:"var(--indigo)" },
                      { stage:"Consideration", data:A.marketingFunnel.consideration, color:"var(--amber)"  },
                      { stage:"Conversion",    data:A.marketingFunnel.conversion,    color:"var(--emerald)"   },
                      { stage:"Retention",     data:A.marketingFunnel.retention,     color:"var(--coral)"   },
                    ].map(f => (
                      <div key={f.stage} style={{ background:"var(--bg-base)",border:`1px solid ${f.color}33`,borderTop:`3px solid ${f.color}`,borderRadius:"10px",padding:"12px" }}>
                        <p style={{ fontSize:"11px",fontWeight:700,color:f.color,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"6px" }}>{f.stage}</p>
                        <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.6 }}>{f.data}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Strategy */}
              {A.contentStrategy && (
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Layout} label="Content Strategy" color="var(--amber)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px" }}>
                    <div>
                      <p className="label" style={{ marginBottom:"7px" }}>Content Pillars</p>
                      {(A.contentStrategy.pillars||[]).map((p:string,i:number) => (
                        <div key={i} style={{ display:"flex",gap:"6px",marginBottom:"5px" }}>
                          <div style={{ width:"16px",height:"16px",borderRadius:"4px",background:"var(--amber-soft)",border:"1px solid var(--amber)44",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"10px",fontWeight:700,color:"var(--amber)" }}>{i+1}</div>
                          <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{p}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="label" style={{ marginBottom:"7px" }}>Themes</p>
                      <div style={{ display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"12px" }}>
                        {(A.contentStrategy.themes||[]).map((t:string,i:number) => <span key={i} className="badge badge-amber">{t}</span>)}
                      </div>
                      <p className="label" style={{ marginBottom:"4px" }}>Content Mix</p>
                      <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{A.contentStrategy.contentMix}</p>
                      <p className="label" style={{ marginBottom:"4px",marginTop:"8px" }}>Best Times</p>
                      <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{A.contentStrategy.bestPostingTimes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Platforms */}
              {A.platformRecommendations && (
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Globe} label="Platform Recommendations" color="var(--indigo)"/>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"10px" }}>
                    {(A.platformRecommendations as AnyObj[]).map((p,i) => (
                      <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"12px" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
                          <p style={{ fontWeight:700,fontSize:"13px" }}>{p.platform}</p>
                          <div style={{ display:"flex",gap:"5px" }}>
                            <span className={`badge ${p.priority==="High"?"badge-coral":p.priority==="Medium"?"badge-amber":"badge-ghost"}`}>{p.priority}</span>
                          </div>
                        </div>
                        <p style={{ fontSize:"11px",color:"var(--text-2)",marginBottom:"4px" }}>{p.reason}</p>
                        <p style={{ fontSize:"11px",color:"var(--indigo)",fontWeight:600,marginBottom:"3px" }}>{p.contentType}</p>
                        {p.postingFrequency && <p style={{ fontSize:"10px",color:"var(--text-3)" }}>📅 {p.postingFrequency}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immediate Actions */}
              {A.immediateActions && (
                <div className="card" style={{ padding:"20px" }}>
                  <SectionHead icon={Zap} label="3 Immediate Actions" color="var(--coral)"/>
                  <div style={{ display:"grid",gap:"10px" }}>
                    {(A.immediateActions as AnyObj[]).map((act,i) => (
                      <div key={i} style={{ display:"flex",gap:"12px",alignItems:"flex-start",background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"14px" }}>
                        <div style={{ width:"24px",height:"24px",borderRadius:"50%",background:act.impact==="High"?"var(--coral-soft)":"var(--amber-soft)",border:`1px solid ${act.impact==="High"?"var(--coral)":"var(--amber)"}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"11px",fontWeight:800,color:act.impact==="High"?"var(--coral)":"var(--amber)" }}>{i+1}</div>
                        <div>
                          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px" }}>
                            <p style={{ fontWeight:700,fontSize:"13px" }}>{act.action}</p>
                            <span className={`badge ${act.impact==="High"?"badge-coral":"badge-amber"}`}>{act.impact} impact</span>
                          </div>
                          <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.6 }}>{act.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emotional Triggers */}
              {A.emotionalTriggers && (
                <div className="card" style={{ padding:"18px 20px" }}>
                  <p style={{ fontWeight:700,fontSize:"13px",marginBottom:"10px" }}>Emotional Triggers</p>
                  <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                    {(A.emotionalTriggers as string[]).map((t,i) => <span key={i} className="badge badge-rose">{t}</span>)}
                  </div>
                </div>
              )}

              {!C && (
                <div style={{ background:"var(--amber-soft)",border:"1px solid rgba(200,135,58,0.25)",borderRadius:"14px",padding:"24px",textAlign:"center" }}>
                  <Sparkles size={24} color="var(--amber)" style={{ margin:"0 auto 10px" }}/>
                  <h3 className="font-display" style={{ fontSize:"17px",fontWeight:600,marginBottom:"6px" }}>Ready to generate content?</h3>
                  <p style={{ color:"var(--text-2)",fontSize:"13px",marginBottom:"16px" }}>Create captions, ads, hooks, email subject lines, CTAs and hashtags.</p>
                  <button onClick={doContent} disabled={!!genLoading} className="btn-primary">
                    {genLoading==="content" ? "Generating…" : <><Zap size={13}/>Generate Marketing Content<ArrowRight size={13}/></>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ CONTENT ═══ */}
          {tab==="content" && (
            <div className="fade-up" style={{ display:"grid",gap:"16px" }}>
              {!C ? (
                <div className="card" style={{ padding:"56px",textAlign:"center" }}>
                  <Zap size={28} color="var(--amber)" style={{ margin:"0 auto 12px" }}/>
                  <h3 className="font-display" style={{ fontSize:"17px",fontWeight:600,marginBottom:"8px" }}>Content not generated yet</h3>
                  <button onClick={doContent} disabled={!!genLoading} className="btn-primary">
                    {genLoading==="content" ? "Generating…" : <><Zap size={13}/>Generate Content</>}
                  </button>
                </div>
              ) : (
                <>
                  {/* Instagram Captions — all 3 versions */}
                  <div className="card" style={{ padding:"20px" }}>
                    <SectionHead icon={AtSign} label="Instagram Captions" color="var(--coral)"/>
                    <div style={{ display:"grid",gap:"16px" }}>
                      {(C.instagramCaptions as AnyObj[]||[]).map((cap,i) => (
                        <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderLeft:"3px solid var(--coral)",borderRadius:"10px",padding:"14px" }}>
                          <p style={{ fontSize:"11px",fontWeight:700,color:"var(--coral)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px" }}>{cap.style}</p>
                          <div style={{ display:"grid",gap:"8px" }}>
                            {[
                              { label:"Short Version",  body:cap.short },
                              { label:"Long Version",   body:cap.long  },
                              { label:"Emoji Version",  body:cap.emojiVersion },
                            ].map(v => v.body && (
                              <div key={v.label} className="group" style={{ background:"var(--bg-raised)",border:"1px solid var(--border)",borderRadius:"6px",padding:"10px 12px" }}>
                                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"5px" }}>
                                  <p style={{ fontSize:"10px",fontWeight:600,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.06em" }}>{v.label}</p>
                                  <div style={{ display:"flex",gap:"4px" }}>
                                    <CopyBtn text={v.body}/>
                                    <SaveBtn projectId={project.id} type="caption" content={v.body} label={`${cap.style} — ${v.label}`} onSave={load}/>
                                  </div>
                                </div>
                                <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.65 }}>{v.body}</p>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop:"10px",paddingTop:"10px",borderTop:"1px solid var(--border)",display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap" }}>
                            <span style={{ fontSize:"11px",fontWeight:600,color:"var(--text-2)" }}>CTA:</span>
                            <span className="badge badge-rose">{cap.cta}</span>
                            {(cap.hashtags||[]).slice(0,3).map((h:string,hi:number) => <span key={hi} className="badge badge-cobalt">{h}</span>)}
                            {(cap.hashtags||[]).length > 3 && <span style={{ fontSize:"11px",color:"var(--text-3)" }}>+{cap.hashtags.length-3} more</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email Subject Lines */}
                  {C.emailSubjectLines && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={AtSign} label="Email Subject Lines" color="var(--emerald)"/>
                      <div style={{ display:"grid",gap:"8px" }}>
                        {(C.emailSubjectLines as AnyObj[]).map((s,i) => (
                          <div key={i} className="group" style={{ display:"flex",gap:"10px",alignItems:"center",padding:"10px 13px",background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px" }}>
                            <span className="badge badge-sage" style={{ flexShrink:0 }}>{s.type}</span>
                            <p style={{ fontSize:"13px",color:"var(--text-1)",flex:1,fontWeight:500 }}>"{s.subject}"</p>
                            <CopyBtn text={s.subject}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hooks */}
                  <div className="card" style={{ padding:"20px" }}>
                    <SectionHead icon={TrendingUp} label="Scroll-Stopping Hooks" color="var(--amber)"/>
                    <div style={{ display:"grid",gap:"7px" }}>
                      {(C.hooks as AnyObj[]||[]).map((h,i) => (
                        <div key={i} className="group" style={{ display:"flex",gap:"10px",alignItems:"center",padding:"10px 13px",background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px" }}>
                          <span className="badge badge-amber" style={{ flexShrink:0 }}>{h.type}</span>
                          <p style={{ fontSize:"13px",color:"var(--text-1)",flex:1,fontStyle:"italic" }}>"{h.hook}"</p>
                          <div style={{ display:"flex",gap:"4px" }}>
                            <CopyBtn text={h.hook}/>
                            <SaveBtn projectId={project.id} type="hook" content={h.hook} label={`Hook: ${h.type}`} onSave={load}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ad Copy */}
                  <div className="card" style={{ padding:"20px" }}>
                    <SectionHead icon={Target} label="Ad Copy" color="var(--indigo)"/>
                    <div style={{ display:"grid",gap:"10px" }}>
                      {(C.adCopy as AnyObj[]||[]).map((ad,i) => (
                        <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderLeft:"3px solid var(--indigo)",borderRadius:"10px",padding:"13px 15px" }}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px" }}>
                            <div style={{ display:"flex",gap:"6px" }}>
                              <span className="badge badge-cobalt">{ad.platform}</span>
                            </div>
                            <div style={{ display:"flex",gap:"4px" }}>
                              <CopyBtn text={`${ad.headline}\n\n${ad.body}`}/>
                              <SaveBtn projectId={project.id} type="ad_copy" content={`${ad.headline}\n\n${ad.body}`} label={`Ad: ${ad.platform}`} onSave={load}/>
                            </div>
                          </div>
                          <p style={{ fontWeight:700,fontSize:"14px",marginBottom:"4px" }}>{ad.headline}</p>
                          <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.65,marginBottom:"6px" }}>{ad.body}</p>
                          <span className="badge badge-sage">{ad.cta}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTAs + Hashtags */}
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px" }}>
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={ArrowRight} label="CTA Suggestions" color="var(--emerald)"/>
                      <div style={{ display:"grid",gap:"7px" }}>
                        {(C.ctaSuggestions as AnyObj[]||[]).map((cta,i) => (
                          <div key={i} className="group" style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"10px 12px" }}>
                            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px" }}>
                              <p style={{ fontWeight:700,fontSize:"13px",color:"var(--emerald)" }}>"{cta.action}"</p>
                              <CopyBtn text={cta.action}/>
                            </div>
                            <div style={{ display:"flex",gap:"5px" }}>
                              <span className={`badge ${cta.urgency==="High"?"badge-coral":cta.urgency==="Medium"?"badge-amber":"badge-ghost"}`}>{cta.urgency}</span>
                            </div>
                            <p style={{ fontSize:"11px",color:"var(--text-3)",marginTop:"4px" }}>{cta.context}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {C.hashtags && (
                      <div className="card" style={{ padding:"20px" }}>
                        <SectionHead icon={Hash} label="Hashtag Strategy" color="var(--indigo)"/>
                        {Object.entries(C.hashtags as Record<string,string[]>).map(([key,tags]) => (
                          <div key={key} style={{ marginBottom:"10px" }}>
                            <p className="label" style={{ color:"var(--indigo)",marginBottom:"5px" }}>{key}</p>
                            <div style={{ display:"flex",gap:"4px",flexWrap:"wrap" }}>
                              {tags.map((t,i) => <span key={i} className="badge badge-cobalt" style={{ cursor:"pointer" }} onClick={()=>navigator.clipboard.writeText(t)}>{t}</span>)}
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>{ const all=Object.values(C.hashtags as Record<string,string[]>).flat().join(" "); navigator.clipboard.writeText(all); toast.success("All hashtags copied!"); }}
                          className="btn-ghost" style={{ fontSize:"11px",padding:"6px 10px",marginTop:"4px" }}>
                          <Copy size={10}/> Copy All
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ CREATIVE ═══ */}
          {tab==="creative" && (
            <div className="fade-up" style={{ display:"grid",gap:"16px" }}>
              {!CR ? (
                <div className="card" style={{ padding:"56px",textAlign:"center" }}>
                  <Lightbulb size={28} color="var(--amber)" style={{ margin:"0 auto 12px" }}/>
                  <h3 className="font-display" style={{ fontSize:"17px",fontWeight:600,marginBottom:"8px" }}>Creative ideas not generated yet</h3>
                  <button onClick={doCreative} disabled={!!genLoading} className="btn-primary">
                    {genLoading==="creative" ? "Generating…" : <><Lightbulb size={13}/>Generate Creative Ideas</>}
                  </button>
                </div>
              ) : (
                <>
                  {/* Reels */}
                  <div className="card" style={{ padding:"20px" }}>
                    <SectionHead icon={Video} label="Reel Ideas" color="var(--coral)"/>
                    <div style={{ display:"grid",gap:"12px" }}>
                      {(CR.reelIdeas as AnyObj[]||[]).map((reel,i) => (
                        <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"14px" }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px" }}>
                            <div>
                              <p style={{ fontWeight:700,fontSize:"14px",marginBottom:"4px" }}>{reel.title}</p>
                              <div style={{ display:"flex",gap:"5px" }}>
                                <span className="badge badge-rose">{reel.duration}</span>
                                <span className={`badge ${reel.viralPotential==="High"?"badge-emerald":"badge-amber"}`}>🔥 {reel.viralPotential} viral</span>
                              </div>
                            </div>
                            <SaveBtn projectId={project.id} type="reel_idea" content={`${reel.title}\n\nConcept: ${reel.concept}\nHook: ${reel.hook}\nScript: ${reel.script||""}`} label={`Reel: ${reel.title}`} onSave={load}/>
                          </div>
                          <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.65,marginBottom:"10px" }}>{reel.concept}</p>
                          {reel.script && (
                            <div style={{ background:"var(--bg-raised)",border:"1px solid var(--border)",borderRadius:"6px",padding:"10px",marginBottom:"10px" }}>
                              <p className="label" style={{ marginBottom:"4px" }}>Script Outline</p>
                              <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.6 }}>{reel.script}</p>
                            </div>
                          )}
                          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",borderTop:"1px solid var(--border)",paddingTop:"10px" }}>
                            {[["Hook",reel.hook],["Music",reel.music],["Visual",reel.visualStyle]].map(([l,v])=>(
                              <div key={l as string}><p className="label" style={{ marginBottom:"2px" }}>{l}</p><p style={{ fontSize:"11px",color:"var(--text-2)" }}>{v}</p></div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Carousels */}
                  <div className="card" style={{ padding:"20px" }}>
                    <SectionHead icon={Layout} label="Carousel Ideas" color="var(--indigo)"/>
                    <div style={{ display:"grid",gap:"12px" }}>
                      {(CR.carouselIdeas as AnyObj[]||[]).map((car,i) => (
                        <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"14px" }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px" }}>
                            <div>
                              <p style={{ fontWeight:700,fontSize:"14px",marginBottom:"4px" }}>{car.title}</p>
                              <span className={`badge ${car.objective==="conversion"?"badge-emerald":car.objective==="awareness"?"badge-indigo":"badge-amber"}`}>{car.objective}</span>
                            </div>
                            <SaveBtn projectId={project.id} type="carousel" content={`${car.title}\n${car.concept}`} label={`Carousel: ${car.title}`} onSave={load}/>
                          </div>
                          <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.65,marginBottom:"10px" }}>{car.concept}</p>
                          <p className="label" style={{ marginBottom:"7px" }}>Slides</p>
                          <div style={{ display:"flex",flexDirection:"column",gap:"5px" }}>
                            {(car.slides as string[]).map((s,si) => (
                              <div key={si} style={{ display:"flex",gap:"8px",alignItems:"flex-start" }}>
                                <div style={{ width:"18px",height:"18px",borderRadius:"5px",background:"var(--indigo-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"10px",fontWeight:700,color:"var(--indigo)" }}>{si+1}</div>
                                <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{s}</p>
                              </div>
                            ))}
                          </div>
                          {car.designTip && <p style={{ fontSize:"12px",color:"var(--indigo)",marginTop:"10px",padding:"8px 10px",background:"var(--indigo-soft)",borderRadius:"6px" }}>💡 {String(car.designTip)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Campaigns */}
                  <div className="card" style={{ padding:"20px" }}>
                    <SectionHead icon={Megaphone} label="Campaign Strategies" color="var(--amber)"/>
                    <div style={{ display:"grid",gap:"12px" }}>
                      {(CR.campaignSuggestions as AnyObj[]||[]).map((camp,i) => (
                        <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderLeft:"3px solid var(--amber)",borderRadius:"10px",padding:"16px" }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px" }}>
                            <div>
                              <p style={{ fontWeight:800,fontSize:"15px",marginBottom:"3px" }}>{camp.campaignName}</p>
                              <p style={{ fontSize:"13px",color:"var(--amber)",fontStyle:"italic",marginBottom:"6px" }}>"{camp.tagline}"</p>
                              <div style={{ display:"flex",gap:"5px" }}>
                                <span className="badge badge-amber">{camp.duration}</span>
                                <span className={`badge ${camp.budget==="Low"?"badge-emerald":camp.budget==="Medium"?"badge-amber":"badge-coral"}`}>{camp.budget} budget</span>
                              </div>
                            </div>
                            <SaveBtn projectId={project.id} type="campaign" content={`${camp.campaignName}\n"${camp.tagline}"\n\n${camp.concept}`} label={`Campaign: ${camp.campaignName}`} onSave={load}/>
                          </div>
                          <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.65,marginBottom:"12px" }}>{camp.concept}</p>
                          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
                            <div>
                              <p className="label" style={{ marginBottom:"6px" }}>Key Activations</p>
                              {(camp.keyActivations as string[]).map((a,ai) => (
                                <div key={ai} style={{ display:"flex",gap:"5px",marginBottom:"4px" }}>
                                  <ChevronRight size={11} color="var(--amber)" style={{ marginTop:"2px",flexShrink:0 }}/>
                                  <p style={{ fontSize:"11px",color:"var(--text-2)" }}>{a}</p>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="label" style={{ marginBottom:"6px" }}>Channels</p>
                              <div style={{ display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"8px" }}>
                                {(camp.channels as string[]).map((ch,ci) => <span key={ci} className="badge badge-cobalt">{ch}</span>)}
                              </div>
                              {camp.kpis && <>
                                <p className="label" style={{ marginBottom:"4px" }}>KPIs</p>
                                {(camp.kpis as string[]).map((k,ki) => <p key={ki} style={{ fontSize:"11px",color:"var(--text-2)" }}>• {k}</p>)}
                              </>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* UGC Ideas */}
                  {CR.ugcIdeas && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={Users} label="UGC Campaign Ideas" color="var(--coral)"/>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px" }}>
                        {(CR.ugcIdeas as AnyObj[]).map((u,i) => (
                          <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"13px" }}>
                            <p style={{ fontWeight:600,fontSize:"13px",marginBottom:"5px" }}>{u.idea}</p>
                            <p style={{ fontSize:"12px",color:"var(--text-2)",marginBottom:"5px" }}>{u.mechanic}</p>
                            <span className="badge badge-sage">🎁 {u.incentive}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Calendar */}
                  {CR.contentCalendarThemes && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={Calendar} label="Monthly Content Calendar" color="var(--emerald)"/>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"10px" }}>
                        {(CR.contentCalendarThemes as AnyObj[]).map((wk,i) => (
                          <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderLeft:"3px solid var(--emerald)",borderRadius:"10px",padding:"12px" }}>
                            <p className="label" style={{ color:"var(--emerald)",marginBottom:"4px" }}>{wk.week}</p>
                            <p style={{ fontWeight:700,fontSize:"13px",marginBottom:"3px" }}>{wk.theme}</p>
                            <p style={{ fontSize:"11px",color:"var(--text-3)",marginBottom:"3px" }}>{wk.contentMix}</p>
                            {wk.focus && <p style={{ fontSize:"11px",color:"var(--text-2)",fontStyle:"italic" }}>Focus: {wk.focus}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ AI CHAT ═══ */}
          {tab==="chat" && (
            <div className="fade-up">
              <div className="card" style={{ overflow:"hidden", display:"flex", flexDirection:"column", height:"calc(100vh - 220px)" }}>
                {/* Chat header */}
                <div style={{ padding:"16px 20px",borderBottom:"1px solid var(--border)",background:"var(--bg-raised)",flexShrink:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                    <div style={{ width:"32px",height:"32px",borderRadius:"50%",background:"var(--text-1)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Sparkles size={14} color="var(--amber-mid)"/>
                    </div>
                    <div>
                      <p style={{ fontWeight:700,fontSize:"13px" }}>BrandAI Assistant</p>
                      <p style={{ fontSize:"11px",color:"var(--text-2)" }}>Knows everything about {project.brandName}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"14px" }}>
                  {/* Welcome */}
                  {(!project.chatHistory || project.chatHistory.length===0) && (
                    <div style={{ textAlign:"center",padding:"32px 20px" }}>
                      <div style={{ width:"52px",height:"52px",borderRadius:"50%",background:"var(--amber-soft)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
                        <MessageSquare size={22} color="var(--amber)"/>
                      </div>
                      <h3 className="font-display" style={{ fontSize:"18px",fontWeight:600,marginBottom:"6px" }}>Ask me anything about {project.brandName}</h3>
                      <p style={{ fontSize:"13px",color:"var(--text-2)",marginBottom:"20px" }}>I have full context of your brand profile, audience, competitors, and marketing strategy.</p>
                      {/* Quick suggestions */}
                      <div style={{ display:"flex",flexWrap:"wrap",gap:"6px",justifyContent:"center" }}>
                        {suggestions.map((s,i) => (
                          <button key={i} onClick={()=>setChatMsg(s)} className="btn-ghost" style={{ fontSize:"12px",padding:"6px 12px" }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(project.chatHistory||[]).map((msg,i) => (
                    <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start",gap:"4px" }}>
                      {msg.role==="user" ? (
                        <div className="chat-bubble-user">{msg.content}</div>
                      ) : (
                        <div style={{ display:"flex",gap:"8px",alignItems:"flex-start",maxWidth:"88%" }}>
                          <div style={{ width:"24px",height:"24px",borderRadius:"50%",background:"var(--text-1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"2px" }}>
                            <Sparkles size={11} color="var(--amber-mid)"/>
                          </div>
                          <div>
                            <div className="chat-bubble-ai">{msg.content}</div>
                            <button onClick={()=>navigator.clipboard.writeText(msg.content)} style={{ fontSize:"10px",color:"var(--text-3)",background:"none",border:"none",cursor:"pointer",marginTop:"4px",display:"flex",alignItems:"center",gap:"3px" }}>
                              <Copy size={9}/> Copy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {chatLoading && (
                    <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
                      <div style={{ width:"24px",height:"24px",borderRadius:"50%",background:"var(--text-1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <Sparkles size={11} color="var(--amber-mid)"/>
                      </div>
                      <div style={{ display:"flex",gap:"4px",padding:"12px 16px",background:"var(--bg-raised)",border:"1px solid var(--border)",borderRadius:"14px 14px 14px 4px" }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width:"6px",height:"6px",borderRadius:"50%",background:"var(--text-3)",animation:`fadeUp 1s ${i*0.2}s ease infinite` }}/>
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>

                {/* Input */}
                <div style={{ padding:"14px 16px",borderTop:"1px solid var(--border)",background:"var(--bg-raised)",flexShrink:0 }}>
                  <div style={{ display:"flex",gap:"8px" }}>
                    <input
                      className="input-field"
                      value={chatMsg}
                      onChange={e=>setChatMsg(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); doChat(); } }}
                      placeholder={`Ask anything about ${project.brandName}…`}
                      disabled={chatLoading}
                    />
                    <button onClick={doChat} disabled={chatLoading||!chatMsg.trim()} className="btn-primary" style={{ padding:"10px 16px",flexShrink:0 }}>
                      {chatLoading ? <div className="spinner" style={{ width:"14px",height:"14px",border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%" }}/> : <Send size={15}/>}
                    </button>
                  </div>
                  <p style={{ fontSize:"10px",color:"var(--text-3)",marginTop:"6px" }}>Uses your full brand profile as context · Press Enter to send</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ REPORT ═══ */}
          {tab==="report" && (
            <div className="fade-up" style={{ display:"grid",gap:"16px" }}>
              {!R ? (
                <div className="card" style={{ padding:"56px",textAlign:"center" }}>
                  <FileText size={28} color="var(--indigo)" style={{ margin:"0 auto 12px" }}/>
                  <h3 className="font-display" style={{ fontSize:"17px",fontWeight:600,marginBottom:"8px" }}>Marketing Report not generated yet</h3>
                  <p style={{ color:"var(--text-2)",marginBottom:"20px",fontSize:"13px" }}>Executive summary, SWOT, competitive analysis, strategy, KPIs and 3-month content calendar.</p>
                  <button onClick={doReport} disabled={!!genLoading} className="btn-primary">
                    {genLoading==="report" ? "Generating…" : <><FileText size={13}/>Generate Full Report</>}
                  </button>
                </div>
              ) : (
                <>
                  {/* Report Header */}
                  <div className="card" style={{ padding:"22px", background:"var(bg-raised)" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                      <div>
                        <p style={{ fontSize:"11px",color:"rgba(253,252,249,0.5)",marginBottom:"6px",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600 }}>Marketing Intelligence Report</p>
                        <h2 className="font-display" style={{ fontSize:"22px",fontWeight:600,color:"#fdfcf9",letterSpacing:"-0.5px",marginBottom:"4px" }}>{project.brandName}</h2>
                        <p style={{ fontSize:"12px",color:"rgba(253,252,249,0.4)" }}>Generated {new Date(R.generatedAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => {
                          window.print();
                        }} className="btn-ghost" style={{ color:"rgba(253,252,249,0.7)", borderColor:"rgba(253,252,249,0.15)", fontSize:"12px", padding:"8px 14px" }}>
                          <Download size={13}/> Export PDF
                        </button>
                  </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="card" style={{ padding:"20px" }}>
                    <SectionHead icon={FileText} label="Executive Summary" color="var(--indigo)"/>
                    <p style={{ fontSize:"13px",color:"var(--text-2)",lineHeight:1.8 }}>{R.executiveSummary}</p>
                  </div>

                  {/* Market Overview */}
                  {R.marketOverview && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={Globe} label="Market Overview" color="var(--emerald)"/>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"16px",marginBottom:"14px" }}>
                        <div>
                          <p className="label" style={{ marginBottom:"4px" }}>Market Size</p>
                          <p style={{ fontSize:"13px",color:"var(--text-1)",fontWeight:600 }}>{R.marketOverview.marketSize}</p>
                        </div>
                        <div>
                          <p className="label" style={{ marginBottom:"4px" }}>Growth Trend</p>
                          <p style={{ fontSize:"13px",color:"var(--emerald)",fontWeight:600 }}>{R.marketOverview.growthTrend}</p>
                        </div>
                      </div>
                      <p className="label" style={{ marginBottom:"7px" }}>Key Trends</p>
                      <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px" }}>
                        {(R.marketOverview.keyTrends as string[]).map((t,i) => <span key={i} className="badge badge-sage">{t}</span>)}
                      </div>
                      <div style={{ background:"var(--emerald-soft)",border:"1px solid var(--emerald)33",borderRadius:"10px",padding:"12px" }}>
                        <p className="label" style={{ marginBottom:"4px" }}>Market Opportunity</p>
                        <p style={{ fontSize:"12px",color:"var(--text-2)" }}>{R.marketOverview.marketOpportunity}</p>
                      </div>
                    </div>
                  )}

                  {/* Audience Analysis */}
                  {R.audienceAnalysis && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={Users} label="Audience Analysis" color="var(--indigo)"/>
                      <p style={{ fontSize:"13px",color:"var(--text-2)",lineHeight:1.75,marginBottom:"14px" }}>{R.audienceAnalysis.overview}</p>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"10px",marginBottom:"14px" }}>
                        {(R.audienceAnalysis.segments as AnyObj[]).map((seg,i) => (
                          <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"12px" }}>
                            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
                              <p style={{ fontWeight:700,fontSize:"13px" }}>{seg.name}</p>
                              <span className="badge badge-cobalt">{seg.size}</span>
                            </div>
                            <p style={{ fontSize:"12px",color:"var(--text-2)",marginBottom:"5px" }}>{seg.description}</p>
                            <p style={{ fontSize:"11px",color:"var(--indigo)" }}>→ {seg.howToReach}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Competitor Analysis */}
                  {R.competitorAnalysis && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={TrendingUp} label="Competitor Analysis" color="var(--coral)"/>
                      <p style={{ fontSize:"13px",color:"var(--text-2)",lineHeight:1.75,marginBottom:"14px" }}>{R.competitorAnalysis.overview}</p>
                      <div style={{ display:"grid",gap:"10px",marginBottom:"12px" }}>
                        {(R.competitorAnalysis.competitors as AnyObj[]).map((comp,i) => (
                          <div key={i} style={{ display:"grid",gridTemplateColumns:"auto 1fr 1fr 1fr",gap:"12px",alignItems:"center",padding:"12px",background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px" }}>
                            <p style={{ fontWeight:700,fontSize:"13px",minWidth:"80px" }}>{comp.name}</p>
                            <div><p className="label" style={{ color:"var(--emerald)",marginBottom:"2px" }}>Strength</p><p style={{ fontSize:"11px",color:"var(--text-2)" }}>{comp.strength}</p></div>
                            <div><p className="label" style={{ color:"var(--coral)",marginBottom:"2px" }}>Weakness</p><p style={{ fontSize:"11px",color:"var(--text-2)" }}>{comp.weakness}</p></div>
                            <div><p className="label" style={{ color:"var(--indigo)",marginBottom:"2px" }}>Our Edge</p><p style={{ fontSize:"11px",color:"var(--text-2)" }}>{comp.opportunity}</p></div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background:"var(--amber-soft)",border:"1px solid rgba(200,135,58,0.25)",borderRadius:"10px",padding:"12px" }}>
                        <p className="label" style={{ marginBottom:"4px" }}>Our Differentiator</p>
                        <p style={{ fontSize:"13px",color:"var(--amber)",fontWeight:600 }}>{R.competitorAnalysis.differentiator}</p>
                      </div>
                    </div>
                  )}

                  {/* SWOT */}
                  {R.swotAnalysis && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={ShieldCheck} label="SWOT Analysis" color="var(--text-2)"/>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px" }}>
                        <SwotBox title="Strengths"     items={R.swotAnalysis.strengths    ||[]} color="var(--emerald)"   bg="var(--emerald-soft)"/>
                        <SwotBox title="Weaknesses"    items={R.swotAnalysis.weaknesses   ||[]} color="var(--coral)"   bg="var(--coral-soft)"/>
                        <SwotBox title="Opportunities" items={R.swotAnalysis.opportunities||[]} color="var(--indigo)" bg="var(--indigo-soft)"/>
                        <SwotBox title="Threats"       items={R.swotAnalysis.threats      ||[]} color="var(--amber)"  bg="var(--amber-soft)"/>
                      </div>
                      {R.swotAnalysis.strategicImplications && (
                        <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.7,padding:"12px",background:"var(--bg-base)",borderRadius:"10px",border:"1px solid var(--border)" }}>{R.swotAnalysis.strategicImplications}</p>
                      )}
                    </div>
                  )}

                  {/* Strategy */}
                  {R.marketingStrategy && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={Target} label="Marketing Strategy" color="var(--amber)"/>
                      <p style={{ fontSize:"13px",color:"var(--text-2)",lineHeight:1.75,marginBottom:"16px" }}>{R.marketingStrategy.overarchingStrategy}</p>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px" }}>
                        {[
                          { label:"Short Term (0-30d)",  items:R.marketingStrategy.shortTerm,  color:"var(--coral)"   },
                          { label:"Medium Term (30-90d)", items:R.marketingStrategy.mediumTerm, color:"var(--amber)"  },
                          { label:"Long Term (90d+)",    items:R.marketingStrategy.longTerm,    color:"var(--emerald)"   },
                        ].map(s => (
                          <div key={s.label} style={{ background:"var(--bg-base)",border:`1px solid ${s.color}33`,borderTop:`3px solid ${s.color}`,borderRadius:"10px",padding:"12px" }}>
                            <p style={{ fontSize:"10px",fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>{s.label}</p>
                            {(s.items as string[]).map((item,i) => (
                              <div key={i} style={{ display:"flex",gap:"5px",marginBottom:"5px" }}>
                                <ChevronRight size={11} color={s.color} style={{ marginTop:"2px",flexShrink:0 }}/>
                                <p style={{ fontSize:"11px",color:"var(--text-2)" }}>{item}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      {/* Budget allocation */}
                      {R.marketingStrategy.budgetAllocation && (
                        <div>
                          <p className="label" style={{ marginBottom:"10px" }}>Budget Allocation</p>
                          {(R.marketingStrategy.budgetAllocation as AnyObj[]).map((b,i) => (
                            <div key={i} style={{ marginBottom:"10px" }}>
                              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                                <span style={{ fontSize:"12px",color:"var(--text-2)",fontWeight:500 }}>{b.channel}</span>
                                <span style={{ fontSize:"12px",fontWeight:700,color:"var(--amber)" }}>{b.percentage}%</span>
                              </div>
                              <div className="score-bar-track">
                                <div className="score-bar-fill" style={{ width:`${b.percentage}%`,background:"var(--amber)" }}/>
                              </div>
                              <p style={{ fontSize:"11px",color:"var(--text-3)",marginTop:"2px" }}>{b.rationale}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3-month calendar */}
                  {R.contentCalendar && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={Calendar} label="3-Month Content Calendar" color="var(--emerald)"/>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px" }}>
                        {(R.contentCalendar as AnyObj[]).map((m,i) => (
                          <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderLeft:"3px solid var(--emerald)",borderRadius:"10px",padding:"14px" }}>
                            <p className="label" style={{ color:"var(--emerald)",marginBottom:"5px" }}>{m.month}</p>
                            <p style={{ fontWeight:700,fontSize:"13px",marginBottom:"4px" }}>{m.theme}</p>
                            <p style={{ fontSize:"12px",color:"var(--text-2)",marginBottom:"8px" }}>{m.goals}</p>
                            {(m.keyContent as string[]).map((c,ci) => (
                              <div key={ci} style={{ display:"flex",gap:"5px",marginBottom:"3px" }}>
                                <div style={{ width:"4px",height:"4px",borderRadius:"50%",background:"var(--emerald)",marginTop:"5px",flexShrink:0 }}/>
                                <p style={{ fontSize:"11px",color:"var(--text-2)" }}>{c}</p>
                              </div>
                            ))}
                            <p style={{ fontSize:"10px",color:"var(--emerald)",fontWeight:600,marginTop:"8px" }}>📊 KPI: {m.kpi}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KPIs */}
                  {R.kpis && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={BarChart3} label="KPIs to Track" color="var(--indigo)"/>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"10px" }}>
                        {(R.kpis as AnyObj[]).map((kpi,i) => (
                          <div key={i} style={{ background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"12px" }}>
                            <p style={{ fontWeight:700,fontSize:"13px",marginBottom:"4px" }}>{kpi.metric}</p>
                            <p style={{ fontSize:"14px",fontWeight:800,color:"var(--indigo)",marginBottom:"4px" }}>{kpi.target}</p>
                            <p style={{ fontSize:"11px",color:"var(--text-3)" }}>{kpi.howToMeasure}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {R.recommendations && (
                    <div className="card" style={{ padding:"20px" }}>
                      <SectionHead icon={Star} label="Top Recommendations" color="var(--amber)"/>
                      <div style={{ display:"grid",gap:"10px" }}>
                        {(R.recommendations as AnyObj[]).map((rec,i) => (
                          <div key={i} style={{ display:"flex",gap:"12px",background:"var(--bg-base)",border:"1px solid var(--border)",borderRadius:"10px",padding:"14px" }}>
                            <div style={{ width:"28px",height:"28px",borderRadius:"50%",background:"var(--amber-soft)",border:"1px solid rgba(200,135,58,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:800,fontSize:"12px",color:"var(--amber)" }}>{rec.priority}</div>
                            <div>
                              <p style={{ fontWeight:700,fontSize:"13px",marginBottom:"4px" }}>{rec.title}</p>
                              <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.6,marginBottom:"6px" }}>{rec.description}</p>
                              <div style={{ display:"flex",gap:"6px" }}>
                                <span className="badge badge-sage">Impact: {rec.expectedImpact}</span>
                                <span className="badge badge-ink">Timeline: {rec.timeline}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conclusion */}
                  {R.conclusion && (
                    <div className="card" style={{ padding:"20px",background:"var(bg-raised)" }}>
                      <p className="label" style={{ color:"rgba(253,252,249,0.4)",marginBottom:"10px" }}>Conclusion</p>
                      <p style={{ fontSize:"13px",color:"rgba(253,252,249,0.75)",lineHeight:1.8 }}>{R.conclusion}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab==="settings" && (
            <div className="fade-up">
              <div className="card" style={{ padding:"24px" }}>
                <SectionHead icon={Settings} label="Project Settings" color="var(--amber)"/>
                <p style={{ fontSize:"13px",color:"var(--text-2)",marginBottom:"20px" }}>This information is used by all AI modules to give you more accurate, personalized output.</p>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px" }}>
                  {[
                    { key:"businessName", label:"Business Name",   placeholder:"Official business name"             },
                    { key:"industry",     label:"Industry",        placeholder:"e.g. Beauty, Tech, Food"            },
                    { key:"audience",     label:"Target Audience", placeholder:"e.g. Women 25–35 in metro cities"   },
                    { key:"budget",       label:"Monthly Budget",  placeholder:"e.g. ₹50,000 / $1,000"              },
                    { key:"country",      label:"Country / Market",placeholder:"e.g. India, USA, Global"            },
                    { key:"website",      label:"Website URL",     placeholder:"https://yourbrand.com"              },
                    { key:"instagram",    label:"Instagram Handle",placeholder:"@yourbrand"                         },
                    { key:"competitors",  label:"Key Competitors", placeholder:"Brand A, Brand B, Brand C"          },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="label" style={{ display:"block",marginBottom:"6px" }}>{field.label}</label>
                      <input className="input-field" value={sForm[field.key]||""} onChange={e=>setSForm({...sForm,[field.key]:e.target.value})} placeholder={field.placeholder}/>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginTop:"16px" }}>
                  {[
                    { key:"brandVoice", label:"Brand Voice",  placeholder:"e.g. Energetic, witty, empowering — speaks like a friend", rows:3 },
                    { key:"mission",    label:"Mission",       placeholder:"Why your brand exists", rows:3 },
                    { key:"vision",     label:"Vision",        placeholder:"Where your brand is headed in 5 years", rows:3 },
                  ].map(field => (
                    <div key={field.key} style={field.key==="brandVoice"?{}:{}}>
                      <label className="label" style={{ display:"block",marginBottom:"6px" }}>{field.label}</label>
                      <textarea className="input-field" value={sForm[field.key]||""} onChange={e=>setSForm({...sForm,[field.key]:e.target.value})} placeholder={field.placeholder} rows={field.rows} style={{ resize:"vertical" }}/>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:"20px",display:"flex",gap:"10px" }}>
                  <button onClick={saveSettings} disabled={sLoading} className="btn-primary" style={{ padding:"11px 24px" }}>
                    {sLoading ? "Saving…" : <><CheckCircle size={14}/>Save Settings</>}
                  </button>
                  <p style={{ fontSize:"12px",color:"var(--text-3)",alignSelf:"center" }}>Settings are used in all future AI generations for this project.</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SAVED ═══ */}
          {tab==="saved" && (
            <div className="fade-up" style={{ display:"grid",gap:"12px" }}>
              {!project.savedOutputs?.length ? (
                <div className="card" style={{ padding:"56px",textAlign:"center" }}>
                  <Bookmark size={28} color="var(--text-3)" style={{ margin:"0 auto 12px" }}/>
                  <h3 className="font-display" style={{ fontSize:"17px",fontWeight:600,marginBottom:"8px" }}>Nothing saved yet</h3>
                  <p style={{ color:"var(--text-2)",fontSize:"13px" }}>Click Save on any content piece to bookmark it here.</p>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <p style={{ fontSize:"13px",color:"var(--text-2)" }}>{project.savedOutputs.length} saved item{project.savedOutputs.length>1?"s":""}</p>
                    <button onClick={()=>{ const all=project.savedOutputs.map(s=>`[${s.label}]\n${s.content}`).join("\n\n---\n\n"); const blob=new Blob([all],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${project.brandName}-saved-outputs.txt`; a.click(); toast.success("Exported!"); }}
                      className="btn-ghost" style={{ fontSize:"12px",padding:"7px 12px" }}>
                      <Download size={12}/> Export All
                    </button>
                  </div>
                  {project.savedOutputs.map(item => (
                    <div key={item.id} className="card" style={{ padding:"15px 18px" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"7px" }}>
                        <div style={{ display:"flex",gap:"7px",alignItems:"center" }}>
                          <span className="badge badge-amber">{item.type.replace(/_/g," ")}</span>
                          <p style={{ fontWeight:700,fontSize:"12px" }}>{item.label}</p>
                        </div>
                        <div style={{ display:"flex",gap:"5px",alignItems:"center" }}>
                          <p style={{ fontSize:"10px",color:"var(--text-3)" }}>{new Date(item.savedAt).toLocaleDateString()}</p>
                          <CopyBtn text={item.content}/>
                        </div>
                      </div>
                      <p style={{ fontSize:"12px",color:"var(--text-2)",lineHeight:1.65,whiteSpace:"pre-wrap" }}>
                        {item.content.length>250 ? item.content.slice(0,250)+"…" : item.content}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
