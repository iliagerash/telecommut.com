import { useEffect, useMemo, useRef, useState } from "react";

import { authClient } from "@/auth/client";
import {
  normalizeHeaderUserType,
  shouldShowEmployerLinks,
  shouldShowPostResume,
  type HeaderUserType,
} from "@/components/navigation/public-nav";

type AuthSessionUser = {
  id?: string;
  role?: string;
  type?: string;
};

type AuthSessionPayload = {
  user?: AuthSessionUser | null;
};

type PublicDesktopNavProps = {
  initialUserType?: HeaderUserType;
};

export default function PublicDesktopNav({ initialUserType = "guest" }: PublicDesktopNavProps) {
  const [userType, setUserType] = useState<HeaderUserType>(initialUserType);
  const [isReady, setIsReady] = useState(initialUserType !== "guest");
  const [loginHref, setLoginHref] = useState("/login");
  const profileMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (!cancelled) {
            setUserType(initialUserType);
          }
          return;
        }

        const payload = (await response.json()) as AuthSessionPayload;
        if (!cancelled) {
          setUserType(normalizeHeaderUserType(payload?.user ?? null));
        }
      } catch {
        if (!cancelled) {
          setUserType(initialUserType);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [initialUserType]);

  useEffect(() => {
    const next = `${window.location.pathname}${window.location.search}`;
    setLoginHref(`/login?next=${encodeURIComponent(next)}`);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const container = profileMenuRef.current;
      if (!container || !container.open) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && container.contains(target)) {
        return;
      }

      container.open = false;
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const showPostResume = useMemo(() => shouldShowPostResume(userType), [userType]);
  const showEmployerLinks = useMemo(() => shouldShowEmployerLinks(userType), [userType]);

  async function handleLogout() {
    try {
      await authClient.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <>
      <nav className="hidden flex-wrap gap-2 text-sm md:ml-4 md:flex">
        {showPostResume ? (
          <a className="rounded-full border border-primary-foreground/30 px-3 py-1.5 hover:bg-primary-foreground/10" href="/resumes">
            Post a resume
          </a>
        ) : null}
        {showEmployerLinks ? (
          <>
            <a className="rounded-full border border-primary-foreground/30 px-3 py-1.5 hover:bg-primary-foreground/10" href="/search/jobs">
              Post a job
            </a>
            <a className="rounded-full border border-primary-foreground/30 px-3 py-1.5 hover:bg-primary-foreground/10" href="/resumes">
              Candidates search
            </a>
          </>
        ) : null}
      </nav>

      <div className="ml-auto hidden items-center gap-2 text-sm md:flex">
        {!isReady || userType === "guest" ? (
          <>
            <a className="rounded-full bg-background px-4 py-1.5 font-semibold text-foreground hover:opacity-90" href={loginHref}>
              Login
            </a>
            <a className="rounded-full border border-primary-foreground/40 px-4 py-1.5 hover:bg-primary-foreground/10" href="/register">
              Register
            </a>
          </>
        ) : (
          <details ref={profileMenuRef} className="group relative">
            <summary className="list-none cursor-pointer rounded-full border border-primary-foreground/40 px-4 py-1.5 hover:bg-primary-foreground/10">
              Account
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-primary-foreground/20 bg-primary p-2 shadow-lg">
              {userType === "candidate" ? (
                <a className="block rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/resumes">
                  My resumes
                </a>
              ) : null}
              {userType === "employer" ? (
                <a className="block rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/search/jobs">
                  My jobs
                </a>
              ) : null}
              {userType === "admin" ? (
                <a className="block rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/admin/jobs" target="_blank" rel="noreferrer">
                  Admin
                </a>
              ) : null}
              <a className="block rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/app/profile">
                My profile
              </a>
              <button
                type="button"
                className="mt-1 block w-full rounded-lg px-3 py-2 text-left hover:bg-primary-foreground/10"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </details>
        )}
      </div>
    </>
  );
}
