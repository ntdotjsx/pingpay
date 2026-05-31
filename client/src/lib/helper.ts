export function isPathActive(pathname: string, path?: string) {
  if (!path) return false;

  if (path === "/") {
    return pathname === "/";
  }

  return pathname === path || pathname.startsWith(path + "/");
}
