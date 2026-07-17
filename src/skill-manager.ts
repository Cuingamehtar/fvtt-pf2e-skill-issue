import {
    CharacterPF2e,
    SkillSlug,
    ZeroToFour,
} from "@7h3laughingman/pf2e-types";
import { MODULE_ID } from "./module";
import {
    LoreSlug,
    migrateData,
    newData,
    OneToTwenty,
    SkillManagerData,
} from "./data";
import { getSetting } from "./settings";
import { isSkill, rangeInclusive } from "./utils";

export class SkillManager {
    actor: CharacterPF2e;

    constructor(actor: CharacterPF2e) {
        this.actor = actor;
    }

    getData() {
        const data = this.actor.getFlag(MODULE_ID, "skill-data") as
            SkillManagerData | undefined;
        return data ? migrateData(data) : newData;
    }

    prepareData() {
        const data = this.getData();
        const ranks =
            data.increases
                ?.filter((e) => this.actor.level >= e.level)
                .reduce(
                    (acc, e) => {
                        const upgrade = acc[e.slug];
                        acc[e.slug] = upgrade
                            ? (Math.max(upgrade, e.rank) as ZeroToFour)
                            : e.rank;
                        return acc;
                    },
                    {} as Record<
                        NonNullable<SkillManagerData["increases"]>[0]["slug"],
                        ZeroToFour
                    >,
                ) ??
            ({} as Record<
                NonNullable<SkillManagerData["increases"]>[0]["slug"],
                ZeroToFour
            >);

        objectKeys(CONFIG.PF2E.skills).forEach((s) => {
            this.actor.system.skills[s].rank = updateValue(
                this.actor.system.skills[s].rank,
                ranks[s],
                data.overrides?.[s],
            );
        });
        this.actor.itemTypes.lore.forEach((lore) => {
            lore.system.proficient.value = updateValue(
                lore.system.proficient.value,
                ranks[lore.slug as LoreSlug],
                data.overrides?.[lore.slug as LoreSlug],
            );
        });
    }

    levelsWithSkillUpgrades() {
        if (getSetting("roguelike")) {
            return rangeInclusive(1, 20) as OneToTwenty[];
        } else {
            return [
                1,
                ...(this.actor.class?.system.skillIncreaseLevels.value ?? []),
            ] as OneToTwenty[];
        }
    }

    levelOneUpgrades() {
        return (
            (this.actor.class?.system.trainedSkills.additional ?? 0) +
            Math.max(this.actor.abilities.int.base, 0)
        );
    }

    getLevels() {
        return this.levelsWithSkillUpgrades()
            .filter((l) => getSetting("plan-ahead") || this.actor.level >= l)
            .map((level) => ({
                value: level,
                label: _loc("pf2e-skill-issue.levels." + level),
                allowance: level == 1 ? this.levelOneUpgrades() : 1,
            }));
    }

    getCumulativeRanks(
        slug: SkillSlug | LoreSlug,
    ): Record<
        | 0
        | OneToTwenty
        | "source"
        | "class"
        | "background"
        | "override"
        | "final",
        ZeroToFour
    > {
        const isLore = !isSkill(slug);
        let source, characterClass, background, final;
        if (isLore) {
            const lore = this.actor.itemTypes.lore.find(
                (lore) => lore.slug === slug,
            );
            source = lore?._source.system.proficient.value ?? 0;
            characterClass = 0;
            background = 0;
            final = lore?.system.proficient.value ?? 0;
        } else {
            source = this.actor._source.system.skills[slug]?.rank ?? 0;
            characterClass = Number(
                this.actor.class?.system.trainedSkills.value.includes(slug),
            );
            background = Number(
                this.actor.background?.system.trainedSkills.value.includes(
                    slug,
                ),
            );
            final = this.actor.system.skills[slug]?.rank ?? 0;
        }
        const atZero = Math.max(
            source,
            getSetting("mark-background-class") ? background : 0,
            getSetting("mark-background-class") ? characterClass : 0,
        ) as ZeroToFour;
        const increases = this.getData().increases ?? [];
        const levels = rangeInclusive(1, 20).reduce(
            (arr, level) => {
                const inc = increases
                    .filter((inc) => inc.slug === slug && inc.level === level)
                    .reduce((rank, e) => Math.max(rank, e.rank), 0);
                const prevRank = arr[arr.length - 1][1];
                const rank = Math.max(prevRank, inc) as ZeroToFour;
                arr.push([level, rank] as [OneToTwenty, ZeroToFour]);
                return arr;
            },
            [[0, atZero]] as [0 | OneToTwenty, ZeroToFour][],
        );
        const override =
            this.getData().overrides?.[slug] ?? levels[levels.length - 1][1];

        return {
            ...fromEntries(levels),
            source,
            class: characterClass as ZeroToFour,
            background: background as ZeroToFour,
            override,
            final,
        };
    }

    getSkills() {
        return objectEntries(CONFIG.PF2E.skills).map(([slug, { label }]) => ({
            slug: slug,
            label: _loc(label),
        }));
    }
    getLores() {
        return this.actor.itemTypes.lore.map((lore) => ({
            slug: lore.slug as LoreSlug,
            label: lore.name,
        }));
    }
}

function updateValue(
    original: ZeroToFour,
    upgrade?: ZeroToFour,
    override?: ZeroToFour,
) {
    if (typeof override !== "undefined") return override;

    return Math.max(original, upgrade ?? 0) as ZeroToFour;
}

const objectKeys = <T extends object>(obj: T): (keyof T)[] => {
    return Object.keys(obj) as (keyof T)[];
};
export const objectEntries = <T extends object>(
    obj: T,
): [keyof T, T[keyof T]][] => {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
};

export const fromEntries = <K extends string | number | symbol, V>(
    entries: [K, V][],
): Record<K, V> => {
    return Object.fromEntries(entries) as Record<K, V>;
};

export const maxRank = (level: OneToTwenty) => {
    return level >= 15 ? 4 : level >= 7 ? 3 : level >= 2 ? 2 : 1;
};
