import {
    ActorPF2e,
    ActorSheetPF2e,
    ItemPF2e,
    ItemSheetPF2e,
    PhysicalItemPF2e,
} from "@7h3laughingman/pf2e-types";
import { SpecialPredicates, usages } from "./attachments-types";

let currentlyDragging = false;
Hooks.on("renderActorSheetPF2e", (sheet) => {
    const { actor, form } = sheet as ActorSheetPF2e<ActorPF2e>;
    if (!actor.isOfType("npc", "character", "party")) return;
    form.querySelectorAll(".inventory ul.items > li[data-item-id]").forEach(
        (li) => {
            const dataset = (li as HTMLUListElement).dataset;
            const id = dataset.itemId!;
            const item = (actor as ActorPF2e).items.get(id);
            if (!item) return;

            li.addEventListener("dragstart", () => dragItem(item));

            li.addEventListener("dragend", () => {
                if (!currentlyDragging) return;
                document
                    .querySelectorAll(".drag-attach-droppable")
                    .forEach((e) => e.remove());
                currentlyDragging = false;
            });
        },
    );
});

function dragItem(attachment: ItemPF2e) {
    if (!attachment) return;
    if (attachment.isOfType("physical")) {
        const usage = attachment._source.system.usage?.value;
        if (!usage) return;
        const predicateSource = usages[usage] ?? [];
        const always = predicateSource[0] === SpecialPredicates.Always;
        const predicate = new game.pf2e.Predicate(usages[usage] ?? []);
        const openWindows = Object.values(ui.windows).filter(
            (w): w is ItemSheetPF2e<PhysicalItemPF2e> =>
                isItemSheet(w) && w.item?.isOfType("physical"),
        );
        if (openWindows.length == 0) {
            return;
        }
        currentlyDragging = true;
        for (const window of openWindows) {
            const { item, form } = window;
            const options = customRollOptions(item);
            const allowed = always || predicate.test(options);
            const n = document.createElement("div");
            n.classList.add(
                "drag-attach-droppable",
                allowed ? "allowed" : "denied",
            );
            if (always) {
                n.classList.add("unchecked");
            }
            const message = always
                ? "drop-unchecked"
                : allowed
                  ? "drop"
                  : "no-drop";

            const p = document.createElement("p");
            p.innerText = _loc(`pf2e-drag-attach.${message}`);
            n.appendChild(p);
            if (allowed) {
                n.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    n.classList.add("drag-over");
                });
                n.addEventListener("dragleave", () => {
                    n.classList.remove("drag-over");
                });
                n.addEventListener("drop", async (event) => {
                    event.preventDefault();
                    await item.attach(attachment);
                    await window.render(true);
                });
            }
            form.querySelector("section.sidebar")?.appendChild(n);
        }
    }
}

function isItemSheet(
    window: foundry.appv1.api.Application<foundry.appv1.api.ApplicationV1Options>,
): window is ItemSheetPF2e<ItemPF2e> {
    return window.options.baseApplication === "ItemSheet";
}

function customRollOptions(item: ItemPF2e) {
    const base = item.getRollOptions("item");
    if (item.isOfType("physical")) {
        base.push(`usage:${item.system.usage.value}`);
        for (const at of item.subitems) {
            base.push(`attached:${at.slug}`);
        }
        if (item.bulk.isNegligible) {
            base.push(`item:bulk:negligible`);
        }
    }
    return base;
}
