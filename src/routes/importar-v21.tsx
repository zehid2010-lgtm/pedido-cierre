import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/importar-v21")({
  beforeLoad: () => {
    throw redirect({ to: "/importar", search: { build: "21" } as never });
  },
  component: () => null,
});
