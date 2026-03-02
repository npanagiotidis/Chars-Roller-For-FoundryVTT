/**
 * Chars Roller for FoundryVTT
 * Rolls 4d6 drop-lowest twice for each ability score (STR, DEX, CON, WIS, INT, CHA),
 * presents two sets so the player can choose one, then locks the character against
 * future rolls. Suggests a class based on the highest ability score.
 *
 * Designed for the ARS system with OSRIC compendium.
 * The ability score data path is configurable via module settings.
 */

const MODULE_ID = "chars-roller";
const FLAG_HAS_ROLLED = "hasRolled";

/** Ordered list of the six OSRIC/ARS ability scores. */
const ABILITIES = [
  { key: "str", labelKey: "CHARS_ROLLER.Str" },
  { key: "dex", labelKey: "CHARS_ROLLER.Dex" },
  { key: "con", labelKey: "CHARS_ROLLER.Con" },
  { key: "wis", labelKey: "CHARS_ROLLER.Wis" },
  { key: "int", labelKey: "CHARS_ROLLER.Int" },
  { key: "cha", labelKey: "CHARS_ROLLER.Cha" },
];

/**
 * Class suggestions keyed by ability score.
 * Follows OSRIC class recommendations.
 */
const CLASS_SUGGESTIONS = {
  str: ["Fighter"],
  dex: ["Thief"],
  con: ["Fighter", "Invoker"],
  wis: ["Cleric"],
  int: ["Mage"],
  cha: ["Paladin"],
};

// ---------------------------------------------------------------------------
// Rolling helpers
// ---------------------------------------------------------------------------

/**
 * Roll a single die with the given number of sides.
 * Uses the native Math.random() — no Foundry Roll dependency needed.
 *
 * @param {number} sides
 * @returns {number} integer in [1, sides]
 */
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll 4d6, drop the lowest die, and return the sum of the remaining three.
 *
 * @returns {number} score in [3, 18]
 */
function roll4d6DropLowest() {
  const dice = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];
  dice.sort((a, b) => a - b); // ascending — drop index 0 (lowest)
  return dice[1] + dice[2] + dice[3];
}

/**
 * Generate one complete set of ability scores.
 *
 * @returns {Array<{key: string, label: string, value: number}>}
 */
function generateAbilitySet() {
  return ABILITIES.map((ab) => ({
    key: ab.key,
    label: game.i18n.localize(ab.labelKey),
    value: roll4d6DropLowest(),
  }));
}

// ---------------------------------------------------------------------------
// Class suggestion helpers
// ---------------------------------------------------------------------------

/**
 * Given an ability set, find the highest scoring ability (or abilities, if
 * tied) and return suggested classes.
 *
 * @param {Array<{key: string, label: string, value: number}>} abilitySet
 * @returns {{ abilityLabel: string, score: number, classesText: string }}
 */
function buildSuggestion(abilitySet) {
  const maxScore = Math.max(...abilitySet.map((a) => a.value));
  const topAbilities = abilitySet.filter((a) => a.value === maxScore);

  // Collect unique class names for all tied top abilities
  const allClasses = [];
  for (const ab of topAbilities) {
    for (const cls of CLASS_SUGGESTIONS[ab.key] ?? []) {
      if (!allClasses.includes(cls)) allClasses.push(cls);
    }
  }

  const abilityLabel = topAbilities.map((a) => a.label).join(" / ");
  const or = game.i18n.localize("CHARS_ROLLER.Or").trim(); // e.g. "or"
  const classesText =
    allClasses.length <= 2
      ? allClasses.join(` ${or} `)
      : `${allClasses.slice(0, -1).join(", ")}, ${or} ${allClasses[allClasses.length - 1]}`;

  return { abilityLabel, score: maxScore, classesText };
}

// ---------------------------------------------------------------------------
// Data-path helper
// ---------------------------------------------------------------------------

/**
 * Build the actor update object for the given ability set using the
 * configurable data-path template.
 *
 * @param {Array<{key: string, value: number}>} abilitySet
 * @returns {object} flat update data for Actor#update()
 */
function buildUpdateData(abilitySet) {
  const pathTemplate = game.settings.get(MODULE_ID, "abilityScorePath");
  const updateData = {};
  for (const ab of abilitySet) {
    const path = pathTemplate.replace("{key}", ab.key);
    updateData[path] = ab.value;
  }
  return updateData;
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

/**
 * Render and show the ability-roller dialog for the given actor.
 * If the actor already has the FLAG_HAS_ROLLED flag set, a warning is shown
 * and nothing happens (unless the caller has already cleared the flag).
 *
 * @param {Actor} actor
 */
async function showRollerDialog(actor) {
  if (actor.getFlag(MODULE_ID, FLAG_HAS_ROLLED)) {
    ui.notifications.warn(game.i18n.localize("CHARS_ROLLER.AlreadyRolled"));
    return;
  }

  // Roll two complete sets
  const set1 = generateAbilitySet();
  const set2 = generateAbilitySet();

  const total1 = set1.reduce((s, a) => s + a.value, 0);
  const total2 = set2.reduce((s, a) => s + a.value, 0);

  const suggestion1 = buildSuggestion(set1);
  const suggestion2 = buildSuggestion(set2);

  const templateData = {
    actorName: actor.name,
    instructions: game.i18n.localize("CHARS_ROLLER.Instructions"),
    set1Label: game.i18n.localize("CHARS_ROLLER.Set1"),
    set2Label: game.i18n.localize("CHARS_ROLLER.Set2"),
    abilityLabel: game.i18n.localize("CHARS_ROLLER.Ability"),
    scoreLabel: game.i18n.localize("CHARS_ROLLER.Score"),
    totalLabel: game.i18n.localize("CHARS_ROLLER.Total"),
    suggestionLabel: game.i18n.localize("CHARS_ROLLER.Suggestion"),
    set1,
    set2,
    total1,
    total2,
    suggestion1Text: game.i18n.format("CHARS_ROLLER.SuggestionText", {
      ability: suggestion1.abilityLabel,
      score: suggestion1.score,
      classes: suggestion1.classesText,
    }),
    suggestion2Text: game.i18n.format("CHARS_ROLLER.SuggestionText", {
      ability: suggestion2.abilityLabel,
      score: suggestion2.score,
      classes: suggestion2.classesText,
    }),
    chooseSet1: game.i18n.localize("CHARS_ROLLER.ChooseSet1"),
    chooseSet2: game.i18n.localize("CHARS_ROLLER.ChooseSet2"),
  };

  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/chars-roller-dialog.hbs`,
    templateData
  );

  /**
   * Commit the chosen set: update the actor, set the flag, and post a
   * class-suggestion chat message.
   *
   * @param {Array} chosenSet
   * @param {{ abilityLabel: string, score: number, classesText: string }} suggestion
   */
  async function commitSet(chosenSet, suggestion) {
    try {
      await actor.update(buildUpdateData(chosenSet));
      await actor.setFlag(MODULE_ID, FLAG_HAS_ROLLED, true);
      ui.notifications.info(game.i18n.localize("CHARS_ROLLER.Applied"));

      // Post class suggestion to chat
      const suggestionMsg = game.i18n.format("CHARS_ROLLER.ClassSuggestion", {
        ability: suggestion.abilityLabel,
        score: suggestion.score,
        classes: suggestion.classesText,
      });

      await ChatMessage.create({
        content: `<div class="chars-roller-chat-suggestion">
          <strong>${actor.name}</strong> — ${suggestionMsg}
        </div>`,
        speaker: ChatMessage.getSpeaker({ actor }),
      });
    } catch (err) {
      console.error(`${MODULE_ID} | Failed to apply ability scores:`, err);
      ui.notifications.error(
        `Chars Roller: Failed to apply ability scores. Check the data path setting. (${err.message})`
      );
    }
  }

  new Dialog(
    {
      title: game.i18n.format("CHARS_ROLLER.DialogTitle", {
        name: actor.name,
      }),
      content,
      buttons: {
        set1: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n.localize("CHARS_ROLLER.ChooseSet1"),
          callback: () => commitSet(set1, suggestion1),
        },
        set2: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: game.i18n.localize("CHARS_ROLLER.ChooseSet2"),
          callback: () => commitSet(set2, suggestion2),
        },
      },
      default: "set1",
    },
    { width: 560 }
  ).render(true);
}

// ---------------------------------------------------------------------------
// Module lifecycle hooks
// ---------------------------------------------------------------------------

Hooks.once("init", () => {
  // ── Module Settings ───────────────────────────────────────────────────────

  game.settings.register(MODULE_ID, "abilityScorePath", {
    name: game.i18n.localize("CHARS_ROLLER.Settings.AbilityScorePath"),
    hint: game.i18n.localize("CHARS_ROLLER.Settings.AbilityScorePathHint"),
    scope: "world",
    config: true,
    type: String,
    default: "system.abilities.{key}.value",
  });

  game.settings.register(MODULE_ID, "allowGMReroll", {
    name: game.i18n.localize("CHARS_ROLLER.Settings.AllowGMReroll"),
    hint: game.i18n.localize("CHARS_ROLLER.Settings.AllowGMRerollHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});

// ── Inject Roll button into actor sheets ────────────────────────────────────

Hooks.on("renderActorSheet", (app, html, _data) => {
  const actor = app.actor;

  // Only character-type actors with at least one owner
  if (actor.type !== "character") return;
  if (!actor.isOwner) return;

  const hasRolled = !!actor.getFlag(MODULE_ID, FLAG_HAS_ROLLED);
  const isGMRerollAllowed =
    game.user.isGM && game.settings.get(MODULE_ID, "allowGMReroll");

  // Players cannot see/use the button once the roll is done
  if (hasRolled && !isGMRerollAllowed) return;

  const btnLabel = hasRolled
    ? game.i18n.localize("CHARS_ROLLER.RerollButton")
    : game.i18n.localize("CHARS_ROLLER.RollButton");

  const $btn = $(
    `<div class="chars-roller-header-btn">
       <button type="button" class="chars-roller-btn">
         <i class="fas fa-dice-d6"></i> ${btnLabel}
       </button>
     </div>`
  );

  $btn.find(".chars-roller-btn").on("click", async () => {
    // If GM is re-rolling, clear the flag first so the dialog opens
    if (hasRolled && isGMRerollAllowed) {
      await actor.unsetFlag(MODULE_ID, FLAG_HAS_ROLLED);
    }
    showRollerDialog(actor);
  });

  // Try to inject below the sheet header; fall back to top of sheet body
  const $header = html.find(".window-header");
  if ($header.length) {
    $header.after($btn);
  } else {
    html.prepend($btn);
  }
});

// ── Expose API for macro use ────────────────────────────────────────────────

Hooks.once("ready", () => {
  /**
   * Public API exposed on the global `game` object so GMs and power users
   * can call the roller from macros:
   *
   *   game.charsRoller.rollForActor(actor)
   */
  game.charsRoller = { rollForActor: showRollerDialog };

  console.log(`${MODULE_ID} | Chars Roller module ready.`);
});
