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
        return [
            1,
            ...(this.actor.class?.system.skillIncreaseLevels.value ?? []),
        ] as OneToTwenty[];
    }

    levelOneUpgrades() {
        return (
            (this.actor.class?.system.trainedSkills.additional ?? 0) +
            Math.max(this.actor.abilities.int.base, 0)
        );
    }

    getLevels() {
        return this.levelsWithSkillUpgrades()
            .filter((l) => this.actor.level >= l)
            .map((level) => ({
                value: level,
                label: _loc("pf2e-skill-issue.levels." + level),
                allowance: level == 1 ? this.levelOneUpgrades() : 1,
            }));
    }

    getRank(
        slug: SkillSlug | LoreSlug,
        level: 0 | OneToTwenty | "source" | "total",
    ): ZeroToFour {
        if (slug in CONFIG.PF2E.skills) {
            if (level === "source" || level === 0)
                return (
                    this.actor._source.system.skills[slug as SkillSlug]?.rank ??
                    0
                );
            if (level === "total") {
                this.actor.system.skills[slug]?.rank;
            }
            return (
                this.getData()
                    .increases?.filter(
                        (inc) =>
                            inc.slug === slug && inc.level <= (level as number),
                    )
                    .map((inc) => inc.rank)
                    .reduce(
                        (acc, e) => Math.max(acc, e) as ZeroToFour,
                        this.getRank(slug, "source"),
                    ) ?? 0
            );
        }
        const lore = this.actor.itemTypes.lore.find(
            (lore) => lore.slug === slug,
        );
        if (!lore) return 0;
        if (level === "source" || level === 0)
            return lore._source.system.proficient.value;
        if (level === "total") {
            lore.system.proficient.value;
        }
        return (
            this.getData()
                .increases?.filter(
                    (inc) =>
                        inc.slug === slug && inc.level <= (level as number),
                )
                .map((inc) => inc.rank)
                .reduce(
                    (acc, e) => Math.max(acc, e) as ZeroToFour,
                    this.getRank(slug, "source"),
                ) ?? 0
        );
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
