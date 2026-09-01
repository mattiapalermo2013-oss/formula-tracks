import { createFileRoute } from "@tanstack/react-router";
import { GameScene } from "../game/GameScene";
import { Hud } from "../game/Hud";

export const Route = createFileRoute("/")({
  ssr: false, // the WebGL canvas must never render on the server
  head: () => ({
    meta: [
      { title: "Poly Rush — Gioco di corse 3D low-poly nel browser" },
      {
        name: "description",
        content:
          "Guida una monoposto low-poly su un circuito sospeso: tre giri, rampe, derapate e cronometro. Gioca gratis nel browser, senza download.",
      },
      { property: "og:title", content: "Poly Rush — Gioco di corse 3D low-poly" },
      {
        property: "og:description",
        content: "Circuito sospeso, curve strette e cronometro: batti il tuo miglior giro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RacePage,
});

function RacePage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-background">
      <h1 className="sr-only">Poly Rush — gioco di corse 3D low-poly</h1>
      <GameScene />
      <Hud />
    </main>
  );
}
