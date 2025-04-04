import type { Route } from "./+types/home";

import { EmbeddedWallet } from "@/components/wallet_example/wallet_example";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Embedded wallet" },
    { name: "description", content: "Embedded wallet" },
  ];
}

export default function Home() {
  return <EmbeddedWallet />;
}
