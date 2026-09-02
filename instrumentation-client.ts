import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/api/trips", method: "POST" },
    { path: "/api/trips/*", method: "POST" },
    { path: "/api/trips/*/run", method: "POST" },
    { path: "/api/trips/*/images", method: "POST" },
  ],
});
