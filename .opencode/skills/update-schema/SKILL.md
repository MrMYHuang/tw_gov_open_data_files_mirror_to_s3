---
name: update-schema
description: Refresh source CSV schemas and target mapping functions in SourceModels.ts from the live dataset URLs defined in fileMirroringToS3.ts. Use when asked to update SourceFreeChargingItemSchema, SourceFreeWifiItemSchema, mapToFreeChargingItem, or mapToFreeWifiItem based on current CSV columns and values.
---

# Update Schema

Execute this workflow for each item in `data` from `fileMirroringToS3.ts`.

## Workflow

1. Read `fileMirroringToS3.ts` and locate the `data` array URLs.
2. Fetch each CSV file from its URL.
3. Parse CSV with headers and inspect representative rows for value types.
4. For `charge_station_list`:
   - Update `SourceFreeChargingItemSchema` in `SourceModels.ts`.
   - Update `mapToFreeChargingItem` in `SourceModels.ts`.
5. For `hotspotlist`:
   - Update `SourceFreeWifiItemSchema` in `SourceModels.ts`.
   - Update `mapToFreeWifiItem` in `SourceModels.ts`.
6. Keep schema and mapper aligned:
   - Every mapped source field must exist in the source schema.
   - Coordinate fields must map to numeric target fields.
7. Keep existing style unless data forces change:
   - Preserve TypeBox object schema structure and `additionalProperties: false`.
   - Preserve mapper output contracts (`IFreeChargingItem`, `IFreeWifiItem`).
8. Run project build to validate TypeScript after edits.

## Output Requirements

- Edit only files needed for schema and mapper updates.
- Report:
  - Which source URLs were processed.
  - Which schema fields changed.
  - Which mapping fields changed.
  - Build/test result.
