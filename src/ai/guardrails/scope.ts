const OFF_SCOPE =
  /(python|javascript|code|scraper|hack|password|system prompt|ignore previous|jailbreak|write me a|deploy a|sql injection)/i;

export function isOffScope(text: string): boolean {
  return OFF_SCOPE.test(text);
}

export function looksLikeInjection(text: string): boolean {
  return /(ignore previous|disregard instructions|reveal (the )?(system|hidden) prompt|you are now)/i.test(
    text,
  );
}
