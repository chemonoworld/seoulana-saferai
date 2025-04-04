import type { Route } from "./+types/home";

import EmbeddedWallet from "@/components/embedded_wallet/embedded_wallet";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Embedded wallet" },
    { name: "description", content: "Embedded wallet" },
  ];
}

export default function Home() {
  return <EmbeddedWallet />;
}
