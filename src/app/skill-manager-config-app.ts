import { CharacterPF2e, SkillSlug } from "@7h3laughingman/pf2e-types";
import {
    div1,
    fromEntries,
    getApp,
    isSkill,
    localeCompare,
    rangeInclusive,
    rem1,
} from "../utils";
import { SkillManager } from "../skill-manager";
import { LoreId, OneToTwenty, SkillManagerData } from "../data";

export function openSkillManagerConfig(actor: CharacterPF2e) {
    const id = `skill-manager-config-app-${actor.uuid}`;
    const currentWindow = getApp(id);

    return currentWindow ?? new SkillManagerConfigApp({ id, actor });
}

interface SkillManagerConfigAppOptions extends DeepPartial<foundry.applications.ApplicationConfiguration> {
    actor: CharacterPF2e;
}

class SkillManagerConfigApp extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2,
) {
    static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.ApplicationConfiguration> =
        {
            tag: "form",
            form: {
                submitOnChange: true,
                closeOnSubmit: false,
                handler: SkillManagerConfigApp.submitFormHandler,
            },
            window: {
                contentClasses: ["standard-form"],
                title: "pf2e-skill-issue.config.title",
            },
        };

    static override PARTS = {
        form: {
            template:
                "modules/pf2e-skill-issue/templates/skill-manager-config-app.hbs",
        },
    };

    actor: CharacterPF2e;
    skillManager: SkillManager;
    scrollPosition?: number;

    constructor(options: SkillManagerConfigAppOptions) {
        super(options);
        this.actor = options.actor;
        this.skillManager = new SkillManager(this.actor);
    }

    protected async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SkillManagerConfigAppContext> {
        const context = super._prepareContext(options);
        const data = this.skillManager.getData();
        const overrides = data.capOverrides ?? {};
        const planAheadCap = data.settings?.["plan-ahead-cap"];

        const skills = this.skillManager.getSkills();
        const lores = this.skillManager.getLores();

        const planAheadCapField = new foundry.data.fields.NumberField({
            min: 0,
            max: 20,
            step: 1,
            integer: true,
        });
        const backgroundSkillField = new foundry.data.fields.SetField(
            new foundry.data.fields.StringField({
                choices: fromEntries(
                    [skills, lores]
                        .flat()
                        .toSorted(sortSkillLore)
                        .map(({ slug, label }) => [slug, label]),
                ),
            }),
        );
        const classSkillField = new foundry.data.fields.SetField(
            new foundry.data.fields.StringField({
                choices: fromEntries(
                    [skills, lores]
                        .flat()
                        .toSorted(sortSkillLore)
                        .map(({ slug, label }) => [slug, label]),
                ),
            }),
        );

        const paragonSkillField = new foundry.data.fields.SetField(
            new foundry.data.fields.StringField({
                choices: fromEntries(
                    [skills, lores]
                        .flat()
                        .toSorted(sortSkillLore)
                        .map(({ slug, label }) => [slug, label]),
                ),
            }),
        );

        const markAutoBackgroundClassField =
            new foundry.data.fields.BooleanField();

        return {
            ...context,
            planAheadCapField,
            backgroundSkillField,
            backgroundSkills: data.backgroundSkills ?? [],
            classSkillField,
            classSkills: data.classSkills ?? [],
            markAutoBackgroundClassField,
            markAutoBackgroundClass:
                data.settings?.["mark-background-class"] ?? false,
            paragonSkillField,
            paragonSkills: data.paragonSkills,
            ...{
                planAheadCap: planAheadCap ?? 0,
                overrides: rangeInclusive(1, 20)
                    .map((level) => ({
                        level,
                        label: _loc(`pf2e-skill-issue.levels.${level}`),
                        allowance:
                            this.skillManager.getBaseUpgradesForLevel(level),
                        override: overrides[level],
                    }))
                    .sort((a, b) => {
                        const a_row = rem1(a.level, 5);
                        const a_col = div1(a.level, 5);
                        const b_row = rem1(b.level, 5);
                        const b_col = div1(b.level, 5);
                        return a_row * 5 + a_col - b_row * 5 - b_col;
                    }),
            },
        } as SkillManagerConfigAppContext;
    }
    override async _onRender(
        context: SkillManagerConfigAppContext,
        options: fa.ApplicationRenderOptions,
    ) {
        super._onRender(context, options);
        const lores = this.skillManager.getLores().toSorted(sortByLabel);
        const selector = lores
            .map(({ slug }) => `option[value='${slug}']`)
            .join(", ");
        const selects = this.element.querySelectorAll("select");
        selects.forEach((e) => {
            const l = e.querySelector(selector);
            if (l) {
                l.parentElement?.insertBefore(document.createElement("hr"), l);
            }
        });
    }

    static async submitFormHandler(
        this: SkillManagerConfigApp,
        _event: Event,
        _form: HTMLFormElement,
        formData: foundry.applications.ux.FormDataExtended,
    ) {
        const capOverrides = rangeInclusive(1, 20).reduce(
            (acc, level) => {
                const key = `override-level-${level}`;
                const value = formData.object[key];
                if (typeof value === "number") {
                    acc[level] = value;
                }
                return acc;
            },
            {} as NonNullable<SkillManagerData["capOverrides"]>,
        );
        const markBackgroundClass = formData.object.markAutoBackgroundClass;

        const flag = {
            capOverrides: _replace(capOverrides),
            settings: {
                "plan-ahead-cap":
                    Number(formData.object.planAheadCap) > 0
                        ? Number(formData.object.planAheadCap)
                        : _del,
                "mark-background-class": markBackgroundClass,
            },
            backgroundSkills: _replace(formData.object.backgroundSkills),
            classSkills: _replace(formData.object.classSkills),
            paragonSkills: _replace(formData.object.paragonSkills),
        };

        await this.skillManager.setData(flag);
    }
}

interface SkillManagerConfigAppContext extends fa.ApplicationRenderContext {
    planAheadCap?: OneToTwenty;
    markAutoBackgroundClass: boolean;
    overrides: {
        level: number;
        label: string;
        allowance: number;
        override?: number;
    }[];
}

function sortSkillLore(
    a: { slug: SkillSlug | LoreId; label: string },
    b: { slug: SkillSlug | LoreId; label: string },
) {
    const aSkill = isSkill(a.slug);
    const bSkill = isSkill(b.slug);
    if (aSkill !== bSkill) {
        return Number(bSkill) - Number(aSkill);
    }
    return sortByLabel(a, b);
}

function sortByLabel(
    a: { slug: SkillSlug | LoreId; label: string },
    b: { slug: SkillSlug | LoreId; label: string },
) {
    return localeCompare(a.label, b.label);
}
