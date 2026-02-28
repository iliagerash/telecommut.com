import { useEffect, useMemo, useRef, useState } from "react";

import { authClient } from "@/auth/client";
import {
  shouldShowEmployerLinks,
  shouldShowPostResume,
  type HeaderUserType,
} from "@/components/navigation/public-nav";
import { resolveCandidateImage, resolveEmployerImage } from "@/lib/image-fallback";

type PublicDesktopNavProps = {
  initialUserType?: HeaderUserType;
  initialUserImage?: string;
};

export default function PublicDesktopNav({ initialUserType = "guest", initialUserImage = "" }: PublicDesktopNavProps) {
  const [userType] = useState<HeaderUserType>(initialUserType);
  const [isReady] = useState(true);
  const [loginHref, setLoginHref] = useState("/auth/login");
  const [accountImage] = useState(
    initialUserType === "candidate"
      ? resolveCandidateImage(initialUserImage)
      : initialUserType === "employer"
        ? resolveEmployerImage(initialUserImage)
        : initialUserType === "admin"
          ? resolveCandidateImage(initialUserImage)
          : "",
  );
  const profileMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const next = `${window.location.pathname}${window.location.search}`;
    setLoginHref(`/auth/login?next=${encodeURIComponent(next)}`);
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
          <a className="rounded-full border border-primary-foreground/30 px-3 py-1.5 hover:bg-primary-foreground/10" href="/app/resumes/create">
            Post a resume
          </a>
        ) : null}
        {showEmployerLinks ? (
          <>
            <a className="rounded-full border border-primary-foreground/30 px-3 py-1.5 hover:bg-primary-foreground/10" href="/app/jobs/create">
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
            <a className="rounded-full bg-gray-200 px-4 py-1.5 font-semibold text-foreground hover:bg-gray-300" href={loginHref}>
              Login
            </a>
            <a className="rounded-full border border-primary-foreground/40 px-4 py-1.5 hover:bg-primary-foreground/10" href="/auth/register">
              Register
            </a>
          </>
        ) : (
          <details ref={profileMenuRef} className="group relative">
            <summary className="list-none inline-flex h-9 cursor-pointer items-center rounded-full border border-primary-foreground/40 pl-1 pr-3 leading-none hover:bg-primary-foreground/10">
              {
                accountImage ? (
                  <img src={accountImage} alt="" className="mr-2 size-7 rounded-full object-cover" />
                ) : null
              }
              <span className="leading-none">Account</span>
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-primary-foreground/20 bg-primary p-2 shadow-lg">
              {userType === "candidate" ? (
                <a className="block rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/app/resumes/list">
                  My resumes
                </a>
              ) : null}
              {userType === "employer" ? (
                <a className="block rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/app/jobs/list">
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
