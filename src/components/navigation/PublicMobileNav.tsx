import { useEffect, useMemo, useState } from "react";

import { MenuIcon } from "lucide-react";

import { authClient } from "@/auth/client";
import {
  normalizeHeaderUserType,
  shouldShowEmployerLinks,
  shouldShowPostResume,
  type HeaderUserType,
} from "@/components/navigation/public-nav";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type AuthSessionUser = {
  id?: string;
  role?: string;
  type?: string;
};

type AuthSessionPayload = {
  user?: AuthSessionUser | null;
};

export default function PublicMobileNav() {
  const [userType, setUserType] = useState<HeaderUserType>("guest");
  const [isReady, setIsReady] = useState(false);
  const [loginHref, setLoginHref] = useState("/login");

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
            setUserType("guest");
          }
          return;
        }

        const payload = (await response.json()) as AuthSessionPayload;
        if (!cancelled) {
          setUserType(normalizeHeaderUserType(payload?.user ?? null));
        }
      } catch {
        if (!cancelled) {
          setUserType("guest");
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
  }, []);

  useEffect(() => {
    const next = `${window.location.pathname}${window.location.search}`;
    setLoginHref(`/login?next=${encodeURIComponent(next)}`);
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
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-center rounded-lg border border-primary-foreground/40 px-3 py-2 text-xs font-semibold tracking-[0.12em] uppercase hover:bg-primary-foreground/10"
          aria-label="Open navigation menu"
        >
          <MenuIcon className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent className="border-primary-foreground/20 bg-primary text-primary-foreground" side="right">
        <SheetHeader className="border-b border-primary-foreground/20 pb-3">
          <SheetTitle className="text-primary-foreground">Menu</SheetTitle>
          <SheetDescription className="text-primary-foreground/70">Navigate Telecommut</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pb-4 text-sm">
          {showPostResume ? (
            <SheetClose asChild>
              <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/resumes">
                Post a resume
              </a>
            </SheetClose>
          ) : null}

          {showEmployerLinks ? (
            <>
              <SheetClose asChild>
                <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/search/jobs">
                  Post a job
                </a>
              </SheetClose>
              <SheetClose asChild>
                <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/resumes">
                  Candidates search
                </a>
              </SheetClose>
            </>
          ) : null}

          <div className="my-2 h-px bg-primary-foreground/20"></div>

          {!isReady || userType === "guest" ? (
            <>
              <SheetClose asChild>
                <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href={loginHref}>
                  Login
                </a>
              </SheetClose>
              <SheetClose asChild>
                <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/register">
                  Register
                </a>
              </SheetClose>
            </>
          ) : (
            <>
              {userType === "candidate" ? (
                <SheetClose asChild>
                  <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/resumes">
                    My resumes
                  </a>
                </SheetClose>
              ) : null}
              {userType === "employer" ? (
                <SheetClose asChild>
                  <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/search/jobs">
                    My jobs
                  </a>
                </SheetClose>
              ) : null}
              {userType === "admin" ? (
                <SheetClose asChild>
                  <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/admin/jobs" target="_blank" rel="noreferrer">
                    Admin
                  </a>
                </SheetClose>
              ) : null}
              <SheetClose asChild>
                <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/app/profile">
                  Edit my profile
                </a>
              </SheetClose>
              <button type="button" className="rounded-lg px-3 py-2 text-left hover:bg-primary-foreground/10" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
