const USERNAME_KEY = "userName";

export function getStoredUserName(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function setStoredUserName(name: string): void {
  localStorage.setItem(USERNAME_KEY, name.trim());
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
