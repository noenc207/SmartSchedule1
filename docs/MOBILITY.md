# SmartSchedule — Campus Mobility & Physical Transit Architecture

University students frequently move between lectures, labs, and study areas across multiple campus buildings. SmartSchedule incorporates physical campus geography into its planning and scheduling pipelines to prevent impossible or exhausting transitions.

---

## 1. Campus Geography & Building Matrix

Campus locations are modeled as geographical nodes with bidirectional walking durations (in minutes).

### Standard Campus Building Graph (e.g., FPT Quy Nhon Campus)
```text
[ Building Alpha (Lecture Hall) ] ── (8 mins) ── [ Building Beta (Engineering Labs) ]
                │                                         │
            (14 mins)                                 (7 mins)
                │                                         │
                ▼                                         ▼
[ Building Gamma (Research & AI) ] ── (6 mins) ── [ Library / Student Center ]
```

### Precedence & Travel Matrix Representation
```json
{
  "Alpha:Beta": 8,
  "Beta:Alpha": 8,
  "Alpha:Gamma": 14,
  "Gamma:Alpha": 14,
  "Beta:Gamma": 7,
  "Gamma:Beta": 7,
  "Gamma:Library": 6,
  "Library:Gamma": 6
}
```

---

## 2. Mobility Anomaly Detection Rules

The `mobility_analyzer` evaluates daily event sequences and highlights three classes of physical transit risks:

### 1. Domino Transition Risks
- **Definition**: Occurs when two or more consecutive physical classes have a break duration that is less than or equal to the required walking time plus safety buffer (`min_transition_buffer_minutes = 10`).
- **Impact**: Any slight class overrun will cause the student to be late for all subsequent lectures in that chain.
- **Remediation**: The system flags the sequence with a `DOMINO_RISK` warning and prompts for virtual attendance or rescheduling tasks around that block.

### 2. Route Zig-Zagging
- **Pattern**: `Building A` $\to$ `Building B` $\to$ `Building A` within a short time window (e.g., within 3 hours).
- **Impact**: Unnecessary physical exertion and lost study productivity.
- **Remediation**: Recommends consolidating study tasks into the current building rather than trekking across campus.

### 3. Travel-to-Session Imbalance
- **Rule**: If walking time to an isolated physical event exceeds 50% of the session length (e.g. walking 15 minutes for a 20-minute meeting), the transition is flagged as `TRAVEL_HEAVY`.

---

## 3. Route Efficiency Score

Each daily schedule receives an efficiency score:

$$\text{Efficiency} = \max\left(0.0, 1.0 - \left( 0.15 \cdot N_{\text{tight}} + 0.20 \cdot N_{\text{zigzag}} + 0.10 \cdot \frac{T_{\text{travel}}}{T_{\text{total}}} \right)\right)$$

- **Score $\ge 0.85$**: Optimal transit flow.
- **Score $0.60 - 0.84$**: Moderate transit burden with minor gaps.
- **Score $< 0.60$**: Critical transit friction; optimization re-run strongly recommended.
