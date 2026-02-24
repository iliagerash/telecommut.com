const BASE_URL = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");

async function assertRoute(pathname, expectedStatus = 200) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: "GET",
    redirect: "manual",
  });

  if (response.status !== expectedStatus) {
    throw new Error(`[smoke] ${pathname} returned ${response.status}, expected ${expectedStatus}`);
  }

  console.log(`[ok] GET ${pathname} -> ${response.status}`);
}

async function assertUnauthorizedPost(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  if (response.status !== 401) {
    throw new Error(`[smoke] ${pathname} returned ${response.status}, expected 401`);
  }

  console.log(`[ok] POST ${pathname} without auth -> 401`);
}

async function main() {
  console.log(`[smoke] base url: ${BASE_URL}`);

  await assertRoute("/");
  await assertRoute("/search/jobs");
  await assertRoute("/search/resumes");
  await assertRoute("/login");
  await assertRoute("/admin/dashboard");
  await assertUnauthorizedPost("/api/jobs/cron");
  await assertUnauthorizedPost("/api/jobs/run");

  console.log("[smoke] cutover checks passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
