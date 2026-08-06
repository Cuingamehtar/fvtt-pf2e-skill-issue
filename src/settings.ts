import { MODULE_ID } from "./module";

type SettingKey = never;

export function getSetting(setting: SettingKey) {
    return game.settings.get(MODULE_ID, setting);
}

type OldSettingKey =
    "roguelike" | "plan-ahead" | "unlimited" | "mark-background-class";
export function getOldSetting(setting: "roguelike"): boolean | undefined;
export function getOldSetting(setting: "plan-ahead"): boolean | undefined;
export function getOldSetting(setting: "unlimited"): boolean | undefined;
export function getOldSetting(
    setting: "mark-background-class",
): boolean | undefined;
export function getOldSetting(setting: OldSettingKey) {
    return game.settings.storage
        .get("world")
        .find((s) => s.key === `${MODULE_ID}.${setting}`)?.value;
}

export function registerSettings() {}
