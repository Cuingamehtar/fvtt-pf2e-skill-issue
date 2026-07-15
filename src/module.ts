import { CharacterPF2e, CharacterSheetPF2e } from "@7h3laughingman/pf2e-types";
import { SkillManager } from "./skill-manager";
import { SkillManagerApp } from "./app/skill-manager-app";

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
        const header = form.querySelector(".tab.proficiencies header");
        if (!header) return;
        const btn = document.createElement("a");
        btn.innerHTML = '<i class="fa-solid fa-fw fa-edit"></i>';
        btn.dataset.tooltip = _loc("pf2e-skill-issue.edit-skills");
        header.innerHTML += btn.outerHTML;
        header
            .querySelector("a")
            ?.addEventListener("click", () =>
                new SkillManagerApp({ actor }).render(true),
            );
    });
});
