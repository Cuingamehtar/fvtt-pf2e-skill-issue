import { CharacterPF2e } from "@7h3laughingman/pf2e-types";
import { SkillManager } from "./skill-manager";

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
});
