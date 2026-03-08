const staleChunkPatterns = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
];

export function isStaleChunkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    staleChunkPatterns.some((pattern) => error.message.includes(pattern))
  );
}
