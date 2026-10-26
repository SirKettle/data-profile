import { GlobalRegistrator } from "@happy-dom/global-registrator";

/**
 * A DOM for the component tests, registered at import time so it exists before any test file's own
 * imports evaluate. Import it first in every component test file. It never unregisters: `bun test`
 * runs every test file in one process, in an order that is not guaranteed. Bun's own Fetch API is
 * put back, since non-DOM suites in the same process may need it.
 */
const nativeFetch = globalThis.fetch;
const NativeRequest = globalThis.Request;
const NativeResponse = globalThis.Response;
const NativeHeaders = globalThis.Headers;

if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register();
  globalThis.fetch = nativeFetch;
  globalThis.Request = NativeRequest;
  globalThis.Response = NativeResponse;
  globalThis.Headers = NativeHeaders;
}
