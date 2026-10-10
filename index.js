// index.js — Open Roles API for Dynamonexovra Technology
// Includes MongoDB schema + initial six jobs from the Open Roles section.
// No authentication. CORS allows all origins.
//
// Install:
//   npm init -y
//   npm install express mongoose cors dotenv
//
// .env:
//   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/YOUR_DATABASE
//   PORT=3000
//
// Run:
//   node index.js
//
// API:
//   GET    /api/jobs          List active jobs (use ?all=true to include inactive)
//   POST   /api/jobs          Create a job
//   DELETE /api/jobs/:id      Delete a job
//   GET    /api/health         Health check


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

const jobSchema = new mongoose.Schema(
  {
    // Used by the Open Roles heading: "01 / Web Development"
    category: { type: String, required: true, trim: true },

    // Used by the frontend filters: eng, infra, legal
    filterCategory: {
      type: String,
      required: true,
      enum: ["eng", "infra", "legal"],
      default: "eng",
    },

    title: { type: String, required: true, trim: true },
    skills: { type: String, trim: true, default: "" },
    employmentType: {
      type: String,
      enum: [
        "Full-time",
        "Part-time",
        "Contract",
        "Internship",
        "Consultant",
        "Part-time / Consult",
      ],
      default: "Full-time",
    },
    location: { type: String, trim: true, default: "" },
    about: { type: String, trim: true, default: "" },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    applicationEmail: {
      type: String,
      trim: true,
      default: "careers@dynamonexovra.com",
    },
    applicationSubject: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "jobs" },
);

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);

// Prefill exactly the six jobs from the supplied Open Roles section.
// This runs only when the jobs collection is empty, so existing records are not duplicated.
const initialJobs = [
  {
    category: "Web Development",
    filterCategory: "eng",
    title: "Full Stack Web Engineer",
    skills: "React.js, Node.js, TypeScript, PostgreSQL",
    employmentType: "Full-time",
    location: "Auraiya / Remote",
    about:
      "Design and build secure, scalable web applications for enterprise clients, working across the full stack from database schema to polished user interface.",
    responsibilities: [
      "Build and maintain React front-ends and Node.js APIs",
      "Design relational schemas and optimise queries",
      "Write tests and take part in code reviews",
    ],
    requirements: [
      "2+ years with TypeScript and React",
      "Solid grasp of REST and SQL",
      "Clear written communication",
    ],
    applicationEmail: "careers@dynamonexovra.com",
    applicationSubject: "Application: Full Stack Web Engineer",
    active: true,
  },
  {
    category: "Mobile Engineering",
    filterCategory: "eng",
    title: "Mobile App Developer",
    skills: "Flutter, React Native, iOS, Android",
    employmentType: "Full-time",
    location: "Auraiya / Remote",
    about:
      "Create high-performing cross-platform mobile applications that are fast, accessible and easy to maintain, from first prototype to store release.",
    responsibilities: [
      "Develop features in Flutter or React Native",
      "Integrate APIs, push notifications and analytics",
      "Manage builds and App Store / Play Store releases",
    ],
    requirements: [
      "2+ years building mobile apps",
      "Published apps on iOS or Android",
      "Understanding of state management patterns",
    ],
    applicationEmail: "careers@dynamonexovra.com",
    applicationSubject: "Application: Mobile App Developer",
    active: true,
  },
  {
    category: "Enterprise Solutions",
    filterCategory: "eng",
    title: "Backend Systems Engineer",
    skills: "Python, Django, ERP Integrations, API Design",
    employmentType: "Full-time",
    location: "Auraiya / Hybrid",
    about:
      "Own the services and integrations that power enterprise workflows, with a focus on reliability, security and clean API design.",
    responsibilities: [
      "Build Django services and versioned REST APIs",
      "Integrate with ERP and third-party systems",
      "Document architecture and data flows",
    ],
    requirements: [
      "3+ years of Python backend experience",
      "Experience with integrations and data modelling",
      "Security and performance mindset",
    ],
    applicationEmail: "careers@dynamonexovra.com",
    applicationSubject: "Application: Backend Systems Engineer",
    active: true,
  },
  {
    category: "Cloud & DevOps",
    filterCategory: "infra",
    title: "Cloud & DevOps Engineer",
    skills: "AWS, Docker, Kubernetes, CI/CD Pipelines",
    employmentType: "Full-time",
    location: "Remote",
    about:
      "Build and operate the cloud infrastructure and delivery pipelines that let our teams ship safely and quickly.",
    responsibilities: [
      "Automate infrastructure and deployments",
      "Maintain containers, clusters and monitoring",
      "Harden environments and manage access",
    ],
    requirements: [
      "2+ years in DevOps or cloud roles",
      "Hands-on AWS, Docker and Kubernetes",
      "Experience with CI/CD and observability",
    ],
    applicationEmail: "careers@dynamonexovra.com",
    applicationSubject: "Application: Cloud & DevOps Engineer",
    active: true,
  },
  {
    category: "Support & Maintenance",
    filterCategory: "infra",
    title: "IT Support Specialist",
    skills: "System Audits, Monitoring, Client Troubleshooting",
    employmentType: "Full-time",
    location: "Auraiya",
    about:
      "Be the dependable first line of technical support for clients, keeping systems healthy and issues resolved quickly and clearly.",
    responsibilities: [
      "Monitor systems and respond to incidents",
      "Run periodic system audits and health checks",
      "Troubleshoot and document client issues",
    ],
    requirements: [
      "1+ years in IT support or operations",
      "Knowledge of networks, servers and ticketing",
      "Patient, professional client communication",
    ],
    applicationEmail: "careers@dynamonexovra.com",
    applicationSubject: "Application: IT Support Specialist",
    active: true,
  },
  {
    category: "Legal Requirements",
    filterCategory: "legal",
    title: "Legal & Compliance Officer",
    skills: "Tech Policy, Data Privacy (DPDP), Regulatory Obligations",
    employmentType: "Part-time / Consult",
    location: "Remote",
    about:
      "Guide the company and its clients on technology law, data protection and regulatory obligations as our practice grows.",
    responsibilities: [
      "Draft and review contracts, NDAs and policies",
      "Advise on DPDP and data-privacy compliance",
      "Track regulatory changes affecting delivery",
    ],
    requirements: [
      "Law degree with technology or IT-law focus",
      "Familiarity with the DPDP Act and IT regulations",
      "Clear, practical written advice",
    ],
    applicationEmail: "careers@dynamonexovra.com",
    applicationSubject: "Application: Legal & Compliance Officer",
    active: true,
  },
];

app.get("/", (_req, res) => {
  res.json({
    message: "Dynamonexovra Open Roles API is running",
    endpoints: {
      list: "GET /api/jobs",
      add: "POST /api/jobs",
      delete: "DELETE /api/jobs/:id",
      health: "GET /api/health",
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// List jobs. Defaults to active jobs only; /api/jobs?all=true lists all jobs.
app.get("/api/jobs", async (req, res) => {
  try {
    const filter = req.query.all === "true" ? {} : { active: true };
    const jobs = await Job.find(filter).sort({ createdAt: 1 }).lean();
    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    console.error("List jobs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch jobs" });
  }
});

// Add a job. Send JSON matching the schema above.
app.post("/api/jobs", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.title || !String(body.title).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Job title is required" });
    }
    if (!body.category || !String(body.category).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Job category is required" });
    }

    const job = await Job.create({
      category: body.category,
      filterCategory: body.filterCategory || "eng",
      title: String(body.title).trim(),
      skills: body.skills || "",
      employmentType: body.employmentType || "Full-time",
      location: body.location || "",
      about: body.about || "",
      responsibilities: Array.isArray(body.responsibilities)
        ? body.responsibilities
        : [],
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      applicationEmail: body.applicationEmail || "careers@dynamonexovra.com",
      applicationSubject:
        body.applicationSubject || `Application: ${String(body.title).trim()}`,
      active: body.active !== false,
    });

    res.status(201).json({ success: true, message: "Job added", job });
  } catch (error) {
    console.error("Add job error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Failed to add job" });
  }
});

// Delete a job using its MongoDB _id.
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid MongoDB job ID" });
    }

    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, message: "Job deleted", id: job._id });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ success: false, message: "Failed to delete job" });
  }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await mongoose.connect(
      "mongodb+srv://wasimanwar76:h13esWsPKXSsFf3H@cluster0.dgob2ep.mongodb.net/?appName=Cluster0",
    );
    console.log("Connected to MongoDB");

    const existingCount = await Job.countDocuments();
    if (existingCount === 0) {
      await Job.insertMany(initialJobs);
      console.log(`Inserted ${initialJobs.length} initial Open Roles jobs.`);
    } else {
      console.log(
        `Found ${existingCount} existing jobs; skipped initial seed to avoid duplicates.`,
      );
    }

    app.listen(PORT, () => {
      console.log(`Jobs API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
