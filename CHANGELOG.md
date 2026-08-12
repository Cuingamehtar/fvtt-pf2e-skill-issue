# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2] - 2026-08-12

### Fixed

- Fix typo in language file.

## [1.1] - 2026-08-12

### Added

- Option to manually mark a Skill as granted by Background or Class. Character will automatically become trained in this skill. Useful when both the Background and Class provide the same skill improvement, as well as marking Background Lore.
- Option to mark any skill or Lore as Paragon Skill / Additional Lore. Character will automatically become trained in this skill, and their proficiency in it will automatically improve at levels 3, 7 and 15. This will not provide the character with additional feats from the Skill Paragon variant rule.

## [1.0] - 2026-08-06

### Removed

- All settings. The configuration is now done per-character.

### Added

- A counter that tracks the selected allocations per level
- Skill Manager configuration menu
- Ability to override the allowed selections per level. Overriden caps are marked with an exclamation mark
- Option to limit the level for planning ahead
- Overcapped allocations are now marked with and exclamation mark in the table header

### Changed

- Negative intelligence modifier is properly accounted for.
- Lores are now tracked by id and not by slug, which allows renaming the Lore without losing its improvements.

## [0.8] - 2026-07-18

### Added

- Add icons to show that the skill was improved in the source or by background or class (optional as it doesn't consider rule elements)
- Add tooltip when hovering over locks to show the reason they are locked

## [0.7] - 2026-07-17

### Added

- Add Roguelike, Plan the Future and Unlimited Choice settings

## [0.6] - 2026-07-16

### Fixed

- Fix skill manager not working with lores starting with numbers

## [0.5] - 2026-07-16

### Changed

- Update Foundry requirements

## [0.3] - 2026-07-16

### Added

- Changelog file
