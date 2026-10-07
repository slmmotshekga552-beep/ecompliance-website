import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eskom | Compliance Portal — Evidence Tracker" },
      {
        name: "description",
        content:
          "Track employee compliance evidence, submissions, audit scores, and staff records.",
      },
      { property: "og:title", content: "Eskom Compliance Portal" },
      {
        property: "og:description",
        content:
          "Evidence tracking, compliance status, audit reports, and staff records in one portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-background">
      <iframe
        className="h-full w-full border-0"
        src="/portal.html"
        title="Eskom Compliance Portal"
      />
    </main>
  );
}
