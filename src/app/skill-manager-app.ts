import {
    ActorPF2e,
    CharacterPF2e,
    OneToFour,
    SkillSlug,
    ZeroToFour,
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
        this.actorUpdateEventHook = Hooks.on("updateActor", (actor) => {
            if ((actor as ActorPF2e).id !== this.actor.id) {
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
                    const rankMax = maxRank(level.value);
                    return {
                        selected: thisChanged?.rank,
                        id: `cell-${level.value}-${skill.slug}`,
                        options: rangeInclusive(1, rankMax).map((r) => ({
                            value: r as unknown as OneToFour,
                            label: [
                                _loc(
                                    "PF2E.SETTINGS.Variant.Proficiency.Rank.Trained",
                                ),
                                _loc(
                                    "PF2E.SETTINGS.Variant.Proficiency.Rank.Expert",
                                ),
                                _loc(
                                    "PF2E.SETTINGS.Variant.Proficiency.Rank.Master",
                                ),
                                _loc(
                                    "PF2E.SETTINGS.Variant.Proficiency.Rank.Legendary",
                                ),
                            ][r - 1],
                        })),
                    };
                }),
            }));

        return {
            ...context,
            ...{
                increases,
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

        const { skills, increases, levels } = context;

        skills.forEach((skill) => {
            const rowFirstCell = this.element.querySelector(`td#${skill.slug}`);
            const baseRank = this.skillManager.getRank(skill.slug, 0);
            stripGradientClasses(rowFirstCell);
            rowFirstCell?.classList.add(
                `si-enter-${baseRank}`,
                `si-leave-${baseRank}`,
            );
            const rowLastCell = this.element.querySelector(
                `td#${skill.slug}-final`,
            );
            if (rowLastCell) {
                const rankLastLevel = this.skillManager.getRank(
                    skill.slug,
                    levels[levels.length - 1].value,
                );
                const rankFinal = this.skillManager.getRank(
                    skill.slug,
                    "total",
                );
                stripGradientClasses(rowLastCell);

                rowLastCell.classList.add(
                    `si-enter-${rankLastLevel}`,
                    `si-leave-${rankFinal}`,
                );
                rowLastCell.innerHTML = ((r: ZeroToFour) => {
                    switch (r) {
                        case 0:
                            return _loc("PF2E.ProficiencyLevel0");
                        case 1:
                            return _loc("PF2E.ProficiencyLevel1");
                        case 2:
                            return _loc("PF2E.ProficiencyLevel2");
                        case 3:
                            return _loc("PF2E.ProficiencyLevel3");
                        case 4:
                            return _loc("PF2E.ProficiencyLevel4");
                    }
                })(rankFinal);
            }

            skill.cells.forEach((cell, i) => {
                const cellHTML = this.element.querySelector(`td#${cell.id}`);
                if (!cellHTML) return;

                const level = levels[i];
                const rankEnter = this.skillManager.getRank(
                    skill.slug,
                    (level.value - 1) as 0 | OneToTwenty,
                );
                stripGradientClasses(cellHTML);
                cellHTML.classList.add(`si-enter-${rankEnter}`);
                const thisChanged = cell.selected;
                cellHTML.classList.add(
                    `si-leave-${thisChanged ? thisChanged : rankEnter}`,
                );
                const rankNext = rankEnter + 1;
                const rankMax = maxRank(level.value);
                const selectedOnLevel =
                    increases.filter((inc) => inc.level === level.value)
                        .length ?? 0;
                const locked =
                    !thisChanged &&
                    (rankNext > rankMax || selectedOnLevel >= level.allowance);
                if (locked) {
                    cellHTML
                        .querySelector("p")
                        ?.classList.remove("si-disabled");
                    cellHTML
                        .querySelector("select")
                        ?.classList.add("si-disabled");
                    return;
                }

                cellHTML.querySelector("p")?.classList.add("si-disabled");
                cellHTML
                    .querySelector("select")
                    ?.classList.remove("si-disabled");

                rangeInclusive(1, rankMax).forEach((rank) => {
                    const option = cellHTML.querySelector(
                        `option[value="${rank}"]`,
                    );
                    if (!option) return;
                    if (rank < rankNext) {
                        option.classList.add("si-disabled");
                    } else {
                        option.classList.remove("si-disabled");
                    }
                });
            });
        });
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
        Hooks.off("updateActor", this.actorUpdateEventHook);
        return this;
    }
}

interface SkillManagerAppContext extends fa.ApplicationRenderContext {
    increases: NonNullable<SkillManagerData["increases"]>;
    levels: { value: OneToTwenty; label: string; allowance: number }[];
    skills: {
        slug: SkillSlug | LoreSlug;
        label: string;
        cells: {
            id: string;
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

const stripGradientClasses = (e: Element | null) =>
    e?.classList.remove(
        "si-enter-0",
        "si-enter-1",
        "si-enter-2",
        "si-enter-3",
        "si-enter-4",
        "si-leave-0",
        "si-leave-1",
        "si-leave-2",
        "si-leave-3",
        "si-leave-4",
    );
