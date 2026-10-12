export type HttpAuthSignal = "session-expired" | "forbidden";
type HttpAuthSignalListener = (signal: HttpAuthSignal) => void | Promise<void>;

const listeners = new Set<HttpAuthSignalListener>();
let sessionExpiredFlight: Promise<void> | undefined;

export function subscribeHttpAuthSignal(listener: HttpAuthSignalListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const dispatch = async (signal: HttpAuthSignal): Promise<void> => {
  await Promise.allSettled(
    [...listeners].map((listener) => Promise.resolve().then(() => listener(signal))),
  );
};

export function publishHttpAuthSignal(signal: HttpAuthSignal): Promise<void> {
  if (signal !== "session-expired") return dispatch(signal);

  if (!sessionExpiredFlight) {
    sessionExpiredFlight = dispatch(signal).finally(() => {
      sessionExpiredFlight = undefined;
    });
  }
  return sessionExpiredFlight;
}
