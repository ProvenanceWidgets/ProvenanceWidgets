export type EntryType<T> = T extends {
  entries: () => IterableIterator<[infer K, infer V]>;
}
  ? [K, V]
  : never;

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
