import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/importar-v24")({
  beforeLoad: () => {
    throw redirect({ to: "/importar", search: { build: "24" } as never });
  },
  component: () => null,
});
