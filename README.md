# Chars Roller for FoundryVTT

A FoundryVTT module for rolling ability scores using the **4d6 drop-lowest** method. Designed for the **ARS system with OSRIC compendium**.

---

## Features

- **Two sets, one choice** — rolls 4d6 drop-lowest for each of the six OSRIC ability scores (STR, DEX, CON, WIS, INT, CHA) *twice*, presenting both sets side-by-side so the player can pick the one they prefer.
- **One-time only** — once a character has chosen a set, the roll button is hidden for regular players. The character is permanently flagged as "rolled" to prevent abuse.
- **Class suggestions** — after choosing a set, the module posts a chat message suggesting an OSRIC class based on the character's highest ability:

  | Highest Ability | Suggested Class(es)  |
  |-----------------|----------------------|
  | Strength        | Fighter              |
  | Dexterity       | Thief                |
  | Constitution    | Fighter, Invoker     |
  | Wisdom          | Cleric               |
  | Intelligence    | Mage                 |
  | Charisma        | Paladin              |

- **GM override** — GMs can re-roll any character's ability scores even after the initial roll (configurable via module settings).
- **Configurable data path** — the ability score data path is a module setting, making it easy to adapt to different system implementations.

---

## Installation

1. Open FoundryVTT and navigate to **Add-on Modules** → **Install Module**.
2. Paste the following manifest URL:

   ```
   https://raw.githubusercontent.com/npanagiotidis/Chars-Roller-For-FoundryVTT/main/module.json
   ```

3. Click **Install**, then enable the module in your world's **Manage Modules** settings.

---

## Usage

1. Open the character sheet of a **player-character** actor.
2. A **Roll Ability Scores** button appears at the top of the sheet (visible only before the roll is made).
3. Click the button — a dialog opens showing two sets of rolled ability scores.
4. Review both sets and the suggested class for each, then click **Choose Set 1** or **Choose Set 2**.
5. The selected scores are written directly to the character sheet and the choice is locked in.

### Macro usage

You can also trigger the dialog from a macro:

```javascript
const actor = game.actors.getName("My Character");
game.charsRoller.rollForActor(actor);
```

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Ability Score Data Path** | `system.abilities.{key}.value` | Template for the actor data path. `{key}` is replaced by `str`, `dex`, `con`, `wis`, `int`, or `cha`. |
| **Allow GM to Re-roll** | `true` | When enabled, the GM sees a *Re-roll* button even after the initial roll has been committed. |

---

## Compatibility

| FoundryVTT Version | Status  |
|--------------------|---------|
| v11                | ✅ Supported |
| v12                | ✅ Verified  |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
