import { describe, expect, it } from "vitest";

import { GET } from "../src/pages/jobs/[id]";

describe("job detail page metadata", () => {
  it("renders social metadata for active job pages", async () => {
    const request = new Request("http://localhost:4321/jobs/42?state=active");

    const response = await GET({
      params: { id: "42" },
      request,
    } as unknown as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain('property="og:image"');
    expect(html).toContain("/brand/og-jobs.png");
    expect(html).toContain('name="twitter:image"');
    expect(html).toContain('meta name="robots" content="index,follow"');
  });

  it("marks removed jobs as noindex", async () => {
    const request = new Request("http://localhost:4321/jobs/42?state=removed");

    const response = await GET({
      params: { id: "42" },
      request,
    } as unknown as Parameters<typeof GET>[0]);

    expect(response.status).toBe(410);

    const html = await response.text();
    expect(html).toContain('meta name="robots" content="noindex,nofollow"');
  });

  it("escapes untrusted id values in rendered html", async () => {
    const maliciousId = '"><img src=x onerror=alert(1)>';
    const request = new Request("http://localhost:4321/jobs/test?state=active");

    const response = await GET({
      params: { id: maliciousId },
      request,
    } as unknown as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain('/jobs/%22%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');
  });
});
