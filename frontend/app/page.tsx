"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import { analyzeProduct } from "@/lib/api";
import toast from "react-hot-toast";
import {
  ImageIcon, X, ArrowRight, Users, FileText, Tag,
  Sparkles, User, BarChart3, AtSign, Lightbulb, Zap, Award, MessageSquare
} from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    color: "var(--indigo)",
    bg: "var(--indigo-soft)",
    label: "AI Analysis",
    desc: "Brand tone, audience insights, platform recommendations & competitive edge",
  },
  {
    icon: AtSign,
    color: "var(--coral)",
    bg: "var(--coral-soft)",
    label: "Content Generation",
    desc: "Instagram captions, ad copy, scroll-stopping hooks, CTAs & hashtag strategy",
  },
  {
    icon: Lightbulb,
    color: "var(--amber)",
    bg: "var(--amber-soft)",
    label: "Creative Ideas",
    desc: "Reel scripts, carousel decks, UGC campaigns & full content calendar",
  },
  {
    icon: Award,
    color: "var(--emerald)",
    bg: "var(--emerald-soft)",
    label: "Marketing Score",
    desc: "8-dimension brand readiness score with actionable improvement tips",
  },
  {
    icon: FileText,
    color: "var(--sky)",
    bg: "var(--sky-soft)",
    label: "Full Report",
    desc: "SWOT, competitor analysis, 3-month strategy & budget allocation",
  },
  {
    icon: MessageSquare,
    color: "var(--indigo)",
    bg: "var(--indigo-soft)",
    label: "AI Chat",
    desc: "Context-aware brand assistant that knows your full marketing profile",
  },
];

export default function Home() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userName,setUserName]= useState("");
  const [form,    setForm]    = useState({ brandName: "", productDescription: "", targetAudience: "" });

  useEffect(() => {
    const n = localStorage.getItem("brandai_user_name");
    if (n) setUserName(n);
  }, []);

  function saveName(n: string) {
    setUserName(n);
    localStorage.setItem("brandai_user_name", n);
  }

  function handleFile(f: File) {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (e) => setPreview(e.target?.result as string);
      r.readAsDataURL(f);
    } else setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brandName || !form.productDescription) {
      toast.error("Brand name and description required");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("brandName", form.brandName);
      fd.append("productDescription", form.productDescription);
      fd.append("targetAudience", form.targetAudience);
      if (file) fd.append("image", file);
      const data = await analyzeProduct(fd);
      toast.success("Analysis complete!");
      router.push(`/project/${data.projectId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const hour   = new Date().getHours();
  const greet  = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main className="main-content" style={{ padding: "48px 52px 64px", overflowY: "auto" }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: "48px" }}>

          {/* Top row: pill + greeting */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "var(--indigo-soft)", border: "1px solid var(--indigo-border)", borderRadius: "99px", padding: "6px 16px" }}>
              <Sparkles size={12} color="var(--indigo)" />
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#a09cff", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Marketing Suite</span>
            </div>
            {userName && (
              <p style={{ fontSize: "13px", color: "var(--text-3)", fontWeight: 600 }}>{greet}, {userName} 👋</p>
            )}
          </div>

          {/* Big headline — mixed fonts */}
          <div style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, fontFamily: "'Cabinet Grotesk', sans-serif", color: "var(--text-1)", marginBottom: "4px" }}>
              Build your brand&apos;s
            </h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 300, letterSpacing: "-1px", lineHeight: 1.05, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--text-1)" }}>
                complete
              </span>
              <span className="gradient-text" style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                marketing
              </span>
              <span style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, fontFamily: "'Cabinet Grotesk', sans-serif", color: "var(--amber)" }}>
                kit
              </span>
            </div>
          </div>

          <p style={{ fontSize: "16px", color: "var(--text-2)", lineHeight: 1.7, maxWidth: "580px" }}>
            Upload your product, fill in the details, and watch AI generate your entire
            marketing strategy — captions, ads, hooks, campaigns — in seconds.
          </p>
        </div>

        {/* ── Two-column: Form + Features ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "28px", alignItems: "start" }}>

          {/* Left — Form card */}
          <div className="card" style={{ padding: "28px" }}>

            {/* Name input (only if no name yet) */}
            {!userName && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "var(--indigo-soft)", border: "1px solid var(--indigo-border)", borderRadius: "10px", marginBottom: "20px" }}>
                <User size={14} color="var(--indigo)" style={{ flexShrink: 0 }} />
                <input
                  className="input-field"
                  style={{ border: "none", background: "transparent", padding: "0", fontSize: "13px" }}
                  placeholder="Enter your name for a personalized experience..."
                  onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) saveName(e.currentTarget.value.trim()); }}
                  onBlur={(e) => { if (e.currentTarget.value.trim()) saveName(e.currentTarget.value.trim()); }}
                />
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* Upload zone */}
              <div>
                <p className="label" style={{ marginBottom: "10px" }}>Product Image / Video — <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: "10px" }}>optional</span></p>
                <div
                  onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => !file && fileRef.current?.click()}
                  style={{
                    border: `1.5px dashed ${file ? "var(--indigo)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: "12px", padding: "36px 20px", textAlign: "center",
                    cursor: file ? "default" : "pointer",
                    background: file ? "var(--indigo-soft)" : "rgba(255,255,255,0.02)",
                    transition: "all 0.2s", position: "relative", minHeight: "140px",
                    display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                  }}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="preview" style={{ maxHeight: "150px", maxWidth: "100%", borderRadius: "10px", objectFit: "contain" }} />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                        style={{ position: "absolute", top: "10px", right: "10px", width: "26px", height: "26px", borderRadius: "50%", background: "var(--coral-soft)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--coral)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <X size={12} />
                      </button>
                    </>
                  ) : file ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <FileText size={24} color="var(--indigo)" />
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)" }}>{file.name}</p>
                      <button type="button" onClick={() => { setFile(null); setPreview(null); }} style={{ fontSize: "11px", color: "var(--coral)", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--bg-overlay)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                        <ImageIcon size={20} color="var(--text-2)" />
                      </div>
                      <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "4px" }}>
                        <span style={{ color: "var(--indigo)", fontWeight: 700 }}>Click to upload</span> or drag & drop
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>PNG, JPG, WebP, MP4 — up to 20MB</p>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: "none" }} />
                </div>
              </div>

              {/* Brand name */}
              <div>
                <label className="label" style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                  <Tag size={10} /> Brand Name <span style={{ color: "var(--coral)", marginLeft: "2px" }}>*</span>
                </label>
                <input className="input-field" type="text" placeholder="e.g. Nike, Nykaa, Mamaearth..." value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} required />
              </div>

              {/* Description */}
              <div>
                <label className="label" style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                  <FileText size={10} /> Product Description <span style={{ color: "var(--coral)", marginLeft: "2px" }}>*</span>
                </label>
                <textarea className="input-field" placeholder="Describe your product — features, benefits, what makes it special..." value={form.productDescription} onChange={(e) => setForm({ ...form, productDescription: e.target.value })} rows={4} required style={{ resize: "vertical", minHeight: "96px" }} />
              </div>

              {/* Audience */}
              <div>
                <label className="label" style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                  <Users size={10} /> Target Audience
                </label>
                <input className="input-field" type="text" placeholder="e.g. Women 25–35, fitness enthusiasts, urban professionals..." value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "15px", marginTop: "4px" }}>
                {loading ? (
                  <><div className="spinner" style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%" }} /> Analyzing with AI...</>
                ) : (
                  <><Zap size={16} /> Generate Full Marketing Kit <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>

          {/* Right — What you'll get */}
          <div>
            <p className="label" style={{ marginBottom: "16px", color: "var(--text-2)" }}>What you&apos;ll get</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="card card-hover" style={{ padding: "16px 18px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: f.bg, border: `1px solid ${f.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={f.color} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: "13px", color: "var(--text-1)", marginBottom: "3px" }}>{f.label}</p>
                      <p style={{ fontSize: "12px", color: "var(--text-3)", lineHeight: 1.55 }}>{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
