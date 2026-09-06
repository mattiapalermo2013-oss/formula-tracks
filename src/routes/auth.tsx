import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useT } from "@/game/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Formula Track" },
      {
        name: "description",
        content:
          "Sign in to Formula Track to save your lap times and climb the world leaderboard of the 24 official tracks.",
      },
      { property: "og:title", content: "Sign in — Formula Track" },
      {
        property: "og:description",
        content: "Sign in to Formula Track and join the world leaderboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      setMsg(error ? error.message : t("auth.created"));
      if (!error) setMode("signin");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else navigate({ to: "/" });
  };

  const google = async () => {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsg(t("auth.googleFailed"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/80 p-7 backdrop-blur-md">
        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
          {t("auth.title")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("auth.subtitle")}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.email")}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.password")}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
          >
            {mode === "signin" ? t("auth.signin") : t("auth.signup")}
          </button>
        </form>

        <button
          onClick={google}
          className="mt-3 w-full rounded-full border border-border/60 px-6 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground/10"
        >
          {t("auth.google")}
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground underline"
        >
          {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
        </button>

        {msg && <p className="mt-4 text-center text-xs text-primary">{msg}</p>}

        <Link
          to="/"
          className="mt-6 block text-center text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("auth.back")}
        </Link>
      </div>
    </main>
  );
}
