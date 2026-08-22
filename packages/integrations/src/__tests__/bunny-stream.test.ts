/**
 * bunny-stream.test.ts — client Bunny.net Stream, P-6.20.
 *
 * Puro/sem banco (diferente dos demais testes deste pacote) — cobre o
 * critério de aceite "sem BUNNY_STREAM_API_KEY, upload falha com mensagem
 * clara (fail-fast)" e a determinística da assinatura de URL de reprodução
 * (regressão do formato Token Authentication caso o cálculo mude sem querer).
 * createBunnyVideo é a única função que faz uma chamada HTTP real — mockada
 * via `vi.stubGlobal("fetch", ...)`, nunca bate na Bunny de verdade.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ENV_KEYS = [
  "BUNNY_STREAM_LIBRARY_ID",
  "BUNNY_STREAM_API_KEY",
  "BUNNY_STREAM_CDN_HOSTNAME",
  "BUNNY_STREAM_TOKEN_AUTH_KEY",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = savedEnv[key];
  }
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("fail-fast sem env vars configuradas", () => {
  it("createBunnyVideo lança com mensagem clara quando BUNNY_STREAM_LIBRARY_ID falta", async () => {
    const { createBunnyVideo } = await import("../bunny-stream");
    await expect(createBunnyVideo("Aula 1")).rejects.toThrow(
      "Missing required env var: BUNNY_STREAM_LIBRARY_ID",
    );
  });

  it("createBunnyTusUploadCredentials lança com mensagem clara quando BUNNY_STREAM_API_KEY falta", async () => {
    process.env.BUNNY_STREAM_LIBRARY_ID = "lib-1";
    const { createBunnyTusUploadCredentials } = await import("../bunny-stream");
    expect(() => createBunnyTusUploadCredentials("guid-1")).toThrow(
      "Missing required env var: BUNNY_STREAM_API_KEY",
    );
  });

  it("signBunnyPlaybackUrl lança com mensagem clara quando BUNNY_STREAM_CDN_HOSTNAME falta", async () => {
    const { signBunnyPlaybackUrl } = await import("../bunny-stream");
    expect(() => signBunnyPlaybackUrl("guid-1")).toThrow(
      "Missing required env var: BUNNY_STREAM_CDN_HOSTNAME",
    );
  });
});

describe("com env vars configuradas", () => {
  beforeEach(() => {
    process.env.BUNNY_STREAM_LIBRARY_ID = "lib-1";
    process.env.BUNNY_STREAM_API_KEY = "key-1";
    process.env.BUNNY_STREAM_CDN_HOSTNAME = "vz-test.b-cdn.net";
    process.env.BUNNY_STREAM_TOKEN_AUTH_KEY = "security-key-1";
  });

  it("createBunnyVideo propaga o guid retornado pela Bunny (fetch mockado)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guid: "returned-guid" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createBunnyVideo } = await import("../bunny-stream");
    const result = await createBunnyVideo("Aula 1");

    expect(result).toEqual({ videoId: "returned-guid" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://video.bunnycdn.com/library/lib-1/videos");
    expect((init.headers as Record<string, string>).AccessKey).toBe("key-1");
  });

  it("createBunnyVideo lança BusinessError-friendly quando a Bunny responde erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    const { createBunnyVideo } = await import("../bunny-stream");
    await expect(createBunnyVideo("Aula 1")).rejects.toThrow(
      "Falha ao criar vídeo na Bunny Stream: 401",
    );
  });

  it("createBunnyTusUploadCredentials assina sha256(libraryId + apiKey + expire + videoId)", async () => {
    const { createBunnyTusUploadCredentials } = await import("../bunny-stream");
    const crypto = await import("node:crypto");

    const credentials = createBunnyTusUploadCredentials("guid-1");

    const expectedSignature = crypto
      .createHash("sha256")
      .update(`lib-1key-1${credentials.authorizationExpire}guid-1`)
      .digest("hex");

    expect(credentials.authorizationSignature).toBe(expectedSignature);
    expect(credentials.libraryId).toBe("lib-1");
    expect(credentials.videoId).toBe("guid-1");
    expect(credentials.endpoint).toBe("https://video.bunnycdn.com/tusupload");
  });

  it("signBunnyPlaybackUrl é determinística e nunca expõe a security key na URL", async () => {
    const { signBunnyPlaybackUrl } = await import("../bunny-stream");

    // Determinismo: mesmo videoId no mesmo segundo produz a mesma URL —
    // regressão do formato caso o cálculo do token mude sem querer.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const url1 = signBunnyPlaybackUrl("guid-1");
    const url2 = signBunnyPlaybackUrl("guid-1");

    vi.useRealTimers();

    expect(url1).toBe(url2);
    expect(url1).toContain(
      "https://vz-test.b-cdn.net/guid-1/playlist.m3u8?token=",
    );
    expect(url1).not.toContain("security-key-1");
  });
});
