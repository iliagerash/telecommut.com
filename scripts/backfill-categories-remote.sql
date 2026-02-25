WITH category_map(title, slug, meta_description, page_text, meta_title, lucide_icon) AS (
  VALUES
    ('Software Development', 'software-development', 'Build and ship remote software across frontend, backend, mobile, and platform teams working with modern engineering stacks.', 'Browse hand-curated software engineering roles across frontend, backend, full-stack, platform, and mobile teams. Listings are remote-first and include details on stack, ownership, and hiring scope.', 'Remote Software Development Jobs', 'Code2'),
    ('Product Management', 'product-management', 'Lead product direction for distributed teams by owning roadmap priorities, discovery cycles, and measurable customer outcomes.', 'Explore remote PM roles spanning product strategy, discovery, roadmap execution, and stakeholder alignment. Compare openings by product stage, ownership level, and domain focus.', 'Remote Product Management Jobs', 'HardDrive'),
    ('Project Management', 'project-management', 'Coordinate timelines, stakeholders, and delivery across remote projects to keep cross-functional execution predictable and on track.', 'Find distributed project management opportunities focused on delivery planning, cross-functional coordination, and execution governance. Roles include Agile, technical, and operations-heavy programs.', 'Remote Project Management Jobs', 'ListTodo'),
    ('DevOps and Sysadmin', 'devops-and-sysadmin', 'Operate reliable cloud infrastructure, CI/CD pipelines, observability tooling, and incident response for remote-first engineering organizations.', 'Review infrastructure and reliability positions covering CI/CD, cloud operations, security hardening, observability, and incident response. These roles support always-on distributed systems.', 'Remote DevOps and Sysadmin Jobs', 'Database'),
    ('Customer Support', 'customer-support', 'Help customers succeed through chat, email, and support operations roles focused on resolution quality, empathy, and response speed.', 'Discover customer support jobs in remote teams handling onboarding, retention, escalations, and technical troubleshooting. Openings range from frontline support to support operations leadership.', 'Remote Customer Support Jobs', 'Headset'),
    ('Copywriting and Editing', 'copywriting-and-editing', 'Create and refine high-impact written content, from product messaging to long-form editorial work, for globally distributed audiences.', 'Find writing and editing opportunities in content marketing, technical documentation, product copy, and editorial workflows. Roles are suited for strong communicators who can write with clarity and precision.', 'Remote Copywriting and Editing Jobs', 'FilePenLine'),
    ('Design and Multimedia', 'design-and-multimedia', 'Design polished digital experiences and visual assets spanning UI, brand, video, and multimedia production for remote teams.', 'Browse design and multimedia roles in UI/UX, brand systems, motion, and creative production. Compare positions by product design depth, visual ownership, and collaboration model.', 'Remote Design and Multimedia Jobs', 'Palette'),
    ('Administrative', 'administrative', 'Support business operations with remote administrative roles covering scheduling, coordination, documentation, and executive assistance.', 'Explore remote administrative positions supporting executives and teams through scheduling, process management, communication, and operations coordination. Ideal for detail-driven organizational work.', 'Remote Administrative Jobs', 'CalendarDays'),
    ('Accounting and Finance', 'accounting-and-finance', 'Manage budgets, reporting, payroll, and financial planning in remote accounting and finance roles across growing global companies.', 'Review accounting and finance opportunities in reporting, FP&A, bookkeeping, controls, and payroll operations. Roles span startups and established organizations with distributed finance teams.', 'Remote Accounting and Finance Jobs', 'Coins'),
    ('Business Management', 'business-management', 'Drive strategy and operations through remote management roles focused on growth, process improvement, and organizational performance.', 'Find business management jobs focused on operations, execution, and strategic growth initiatives. These openings often combine planning, people leadership, and measurable performance goals.', 'Remote Business Management Jobs', 'LineChart'),
    ('Marketing and Sales', 'marketing-and-sales', 'Scale demand and revenue through remote marketing and sales positions in content, lifecycle, partnerships, and account growth.', 'Explore remote marketing and sales roles across growth, lifecycle, paid channels, partnerships, and revenue operations. Compare openings by funnel stage responsibility and target market.', 'Remote Marketing and Sales Jobs', 'Megaphone'),
    ('Education and Training', 'education-and-training', 'Teach, coach, and enable learners through remote education and training jobs across curriculum, instruction, and learning operations.', 'Discover education and training opportunities in curriculum design, facilitation, coaching, and learner enablement. Roles support remote learning programs for customers, employees, and students.', 'Remote Education and Training Jobs', 'GraduationCap'),
    ('Healthcare', 'healthcare', 'Find remote healthcare opportunities in clinical support, health operations, telehealth coordination, and regulated care workflows.', 'Browse healthcare openings in telehealth support, clinical operations, compliance, and care coordination. These roles combine domain expertise with remote-first delivery models.', 'Remote Healthcare Jobs', 'Stethoscope'),
    ('Human Resources', 'human-resources', 'Build strong distributed teams through remote HR roles in recruiting, people operations, performance, and employee experience.', 'Find HR opportunities covering recruiting, people operations, performance systems, and employee experience. Positions are designed for distributed organizations building strong remote cultures.', 'Remote Human Resources Jobs', 'Users'),
    ('Legal', 'legal', 'Support compliance and risk management with remote legal roles across contracts, privacy, policy, and corporate governance.', 'Explore legal roles in contracts, compliance, corporate governance, and policy advisory. Remote legal teams support business velocity while reducing risk across jurisdictions.', 'Remote Legal Jobs', 'Scale'),
    ('Other', 'other', 'Browse remote openings that do not fit standard tracks, including specialized, emerging, and cross-disciplinary career paths.', 'Review specialized remote jobs that do not fit standard functional tracks. This section includes niche, hybrid, and emerging roles with unique skill combinations.', 'Remote Jobs Across Specialized Roles', 'Sun')
)
UPDATE categories
SET
  slug = CASE
    WHEN trim(COALESCE(categories.slug, '')) = '' THEN category_map.slug
    ELSE categories.slug
  END,
  description = CASE
    WHEN trim(COALESCE(categories.description, '')) = '' THEN category_map.meta_description
    ELSE categories.description
  END,
  page_text = CASE
    WHEN trim(COALESCE(categories.page_text, '')) = '' THEN category_map.page_text
    ELSE categories.page_text
  END,
  meta_title = CASE
    WHEN trim(COALESCE(categories.meta_title, '')) = '' THEN category_map.meta_title
    ELSE categories.meta_title
  END,
  icon = CASE
    WHEN trim(COALESCE(categories.icon, '')) = '' OR categories.icon LIKE 'fa-%' THEN category_map.lucide_icon
    ELSE categories.icon
  END
FROM category_map
WHERE categories.title = category_map.title;
