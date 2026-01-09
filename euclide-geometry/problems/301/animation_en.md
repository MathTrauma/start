## Problem 004: Concyclic Points

### Problem
In square $ABCD$, points $P$ on side $AB$ and $Q$ on side $AD$ satisfy
$\overline{AP} = \overline{AQ} = \frac{\overline{AB}}{5}$.
Let $H$ be the foot of the perpendicular from point $A$ to segment $PD$.
If the area of triangle $APH$ is 20, find the area of triangle $HCQ$.

## Geometry Information

### Base Points
| Point | x | y | Description |
|-------|-----|-----|-------------|
| A | -2 | -2 | Square vertex (bottom-left) |
| B | 2 | -2 | Square vertex (bottom-right) |
| C | 2 | 2 | Square vertex (top-right) |
| D | -2 | 2 | Square vertex (top-left) |

> **Note**: The problem states AP = AB/5, but **pos=0.25 (1/4)** is used for visual clarity.

### Computed Points
| Point | x | y | Description |
|-------|-----|-----|-------------|
| P | -1 | -2 | On AB, AP:PB = 1:3 |
| Q | -2 | -1 | On AD, AQ:QD = 1:3 |
| H | ≈-1.06 | ≈-1.76 | Foot of perpendicular from A to PD |
| R | 2 | ≈0.24 | Intersection of extended AH and BC |

---

## Problem Phases

**PHASE 1: Square ABCD**
- Display square ABCD with vertices A, B, C, D simultaneously (duration: 0.2)
- Display points P, Q (duration: 0.2)
- Draw segment PD (duration: 0.8)

---

**PHASE 2: Drop Perpendicular to PD**
- Drop perpendicular from A to segment PD (duration: 0.5)
- Display foot of perpendicular H (duration: 0.2)
- Display right angle AHP (duration: 0.3)
- Draw triangle HQC (duration: 1.5)

---

## Solution Phases

**PHASE 1: Show Right Angles**
- Draw segment HR (duration: 1.0)
- Draw segment QR (dashed), display point R (duration: 1.5, 0.3)
- Display right angles RHD, DCR simultaneously (duration: 0.1)
- Blink right angles RHD, DCR 3 times (duration: 0.9)
- Display right angle RQD (duration: 0.3)

---

**PHASE 2: Concyclic Points - Draw Circle**
- Draw segment DR (diameter) (duration: 1.2)
- Draw circumcircle of C, D, R starting from point R (duration: 2.0)
- Hide right angle RHD, display right angle CHQ (duration: 0.5)

---

**PHASE 3: Inscribed Angles**
- Display ⭐ at angle QCP (duration: 0.3)
- Display ⭐ at angle QDP (duration: 0.3)
- Display ⭐ at angle HAP (duration: 0.3)

---
