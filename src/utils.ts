import { LorePF2e, SkillSlug } from "@7h3laughingman/pf2e-types";
import { OneToTwenty } from "./data";

export function rangeInclusive(from: 1, to: 20): OneToTwenty[];
export function rangeInclusive(from: number, to: number): number[];
export function rangeInclusive(from: number, to: number) {
    return Array.fromRange(to - from + 1, from);
}

export const notNull = <T>(e: T): e is NonNullable<T> => {
    return !(typeof e === "undefined" || e === null);
};

export const localeCompare = (a: string, b: string) => a.localeCompare(b);

export const isSkill = (s: SkillSlug | LorePF2e["id"]): s is SkillSlug =>
    s in CONFIG.PF2E.skills;

export const unique = <T>(arr: T[]) => Array.from(new Set(arr));

export const asc = <T extends number>(a: T, b: T) => a - b;

export function mapSome<T, V>(value: T, f: (value: NonNullable<T>) => V) {
    if (!notNull(value)) {
        return null;
    }
    return f(value);
}

export const levelLabel = (level: OneToTwenty) =>
    _loc("pf2e-skill-issue.levels." + level);

export const getApp = (id: string) => foundry.applications.instances.get(id);

export const rem1 = (a: number, b: number) => ((a - 1) % b) + 1;
export const div1 = (a: number, b: number) => Math.floor((a - 1) / b) + 1;
