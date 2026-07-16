import { OneToFour, SkillSlug, ZeroToFour } from "@7h3laughingman/pf2e-types";

export type LoreSlug = `${string}-lore`;
export type OneToTwenty =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20;

type SkillManagerDataV1 = {
    increases?: {
        slug: SkillSlug | LoreSlug;
        level: OneToTwenty;
        rank: OneToFour;
    }[];
    overrides?: Record<SkillSlug | LoreSlug, ZeroToFour>;
    note?: string;
    version: number;
};

export type SkillManagerData = SkillManagerDataV1;

export function migrateData(data: SkillManagerData) {
    while (migrations[data.version]) {
        data = migrations[data.version](data);
    }
    return data;
}

export const newData: SkillManagerData = { version: 1 };
const migrations: Record<number, Function> = {};
