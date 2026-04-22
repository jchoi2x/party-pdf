const USERNAME_KEY = "userName";
const USER_COLOR_KEY = "userColor";

const AVATAR_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#9575CD",
  "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
  "#4DB6AC", "#81C784", "#AED581", "#FFD54F",
  "#FFB74D", "#FF8A65", "#A1887F", "#90A4AE",
];

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

export function getUserColor(): string {
  let color = localStorage.getItem(USER_COLOR_KEY);
  if (!color) {
    color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    localStorage.setItem(USER_COLOR_KEY, color);
  }
  return color;
}
