import { CharacterPF2e, CharacterSheetPF2e } from "@7h3laughingman/pf2e-types";
import { SkillManager } from "./skill-manager";
import { SkillManagerApp } from "./app/skill-manager-app";
import { registerSettings } from "./settings";

export const MODULE_ID = "pf2e-skill-issue";

Hooks.on("init", () => {
    registerSettings();
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
        const div = document.createElement("div");
        div.classList.add("controls");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("si-open-manager");
        btn.innerHTML = `<i class="fa-solid fa-fw fa-edit"></i> ${_loc("pf2e-skill-issue.skill-manager-title")}`;
        btn.dataset.tooltip = _loc("pf2e-skill-issue.edit-skills");
        div.innerHTML += btn.outerHTML;
        header.innerHTML += div.outerHTML;
        header
            .querySelector("button.si-open-manager")
            ?.addEventListener("click", () =>
                new SkillManagerApp({ actor }).render(true),
            );
    });
});
