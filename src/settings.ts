import { MODULE_ID } from "./module";

type SettingKey = "roguelike" | "plan-ahead" | "unlimited";

export function getSetting(setting: "plan-ahead"): boolean;
export function getSetting(setting: "unlimited"): boolean;
export function getSetting(setting: "roguelike"): boolean;
export function getSetting(setting: SettingKey) {
    return game.settings.get(MODULE_ID, setting);
}

export function registerSettings() {
    game.settings.register(MODULE_ID, "roguelike", {
        name: "pf2e-skill-issue.settings.roguelike.name",
        hint: "pf2e-skill-issue.settings.roguelike.hint",
        type: Boolean,
        scope: "world",
        default: false,
        config: true,
        requiresReload: true,
    });

    game.settings.register(MODULE_ID, "plan-ahead", {
        name: "pf2e-skill-issue.settings.plan-ahead.name",
        hint: "pf2e-skill-issue.settings.plan-ahead.hint",
        type: Boolean,
        scope: "world",
        default: false,
        config: true,
        requiresReload: true,
    });

    game.settings.register(MODULE_ID, "unlimited", {
        name: "pf2e-skill-issue.settings.unlimited.name",
        hint: "pf2e-skill-issue.settings.unlimited.hint",
        type: Boolean,
        scope: "world",
        default: false,
        config: true,
        requiresReload: true,
    });
}
