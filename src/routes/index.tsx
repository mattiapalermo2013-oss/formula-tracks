import { createFileRoute } from "@tanstack/react-router";
import { GameScene } from "../game/GameScene";
import { Hud } from "../game/Hud";
import { Editor } from "../game/Editor";

export const Route = createFileRoute("/")({
  ssr: false, // the WebGL canvas must never render on the server
  head: () => ({
    meta: [
      { title: "Formula Track — Low-Poly 3D Racing Game in Your Browser" },
      {
        name: "description",
        content:
          "Drive a low-poly single-seater on a floating circuit: hot laps, ramps, drifts and a stopwatch. Play free in your browser, no download.",
      },
      { property: "og:title", content: "Formula Track — Low-Poly 3D Racing Game" },
      {
        property: "og:description",
        content: "Floating circuit, tight corners and a stopwatch: beat your best lap.",
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
      <h1 className="sr-only">Formula-Track — gioco di corse 3D low-poly</h1>
      <GameScene />
      <Hud />
      <Editor />
    </main>
  );
}
