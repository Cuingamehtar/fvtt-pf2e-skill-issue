import type { PredicateStatement } from "@7h3laughingman/pf2e-types";
import {
    armor,
    attached,
    equipment,
    hands,
    itemBase,
    itemCategory,
    itemGroup,
    itemSlug,
    melee,
    ranged,
    shield,
    trait,
    usage,
    weapon,
} from "./helpers";

export enum SpecialPredicates {
    Always = "always",
    Never = "never",
}

const never = [SpecialPredicates.Never];
const always = [SpecialPredicates.Always];
const maybeNever = [SpecialPredicates.Never];

const banner = [{ or: [weapon, "item:type:shield"] }];

const gradeVariants = (slug: string) =>
    [
        "commercial",
        "tactical",
        "advanced",
        "superior",
        "elite",
        "ultimate",
        "paragon",
    ].reduce(
        (acc, grade) => {
            acc.push(`${slug}-${grade}`);
            return acc;
        },
        [slug],
    );

export const usages: Record<string, PredicateStatement[]> = {
    "installed-in-a-grenade-launcher-or-two-handed-weapon-with-an-undermounted-grenade-launcher":
        [
            {
                or: [
                    itemBase("grenade-launcher"),
                    ...gradeVariants("undermounted-grenade-launcher").map(
                        attached,
                    ),
                ],
            },
        ],
    "installed-in-a-weapon-sight": [weapon, ranged],
    "installed-in-a-weapon-with-the-kickback-trait": [
        weapon,
        "item:trait:kickback",
    ],
    "installed-in-a-weapon": [weapon],
    "installed-in-one-handed-weapon-grip": [weapon, hands(1)],
    "installed-in-ranged-weapon-without-a-loudener": [
        weapon,
        ranged,
        { not: { or: gradeVariants("loudener").map(attached) } },
    ],
    "installed-in-two-handed-weapon": [weapon, hands(2)],
    "installed-on-a-weapon-without-a-silencer": [
        weapon,
        ranged,
        { not: { or: gradeVariants("silencer").map(attached) } },
    ],
    "installed-in-armor-with-the-energy-shielding-upgrade": [
        armor,
        { or: gradeVariants("energy-shielding").map(attached) },
    ],
    "installed-in-armor-with-the-exposed-trait": [armor, trait("exposed")],
    "installed-in-armor": [armor],
    "affixed-or-held-in-one-hand": banner,
    "affixed-to-a-creature": never,
    "affixed-to-a-magical-staff": [trait("staff")],
    "affixed-to-a-metal-weapon": [weapon],
    "affixed-to-a-one-handed-firearm-or-hand-crossbow": [
        { or: [itemGroup("firearm"), itemBase("hand-crossbow")] },
        hands(1),
    ],
    "affixed-to-a-ranged-weapon": ["item:ranged"],
    "affixed-to-a-shield": ["item:type:shield"],
    "affixed-to-a-shield-or-weapon": [{ or: [weapon, shield] }],
    "affixed-to-a-slashing-weapon": [weapon, "item:damage:type:slashing"],
    "affixed-to-a-thrown-weapon": ["item:trait:thrown"],
    "affixed-to-a-two-handed-firearm-or-crossbow": [
        { or: [itemGroup("firearm"), itemGroup("crossbow")] },
        hands(2),
    ],
    "affixed-to-an-innovation": ["item:granter:tag:inventor-innovation"],
    "affixed-to-an-object-or-structure": never,
    "affixed-to-armor": [armor],
    "affixed-to-medium-heavy-armor": [
        armor,
        { or: [itemCategory("medium"), itemCategory("heavy")] },
    ],
    "affixed-to-medium-heavy-metal-armor": [
        armor,
        { or: [itemCategory("medium"), itemCategory("heavy")] },
    ],
    "affixed-to-metal-armor-or-a-weapon": [{ or: [armor, weapon] }],
    "affixed-to-non-metal-armor-or-a-weapon": [{ or: [armor, weapon] }],
    "affixed-to-armor-shield-or-weapon": [{ or: [armor, shield, weapon] }],
    "affixed-to-armor-or-a-weapon": [{ or: [armor, weapon] }],
    "affixed-to-armor-or-travelers-clothing": [armor],
    "affixed-to-crossbow-or-firearm": [
        { or: [itemGroup("firearm"), itemGroup("crossbow")] },
    ],
    "affixed-to-firearm": [itemGroup("firearm")],
    "affixed-to-firearm-with-a-reload-of-1": [
        itemGroup("firearm"),
        "item:reload:1",
    ],
    "affixed-to-firearm-with-the-kickback-trait": [
        itemGroup("firearm"),
        trait("kickback"),
    ],
    "affixed-to-ground-in-10-foot-radius": never,
    "affixed-to-ground-in-20-foot-radius": never,
    "affixed-to-harness": never,
    "affixed-to-headgear": [usage("wornheadwear")],
    "affixed-to-instrument": maybeNever,
    "affixed-to-load-bearing-wall-or-pillar": never,
    "affixed-to-melee-weapon": [weapon, melee],
    "affixed-to-metal-weapon": [weapon],
    "affixed-to-object-structure-or-creature": never,
    "affixed-to-the-ground": never,
    "affixed-to-unarmored-defense-item": [itemCategory("unarmored")],
    "affixed-to-wall": never,
    "affixed-to-weapon": [weapon],
    "applied-to-a-basket-bag-or-other-container": ["item:type:backpack"],
    "applied-to-a-weapon": [weapon],
    "applied-to-a-wind-powered-vehicle": never,
    "applied-to-a-non-injection-melee-weapon-piercing-damage": [
        weapon,
        melee,
        "item:damage:type:piercing",
        { not: trait("injection") },
    ],
    "applied-to-any-item-of-light-or-negligible-bulk": [
        { or: ["item:bulk:light", "item:bulk:negligible"] },
    ],
    "applied-to-any-visible-article-of-clothing": always,
    "applied-to-armor": [armor],
    "applied-to-armor-or-unarmored-defense-clothing": [armor],
    "applied-to-belt-cape-cloak-or-scarf": [
        {
            or: [
                usage("wornbelt"),
                usage("worncape"),
                usage("worncloak"),
                usage("wornscarf"),
                usage("worn"),
            ],
        },
    ],
    "applied-to-boots-cape-cloak-or-umbrella": [
        {
            or: [
                usage("wornboots"),
                usage("wornfootwear"),
                usage("worncape"),
                usage("worncloak"),
                usage("worn"),
            ],
        },
    ],
    "applied-to-buckler-shield": [itemBase("buckler")],
    "applied-to-dueling-cape-or-shield": [
        { or: [shield, itemSlug("dueling-cape")] },
    ],
    "applied-to-footwear": [usage("wornboots"), usage("wornfootwear")],
    "applied-to-medium-heavy-armor": [
        armor,
        { or: [itemCategory("medium"), itemCategory("heavy")] },
    ],
    "applied-to-shield": [shield],
    "attached-to-a-thrown-weapon": [weapon, trait("thrown")],
    "attached-to-crossbow-or-firearm": [
        { or: [itemGroup("firearm"), itemGroup("crossbow")] },
    ],
    "attached-to-crossbow-or-firearm-firing-mechanism": [
        { or: [itemGroup("firearm"), itemGroup("crossbow")] },
    ],
    "attached-to-crossbow-or-firearm-scope": [
        { or: [itemGroup("firearm"), itemGroup("crossbow")] },
    ],
    "attached-to-firearm": [itemGroup("firearm")],
    "attached-to-firearm-scope": [itemGroup("firearm")],
    "attached-to-melee-weapon": [weapon, "item:melee"],
    "attached-to-ships-bow": never,
    bonded: never,
    carried: never,
    "each-rune-applied-to-a-separate-item-that-has-pockets": [
        { or: [armor, equipment] },
    ],
    "etched-onto-a-weapon": [weapon],
    "etched-onto-a-shield": [shield],
    "etched-onto-armor": [armor],
    "etched-onto-heavy-armor": [armor, itemCategory("heavy")],
    "etched-onto-light-armor": [armor, itemCategory("light")],
    "etched-onto-metal-armor": [armor],
    "etched-onto-clan-dagger": [itemBase("clan-dagger")],
    "etched-onto-lm-nonmetal-armor": [
        armor,
        { or: [itemCategory("light"), itemCategory("medium")] },
    ],
    "etched-onto-med-heavy-armor": [
        armor,
        { or: [itemCategory("medium"), itemCategory("heavy")] },
    ],
    "etched-onto-medium-heavy-metal-armor": [
        armor,
        { or: [itemCategory("medium"), itemCategory("heavy")] },
    ],
    "etched-onto-bludgeoning-weapon": [weapon, "item:damage:type:bludgeoning"],
    "etched-onto-melee-weapon": [weapon, melee],
    "etched-onto-slashing-melee-weapon": [
        weapon,
        melee,
        "item:damage:type:slashing",
    ],
    "etched-onto-piercing-or-slashing-melee-weapon": [
        weapon,
        melee,
        { or: ["item:damage:type:piercing", "item:damage:type:slashing"] },
    ],
    "etched-onto-piercing-or-slashing-weapon": [
        weapon,
        { or: ["item:damage:type:piercing", "item:damage:type:slashing"] },
    ],
    "etched-onto-weapon-wo-anarchic-rune": [weapon],
    "etched-onto-weapon-wo-axiomatic-rune": [weapon],
    "etched-onto-weapon-wo-unholy-rune": never,
    "etched-onto-weapon-wo-holy-rune": never,
    "etched-onto-melee-weapon-monk": [weapon, melee, trait("monk")],
    "etched-onto-thrown-weapon": [weapon, trait("thrown")],
    "held-in-one-hand": never,
    "held-in-one-hand-or-free-standing": never,
    "held-in-1-hand-hung-on-a-cord-or-attached-to-clothing": [
        { or: [armor, equipment] },
    ],
    "held-in-one-or-two-hands": never,
    "held-in-two-hands": never,
    implanted: never,
    "installed-in-a-datapad": ["item:slug:datapad"],
    "mounted-on-a-tripod-or-bracket": [itemSlug("tripod")],
    other: always,
    "sewn-into-clothing": [{ or: [armor, equipment] }],
    "tattooed-on-the-body": never,
    touched: never,
    worn: never,
    wornamulet: never,
    wornanklets: never,
    wornarmbands: never,
    wornbackpack: never,
    wornbarding: never,
    wornbelt: never,
    wornbeltpouch: never,
    wornboots: never,
    wornbracelet: never,
    wornbracers: never,
    worncap: never,
    worncape: never,
    worncirclet: never,
    worncloak: never,
    wornclothing: never,
    worncollar: never,
    worncrown: never,
    wornepaulet: never,
    worneyeglasses: never,
    worneyepiece: never,
    wornfootwear: never,
    worngarment: never,
    worngloves: never,
    wornheadwear: never,
    wornhorseshoes: never,
    wornmask: never,
    wornnecklace: never,
    wornonbelt: never,
    wornoronehand: never,
    wornring: never,
    wornsaddle: never,
    wornsandles: never,
    wornshoes: never,
    wornwrist: never,
    "worn-and-attached-to-two-weapons": [weapon],
    "worn-under-armor": [armor],
};
