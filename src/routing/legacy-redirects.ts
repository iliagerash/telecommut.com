export type LegacyRedirect = {
  from: string;
  to: string;
  status: 301 | 302 | 307 | 308;
};

const legacyRedirects: LegacyRedirect[] = [
  { from: "/home", to: "/", status: 308 },
  { from: "/privacy", to: "/privacy-policy", status: 308 },
  { from: "/terms", to: "/terms-and-conditions", status: 308 },
  { from: "/job/search", to: "/search/jobs", status: 308 },
  { from: "/resume/search-result", to: "/search/resumes", status: 308 },
  { from: "/resume/index", to: "/search/resumes", status: 308 },
];

export function findLegacyRedirect(pathname: string): LegacyRedirect | null {
  for (const redirect of legacyRedirects) {
    if (pathname === redirect.from) {
      return redirect;
    }
  }

  return null;
}
