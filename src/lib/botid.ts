import { checkBotId } from "botid/server";

export async function assertHumanRequest() {
  if (process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test") {
    return { isHuman: true, bypassed: true };
  }

  const result = await checkBotId({
    developmentOptions: {
      bypass: process.env.NODE_ENV !== "production" ? "HUMAN" : undefined,
    },
  });

  if (!result.isHuman) {
    const error = new Error("Bot traffic blocked");
    error.name = "BotBlockedError";
    throw error;
  }

  return result;
}
