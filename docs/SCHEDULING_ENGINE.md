# SmartSchedule — CP-SAT Constraint Scheduling Engine

The SmartSchedule optimization engine transforms user tasks, fixed university commitments, personal availability, and preferences into a mathematically proven, collision-free schedule using **Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)**.

---

## 1. Mathematical Formulation

The scheduling problem is modeled as an Interval Scheduling and Resource Allocation problem on discrete time domains (15-minute resolution).

### Variables & Domains
- Let $T = \{t_1, t_2, \dots, t_n\}$ be the set of task sessions to schedule.
- For each session $t_i$:
  - Start time variable: $S_i \in [T_{start}, T_{end}]$
  - Fixed duration: $D_i \in \mathbb{N}^+$
  - End time variable: $E_i = S_i + D_i$
  - Interval variable: $I_i = \text{NewIntervalVar}(S_i, D_i, E_i)$
  - Scheduled boolean flag: $b_i \in \{0, 1\}$

---

## 2. Hard Constraints (Inviolable Rules)

1. **No-Overlap with Fixed Events**:
   $$\forall t_i \in T, \forall e_j \in \text{FixedEvents}, \quad [S_i, E_i) \cap [S(e_j), E(e_j)) = \emptyset$$
   Implemented via `cp_model.AddNoOverlap([I_1, I_2, \dots, I_m])` including all pre-existing classes and exams.

2. **Availability Windows**:
   $$\forall t_i \in T, \quad [S_i, E_i) \subseteq \bigcup_{k} \text{AvailabilityWindow}_k$$
   Tasks can only be scheduled during hours the user has designated as active.

3. **Deadline Compliance**:
   $$E_i \le \text{Deadline}(t_i)$$
   Sessions cannot terminate after their specified due dates.

4. **Task Partitioning**:
   If a task is splittable, it is partitioned into sessions adhering to:
   $$\text{minSessionMinutes} \le D_i \le \text{maxSessionMinutes}$$

---

## 3. Objective Function & Soft Optimization

The objective maximizes overall utility while penalizing fragmentation, deadline risk, and chronotype mismatch:

$$\max \sum_{i} \left( W_{\text{priority}}(t_i) \cdot b_i + W_{\text{pref}}(S_i) - W_{\text{delay}}(E_i) \right)$$

### Priority Weighting Matrix
| Priority | Weight ($W_{\text{priority}}$) | Urgency Multiplier |
| :--- | :---: | :---: |
| **URGENT** | 1,000 | 4.0x |
| **HIGH** | 500 | 2.5x |
| **MEDIUM** | 200 | 1.0x |
| **LOW** | 100 | 0.5x |

### Energy & Chronotype Matching
- **Morning Chronotype**: Awards positive utility to sessions placed between 08:00 and 12:00.
- **Evening Chronotype**: Awards positive utility to sessions placed between 18:00 and 22:00.

---

## 4. Determinism & Performance Guarantees

- **Deterministic Seeds**: The solver computes a deterministic SHA-256 hash of the input parameters to set the CP-SAT solver seed, ensuring that identical inputs yield identical schedules.
- **Time Limits**: The solver enforces a strict configurable timeout (default 5.0 seconds). If the optimal solution is not proven within 5s, the best feasible solution found is returned.
- **Unscheduled Handling**: If constraints make it impossible to schedule all tasks before deadlines, unscheduled tasks are recorded with explicit reason codes (`DEADLINE_UNATTAINABLE`, `AVAILABILITY_EXHAUSTED`).
