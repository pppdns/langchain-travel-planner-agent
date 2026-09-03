const INJECTION =
  /(ignore previous|disregard instructions|reveal (the )?(system|hidden) prompt|you are now)/i;

const CODE =
  /(python|javascript|sql injection|jailbreak|system prompt|hack|password|deploy a|scraper)|\b(?:write|generate) (?:me )?(?:a )?(?:python|javascript|java|sql|scraper|script|function|class)\b/i;

const NON_TRAVEL_HOWTO =
  /\bhow (?:(?:do|can) (?:i|you|we) )?(?:to )?(?:brew|make|ferment) (?:beer|wine|spirits|whiskey|whisky)\b|\b(?:homebrew(?:ing)?|beer recipe)\b|\b(?:solve|do) (?:this |my )?(?:homework|math problem|calculus)\b|\b(?:diagnos(?:e|is)|prescribe|medical advice|legal advice)\b/i;

export function looksLikeInjection(text: string): boolean {
  return INJECTION.test(text);
}

export function isOffScope(text: string): boolean {
  return looksLikeInjection(text) || CODE.test(text) || NON_TRAVEL_HOWTO.test(text);
}
