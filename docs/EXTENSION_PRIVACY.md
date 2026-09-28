# SmartSchedule Browser Extension — Privacy Policy & Data Handling

SmartSchedule prioritizes student privacy, autonomy, and security. This document details our data handling practices for the **SmartSchedule Browser Extension**.

---

## 1. What Data Is Read?

The extension only reads visible timetable content from recognized university portals matching active extraction rules:
- **Course Name & Code** (e.g., "SWP391", "Dự án phần mềm")
- **Class Timestamps** (Date, Start Time, End Time)
- **Room / Location** (e.g., "BE-301")
- **Lecturer / Teacher Name** (e.g., "HuongLT")
- **Class / Group Code** (e.g., "SE1701")

---

## 2. What Data Is NEVER Read or Collected?

The extension strictly enforces:
- **NO Passwords**: Password input fields are never queried or inspected.
- **NO Session Cookies**: Authentication cookies from university portals are completely ignored and never accessed.
- **NO Personal Credentials**: Portal credentials, security tokens, or localStorage authentication tokens are never exported.
- **NO Browsing History**: The extension does not track tabs or URLs other than checking whether the active tab matches a configured educational domain pattern.
- **NO Raw Page HTML**: The complete page HTML is never saved or transmitted to SmartSchedule servers.

---

## 3. What Leaves the Browser?

Data leaves the user's browser **ONLY** when the user explicitly clicks:

> **"Đồng bộ vào SmartSchedule"**

When confirmed:
1. Extracted timetable items (Title, Start/End times, Room, Teacher, Course Code) are sent to the user's authenticated SmartSchedule account via `POST /api/v1/schedules/{id}/import/portal`.
2. Telemetry metadata (number of sessions detected, number of sessions accepted, execution duration in milliseconds, rule version) is recorded in the import audit log to maintain system health.
3. No personal notes, grades, tuition fees, or transcript details ever leave the browser.

---

## 4. What Stays Local?

- Cached extraction rules in `chrome.storage.local`.
- User configuration (target schedule ID, custom backend API URL).
- Temporary in-memory DOM extraction previews before confirmation.

---

## 5. How Synchronization Works

- **Manual by default**: Automatic silent uploading is strictly disabled.
- The student opens their university portal, clicks the extension icon, inspects the parsed timetable preview, reviews any scheduling conflicts, and explicitly confirms the synchronization.
- An idempotent fingerprint is generated for every session so that re-importing the same timetable will not duplicate calendar entries.

---

## 6. How to Revoke or Disable

- **Uninstall**: Remove the extension anytime via `chrome://extensions` or `edge://extensions`.
- **Delete Imported Events**: In SmartSchedule web application, imported events can be filtered by source ("FAP" / "EDUSOFT") and deleted or adjusted directly on the calendar.
- **Clear Local Cache**: In the extension Options page (`src/options/options.html`), users can clear cached rules and history.
