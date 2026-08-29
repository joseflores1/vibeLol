import { useEffect, useState } from "react";

// Returns `value` only after it has stopped changing for `delayMs`. Used to
// debounce the search-suggest input so keystrokes don't hammer the backend.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
