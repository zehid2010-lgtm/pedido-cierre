import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/importar-v22")({
  beforeLoad: () => {
    throw redirect({ to: "/importar", search: { build: "22" } as never });
  },
  component: () => null,
});
