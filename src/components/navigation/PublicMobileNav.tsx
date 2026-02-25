import { MenuIcon } from "lucide-react";

import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function PublicMobileNav() {
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
          <SheetClose asChild>
            <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/search/resumes">
              Post a resume
            </a>
          </SheetClose>
          <SheetClose asChild>
            <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/search/jobs">
              Post a job
            </a>
          </SheetClose>
          <SheetClose asChild>
            <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/search/resumes">
              Candidates search
            </a>
          </SheetClose>
          <div className="my-2 h-px bg-primary-foreground/20"></div>
          <SheetClose asChild>
            <a className="rounded-lg bg-background px-3 py-2 font-semibold text-foreground hover:opacity-90" href="/login">
              Login
            </a>
          </SheetClose>
          <SheetClose asChild>
            <a className="rounded-lg px-3 py-2 hover:bg-primary-foreground/10" href="/login?mode=register">
              Register
            </a>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
