import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const appMeta = sqliteTable("app_meta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const authUsers = sqliteTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("candidate"),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    emailVerifiedAt: text("email_verified_at"),
    image: text("image"),
    password: text("password").notNull().default(""),
    rememberToken: text("remember_token"),
    candidateName: text("candidate_name").notNull().default(""),
    candidatePhone: text("candidate_phone").notNull().default(""),
    candidatePhoto: text("candidate_photo").notNull().default(""),
    companyName: text("company_name").notNull().default(""),
    companyPhone: text("company_phone").notNull().default(""),
    companyContact: text("company_contact").notNull().default(""),
    companyDescription: text("company_description"),
    companyLogo: text("company_logo").notNull().default(""),
    subscribe: integer("subscribe").notNull().default(0),
    subscribePartners: integer("subscribe_partners").notNull().default(0),
    deletedAt: text("deleted_at"),
    stripeId: text("stripe_id"),
    pmType: text("pm_type"),
    pmLastFour: text("pm_last_four"),
    trialEndsAt: text("trial_ends_at"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_users_email_unique").on(table.email),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_unique").on(table.token),
  ],
);

export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_accounts_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const authVerifications = sqliteTable("auth_verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug"),
  description: text("description").notNull().default(""),
  pageText: text("page_text").notNull().default(""),
  metaTitle: text("meta_title").notNull().default(""),
  icon: text("icon").notNull().default("fa-check-circle"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  coverageState: text("coverage_state").notNull().default(""),
  inspectionUrl: text("inspection_url").notNull().default(""),
  crawledAt: text("crawled_at"),
  bingCrawledAt: text("bing_crawled_at"),
  submittedAt: text("submitted_at"),
}, (table) => [
  uniqueIndex("categories_slug_unique").on(table.slug),
]);

export const countries = sqliteTable("countries", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  code: text("code").notNull(),
  weight: integer("weight").notNull().default(100),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const countryGroups = sqliteTable("country_groups", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  countries: text("countries").notNull(),
  weight: integer("weight").notNull().default(100),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const contracts = sqliteTable("contracts", {
  id: integer("id").primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull().default("1"),
  categoryId: integer("category_id").notNull(),
  countryId: integer("country_id").notNull(),
  countryGroups: text("country_groups").notNull().default(""),
  url: text("url").notNull().default(""),
  position: text("position").notNull(),
  companyName: text("company_name").notNull(),
  companyLogo: text("company_logo").notNull().default(""),
  salaryMin: real("salary_min").notNull().default(0),
  salaryMax: real("salary_max").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  salaryPeriod: text("salary_period").notNull().default("hour"),
  published: text("published").notNull(),
  expires: text("expires"),
  skills: text("skills").notNull().default(""),
  description: text("description").notNull(),
  applyText: text("apply_text").notNull(),
  contractCode: text("contract_code").notNull().default("full_time"),
  status: integer("status").notNull().default(1),
  googleCrawled: integer("google_crawled").notNull().default(0),
  googleCrawledAt: text("google_crawled_at"),
  bingCrawled: integer("bing_crawled").notNull().default(0),
  bingCrawledAt: text("bing_crawled_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const resumes = sqliteTable("resumes", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull().default("1"),
  categoryId: integer("category_id").notNull(),
  countryId: integer("country_id").notNull(),
  position: text("position").notNull(),
  salaryMin: real("salary_min").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  salaryPeriod: text("salary_period").notNull().default("hour"),
  description: text("description").notNull(),
  skills: text("skills").notNull().default(""),
  contractCode: text("contract_code").notNull().default("full_time"),
  status: integer("status").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const seoPages = sqliteTable("seo_pages", {
  id: integer("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  coverageState: text("coverage_state").notNull().default(""),
  inspectionUrl: text("inspection_url").notNull().default(""),
  crawledAt: text("crawled_at"),
  bingCrawledAt: text("bing_crawled_at"),
  submittedAt: text("submitted_at"),
});

export const jobRemovals = sqliteTable("job_removals", {
  id: integer("id").primaryKey(),
  categoryId: integer("category_id").notNull().default(0),
  position: text("position").notNull().default(""),
  expiredAt: text("expired_at"),
  indexed: integer("indexed").notNull().default(0),
});

export const jobLogos = sqliteTable("job_logos", {
  id: integer("id").primaryKey(),
  externalCompanyId: integer("external_company_id").notNull(),
  companyLogo: text("company_logo").notNull(),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const cloudflareEvents = sqliteTable("cloudflare_events", {
  rayName: text("ray_name").primaryKey(),
  action: text("action").notNull(),
  asn: text("asn"),
  asnDescription: text("asn_description"),
  country: text("country").notNull(),
  ip: text("ip").notNull(),
  httpHost: text("http_host").notNull(),
  httpMethod: text("http_method"),
  requestPath: text("request_path"),
  userAgent: text("user_agent"),
  status: integer("status"),
  ruleId: text("rule_id"),
  createdAt: text("created_at").notNull(),
});

export const directTraffic = sqliteTable(
  "direct_traffic",
  {
    id: integer("id").primaryKey(),
    trafficDate: text("traffic_date").notNull(),
    bypassBots: text("bypass_bots"),
    falsePositives: text("false_positives"),
    totalNginxRequests: integer("total_nginx_requests").notNull().default(0),
    totalCloudflareEvents: integer("total_cloudflare_events").notNull().default(0),
    cloudflareBlocks: integer("cloudflare_blocks").notNull().default(0),
    cloudflareChallenges: integer("cloudflare_challenges").notNull().default(0),
  },
  (table) => [
    uniqueIndex("direct_traffic_traffic_date_unique").on(table.trafficDate),
  ],
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    stripeId: text("stripe_id").notNull(),
    stripeStatus: text("stripe_status").notNull(),
    stripePrice: text("stripe_price"),
    quantity: integer("quantity"),
    trialEndsAt: text("trial_ends_at"),
    endsAt: text("ends_at"),
    createdAt: text("created_at"),
    updatedAt: text("updated_at"),
  },
  (table) => [
    uniqueIndex("subscriptions_stripe_id_unique").on(table.stripeId),
  ],
);

export const subscriptionItems = sqliteTable(
  "subscription_items",
  {
    id: integer("id").primaryKey(),
    subscriptionId: integer("subscription_id").notNull(),
    stripeId: text("stripe_id").notNull(),
    stripeProduct: text("stripe_product").notNull(),
    stripePrice: text("stripe_price").notNull(),
    quantity: integer("quantity"),
    createdAt: text("created_at"),
    updatedAt: text("updated_at"),
  },
  (table) => [
    uniqueIndex("subscription_items_stripe_id_unique").on(table.stripeId),
  ],
);

export type AppMeta = typeof appMeta.$inferSelect;
export type NewAppMeta = typeof appMeta.$inferInsert;
