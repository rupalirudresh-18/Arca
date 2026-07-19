const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Request failed"); }
  return res.json();
}

export const analyzeProduct    = (fd: FormData)                             => fetch(`${BASE}/analyze`, { method:"POST", body:fd }).then(r => { if(!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json(); });
export const generateContent   = (projectId: string)                        => request("/generate-content",  { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ projectId }) });
export const generateCreative  = (projectId: string)                        => request("/generate-creative", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ projectId }) });
export const generateReport    = (projectId: string)                        => request("/generate-report",   { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ projectId }) });
export const sendChat          = (projectId: string, message: string)       => request("/chat",              { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ projectId, message }) });
export const getProjects       = ()                                          => request("/projects");
export const getProject        = (id: string)                               => request(`/projects/${id}`);
export const saveOutput        = (projectId: string, type: string, content: string, label: string) => request(`/projects/${projectId}/save`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ type, content, label }) });
export const getSettings       = (projectId: string)                        => request(`/projects/${projectId}/settings`);
export const updateSettings    = (projectId: string, data: Record<string, string>) => request(`/projects/${projectId}/settings`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
