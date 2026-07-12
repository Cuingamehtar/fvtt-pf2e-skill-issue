import { CharacterPF2e, ZeroToFour } from "@7h3laughingman/pf2e-types";
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

    #getData() {
        const data = this.actor.getFlag(MODULE_ID, "skill-data") as
            SkillManagerData | undefined;
        return data ? migrateData(data) : newData;
    }

    prepareData() {
        const data = this.#getData();
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

    #levelsWithSkillUpgrades() {
        return this.actor.class?.system.skillIncreaseLevels.value ?? [];
    }

    #levelOneUpgrades() {
        return (
            this.actor.class?.system.trainedSkills.additional ??
            0 + Math.max(this.actor.abilities.int.base, 0)
        );
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

const maxRank = (level: OneToTwenty) => {
    return level >= 15 ? 4 : level >= 7 ? 3 : level >= 2 ? 2 : 1;
};
