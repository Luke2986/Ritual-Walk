// Nicknames can be up to 50 characters; legends and labels only have room for a short one.
export function shortName(name: string, max = 14): string {
  const trimmed = name.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
