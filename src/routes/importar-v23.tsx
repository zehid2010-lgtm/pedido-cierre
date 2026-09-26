import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/importar-v23")({
  beforeLoad: () => {
    throw redirect({ to: "/importar", search: { build: "23" } as never });
  },
  component: () => null,
});
