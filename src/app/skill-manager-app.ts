import {
    ActorPF2e,
    CharacterPF2e,
    ItemPF2e,
    OneToFour,
    SkillSlug,
    ZeroToFour,
} from "@7h3laughingman/pf2e-types";
import {
    fromEntries,
    maxRank,
    objectEntries,
    SkillManager,
} from "../skill-manager";
import { LoreSlug, OneToTwenty, SkillManagerData } from "../data";
import { localeCompare, rangeInclusive, truthy } from "../utils";
import { getSetting } from "../settings";

type UnknownHookHandler = (p: unknown) => void;

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
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    actor: CharacterPF2e;
    skillManager: SkillManager;
    actorUpdateEventHook: number;
    loreUpdateEventHook: number;
    scrollPosition?: number;

    constructor(options: SkillManagerAppOptions) {
        options.uniqueId = `skill-manager-app-${options.actor.uuid}`;
        super(options);
        this.actor = options.actor;
        this.skillManager = new SkillManager(this.actor);
        this.actorUpdateEventHook = Hooks.on("updateActor", ((
            actor: ActorPF2e,
        ) => {
            if ((actor as ActorPF2e).id !== this.actor.id) {
                return;
            }
            this.scrollPosition =
                this.element.querySelector(".scrollable")?.scrollTop;
            this.render({ isFirstRender: false });
        }) as UnknownHookHandler);
        this.loreUpdateEventHook = Hooks.on("updateItem", ((item: ItemPF2e) => {
            if (!item.isOfType("lore") || item.parent?.id !== this.actor.id) {
                return;
            }
            this.scrollPosition =
                this.element.querySelector(".scrollable")?.scrollTop;
            this.render({ isFirstRender: false });
        }) as UnknownHookHandler);
    }

    protected async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SkillManagerAppContext> {
        const context = await super._prepareContext(options);

        const levels = this.skillManager.getLevels();
        const flag = this.skillManager.getData();
        const increases = flag.increases ?? [];

        const ranks = [
            {
                labelFull: "PF2E.ProficiencyLevel0",
                labelShort: "PF2E.SETTINGS.Variant.Proficiency.Rank.Untrained",
            },
            {
                labelFull: "PF2E.ProficiencyLevel1",
                labelShort: "PF2E.SETTINGS.Variant.Proficiency.Rank.Trained",
            },
            {
                labelFull: "PF2E.ProficiencyLevel2",
                labelShort: "PF2E.SETTINGS.Variant.Proficiency.Rank.Expert",
            },
            {
                labelFull: "PF2E.ProficiencyLevel3",
                labelShort: "PF2E.SETTINGS.Variant.Proficiency.Rank.Master",
            },
            {
                labelFull: "PF2E.ProficiencyLevel4",
                labelShort: "PF2E.SETTINGS.Variant.Proficiency.Rank.Legendary",
            },
        ];

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
                            inc.level === level.value &&
                            inc.rank <= maxRank(level.value),
                    );
                    return {
                        selected: thisChanged?.rank,
                        id: `cell-${level.value}-${skill.slug}`,
                    };
                }),
                override: flag.overrides?.[skill.slug],
            }));

        return {
            ...context,
            ...{
                increases,
                ranks,
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
        const scrollable = this.element.querySelector(".scrollable");
        if (scrollable) scrollable.scrollTop = this.scrollPosition ?? 0;

        const { skills, increases, levels } = context;

        skills.forEach((skill) => {
            const rowFirstCell = this.element.querySelector(
                `td#skill-${skill.slug}`,
            );
            const skillRanks = this.skillManager.getCumulativeRanks(skill.slug);
            if (rowFirstCell) {
                const icons = [
                    this.#faIcon("source", skillRanks.source),
                    ...(getSetting("mark-background-class")
                        ? [
                              this.#faIcon("background", skillRanks.background),
                              this.#faIcon("class", skillRanks.class),
                          ]
                        : []),
                ].filter(truthy);
                rowFirstCell.innerHTML =
                    _loc(skill.label) +
                    (icons.length > 0
                        ? '&ensp;<span style="float:right">' +
                          icons
                              .map((i) => i.outerHTML)
                              .reduce((acc, b) => acc + b, "")
                        : "</span>");
            }

            const rowLastCell = this.element.querySelector(
                `td#skill-${skill.slug}-final`,
            );
            if (rowLastCell) {
                const rankFinal = skillRanks.final;
                stripGradientClasses(rowLastCell);

                rowLastCell.classList.add(`si-leave-${rankFinal}`);
                rowLastCell.innerHTML = _loc(
                    `PF2E.ProficiencyLevel${rankFinal}`,
                );
            }

            skill.cells.forEach((cell, i) => {
                const cellHTML = this.element.querySelector(`td#${cell.id}`);
                if (!cellHTML) return;

                const level = levels[i];
                const rankEnter =
                    skillRanks[(level.value - 1) as 0 | OneToTwenty];
                const thisChanged = cell.selected;
                const rankNext = rankEnter + 1;
                const rankMax = maxRank(level.value);
                const selectedOnLevel =
                    increases.filter((inc) => inc.level === level.value)
                        .length ?? 0;
                const locked =
                    !thisChanged &&
                    (rankNext > rankMax ||
                        (selectedOnLevel >= level.allowance &&
                            !getSetting("unlimited")));
                if (locked) {
                    const lock = cellHTML.querySelector("p");
                    if (lock) {
                        if (rankNext > rankMax) {
                            lock.dataset.tooltip = _loc(
                                "pf2e-skill-issue.tooltip.locked-because.no-valid-upgrade-rank",
                            );
                        } else {
                            lock.dataset.tooltip = _loc(
                                "pf2e-skill-issue.tooltip.locked-because.exhausted-allowance",
                            );
                        }
                        lock.classList.remove("si-disabled");
                    }

                    cellHTML
                        .querySelector("select")
                        ?.classList.add("si-disabled");
                    return;
                }

                cellHTML.querySelector("p")?.classList.add("si-disabled");
                cellHTML
                    .querySelector("select")
                    ?.classList.remove("si-disabled");

                rangeInclusive(0, 4).forEach((rank) => {
                    const option = cellHTML.querySelector(
                        `option[value="${rank}"]`,
                    );
                    if (!option) return;
                    if (rank < rankNext || rank > rankMax) {
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
                if (
                    isNaN(value) ||
                    value < 1 ||
                    value > maxRank(level as OneToTwenty)
                )
                    return;
                return {
                    slug: m[2] as SkillSlug | LoreSlug,
                    level: level as OneToTwenty,
                    rank: value as OneToFour,
                };
            })
            .filter(truthy);

        const overrides = fromEntries(
            objectEntries(formData.object)
                .filter(
                    ([k, _]) =>
                        typeof k === "string" && k.startsWith("cell-override-"),
                )
                .map(([k, v]) => {
                    const m = k.match(/^cell-override-(.*)$/);
                    if (!m) return;
                    const value = Number(v);
                    if (isNaN(value) || value < 0 || value > 4) return;
                    return [m[1] as SkillSlug | LoreSlug, value] as [
                        SkillSlug | LoreSlug,
                        ZeroToFour,
                    ];
                })
                .filter(truthy),
        );

        const flag = {
            increases: _replace(increases),
            overrides: _replace(overrides),
            version: 1,
            note: formData.object.note as string,
        };

        await this.actor.setFlag("pf2e-skill-issue", "skill-data", flag);
    }

    #faIcon(source: "source" | "class" | "background", rank: ZeroToFour) {
        if (rank === 0) return null;
        const icon = document.createElement("i");
        switch (source) {
            case "source":
                icon.classList.add("fa-solid", "fa-file-pen");
                break;
            case "class":
                icon.classList.add("fa-solid", "fa-shield");
                break;
            case "background":
                icon.classList.add("fa-solid", "fa-book");
                break;
        }
        icon.dataset.tooltip = _loc(
            `pf2e-skill-issue.tooltip.granted-by.${source}`,
            {
                proficiency: `<p style="text-align:center;">${_loc(`PF2E.ProficiencyLevel${rank}`)}</p>`,
            },
        );
        return icon;
    }

    override async close(options?: fa.ApplicationClosingOptions) {
        await super.close(options);
        Hooks.off("updateActor", this.actorUpdateEventHook);
        Hooks.off("updateItem", this.loreUpdateEventHook);
        return this;
    }
}

interface SkillManagerAppContext extends fa.ApplicationRenderContext {
    increases: NonNullable<SkillManagerData["increases"]>;
    levels: { value: OneToTwenty; label: string; allowance: number }[];
    ranks: { labelShort: string; labelFull: string }[];
    skills: {
        slug: SkillSlug | LoreSlug;
        label: string;
        cells: {
            id: string;
            options?: { value: OneToFour; label: string }[];
            selected?: OneToFour;
        }[];
        override?: ZeroToFour;
    }[];
    note: string;
}

const stripGradientClasses = (e: Element | null) =>
    e?.classList.remove(
        "si-leave-0",
        "si-leave-1",
        "si-leave-2",
        "si-leave-3",
        "si-leave-4",
    );
