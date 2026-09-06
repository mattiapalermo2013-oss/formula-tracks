declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        user?: {
          getUser?: () => Promise<{ username?: string } | null>;
          submitScore?: (payload: { encryptedScore: string }) => Promise<void> | void;
        };
        game?: {
          addScore?: (score: number) => Promise<void> | void;
        };
      };
    };
  }
}

/** Encrypt a score with the game-specific AES-GCM key required by CrazyGames leaderboards. */
export async function encryptScore(score: number, encryptionKey: string): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const algorithm = { name: "AES-GCM", iv };

  const keyBytes = new Uint8Array(
    atob(encryptionKey)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    algorithm,
    false,
    ["encrypt"],
  );

  const dataBuffer = new TextEncoder().encode(score.toString());
  const encryptedBuffer = await window.crypto.subtle.encrypt(algorithm, cryptoKey, dataBuffer);

  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/** Submit a lap time to CrazyGames leaderboards when the SDK is present.
 *  Uses the encrypted score API if an encryption key is configured,
 *  otherwise falls back to the legacy addScore API.
 */
export async function submitCrazyScore(scoreSeconds: number): Promise<void> {
  if (typeof window === "undefined") return;
  const sdk = window.CrazyGames?.SDK;
  if (!sdk) return;

  try {
    const key = import.meta.env["VITE_CRAZYGAMES_ENCRYPTION_KEY"] as string | undefined;
    if (sdk.user?.submitScore && key) {
      const encryptedScore = await encryptScore(scoreSeconds, key);
      await sdk.user.submitScore({ encryptedScore });
      return;
    }

    if (sdk.game?.addScore) {
      await sdk.game.addScore(scoreSeconds);
    }
  } catch (e) {
    console.warn("CrazyGames score submission failed:", e);
  }
}
