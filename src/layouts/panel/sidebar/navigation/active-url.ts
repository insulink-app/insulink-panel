const trimSlash = (path: string) => path.replace(/\/+$/, "");

/**
 * The entry a path belongs to: the longest url it equals or sits under, so a
 * routine's runner lights "Routines" while "/health/routines/exercises" still
 * lights "Exercises".
 */
export function activeUrl(pathname: string, urls: string[]): string | undefined {
  const path = trimSlash(pathname);
  return urls
    .filter((url) => path === url || path.startsWith(url + "/"))
    .sort((left, right) => right.length - left.length)[0];
}
