# Localization Datasets Report

This project has some intentionally localized datasets used for features tailored to Uganda. These are not part of global marketing copy but power location-specific functionality.

## Localized Data Files

- src/lib/uganda-districts.ts
  - Contains `UgandaRegion` type and district-to-region mappings.
  - Used for region selection and mapping logic.

- src/lib/institutions.ts
  - Contains lists of Uganda-based institutions and categorization.
  - Supports education and institution-related features.

## Rationale
- These datasets enable accurate regional mapping and institution references for users in Uganda.
- They are isolated in `src/lib/` and do not affect global-facing content after recent updates.

## Recommended Options
- Locale module separation: move to `src/locales/uganda/` with explicit exports (`districts`, `institutions`).
- Add global/neutral datasets: introduce `src/locales/global/` with generalized lists (e.g., countries, cities, international institutions where feasible).
- Feature gating: surface locale-specific inputs only when a user selects Uganda (or via geolocation/setting).
- Configuration flag: add a simple feature flag (`UGANDA_LOCALE=true`) to enable region-specific UIs.

## Next Steps (optional)
1. Create `src/locales/uganda/` and relocate the two files there.
2. Provide a `LocaleProvider` or simple config mapping to select datasets.
3. Audit UI components for assumptions about `UgandaRegion` and refactor to use `Region` generics or locale-aware helpers.
