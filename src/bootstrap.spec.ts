import type { App } from "vue";
import type { Pinia } from "pinia";
import type { Router } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import { bootstrapApplication } from "@/bootstrap";

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

describe("bootstrapApplication", () => {
  it("restaura auth antes de instalar el router y montar la aplicación", async () => {
    const events: string[] = [];
    const authReady = deferred<void>();
    const pinia = {} as Pinia;
    const router = {
      isReady: vi.fn(async () => {
        events.push("router-ready");
      }),
    } as unknown as Router;
    const app = {
      use: vi.fn((plugin: unknown) => {
        events.push(plugin === pinia ? "pinia" : plugin === router ? "router" : "plugin");
        return app;
      }),
      mount: vi.fn(() => {
        events.push("mount");
      }),
    } as unknown as App;
    const authStore = {
      authenticated: false,
      initialize: vi.fn(async () => {
        events.push("auth-start");
        await authReady.promise;
        events.push("auth-resolved");
      }),
    };

    const bootstrap = bootstrapApplication({ app, pinia, router, authStore });
    await Promise.resolve();

    expect(events).toEqual(["pinia", "plugin", "auth-start"]);
    expect(app.mount).not.toHaveBeenCalled();

    authReady.resolve(undefined);
    await bootstrap;

    expect(events).toEqual([
      "pinia",
      "plugin",
      "auth-start",
      "auth-resolved",
      "router",
      "router-ready",
      "mount",
    ]);
    expect(router.isReady).toHaveBeenCalledOnce();
    expect(app.mount).toHaveBeenCalledWith("#app");
  });
});
