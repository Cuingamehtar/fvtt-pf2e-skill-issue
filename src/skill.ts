import { OneToFour, SkillSlug, ZeroToFour } from "@7h3laughingman/pf2e-types";
import { SkillManager } from "./skill-manager";
import { LoreId, OneToTwenty } from "./data";

export abstract class AbstractSkillInstance<
    T extends "skill" | "lore",
    S extends SkillSlug | LoreId,
> {
    abstract type: T;
    constructor(
        public slug: S,
        public skillManager: SkillManager,
    ) {}

    get actor() {
        return this.skillManager.actor;
    }

    protected get actorLevel(): OneToTwenty {
        return this.actor.level as OneToTwenty;
    }

    getAutoRank(level: OneToTwenty) {
        return Math.max(
            this.isParagon ? paragonRank(level) : 0,
            this.backgroundAutoRank,
            this.backgroundManualRank,
            this.classAutoRank,
            this.classManualRank,
        );
    }
    getChoices(level: OneToTwenty): { min: OneToFour; max: OneToFour } {
        const prevRank = this.getManualRank((level - 1) as 0 | OneToTwenty);
        const nextRank = Math.max(prevRank, this.getAutoRank(level)) + 1;
        const max = maxRank(level);
        return { min: nextRank as OneToFour, max };
    }
    getManualRank(level: 0 | OneToTwenty): ZeroToFour {
        const data = this.skillManager.getData();
        return (
            data.increases
                ?.filter((inc) => inc.slug === this.slug && level >= inc.level)
                .reduce(
                    (acc, inc) => Math.max(acc, inc.rank) as OneToFour,
                    0 as ZeroToFour,
                ) ?? (0 as ZeroToFour)
        );
    }
    getAppliedRank(): ZeroToFour {
        if (typeof this.override === "number") return this.override;
        const level = this.actorLevel;
        const auto = this.getAutoRank(level);
        const manual = this.getManualRank(level);
        return Math.max(this.source, auto, manual) as ZeroToFour;
    }

    abstract get finalRank(): ZeroToFour;

    get isParagon() {
        const data = this.skillManager.getData();
        return data.paragonSkills?.includes(this.slug) ?? false;
    }
    paragonRank(level: 0 | OneToTwenty): ZeroToFour {
        return this.isParagon && level > 0 ? paragonRank(level) : 0;
    }
    get backgroundAutoRank(): 0 | 1 {
        return 0;
    }
    get backgroundManualRank(): 0 | 1 {
        const data = this.skillManager.getData();
        return data.backgroundSkills?.includes(this.slug) ? 1 : 0;
    }
    get classAutoRank(): 0 | 1 {
        return 0;
    }
    get classManualRank() {
        const data = this.skillManager.getData();
        return data.classSkills?.includes(this.slug) ? 1 : 0;
    }

    abstract get source(): ZeroToFour;
    get override() {
        const data = this.skillManager.getData();
        return data.overrides?.[this.slug];
    }
}

export class SkillInstance extends AbstractSkillInstance<"skill", SkillSlug> {
    type: "skill";
    constructor(slug: SkillSlug, skillManager: SkillManager) {
        super(slug, skillManager);
        this.type = "skill";
    }

    get backgroundAutoRank() {
        return this.actor.background?.system.trainedSkills.value.includes(
            this.slug,
        )
            ? 1
            : 0;
    }

    get classAutoRank() {
        return this.actor.class?.system.trainedSkills.value.includes(this.slug)
            ? 1
            : 0;
    }

    get source(): ZeroToFour {
        return this.actor._source.system.skills[this.slug]?.rank ?? 0;
    }

    get finalRank(): ZeroToFour {
        return this.actor.system.skills[this.slug].rank;
    }
}

export class LoreInstance extends AbstractSkillInstance<"lore", LoreId> {
    type: "lore";
    constructor(slug: LoreId, skillManager: SkillManager) {
        super(slug, skillManager);
        this.type = "lore";
    }

    get source(): ZeroToFour {
        return (
            this.actor.itemTypes.lore.find((lore) => lore.id === this.slug)
                ?._source.system.proficient.value ?? 0
        );
    }

    get finalRank(): ZeroToFour {
        return (
            this.actor.itemTypes.lore.find((lore) => lore.id === this.slug)
                ?.system.proficient.value ?? 0
        );
    }
}

export const maxRank = (level: OneToTwenty | 0) => {
    return level >= 15 ? 4 : level >= 7 ? 3 : level >= 2 ? 2 : 1;
};

export function paragonRank(level: OneToTwenty | 0) {
    return level >= 15 ? 4 : level >= 7 ? 3 : level >= 3 ? 2 : 1;
}
