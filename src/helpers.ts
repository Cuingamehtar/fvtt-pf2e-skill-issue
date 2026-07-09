import {
    ArmorPF2e,
    EquipmentPF2e,
    ShieldPF2e,
    WeaponPF2e,
} from "@7h3laughingman/pf2e-types";

type ItemBase = NonNullable<
    (WeaponPF2e | ArmorPF2e | ShieldPF2e)["system"]["baseItem"]
>;
type ItemTrait = NonNullable<
    (
        | WeaponPF2e
        | ArmorPF2e
        | ShieldPF2e
        | EquipmentPF2e
    )["system"]["traits"]["value"][0]
>;

type ItemCategory = NonNullable<(WeaponPF2e | ArmorPF2e)["system"]["category"]>;

type ItemGroup = NonNullable<(WeaponPF2e | ArmorPF2e)["system"]["group"]>;

export function itemBase(slug: ItemBase) {
    return `item:base:${slug}`;
}
export function itemSlug(slug: string) {
    return `item:slug:${slug}`;
}

export function attached(slug: string) {
    return `attached:${slug}`;
}

export function trait(trait: ItemTrait) {
    return `item:trait:${trait}`;
}
export function usage(usage: string) {
    return `usage:${usage}`;
}
export function itemGroup(group: ItemGroup) {
    return `item:group:${group}`;
}
export function itemCategory(category: ItemCategory) {
    return `item:category:${category}`;
}
export function hands(hands: 1 | 2) {
    return `item:usage:hands:${hands}`;
}

export const weapon = "item:type:weapon";
export const armor = "item:type:armor";
export const equipment = "item:type:equipment";
export const shield = "item:type:shield";
export const melee = "item:melee";
export const ranged = "item:ranged";
