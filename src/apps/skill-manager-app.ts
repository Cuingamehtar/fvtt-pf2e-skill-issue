import {
    CharacterPF2e,
    OneToFour,
    SkillSlug,
} from "@7h3laughingman/pf2e-types";
import { maxRank, objectEntries, SkillManager } from "../skill-manager";
import { LoreSlug, OneToTwenty, SkillManagerData } from "../data";

interface SkillManagerAppOptions extends DeepPartial<foundry.applications.ApplicationConfiguration> {
    actor: CharacterPF2e;
}

export class SkillManagerApp extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2,
) {
    static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.ApplicationConfiguration> =
        {
            tag: "form",
            form: {
                submitOnChange: true,
                closeOnSubmit: false,
                handler: SkillManagerApp.submitFormHandler,
            },
            window: {
                contentClasses: ["standard-form"],
                title: "pf2e-skill-issue.skill-manager-title",
            },
        };

    static override PARTS = {
        form: {
            template:
                "modules/pf2e-skill-issue/templates/skill-manager-app.hbs",
            scrollable: [".scrollable"],
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    actor: CharacterPF2e;
    skillManager: SkillManager;
    actorUpdateEventHook: number;

    constructor(options: SkillManagerAppOptions) {
        options.uniqueId = `skill-manager-app-${options.actor.uuid}`;
        super(options);
        this.actor = options.actor;
        this.skillManager = new SkillManager(this.actor);
        this.actorUpdateEventHook = Hooks.on("updateCharacterPF2e", (actor) => {
            if ((actor as CharacterPF2e).id !== this.actor.id) {
                return;
            }
            this.render();
        });
    }

    protected async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SkillManagerAppContext> {
        const context = await super._prepareContext(options);

        const levels = this.skillManager.getLevels();
        const flag = this.skillManager.getData();
        const increases = flag.increases ?? [];

        const skills = [
            this.skillManager
                .getSkills()
                .sort((a, b) => localeCompare(a.label, b.label)),
            this.skillManager
                .getLores()
                .sort((a, b) => localeCompare(a.label, b.label)),
        ]
            .flat()
            .map((skill) => ({
                ...skill,
                cells: levels.map((level) => {
                    const thisChanged = increases.find(
                        (inc) =>
                            inc.slug === skill.slug &&
                            inc.level === level.value,
                    );
                    const selectedOnLevel =
                        increases.filter((inc) => inc.level === level.value)
                            .length ?? 0;
                    const rankEnter = Math.max(
                        skill.rank,
                        ...increases
                            .filter(
                                (inc) =>
                                    inc.level < level.value &&
                                    inc.slug == skill.slug,
                            )
                            .map((inc) => inc.rank),
                    ) as OneToFour;
                    if (!thisChanged && selectedOnLevel >= level.allowance) {
                        return {
                            id: `cell-${level.value}-${skill.slug}`,
                            rankColorEnter: `si-enter-${rankEnter}`,
                            rankColorLeave: `si-leave-${rankEnter}`,
                        };
                    }
                    const rankNext = Math.min(rankEnter + 1, 4) as OneToFour;
                    const rankMax = maxRank(level.value);
                    if (!thisChanged && rankNext > rankMax)
                        return {
                            id: `cell-${level.value}-${skill.slug}`,
                            rankColorEnter: `si-enter-${rankEnter}`,
                            rankColorLeave: `si-leave-${rankEnter}`,
                        };
                    return {
                        selected: thisChanged?.rank,
                        id: `cell-${level.value}-${skill.slug}`,
                        rankColorEnter: `si-enter-${rankEnter}`,
                        rankColorLeave: `si-leave-${thisChanged?.rank ?? rankEnter}`,
                        options: rangeInclusive(rankNext, rankMax).map((r) => ({
                            value: r as unknown as OneToFour,
                            label: ["T", "E", "M", "L"][r - 1],
                        })),
                    };
                }),
            }));

        return {
            ...context,
            ...{
                levels,
                skills,
                note: flag.note ?? "",
            },
        };
    }

    override async _onRender(
        context: SkillManagerAppContext,
        options: fa.ApplicationRenderOptions,
    ) {
        super._onRender(context, options);
    }

    static async submitFormHandler(
        this: SkillManagerApp,
        _event: Event,
        _form: HTMLFormElement,
        formData: foundry.applications.ux.FormDataExtended,
    ) {
        const increases = objectEntries(formData.object)
            .filter(([k, _]) => typeof k === "string" && k.startsWith("cell-"))
            .map(([k, v]) => {
                const m = k.match(/^cell-(\d+)-(.*)$/);
                if (!m) return;
                const level = Number(m[1]);
                if (isNaN(level) || level < 1 || level > 20) return;
                const value = Number(v);
                if (isNaN(value) || value < 1 || value > 4) return;
                return {
                    slug: m[2] as SkillSlug | LoreSlug,
                    level: level as OneToTwenty,
                    rank: value as OneToFour,
                };
            })
            .filter(truthy);

        const flag: SkillManagerData = {
            increases,
            version: 1,
            note: formData.object.note as string,
        };

        await this.actor.setFlag("pf2e-skill-issue", "skill-data", flag);
    }

    override async close(options?: fa.ApplicationClosingOptions) {
        await super.close(options);
        Hooks.off("updateCharacterPF2e", this.actorUpdateEventHook);
        return this;
    }
}

interface SkillManagerAppContext extends fa.ApplicationRenderContext {
    levels: { value: OneToTwenty; label: string; allowance: number }[];
    skills: {
        slug: SkillSlug | LoreSlug;
        label: string;
        cells: {
            id: string;
            rankColorEnter: string;
            rankColorLeave: string;
            options?: { value: OneToFour; label: string }[];
            selected?: OneToFour;
        }[];
    }[];
    note: string;
}

const rangeInclusive = (from: number, to: number) =>
    Array.fromRange(to - from + 1, from);

const truthy = <T>(e: T): e is NonNullable<T> => Boolean(e);

const localeCompare = (a: string, b: string) => a.localeCompare(b);
