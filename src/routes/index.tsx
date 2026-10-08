import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "eCompliance | OHS Audit Tasks" },
      {
        name: "description",
        content:
          "Manage ISO 45001 audit tasks, subtask answers, employee documents and follow-up statuses.",
      },
      { property: "og:title", content: "eCompliance | OHS Audit Tasks" },
      {
        property: "og:description",
        content:
          "Organise OHS audit tasks, record evidence and comments, and track action-needed, follow-up and completed work.",
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
