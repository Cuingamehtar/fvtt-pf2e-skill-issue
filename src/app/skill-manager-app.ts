import {
    ActorPF2e,
    CharacterPF2e,
    ItemPF2e,
    OneToFour,
    SkillSlug,
    ZeroToFour,
} from "@7h3laughingman/pf2e-types";
import { SkillManager } from "../skill-manager";
import { currentDataVersion, LoreId, OneToTwenty } from "../data";
import {
    localeCompare,
    rangeInclusive,
    notNull,
    getApp,
    objectEntries,
    fromEntries,
    isSkill,
} from "../utils";
import { openSkillManagerConfig } from "./skill-manager-config-app";
import { LoreInstance, maxRank, SkillInstance } from "../skill";

type UnknownHookHandler = (p: unknown) => void;

const rankLabels = [
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

interface SkillManagerAppOptions extends DeepPartial<foundry.applications.ApplicationConfiguration> {
    actor: CharacterPF2e;
}

export function openSkillManager(actor: CharacterPF2e) {
    const id = `skill-manager-app-${actor.uuid}`;
    const currentWindow = getApp(id);

    return currentWindow ?? new SkillManagerApp({ id, actor });
}

Hooks.on("updateActor", ((actor: ActorPF2e) => {
    const id = `skill-manager-app-${actor.uuid}`;
    const app = getApp(id) as SkillManagerApp | undefined;
    app?.render({ isFirstRender: false });
}) as UnknownHookHandler);
for (const hook of ["createItem", "deleteItem", "updateItem"]) {
    Hooks.on(hook, ((item: ItemPF2e) => {
        if (!item.isOfType("background", "class", "lore")) return;
        const actor = item.parent;
        if (!actor) return;
        const id = `skill-manager-app-${actor.uuid}`;
        const app = getApp(id) as SkillManagerApp | undefined;
        app?.render({ isFirstRender: false });
    }) as UnknownHookHandler);
}

class SkillManagerApp extends foundry.applications.api.HandlebarsApplicationMixin(
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
                controls: [
                    {
                        icon: "fa-solid fa-gear",
                        label: "pf2e-skill-issue.config.button",
                        action: "openConfig",
                        visible: true,
                    },
                ],
            },
            actions: {
                openConfig: SkillManagerApp.onOpenConfig,
            },
        };

    static override PARTS = {
        form: {
            template:
                "modules/pf2e-skill-issue/templates/skill-manager-app.hbs",
        },
    };

    actor: CharacterPF2e;
    skillManager: SkillManager;
    scrollPosition?: number;

    constructor(options: SkillManagerAppOptions) {
        super(options);
        this.actor = options.actor;
        this.skillManager = new SkillManager(this.actor);
    }

    _getFrameButtons(options: fa.ApplicationRenderOptions) {
        return [
            // @ts-expect-error
            ...super._getFrameButtons(options),
            {
                icon: "fa-solid fa-gear",
                label: "pf2e-skill-issue.config.button",
                action: "openConfig",
                visible: true,
            },
        ];
    }

    protected async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SkillManagerAppContext> {
        const context = await super._prepareContext(options);
        const flag = this.skillManager.getData();

        const skills = [
            this.skillManager
                .getSkills()
                .sort((a, b) => localeCompare(a.label, b.label)),
            this.skillManager
                .getLores()
                .sort((a, b) => localeCompare(a.label, b.label)),
        ].flat();

        return {
            ...context,
            ...{
                levels: rangeInclusive(1, 20).map((level) => ({
                    value: level,
                    label: _loc(`pf2e-skill-issue.levels.${level}`),
                })),
                ranks: rankLabels,
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

        const data = this.skillManager.getData();
        const filteredIncreases =
            data.increases?.filter((inc) =>
                context.skills.some((s) => s.slug == inc.slug),
            ) ?? [];

        const scrollable = this.element.querySelector(".scrollable");
        if (scrollable) scrollable.scrollTop = this.scrollPosition ?? 0;

        const { skills } = context;

        function keepColumn(
            level: OneToTwenty,
            increases: number,
            allowance: number,
            actorLevel: OneToTwenty,
            planAheadLevel?: OneToTwenty,
        ) {
            if (increases > 0) return true;
            if (allowance == 0) return false;
            if (level <= actorLevel) return true;
            if (planAheadLevel && level <= planAheadLevel) return true;
            return false;
        }

        const allowances = rangeInclusive(1, 20).map((level) => {
            const allowance = this.skillManager.getUpgradesForLevel(level);
            const increases =
                filteredIncreases.filter((inc) => inc.level === level).length ??
                0;
            const isHidden = !keepColumn(
                level,
                increases,
                allowance.value,
                this.actor.level as OneToTwenty,
                data.settings?.["plan-ahead-cap"],
            );
            this.element
                .querySelectorAll(`.si-col-${level}`)
                .forEach((e) => setVisibility(e, !isHidden));
            const label = this.element.querySelector(`.si-allowance-${level}`);
            if (label)
                label.textContent = `(${increases}${increases > allowance.value ? "!" : ""}/${allowance.value}${allowance.override ? "!" : ""})`;
            return {
                max: allowance.value,
                current: increases,
                capped: increases >= allowance.value,
            };
        });

        skills.forEach((skill) => {
            const instance = isSkill(skill.slug)
                ? new SkillInstance(skill.slug, this.skillManager)
                : new LoreInstance(skill.slug, this.skillManager);
            const row = this.element.querySelector(`tr.si-row-${skill.slug}`);
            if (!row) return;
            const rowFirstCell = row.querySelector(`td#skill-${skill.slug}`);
            if (rowFirstCell) {
                const icons = [
                    this.#faIcon("source", instance.source),
                    this.#faIcon(
                        "background-auto",
                        data.settings?.["mark-background-class"]
                            ? instance.backgroundAutoRank
                            : 0,
                    ),
                    this.#faIcon(
                        "background-manual",
                        instance.backgroundManualRank,
                    ),
                    this.#faIcon(
                        "class-auto",
                        data.settings?.["mark-background-class"]
                            ? instance.classAutoRank
                            : 0,
                    ),
                    this.#faIcon("class-manual", instance.classManualRank),
                    this.#faIcon(
                        "paragon-skill",
                        Number(
                            instance.paragonRank(
                                this.actor.level as OneToTwenty,
                            ),
                        ) as ZeroToFour,
                    ),
                ].filter(notNull);
                rowFirstCell.innerHTML =
                    _loc(skill.label) +
                    (icons.length > 0
                        ? '&ensp;<span style="float:right">' +
                          icons
                              .map((i) => i.outerHTML)
                              .reduce((acc, b) => acc + b, "") +
                          "</span>"
                        : "");
            }

            const rowOverrideCell = row.querySelector(`td.si-col-override`);
            if (rowOverrideCell) {
                const select = rowOverrideCell.querySelector("select");
                const override = data.overrides?.[skill.slug];
                if (select) {
                    select.value =
                        typeof override === "number" ? String(override) : "-";
                }
            }

            const rowLastCell = row.querySelector(
                `td#skill-${skill.slug}-final`,
            );
            if (rowLastCell) {
                const rankFinal = instance.finalRank;
                stripGradientClasses(rowLastCell);

                rowLastCell.classList.add(`si-leave-${rankFinal}`);
                rowLastCell.innerHTML = _loc(
                    `PF2E.ProficiencyLevel${rankFinal}`,
                );
            }

            rangeInclusive(1, 20).forEach((level, i) => {
                const cellHTML = row.querySelector(
                    `td.si-row-${skill.slug}.si-col-${level}`,
                );
                if (!cellHTML || cellHTML.classList.contains("si-disabled"))
                    return;

                const thisChanged = filteredIncreases.find(
                    (inc) => inc.level === level && inc.slug === skill.slug,
                );
                const select = cellHTML.querySelector("select");
                const lock = cellHTML.querySelector("p");
                if (thisChanged && select) {
                    select.value = String(thisChanged.rank);
                }
                const choices = instance.getChoices(level);
                const locked =
                    !thisChanged &&
                    (choices.min > choices.max || allowances[i].capped);
                if (locked) {
                    if (lock) {
                        if (choices.min > choices.max) {
                            lock.dataset.tooltip = _loc(
                                "pf2e-skill-issue.tooltip.locked-because.no-valid-upgrade-rank",
                            );
                        } else {
                            lock.dataset.tooltip = _loc(
                                "pf2e-skill-issue.tooltip.locked-because.exhausted-allowance",
                            );
                        }
                        setVisibility(lock, true);
                    }

                    setVisibility(select, false);
                    return;
                }

                setVisibility(lock, false);
                setVisibility(select, true);

                rangeInclusive(0, 4).forEach((rank) => {
                    const option = cellHTML.querySelector(
                        `option[value="${rank}"]`,
                    );
                    setVisibility(
                        option,
                        rank >= choices.min && rank <= choices.max,
                    );
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
                    slug: m[2] as SkillSlug | LoreId,
                    level: level as OneToTwenty,
                    rank: value as OneToFour,
                };
            })
            .filter(notNull);

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
                    return [m[1], value] as [SkillSlug | LoreId, ZeroToFour];
                })
                .filter(notNull),
        );

        const flag = {
            increases: increases,
            overrides: _replace(overrides),
            version: currentDataVersion,
            note: formData.object.note as string,
        };

        await this.skillManager.setData(flag);
    }

    override async render(options?: DeepPartial<fa.ApplicationRenderOptions>) {
        this.scrollPosition =
            this.element?.querySelector(".scrollable")?.scrollTop;
        return super.render(options);
    }

    static onOpenConfig(
        this: SkillManagerApp,
        event: Event,
        _target: HTMLElement,
    ) {
        event.preventDefault();
        const configWindow = openSkillManagerConfig(this.actor);
        configWindow.render(true);
    }

    #faIcon(
        source:
            | "source"
            | "class-auto"
            | "class-manual"
            | "background-auto"
            | "background-manual"
            | "paragon-skill"
            | "paragon-lore",
        rank: ZeroToFour,
    ) {
        if (rank === 0) return null;
        const icon = document.createElement("i");
        const faClass = (() => {
            switch (source) {
                case "source":
                    return "fa-file-pen";
                case "class-auto":
                case "class-manual":
                    return "fa-shield";
                case "background-auto":
                case "background-manual":
                    return "fa-book";
                case "paragon-skill":
                case "paragon-lore":
                    return "fa-star";
            }
        })();
        icon.classList.add("fa-solid", faClass);

        icon.dataset.tooltip = _loc(
            `pf2e-skill-issue.tooltip.granted-by.${source}`,
            {
                proficiency: _loc(`PF2E.ProficiencyLevel${rank}`),
            },
        );
        return icon;
    }
}

interface SkillManagerAppContext extends fa.ApplicationRenderContext {
    note: string;
    ranks: { labelShort: string; labelFull: string }[];
    levels: { value: OneToTwenty; label: string }[];
    skills: {
        slug: SkillSlug | LoreId;
        label: string;
    }[];
}

const stripGradientClasses = (e: Element | null) =>
    e?.classList.remove(
        "si-leave-0",
        "si-leave-1",
        "si-leave-2",
        "si-leave-3",
        "si-leave-4",
    );

function setVisibility(e: Element | undefined | null, visible: boolean) {
    if (!e) return;
    if (visible) {
        e.classList.remove("si-disabled");
    } else {
        e.classList.add("si-disabled");
    }
}
