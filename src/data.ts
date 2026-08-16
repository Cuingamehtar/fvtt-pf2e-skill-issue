import {
    LorePF2e,
    OneToFour,
    SkillSlug,
    ZeroToFour,
} from "@7h3laughingman/pf2e-types";
import { SkillManager } from "./skill-manager";
import { getOldSetting } from "./settings";
import { fromEntries, mapSome, objectEntries } from "./utils";

type LoreSlug = `${string}-lore`;
export type LoreId = LorePF2e["id"];
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

type SkillManagerDataV2 = Omit<
    SkillManagerDataV1,
    "increases" | "overrides"
> & {
    increases?: {
        slug: SkillSlug | LoreId;
        level: OneToTwenty;
        rank: OneToFour;
    }[];
    capOverrides?: Partial<Record<OneToTwenty, number>>;
    settings?: {
        "plan-ahead-cap"?: OneToTwenty;
        "mark-background-class"?: boolean;
    };
    backgroundSkills?: (LoreId | SkillSlug)[];
    classSkills?: (LoreId | SkillSlug)[];
    paragonSkills?: (LoreId | SkillSlug)[];
    overrides?: Record<SkillSlug | LoreId, ZeroToFour>;
};

export type SkillManagerDataVersions = SkillManagerDataV1 | SkillManagerDataV2;

export type SkillManagerData = SkillManagerDataV2;
export const currentDataVersion = 2;

type DataMigrationContext = { manager: SkillManager };

export function migrateData(
    data: SkillManagerDataVersions,
    context: DataMigrationContext,
): SkillManagerData {
    if (migrations[data.version]) {
        while (migrations[data.version]) {
            data = migrations[data.version](data, context);
        }
        return data as SkillManagerData;
    }

    return data as SkillManagerData;
}

export const newData: SkillManagerData = { version: currentDataVersion };
const migrations: Record<number, Function> = {
    1: (
        dataV1: SkillManagerDataV1,
        { manager }: DataMigrationContext,
    ): SkillManagerDataV2 => {
        function loreSlugToId(slug: string) {
            if (slug in CONFIG.PF2E.skills) return slug;
            return (
                manager.actor.itemTypes.lore.find((lore) => lore.slug === slug)
                    ?.id ?? slug
            );
        }
        const increases = dataV1.increases?.map((inc) => ({
            slug: loreSlugToId(inc.slug),
            level: inc.level,
            rank: inc.rank,
        }));
        const overrides =
            mapSome(dataV1.overrides, (overrides) =>
                fromEntries(
                    objectEntries(overrides).map(
                        ([slug, rank]) =>
                            [loreSlugToId(slug), rank] as [string, ZeroToFour],
                    ),
                ),
            ) ?? undefined;
        const settings: NonNullable<SkillManagerDataV2["settings"]> = {
            "mark-background-class": getOldSetting("mark-background-class"),
        };
        return {
            ...dataV1,
            version: 2,
            increases,
            overrides,
            settings,
        };
    },
};
