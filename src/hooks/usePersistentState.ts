import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => readStorage(key, initial));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    writeStorage(key, value);
  }, [key, value]);

  const reset = useCallback(() => {
    setValue(initial);
    writeStorage(key, initial);
  }, [initial, key]);

  return [value, setValue, reset];
}
