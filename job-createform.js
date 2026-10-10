/**
 * job-createform.js — single-file job openings editor for the Open Roles section.
 *
 * Setup:
 *   npm
 *   node job-createform.js
 *   Open http://localhost:3000/job-createform.html
 *
 * The public website's Open Roles section should GET /api/jobs and render the
 * returned jobs. Protect this admin page with HTTPS and replace the default
 * in-memory session store before production deployment.
 */
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  "mongodb+srv://wasimanwar76:h13esWsPKXSsFf3H@cluster0.dgob2ep.mongodb.net/?appName=Cluster0";
const ADMIN_ID = "24SCSE2030475";
const ADMIN_PASSWORD = "8709863288";
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(
  session({
    name: "jobs_admin",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 60 * 60 * 1000,
    },
  }),
);

const jobSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    skills: { type: String, required: true, trim: true, maxlength: 240 },
    employmentType: {
      type: String,
      required: true,
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Consultant"],
    },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    about: { type: String, required: true, trim: true, maxlength: 3000 },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    applicationEmail: {
      type: String,
      default: "careers@dynamonexovra.com",
      trim: true,
      maxlength: 180,
    },
    applicationSubject: { type: String, trim: true, maxlength: 180 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Job = mongoose.model("Job", jobSchema);
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: "Please sign in again." });
};
const cleanLines = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

function normalizeJob(body) {
  const allowedTypes = [
    "Full-time",
    "Part-time",
    "Contract",
    "Internship",
    "Consultant",
  ];
  const data = {
    category: String(body.category || "").trim(),
    title: String(body.title || "").trim(),
    skills: String(body.skills || "").trim(),
    employmentType: String(body.employmentType || "Full-time"),
    location: String(body.location || "").trim(),
    about: String(body.about || "").trim(),
    responsibilities: Array.isArray(body.responsibilities)
      ? body.responsibilities
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 30)
      : cleanLines(body.responsibilities),
    requirements: Array.isArray(body.requirements)
      ? body.requirements
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 30)
      : cleanLines(body.requirements),
    applicationEmail: String(
      body.applicationEmail || "careers@dynamonexovra.com",
    ).trim(),
    applicationSubject: String(body.applicationSubject || "").trim(),
    active: body.active !== false,
  };
  if (
    !data.category ||
    !data.title ||
    !data.skills ||
    !data.location ||
    !data.about
  ) {
    const err = new Error(
      "Please complete category, job title, skills, location and role description.",
    );
    err.status = 400;
    throw err;
  }
  if (!allowedTypes.includes(data.employmentType)) {
    const err = new Error("Select a valid employment type.");
    err.status = 400;
    throw err;
  }
  if (
    data.applicationEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.applicationEmail)
  ) {
    const err = new Error("Enter a valid application email address.");
    err.status = 400;
    throw err;
  }
  return data;
}

app.get("/job-createform.html", (req, res) => res.type("html").send(PAGE));
app.get("/", (req, res) => res.redirect("/job-createform.html"));

app.post("/api/admin/login", (req, res) => {
  const id = String(req.body.id || "");
  const password = String(req.body.password || "");
  const safeEqual = (a, b) => {
    const aa = Buffer.from(a),
      bb = Buffer.from(b);
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
  };
  if (!safeEqual(id, ADMIN_ID) || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "ID or password is incorrect." });
  }
  req.session.regenerate((err) => {
    if (err)
      return res.status(500).json({ error: "Could not start secure session." });
    req.session.isAdmin = true;
    res.json({ ok: true });
  });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Public read endpoint for the website's Open Roles section.
app.get(
  "/api/jobs",
  asyncRoute(async (req, res) => {
    const jobs = await Job.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json(jobs);
  }),
);

// Admin-only list, create, edit and delete endpoints.
app.get(
  "/api/admin/jobs",
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json(await Job.find().sort({ createdAt: -1 }).lean());
  }),
);
app.post(
  "/api/admin/jobs",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const job = await Job.create(normalizeJob(req.body));
    res.status(201).json(job);
  }),
);
app.put(
  "/api/admin/jobs/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: "Invalid job ID." });
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      normalizeJob(req.body),
      { new: true, runValidators: true },
    );
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json(job);
  }),
);
app.delete(
  "/api/admin/jobs/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: "Invalid job ID." });
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json({ ok: true });
  }),
);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError")
    return res.status(400).json({ error: err.message });
  res.status(err.status || 500).json({
    error: err.status ? err.message : "Server error. Check server logs.",
  });
});

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Open Roles Manager — DYNAMONEXOVRA</title>
<style>
:root{--ink:#17182b;--muted:#666b80;--line:#e6e7ef;--brand:#211b8f;--bg:#f6f7fb;--red:#b42318;--green:#087443}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif}
main{width:min(1100px,calc(100% - 32px));margin:38px auto}.brand{font-size:13px;letter-spacing:.12em;font-weight:800;color:var(--brand)}h1{font-size:clamp(26px,4vw,38px);line-height:1.15;margin:8px 0}p{color:var(--muted)}.panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:clamp(18px,3vw,30px);box-shadow:0 12px 34px #20204a0a;margin-top:22px}
.login{max-width:460px;margin:42px auto}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.full{grid-column:1/-1}label{display:block;font-size:13px;font-weight:700;margin:0 0 6px}input,select,textarea{width:100%;border:1px solid #d8dae6;border-radius:10px;padding:12px 13px;font:inherit;color:var(--ink);background:white;outline:none}input:focus,select:focus,textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px #211b8f17}textarea{resize:vertical;min-height:100px}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}button{border:0;border-radius:10px;padding:11px 16px;font:700 14px inherit;cursor:pointer;background:var(--brand);color:white}button.secondary{background:#efeff8;color:var(--ink)}button.danger{background:#fff0ef;color:var(--red)}button:disabled{opacity:.55;cursor:wait}.top{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}.hidden{display:none!important}.notice{padding:12px 14px;border-radius:10px;margin:12px 0;background:#f1f2ff;color:var(--brand)}.notice.error{background:#fff0ef;color:var(--red)}.notice.success{background:#eaf8f0;color:var(--green)}.job{border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:12px;display:flex;gap:16px;justify-content:space-between;align-items:flex-start}.job h3{margin:3px 0 5px}.job p{margin:3px 0}.tag{display:inline-block;background:#f0f0fa;color:var(--brand);border-radius:20px;padding:3px 9px;font-size:12px;font-weight:700}.muted{font-size:13px;color:var(--muted)}.job-actions{display:flex;gap:8px;flex-wrap:wrap}.status{font-size:13px;color:var(--muted)}@media(max-width:650px){.grid{grid-template-columns:1fr}.full{grid-column:auto}.job{display:block}.job-actions{margin-top:12px}}
</style></head>
<body><main>
<div class="brand">DYNAMONEXOVRA · CONSULT</div>
<h1>Open Roles Manager</h1><p>Manage the jobs displayed in the “Current openings” section of your website.</p>
<div id="message" class="notice hidden" role="status"></div>
<section id="loginPanel" class="panel login">
<h2>Administrator sign in</h2><p>Sign in to add, update or remove job listings.</p>
<form id="loginForm"><div style="margin:16px 0"><label for="adminId">Administrator ID</label><input id="adminId" autocomplete="username" required></div>
<div style="margin:16px 0"><label for="adminPassword">Password</label><input id="adminPassword" type="password" autocomplete="current-password" required></div>
<button id="loginButton" type="submit">Sign in securely</button></form>
<p class="muted">Credentials are checked by the server, not in this page.</p>
</section>
<section id="adminPanel" class="hidden">
<div class="top"><div><h2>Job listings</h2><p class="status" id="count">Loading jobs…</p></div><div class="actions"><button id="newButton" type="button">＋ Add a job</button><button class="secondary" id="refreshButton" type="button">Refresh</button><button class="secondary" id="logoutButton" type="button">Sign out</button></div></div>
<div id="jobList" class="panel"><p>Loading existing jobs…</p></div>
<section id="formPanel" class="panel hidden"><div class="top"><div><h2 id="formTitle">Create a job</h2><p>Add the same information visitors see in the Open Roles section.</p></div><button class="secondary" id="cancelButton" type="button">Cancel</button></div>
<form id="jobForm"><input type="hidden" id="jobId">
<div class="grid">
<div><label for="category">Discipline / category *</label><input id="category" placeholder="Web Development, Cloud & DevOps…" required maxlength="80"></div>
<div><label for="title">Job title *</label><input id="title" placeholder="Full Stack Web Engineer" required maxlength="120"></div>
<div><label for="skills">Skills shown under title *</label><input id="skills" placeholder="React.js, Node.js, TypeScript…" required maxlength="240"></div>
<div><label for="employmentType">Employment type *</label><select id="employmentType"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Consultant</option></select></div>
<div class="full"><label for="location">Location / work arrangement *</label><input id="location" placeholder="Auraiya / Remote" required maxlength="120"></div>
<div class="full"><label for="about">About the role *</label><textarea id="about" placeholder="Describe the role in clear, visitor-friendly language…" required maxlength="3000"></textarea></div>
<div class="full"><label for="responsibilities">Responsibilities (one item per line)</label><textarea id="responsibilities" placeholder="Build and maintain applications&#10;Write tests and take part in code reviews"></textarea></div>
<div class="full"><label for="requirements">Requirements (one item per line)</label><textarea id="requirements" placeholder="Experience with relevant technologies&#10;Clear written communication"></textarea></div>
<div><label for="applicationEmail">Application email</label><input id="applicationEmail" type="email" value="careers@dynamonexovra.com"></div>
<div><label for="applicationSubject">Email subject</label><input id="applicationSubject" placeholder="Application: Full Stack Web Engineer" maxlength="180"></div>
<div class="full"><label><input id="active" type="checkbox" checked style="width:auto;margin-right:8px">Publish this job on the public website</label></div>
</div><div class="actions"><button id="saveButton" type="submit">Save job</button><button class="secondary" id="resetButton" type="button">Clear form</button></div>
</form></section>
</section>
</main>
<script>
const $ = id => document.getElementById(id);
const message = (text, type="") => { const el=$("message"); el.textContent=text; el.className="notice"+(type?" "+type:""); el.classList.remove("hidden"); };
const clearMessage = () => $("message").classList.add("hidden");
async function api(url, options={}) {
  const response = await fetch(url, {credentials:"same-origin", ...options, headers:{"Content-Type":"application/json", ...(options.headers||{})}});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) { if(response.status===401 && url.startsWith("/api/admin/") && !url.includes("/login")) showLogin(); throw new Error(data.error||"Request failed."); }
  return data;
}
function showLogin(){ $("loginPanel").classList.remove("hidden"); $("adminPanel").classList.add("hidden"); $("formPanel").classList.add("hidden"); }
function showAdmin(){ $("loginPanel").classList.add("hidden"); $("adminPanel").classList.remove("hidden"); }
$("loginForm").addEventListener("submit", async e=>{e.preventDefault(); clearMessage(); $("loginButton").disabled=true; try{await api("/api/admin/login",{method:"POST",body:JSON.stringify({id:$("adminId").value,password:$("adminPassword").value})}); $("adminPassword").value=""; showAdmin(); await loadJobs(); message("Signed in successfully.","success");}catch(err){message(err.message,"error");}finally{$("loginButton").disabled=false;}});
const fieldIds=["category","title","skills","employmentType","location","about","responsibilities","requirements","applicationEmail","applicationSubject","active"];
function formData(){const o={}; for(const id of fieldIds){o[id]=id==="active"?$(id).checked:$(id).value;} return o;}
function resetForm(){ $("jobForm").reset(); $("jobId").value=""; $("active").checked=true; $("applicationEmail").value="careers@dynamonexovra.com"; $("formTitle").textContent="Create a job"; $("saveButton").textContent="Save job"; }
function openForm(job){clearMessage(); resetForm(); if(job){$("jobId").value=job._id; for(const id of fieldIds){if(id==="responsibilities"||id==="requirements") $(id).value=(job[id]||[]).join("\\n"); else if(id==="active") $(id).checked=job.active!==false; else if(job[id]!==undefined) $(id).value=job[id];} $("formTitle").textContent="Edit job"; $("saveButton").textContent="Update job";} $("formPanel").classList.remove("hidden"); $("formPanel").scrollIntoView({behavior:"smooth",block:"start"});}
function safeText(value){const el=document.createElement("span");el.textContent=value||"";return el.innerHTML;}
function renderJobs(jobs){$("count").textContent=jobs.length+" job listing"+(jobs.length===1?"":"s")+" in MongoDB";const list=$("jobList");list.replaceChildren();if(!jobs.length){list.innerHTML="<p>No jobs yet. Select “Add a job” to create the first opening.</p>";return;}
jobs.forEach(job=>{const article=document.createElement("article");article.className="job";const info=document.createElement("div");info.style.flex="1";info.innerHTML='<span class="tag">'+safeText(job.category)+'</span><h3>'+safeText(job.title)+'</h3><p>'+safeText(job.skills)+'</p><p class="muted">'+safeText(job.employmentType)+' · '+safeText(job.location)+'</p><p class="muted">'+(job.active===false?"Not published":"Published")+'</p>';const actions=document.createElement("div");actions.className="job-actions";const edit=document.createElement("button");edit.className="secondary";edit.textContent="Edit";edit.addEventListener("click",()=>openForm(job));const del=document.createElement("button");del.className="danger";del.textContent="Delete";del.addEventListener("click",async()=>{if(!confirm('Permanently delete “'+job.title+'”? This cannot be undone.'))return;try{await api("/api/admin/jobs/"+encodeURIComponent(job._id),{method:"DELETE"});message("Job deleted.","success");await loadJobs();}catch(err){message(err.message,"error");}});actions.append(edit,del);article.append(info,actions);list.append(article);});}
async function loadJobs(){ $("jobList").innerHTML="<p>Loading jobs…</p>"; try{const jobs=await api("/api/admin/jobs");renderJobs(jobs);}catch(err){message(err.message,"error");}}
$("jobForm").addEventListener("submit",async e=>{e.preventDefault();clearMessage();const id=$("jobId").value;const payload=formData();payload.responsibilities=payload.responsibilities.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);payload.requirements=payload.requirements.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);$("saveButton").disabled=true;try{await api(id?"/api/admin/jobs/"+encodeURIComponent(id):"/api/admin/jobs",{method:id?"PUT":"POST",body:JSON.stringify(payload)});$("formPanel").classList.add("hidden");resetForm();await loadJobs();message(id?"Job updated successfully.":"Job created successfully.","success");}catch(err){message(err.message,"error");}finally{$("saveButton").disabled=false;}});
$("newButton").addEventListener("click",()=>openForm());$("cancelButton").addEventListener("click",()=>{$("formPanel").classList.add("hidden");resetForm();});$("resetButton").addEventListener("click",resetForm);$("refreshButton").addEventListener("click",loadJobs);$("logoutButton").addEventListener("click",async()=>{try{await api("/api/admin/logout",{method:"POST",body:"{}"});}catch(_){} showLogin();message("You have signed out.","success");});
</script></body></html>`;

if (!MONGODB_URI) {
  console.error(
    "Missing MONGODB_URI. Set it to your MongoDB connection string before starting.",
  );
  process.exit(1);
}
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () =>
      console.log(
        `Job manager ready at http://localhost:${PORT}/job-createform.html`,
      ),
    );
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
