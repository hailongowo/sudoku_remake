import { useEffect, useState } from "react";

const PREFIX = "sudoku:v1:";

export function readStored(key, fallback = null) {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function removeStored(key) {
  localStorage.removeItem(PREFIX + key);
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStored(key, initialValue));
  useEffect(() => {
    writeStored(key, value);
  }, [key, value]);
  return [value, setValue];
}
