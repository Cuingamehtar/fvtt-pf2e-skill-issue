export const rangeInclusive = (from: number, to: number) =>
    Array.fromRange(to - from + 1, from);

export const truthy = <T>(e: T): e is NonNullable<T> => Boolean(e);

export const localeCompare = (a: string, b: string) => a.localeCompare(b);
