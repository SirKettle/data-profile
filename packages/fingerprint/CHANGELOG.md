# Changelog

## [0.4.0](https://github.com/SirKettle/data-profile/compare/fingerprint-v0.3.0...fingerprint-v0.4.0) (2026-10-26)


### ⚠ BREAKING CHANGES

* the shared components' CSS classes and every custom property are renamed from fp- to dp-: .fp-legend…, .fp-list… and .fp-views… become .dp-legend…, .dp-list… and .dp-views…, and --fp-accent, --fp-accent-text, --fp-muted, --fp-border, --fp-radius and --fp-callout-ink become --dp-*. fp-canvas and fp-mark still apply, beside dp-canvas and dp-mark. Nothing else changes.

### Features

* build the fingerprint's React on @data-profile/react ([3e14e53](https://github.com/SirKettle/data-profile/commit/3e14e533f8f0c394c3fcdfa5547de69b2feeabb8))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @data-profile/react bumped from ^0.0.0 to ^0.1.0

## [0.3.0](https://github.com/SirKettle/data-profile/compare/fingerprint-v0.2.0...fingerprint-v0.3.0) (2026-10-26)


### Features

* add @data-profile/core, and build the fingerprint on it ([30873f9](https://github.com/SirKettle/data-profile/commit/30873f9997b51fde6eb96cd233a2c486d87d8f04))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @data-profile/core bumped from ^0.0.0 to ^0.1.0

## [0.2.0](https://github.com/SirKettle/data-profile/compare/fingerprint-v0.1.0...fingerprint-v0.2.0) (2026-10-26)


### ⚠ BREAKING CHANGES

* the package is now @data-profile/fingerprint. Install it in place of @thirkettle/collection-fingerprint and change imports from "@thirkettle/collection-fingerprint" (and "/react", "/styles.css") to "@data-profile/fingerprint" (and "/react", "/styles.css"). Nothing else changes.

### Features

* publish as @data-profile/fingerprint, from a Bun workspace ([6166a06](https://github.com/SirKettle/data-profile/commit/6166a0689a7761fb68ab3492eba2c57acc0a67f2))

## 0.1.0 (2026-10-22)


### Features

* import @thirkettle/collection-fingerprint ([c214fbe](https://github.com/SirKettle/collection-fingerprint/commit/c214fbedebc0c8c6faf421272f50d1d2be9cf2ec))
