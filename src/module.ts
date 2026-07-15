import { CharacterPF2e, CharacterSheetPF2e } from "@7h3laughingman/pf2e-types";
import { SkillManager } from "./skill-manager";
import { SkillManagerApp } from "./apps/skill-manager-app";

export const MODULE_ID = "pf2e-skill-issue";

Hooks.on("init", () => {
    libWrapper.register(
        MODULE_ID,
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareDataFromItems",
        function (
            this: CharacterPF2e,
            wrapped: typeof CharacterPF2e.prototype.prepareDataFromItems,
        ) {
            wrapped();
            const skillManager = new SkillManager(this);
            skillManager.prepareData();
        },
    );

    Hooks.on("renderCharacterSheetPF2e", (sheet) => {
        const { actor, form } = sheet as CharacterSheetPF2e<CharacterPF2e>;
        form.querySelector(".tab.proficiencies header")?.addEventListener(
            "click",
            () => new SkillManagerApp({ actor }).render(true),
        );
    });
});
