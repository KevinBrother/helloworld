export function sseEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}
