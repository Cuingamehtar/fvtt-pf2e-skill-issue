import { CharacterPF2e } from "@7h3laughingman/pf2e-types";
import { MODULE_ID } from "./module";
import {
    LoreId,
    migrateData,
    newData,
    OneToTwenty,
    SkillManagerData,
} from "./data";
import { mapSome, objectEntries, objectKeys } from "./utils";
import { LoreInstance, SkillInstance } from "./skill";

export class SkillManager {
    actor: CharacterPF2e;

    constructor(actor: CharacterPF2e) {
        this.actor = actor;
    }

    getData() {
        const data = this.actor.getFlag(MODULE_ID, "skill-data") as
            SkillManagerData | undefined;
        if (!data) return newData;
        return migrateData(data, { manager: this });
    }
    async setData(
        newData:
            | DeepPartial<SkillManagerData>
            | {
                  overrides?: ReturnType<typeof _replace>;
              }
            | {
                  settings?: ReturnType<typeof _replace>;
              },
    ) {
        const obj = foundry.utils.mergeObject(this.getData(), newData, {
            inplace: true,
        });

        await this.actor.setFlag(
            "pf2e-skill-issue",
            "skill-data",
            _replace(obj),
        );
    }

    prepareData() {
        objectKeys(CONFIG.PF2E.skills).forEach((s) => {
            const skill = new SkillInstance(s, this);
            this.actor.system.skills[s].rank = skill.getAppliedRank();
        });
        this.actor.itemTypes.lore.forEach((lore) => {
            const loreInstance = new LoreInstance(lore.id, this);
            lore.system.proficient.value = loreInstance.getAppliedRank();
        });
    }

    get #classSkillLevels() {
        return (this.actor.class?.system.skillIncreaseLevels.value ??
            []) as OneToTwenty[];
    }

    get #classTrainedSkills() {
        return this.actor.class?.system.trainedSkills.additional ?? 0;
    }
    get #intelligenceSkills() {
        return this.actor.abilities.int.base;
    }

    getBaseUpgradesForLevel(level: OneToTwenty) {
        return level === 1
            ? this.#classTrainedSkills + this.#intelligenceSkills
            : Number(this.#classSkillLevels.includes(level));
    }

    getUpgradesForLevel(level: OneToTwenty) {
        const data = this.getData();
        return (
            mapSome(data?.capOverrides?.[level], (cap) => ({
                value: cap,
                override: true,
            })) ?? {
                value: this.getBaseUpgradesForLevel(level),
                override: false,
            }
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
            slug: lore.id as LoreId,
            label: lore.name,
        }));
    }
}
