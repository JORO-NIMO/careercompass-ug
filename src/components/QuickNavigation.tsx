import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type LinkItem = {
  title: string;
  description?: string;
  href: string;
};

const QUICK_LINKS: LinkItem[] = [
  {
    title: "Find Placements",
    description: "Browse internships, apprenticeships, and graduate roles across the world.",
    href: "/find-placements",
  },
  {
    title: "Find Talent",
    description: "Discover emerging and experienced professionals ready for new opportunities.",
    href: "/find-talent",
  },
  {
    title: "Resources",
    description: "Access guides, toolkits, and career advice to support your journey.",
    href: "/application-tips",
  },
  {
    title: "For Companies",
    description: "Publish opportunities and manage your organisation profile in minutes.",
    href: "/for-companies",
  },
];

interface QuickNavigationProps {
  links?: LinkItem[];
  title?: string;
  subtitle?: string;
  sticky?: boolean;
  stickyOffsetClass?: string; // e.g., "top-16", defaults to top offset below global header
}

const QuickNavigation = ({ links, title, subtitle, sticky = false, stickyOffsetClass = "top-16" }: QuickNavigationProps) => {
  const items = links ?? QUICK_LINKS;
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card/60 p-6 shadow-sm",
        sticky && `sticky ${stickyOffsetClass} z-20 backdrop-blur supports-[backdrop-filter]:bg-card/70`,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-foreground">{title ?? "Quick navigation"}</h2>
        <p className="text-sm text-muted-foreground">{subtitle ?? "Jump to our most-requested sections."}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isAnchor = item.href.startsWith("#");
          const content = (
            <div className="group flex h-full items-start justify-between rounded-md border border-border/80 bg-background/80 p-4 transition hover:border-primary hover:bg-primary/5">
              <div className="pr-3">
                <p className="font-medium text-foreground">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          );

          return isAnchor ? (
            <a key={item.href} href={item.href}>{content}</a>
          ) : (
            <Link key={item.href} to={item.href}>{content}</Link>
          );
        })}
      </div>
    </section>
  );
};

export default QuickNavigation;
