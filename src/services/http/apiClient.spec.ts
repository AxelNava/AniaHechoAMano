import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/auth/authService";
import { ApiError, request } from "@/services/http/apiClient";
import { subscribeHttpAuthSignal } from "@/services/http/httpAuthSignal";

vi.mock("@/auth/authService", () => ({
  authService: { getAccessToken: vi.fn() },
}));

const tokenMock = vi.mocked(authService.getAccessToken);
const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(body),
});

const captureError = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
    throw new Error("expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
};

describe("apiClient.request", () => {
  const unsubscribers: Array<() => void> = [];

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the local VITE_API_BASE_URL fallback instead of the legacy domain", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_VUE_APP_DOMAIN", "http://legacy.example");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { request: requestWithLocalFallback } = await import("@/services/http/apiClient");

    await requestWithLocalFallback("/public", { method: "GET", auth: "none" });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/api/public", { method: "GET" });
  });

  it("normalizes the authoritative API override without duplicating /api", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api///");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const {
      API_BASE_URL,
      API_ORIGIN,
      request: requestWithOverride,
    } = await import("@/services/http/apiClient");

    await requestWithOverride("health", { method: "GET", auth: "none" });

    expect(API_BASE_URL).toBe("https://api.example.test/api");
    expect(API_ORIGIN).toBe("https://api.example.test");
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/health", {
      method: "GET",
    });
  });

  it("preserves a custom API override as the authoritative base", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/gateway///");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { API_BASE_URL, request: requestWithOverride } = await import(
      "@/services/http/apiClient"
    );

    await requestWithOverride("health", { method: "GET", auth: "none" });

    expect(API_BASE_URL).toBe("https://api.example.test/gateway");
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/gateway/health", {
      method: "GET",
    });
  });

  it("keeps public requests independent from authentication", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await request("/public", { method: "GET", auth: "none" });

    expect(tokenMock).not.toHaveBeenCalled();
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("forces the current Bearer token over a caller header", async () => {
    tokenMock.mockResolvedValue("current-token");
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await request("/protected", {
      method: "GET",
      auth: "required",
      headers: { Authorization: "Bearer stale-token" },
    });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe(
      "Bearer current-token",
    );
  });

  it("does not call fetch without a required token and signals once concurrently", async () => {
    tokenMock.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const listener = vi.fn(async () => gate);
    unsubscribers.push(subscribeHttpAuthSignal(listener));

    const requests = [
      captureError(request("/protected-a", { auth: "required" })),
      captureError(request("/protected-b", { auth: "required" })),
    ];
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    release();
    const errors = await Promise.all(requests);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith("session-expired");
    expect(errors.every((error) => error.status === 401)).toBe(true);
  });

  it("serializes object JSON once and leaves FormData boundaries to fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await request("/json", { auth: "none", method: "POST", body: { value: 1 } });
    const form = new FormData();
    form.append("file", new Blob(["x"]), "x.txt");
    await request("/upload", {
      auth: "none",
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: form,
    });

    expect(fetchMock.mock.calls[0][1].body).toBe('{"value":1}');
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(fetchMock.mock.calls[1][1].body).toBe(form);
    expect(new Headers(fetchMock.mock.calls[1][1].headers).has("Content-Type")).toBe(false);
  });

  it.each([204, 205])("returns undefined for HTTP %i without parsing JSON", async (status) => {
    const empty = response(undefined, status);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(empty));

    await expect(request("/empty", { auth: "none" })).resolves.toBeUndefined();
    expect(empty.json).not.toHaveBeenCalled();
  });

  it("preserves auth ProblemDetails and emits only the matching 403 signal", async () => {
    const problem = {
      type: "https://httpstatuses.com/403",
      title: "Forbidden",
      status: 403,
      detail: "Insufficient role.",
      code: "INSUFFICIENT_PERMISSIONS",
    } as const;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(problem, 403)));
    const listener = vi.fn();
    unsubscribers.push(subscribeHttpAuthSignal(listener));

    const error = await captureError(request("/admin", { auth: "none" }));

    expect(error.problem).toBe(problem);
    expect(error.message).toBe(problem.detail);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("forbidden");
  });

  it("keeps each original 401 error when the shared signal listener fails", async () => {
    const problem = {
      type: "https://httpstatuses.com/401",
      title: "Unauthorized",
      status: 401,
      detail: "Expired.",
      code: "INVALID_ACCESS_TOKEN",
    } as const;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(problem, 401)));
    const listener = vi.fn(() => {
      throw new Error("redirect failed");
    });
    unsubscribers.push(subscribeHttpAuthSignal(listener));

    const [first, second] = await Promise.all([
      captureError(request("/a", { auth: "none" })),
      captureError(request("/b", { auth: "none" })),
    ]);

    expect(listener).toHaveBeenCalledOnce();
    expect(first.problem).toBe(problem);
    expect(second.problem).toBe(problem);
  });
});
