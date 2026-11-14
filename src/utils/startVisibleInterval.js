export function startVisibleInterval(callback, intervalMs, runImmediately = true) {
  let intervalId = null;
  let requestInFlight = false;

  const run = () => {
    if (document.hidden || requestInFlight) return;

    requestInFlight = true;
    let result;
    try {
      result = callback();
    } catch (error) {
      requestInFlight = false;
      throw error;
    }

    Promise.resolve(result).then(
      () => { requestInFlight = false; },
      (error) => {
        requestInFlight = false;
        window.setTimeout(() => { throw error; }, 0);
      },
    );
  };

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const start = () => {
    if (document.hidden || intervalId !== null) return;
    if (runImmediately) run();
    intervalId = window.setInterval(run, intervalMs);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) stop();
    else start();
  };

  start();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    stop();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
