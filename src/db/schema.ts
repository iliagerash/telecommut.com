import { sql } from "drizzle-orm";
import { boolean, date, double, int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const appMeta = mysqlTable("app_meta", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 191 }).notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const authUsers = mysqlTable(
  "auth_users",
  {
    id: int("id").autoincrement().primaryKey(),
    name: text("name").notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    role: text("role").notNull().default("candidate"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { mode: "date", fsp: 0 }),
    image: text("image"),
    rememberToken: text("remember_token"),
    candidateName: text("candidate_name").notNull().default(""),
    candidatePhone: text("candidate_phone").notNull().default(""),
    candidatePhoto: text("candidate_photo").notNull().default(""),
    companyName: text("company_name").notNull().default(""),
    companyPhone: text("company_phone").notNull().default(""),
    companyContact: text("company_contact").notNull().default(""),
    companyDescription: text("company_description"),
    companyLogo: text("company_logo").notNull().default(""),
    subscribe: int("subscribe").notNull().default(0),
    subscribePartners: int("subscribe_partners").notNull().default(0),
    deletedAt: timestamp("deleted_at", { mode: "date", fsp: 0 }),
    stripeId: text("stripe_id"),
    pmType: text("pm_type"),
    pmLastFour: text("pm_last_four"),
    trialEndsAt: timestamp("trial_ends_at", { mode: "date", fsp: 0 }),
    createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_users_email_unique").on(table.email),
  ],
);

export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: int("user_id").notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", fsp: 0 }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_unique").on(table.token),
  ],
);

export const authAccounts = mysqlTable(
  "auth_accounts",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: int("user_id").notNull(),
    accountId: varchar("account_id", { length: 191 }).notNull(),
    providerId: varchar("provider_id", { length: 191 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date", fsp: 0 }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date", fsp: 0 }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_accounts_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const authVerifications = mysqlTable("auth_verifications", {
  id: varchar("id", { length: 191 }).primaryKey(),
  identifier: varchar("identifier", { length: 191 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date", fsp: 0 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 191 }),
  description: text("description").notNull().default(""),
  pageText: text("page_text").notNull().default(""),
  metaTitle: text("meta_title").notNull().default(""),
  icon: text("icon").notNull().default("fa-check-circle"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
  coverageState: text("coverage_state").notNull().default(""),
  inspectionUrl: text("inspection_url").notNull().default(""),
  crawledAt: timestamp("crawled_at", { mode: "date", fsp: 0 }),
  bingCrawledAt: timestamp("bing_crawled_at", { mode: "date", fsp: 0 }),
  submittedAt: timestamp("submitted_at", { mode: "date", fsp: 0 }),
}, (table) => [
  uniqueIndex("categories_slug_unique").on(table.slug),
]);

export const countries = mysqlTable("countries", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  code: text("code").notNull(),
  weight: int("weight").notNull().default(100),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
});

export const countryGroups = mysqlTable("country_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  countries: text("countries").notNull(),
  weight: int("weight").notNull().default(100),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }),
});

export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }),
});

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().default(1),
  categoryId: int("category_id").notNull(),
  countryId: int("country_id").notNull(),
  countryGroups: text("country_groups").notNull().default(""),
  url: text("url").notNull().default(""),
  position: text("position").notNull(),
  companyName: text("company_name").notNull(),
  companyLogo: text("company_logo").notNull().default(""),
  salaryMin: double("salary_min").notNull().default(0),
  salaryMax: double("salary_max").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  salaryPeriod: text("salary_period").notNull().default("hour"),
  published: timestamp("published", { mode: "date", fsp: 0 }).notNull(),
  expires: timestamp("expires", { mode: "date", fsp: 0 }),
  skills: text("skills").notNull().default(""),
  description: text("description").notNull(),
  applyText: text("apply_text").notNull(),
  contractCode: text("contract_code").notNull().default("full_time"),
  status: int("status").notNull().default(1),
  googleCrawled: int("google_crawled").notNull().default(0),
  googleCrawledAt: timestamp("google_crawled_at", { mode: "date", fsp: 0 }),
  bingCrawled: int("bing_crawled").notNull().default(0),
  bingCrawledAt: timestamp("bing_crawled_at", { mode: "date", fsp: 0 }),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
});

export const resumes = mysqlTable("resumes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().default(1),
  categoryId: int("category_id").notNull(),
  countryId: int("country_id").notNull(),
  position: text("position").notNull(),
  salaryMin: double("salary_min").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  salaryPeriod: text("salary_period").notNull().default("hour"),
  description: text("description").notNull(),
  skills: text("skills").notNull().default(""),
  contractCode: text("contract_code").notNull().default("full_time"),
  status: int("status").notNull().default(1),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }).notNull(),
});

export const seoPages = mysqlTable("seo_pages", {
  id: int("id").autoincrement().primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  coverageState: text("coverage_state").notNull().default(""),
  inspectionUrl: text("inspection_url").notNull().default(""),
  crawledAt: timestamp("crawled_at", { mode: "date", fsp: 0 }),
  bingCrawledAt: timestamp("bing_crawled_at", { mode: "date", fsp: 0 }),
  submittedAt: timestamp("submitted_at", { mode: "date", fsp: 0 }),
});

export const jobRemovals = mysqlTable("job_removals", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("category_id").notNull().default(0),
  position: text("position").notNull().default(""),
  expiredAt: timestamp("expired_at", { mode: "date", fsp: 0 }),
  indexed: int("indexed").notNull().default(0),
});

export const jobLogos = mysqlTable("job_logos", {
  id: int("id").autoincrement().primaryKey(),
  externalCompanyId: int("external_company_id").notNull(),
  companyLogo: text("company_logo").notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }),
});

export const cloudflareEvents = mysqlTable("cloudflare_events", {
  rayName: varchar("ray_name", { length: 191 }).primaryKey(),
  action: text("action").notNull(),
  asn: text("asn"),
  asnDescription: text("asn_description"),
  country: text("country").notNull(),
  ip: text("ip").notNull(),
  httpHost: text("http_host").notNull(),
  httpMethod: text("http_method"),
  requestPath: text("request_path"),
  userAgent: text("user_agent"),
  status: int("status"),
  ruleId: text("rule_id"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 0 }).notNull(),
});

export const directTraffic = mysqlTable(
  "direct_traffic",
  {
    id: int("id").autoincrement().primaryKey(),
    trafficDate: date("traffic_date", { mode: "string" }).notNull(),
    bypassBots: text("bypass_bots"),
    falsePositives: text("false_positives"),
    totalNginxRequests: int("total_nginx_requests").notNull().default(0),
    totalCloudflareEvents: int("total_cloudflare_events").notNull().default(0),
    cloudflareBlocks: int("cloudflare_blocks").notNull().default(0),
    cloudflareChallenges: int("cloudflare_challenges").notNull().default(0),
  },
  (table) => [
    uniqueIndex("direct_traffic_traffic_date_unique").on(table.trafficDate),
  ],
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    type: text("type").notNull(),
    stripeId: varchar("stripe_id", { length: 191 }).notNull(),
    stripeStatus: text("stripe_status").notNull(),
    stripePrice: text("stripe_price"),
    quantity: int("quantity"),
    trialEndsAt: timestamp("trial_ends_at", { mode: "date", fsp: 0 }),
    endsAt: timestamp("ends_at", { mode: "date", fsp: 0 }),
    createdAt: timestamp("created_at", { mode: "date", fsp: 0 }),
    updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }),
  },
  (table) => [
    uniqueIndex("subscriptions_stripe_id_unique").on(table.stripeId),
  ],
);

export const subscriptionItems = mysqlTable(
  "subscription_items",
  {
    id: int("id").autoincrement().primaryKey(),
    subscriptionId: int("subscription_id").notNull(),
    stripeId: varchar("stripe_id", { length: 191 }).notNull(),
    stripeProduct: text("stripe_product").notNull(),
    stripePrice: text("stripe_price").notNull(),
    quantity: int("quantity"),
    createdAt: timestamp("created_at", { mode: "date", fsp: 0 }),
    updatedAt: timestamp("updated_at", { mode: "date", fsp: 0 }),
  },
  (table) => [
    uniqueIndex("subscription_items_stripe_id_unique").on(table.stripeId),
  ],
);

export type AppMeta = typeof appMeta.$inferSelect;
export type NewAppMeta = typeof appMeta.$inferInsert;
