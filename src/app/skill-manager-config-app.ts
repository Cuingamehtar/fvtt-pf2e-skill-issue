import { CharacterPF2e } from "@7h3laughingman/pf2e-types";
import { div1, getApp, rangeInclusive, rem1 } from "../utils";
import { SkillManager } from "../skill-manager";
import { OneToTwenty, SkillManagerData } from "../data";

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

        return {
            ...context,
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
                markBackgroundClass:
                    data.settings?.["mark-background-class"] ?? false,
            },
        } as SkillManagerConfigAppContext;
    }

    static async submitFormHandler(
        this: SkillManagerConfigApp,
        _event: Event,
        _form: HTMLFormElement,
        formData: foundry.applications.ux.FormDataExtended,
    ) {
        const planAheadCap = formData.object["plan-ahead-cap"] as number;
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
        const markBackgroundClass = formData.object["mark-background-class"];

        const flag = {
            capOverrides: _replace(capOverrides),
            settings: {
                "plan-ahead-cap": planAheadCap > 0 ? planAheadCap : _del,
                "mark-background-class": markBackgroundClass,
            },
        };

        await this.skillManager.setData(flag);
    }
}

interface SkillManagerConfigAppContext extends fa.ApplicationRenderContext {
    planAheadCap?: OneToTwenty;
    markBackgroundClass: boolean;
    overrides: {
        level: number;
        label: string;
        allowance: number;
        override?: number;
    }[];
}
