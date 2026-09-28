# SmartSchedule Browser Extension

**Universal Schedule Importer & Dynamic Rule Engine** (Manifest V3)

The SmartSchedule Browser Extension allows university students and faculty to open their student portal (such as FPT FAP or Edusoft) while already authenticated, detect the schedule page, extract timetable information from the rendered DOM, normalize it into SmartSchedule's canonical event schema, preview the result, and import it collision-free into SmartSchedule.

---

## Key Architectural Principles

1. **Security & Zero Credential Collection**:
   - Never collects or inspects passwords or credential inputs.
   - Never reads authentication cookies or exports session tokens.
   - Never transmits raw HTML or authentication headers to SmartSchedule backend.
   - Operates strictly on visible, rendered timetable DOM elements.

2. **Decoupled Dynamic Rule Engine**:
   - University-specific DOM selectors belong in versioned JSON rules, NOT hardcoded in TypeScript.
   - Rules are loaded from local cache or refreshed from SmartSchedule backend API.
   - New university portals can be added by publishing a new rule without republishing the extension.

3. **Deterministic Normalization & Idempotency**:
   - Computes deterministic SHA-256 / fast fingerprints for each class session (`externalId`).
   - Re-importing the same timetable is completely idempotent (no duplicated events).
   - Timezone-aware conversion (e.g. `Asia/Ho_Chi_Minh` UTC+07:00).

4. **User-Controlled Workflow**:
   - Automatic detection → User clicks Extract → Preview with conflict analysis → User confirms → Import to SmartSchedule.

---

## Directory Structure

```text
extension/
├── src/
│   ├── background/
│   │   └── serviceWorker.ts         # MV3 background worker for lifecycle & rule cache
│   ├── content/
│   │   └── contentScript.ts         # In-page DOM inspector & extractor
│   ├── popup/
│   │   ├── Popup.tsx                # Interactive extension popup
│   │   ├── popup.html
│   │   └── popup.css
│   ├── options/
│   │   ├── Options.tsx              # Settings & rule administration
│   │   └── options.html
│   ├── rules/
│   │   ├── types.ts                 # Rule definitions & schema
│   │   ├── domainMatcher.ts         # Hostname, wildcard, and path pattern matcher
│   │   ├── ruleEngine.ts            # DOM CSS selector field extractor
│   │   ├── defaultRules.ts          # Verified FAP & Edusoft offline rules
│   │   └── checksum.ts              # Integrity verification
│   ├── extraction/
│   │   ├── mutationObserverHelper.ts# Dynamic AJAX/React DOM observer
│   │   └── strategies/
│   │       ├── ExtractionStrategy.ts
│   │       ├── RuleBasedExtractionStrategy.ts
│   │       └── AIExtractionStrategy.ts (reserved scaffold)
│   ├── normalization/
│   │   ├── dateParser.ts            # DD/MM/YYYY, YYYY-MM-DD, Vietnamese dates
│   │   ├── timeParser.ts            # 07:30 - 09:00, 07h30, standard slot lookup
│   │   ├── timezone.ts              # ISO 8601 offset normalization
│   │   ├── deduplication.ts         # Fingerprint-based duplicate filtering
│   │   └── validator.ts             # Error, Warning, Info classifier
│   ├── api/
│   │   └── smartScheduleClient.ts   # SmartSchedule backend REST client
│   └── shared/
│       ├── types.ts                 # UniversalScheduleItem, Diagnostics
│       ├── constants.ts
│       └── fingerprint.ts           # Deterministic event fingerprinting
├── tests/
│   ├── domainMatcher.test.ts
│   ├── dateParser.test.ts
│   ├── timeParser.test.ts
│   ├── deduplication.test.ts
│   ├── validator.test.ts
│   ├── fapExtraction.test.ts        # Fixture integration test for FAP
│   ├── edusoftExtraction.test.ts    # Fixture integration test for Edusoft
│   └── fixtures/
│       ├── fap/ (schedule.html, expected.json)
│       └── edusoft/ (schedule.html, expected.json)
├── manifest.json                    # Manifest V3
├── package.json
└── vite.config.ts
```

---

## Installation & Development

### 1. Build Extension

```bash
cd extension
npm install
npm run build
```

The output bundle is generated in `extension/dist/`.

### 2. Load into Chrome or Edge

1. Open your browser and navigate to `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** (Tải tiện ích đã giải nén).
4. Select the `D:\SmartSchedul\extension\dist` directory.
5. The **SmartSchedule Importer** extension icon will appear in your browser toolbar.

---

## Running Automated Tests

```bash
cd extension
npm test
```

Verifies:
- Domain pattern and wildcard matching
- Date parsing (Vietnamese prefixes, DD/MM/YYYY)
- Time and slot parsing (ranges, `07h30`, standard slots)
- In-page duplicate detection and event fingerprinting
- Rule-based extraction against real sanitized HTML fixtures for FAP and Edusoft
