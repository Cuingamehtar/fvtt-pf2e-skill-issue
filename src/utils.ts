import { SkillSlug } from "@7h3laughingman/pf2e-types";
import { LoreSlug } from "./data";

export const rangeInclusive = (from: number, to: number) =>
    Array.fromRange(to - from + 1, from);

export const truthy = <T>(e: T): e is NonNullable<T> => Boolean(e);

export const localeCompare = (a: string, b: string) => a.localeCompare(b);

export const isSkill = (s: SkillSlug | LoreSlug): s is SkillSlug =>
    s in CONFIG.PF2E.skills;
