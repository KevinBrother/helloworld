export function normalizeQuery(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}
