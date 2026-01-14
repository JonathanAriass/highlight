// Simple ID generator for React Native (uuid requires crypto polyfill)
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
