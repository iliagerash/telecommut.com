import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: path.resolve(".env") });

function requiredDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for category backfill.");
  }
  return databaseUrl;
}

const databaseUrl = requiredDatabaseUrl();

const titleDescriptions = new Map([
  [
    "Software Development",
    "Build and ship remote software across frontend, backend, mobile, and platform teams working with modern engineering stacks.",
  ],
  [
    "Product Management",
    "Lead product direction for distributed teams by owning roadmap priorities, discovery cycles, and measurable customer outcomes.",
  ],
  [
    "Project Management",
    "Coordinate timelines, stakeholders, and delivery across remote projects to keep cross-functional execution predictable and on track.",
  ],
  [
    "DevOps and Sysadmin",
    "Operate reliable cloud infrastructure, CI/CD pipelines, observability tooling, and incident response for remote-first engineering organizations.",
  ],
  [
    "Customer Support",
    "Help customers succeed through chat, email, and support operations roles focused on resolution quality, empathy, and response speed.",
  ],
  [
    "Copywriting and Editing",
    "Create and refine high-impact written content, from product messaging to long-form editorial work, for globally distributed audiences.",
  ],
  [
    "Design and Multimedia",
    "Design polished digital experiences and visual assets spanning UI, brand, video, and multimedia production for remote teams.",
  ],
  [
    "Administrative",
    "Support business operations with remote administrative roles covering scheduling, coordination, documentation, and executive assistance.",
  ],
  [
    "Accounting and Finance",
    "Manage budgets, reporting, payroll, and financial planning in remote accounting and finance roles across growing global companies.",
  ],
  [
    "Business Management",
    "Drive strategy and operations through remote management roles focused on growth, process improvement, and organizational performance.",
  ],
  [
    "Marketing and Sales",
    "Scale demand and revenue through remote marketing and sales positions in content, lifecycle, partnerships, and account growth.",
  ],
  [
    "Education and Training",
    "Teach, coach, and enable learners through remote education and training jobs across curriculum, instruction, and learning operations.",
  ],
  [
    "Healthcare",
    "Find remote healthcare opportunities in clinical support, health operations, telehealth coordination, and regulated care workflows.",
  ],
  [
    "Human Resources",
    "Build strong distributed teams through remote HR roles in recruiting, people operations, performance, and employee experience.",
  ],
  [
    "Legal",
    "Support compliance and risk management with remote legal roles across contracts, privacy, policy, and corporate governance.",
  ],
  [
    "Other",
    "Browse remote openings that do not fit standard tracks, including specialized, emerging, and cross-disciplinary career paths.",
  ],
]);

const titlePageText = new Map([
  [
    "Software Development",
    "Browse hand-curated software engineering roles across frontend, backend, full-stack, platform, and mobile teams. Listings are remote-first and include details on stack, ownership, and hiring scope.",
  ],
  [
    "Product Management",
    "Explore remote PM roles spanning product strategy, discovery, roadmap execution, and stakeholder alignment. Compare openings by product stage, ownership level, and domain focus.",
  ],
  [
    "Project Management",
    "Find distributed project management opportunities focused on delivery planning, cross-functional coordination, and execution governance. Roles include Agile, technical, and operations-heavy programs.",
  ],
  [
    "DevOps and Sysadmin",
    "Review infrastructure and reliability positions covering CI/CD, cloud operations, security hardening, observability, and incident response. These roles support always-on distributed systems.",
  ],
  [
    "Customer Support",
    "Discover customer support jobs in remote teams handling onboarding, retention, escalations, and technical troubleshooting. Openings range from frontline support to support operations leadership.",
  ],
  [
    "Copywriting and Editing",
    "Find writing and editing opportunities in content marketing, technical documentation, product copy, and editorial workflows. Roles are suited for strong communicators who can write with clarity and precision.",
  ],
  [
    "Design and Multimedia",
    "Browse design and multimedia roles in UI/UX, brand systems, motion, and creative production. Compare positions by product design depth, visual ownership, and collaboration model.",
  ],
  [
    "Administrative",
    "Explore remote administrative positions supporting executives and teams through scheduling, process management, communication, and operations coordination. Ideal for detail-driven organizational work.",
  ],
  [
    "Accounting and Finance",
    "Review accounting and finance opportunities in reporting, FP&A, bookkeeping, controls, and payroll operations. Roles span startups and established organizations with distributed finance teams.",
  ],
  [
    "Business Management",
    "Find business management jobs focused on operations, execution, and strategic growth initiatives. These openings often combine planning, people leadership, and measurable performance goals.",
  ],
  [
    "Marketing and Sales",
    "Explore remote marketing and sales roles across growth, lifecycle, paid channels, partnerships, and revenue operations. Compare openings by funnel stage responsibility and target market.",
  ],
  [
    "Education and Training",
    "Discover education and training opportunities in curriculum design, facilitation, coaching, and learner enablement. Roles support remote learning programs for customers, employees, and students.",
  ],
  [
    "Healthcare",
    "Browse healthcare openings in telehealth support, clinical operations, compliance, and care coordination. These roles combine domain expertise with remote-first delivery models.",
  ],
  [
    "Human Resources",
    "Find HR opportunities covering recruiting, people operations, performance systems, and employee experience. Positions are designed for distributed organizations building strong remote cultures.",
  ],
  [
    "Legal",
    "Explore legal roles in contracts, compliance, corporate governance, and policy advisory. Remote legal teams support business velocity while reducing risk across jurisdictions.",
  ],
  [
    "Other",
    "Review specialized remote jobs that do not fit standard functional tracks. This section includes niche, hybrid, and emerging roles with unique skill combinations.",
  ],
]);

const titleMetaTitles = new Map([
  ["Software Development", "Remote Software Development Jobs"],
  ["Product Management", "Remote Product Management Jobs"],
  ["Project Management", "Remote Project Management Jobs"],
  ["DevOps and Sysadmin", "Remote DevOps and Sysadmin Jobs"],
  ["Customer Support", "Remote Customer Support Jobs"],
  ["Copywriting and Editing", "Remote Copywriting and Editing Jobs"],
  ["Design and Multimedia", "Remote Design and Multimedia Jobs"],
  ["Administrative", "Remote Administrative Jobs"],
  ["Accounting and Finance", "Remote Accounting and Finance Jobs"],
  ["Business Management", "Remote Business Management Jobs"],
  ["Marketing and Sales", "Remote Marketing and Sales Jobs"],
  ["Education and Training", "Remote Education and Training Jobs"],
  ["Healthcare", "Remote Healthcare Jobs"],
  ["Human Resources", "Remote Human Resources Jobs"],
  ["Legal", "Remote Legal Jobs"],
  ["Other", "Remote Jobs Across Specialized Roles"],
]);

const legacyToLucideIcon = new Map([
  ["fa-code", "Code2"],
  ["fa-hdd", "HardDrive"],
  ["fa-tasks", "ListTodo"],
  ["fa-database", "Database"],
  ["fa-phone-volume", "Headset"],
  ["fa-edit", "FilePenLine"],
  ["fa-photo-video", "Palette"],
  ["fa-calendar-alt", "CalendarDays"],
  ["fa-coins", "Coins"],
  ["fa-chart-line", "LineChart"],
  ["fa-mail-bulk", "Megaphone"],
  ["fa-user-graduate", "GraduationCap"],
  ["fa-user-md", "Stethoscope"],
  ["fa-users", "Users"],
  ["fa-balance-scale", "Scale"],
  ["fa-sun", "Sun"],
  ["fa-check-circle", "CircleCheckBig"],
]);

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const pool = mysql.createPool({
  uri: databaseUrl,
  connectionLimit: 5,
});

const [rows] = await pool.execute(
  "SELECT id, title, slug, description, page_text, meta_title, icon FROM categories ORDER BY id ASC",
);

if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error(
    `No categories rows found in target database. Set DATABASE_URL to the app database and rerun.`,
  );
}

const used = new Set(
  rows
    .map((row) => String(row.slug ?? "").trim().toLowerCase())
    .filter(Boolean),
);

for (const row of rows) {
  const title = String(row.title ?? "").trim();
  let slug = String(row.slug ?? "").trim().toLowerCase();
  const description = String(row.description ?? "").trim();
  const pageText = String(row.page_text ?? "").trim();
  const metaTitle = String(row.meta_title ?? "").trim();
  const icon = String(row.icon ?? "").trim();

  if (!slug) {
    let base = slugify(title);
    if (!base) {
      base = `category-${row.id}`;
    }

    slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
  }

  const nextDescription = description || titleDescriptions.get(title) || `Remote jobs in ${title}.`;
  const nextPageText = pageText || titlePageText.get(title) || `Browse remote opportunities in ${title}.`;
  const nextMetaTitle = metaTitle || titleMetaTitles.get(title) || `Remote ${title} Jobs`;
  const nextIcon = legacyToLucideIcon.get(icon) || icon || "CircleCheckBig";

  await pool.execute(
    "UPDATE categories SET slug = ?, description = ?, page_text = ?, meta_title = ?, icon = ? WHERE id = ?",
    [slug, nextDescription, nextPageText, nextMetaTitle, nextIcon, row.id],
  );
}

await pool.end();
console.log(`category metadata backfill complete (${rows.length} rows) for DATABASE_URL target`);
