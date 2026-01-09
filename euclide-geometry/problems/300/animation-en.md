## Problem 001: Orthogonality in Isosceles Triangle

### Problem
In isosceles triangle $ABC$ where $\overline{AB}=\overline{AC}$,
let $D$ be the foot of the perpendicular from $A$ to segment $BC$.
Let $E$ be the foot of the perpendicular from $D$ to segment $AB$, and let $M$ be the midpoint of segment $DE$.
Prove that $\overline{AM} \perp \overline{EC}$.

---

## Problem Phases

**PHASE 1: Triangle ABC**
Time: 0-2s

- Display points A, B, C
- Draw triangle ABC @ 0.6s (duration: 1.4s)

---

**PHASE 2: Foot of Perpendicular D**
Time: 2-4s

- Display point D (midpoint of BC) @ 2.0s
- Draw segment AD @ 2.3s (duration: 1.0s)
- Display right angle ADC @ 3.4s

---

**PHASE 3: Projection Point E**
Time: 4-5s

- Draw segment DE @ 4.0s (duration: 1.0s)
- Display point E (projection of D onto AB) @ 4.0s
- Display right angle DEB @ 5.0s

---

**PHASE 4: Midpoint M and Auxiliary Lines**
Time: 5-7s

- Display point M (midpoint of DE) @ 5.0s
- Draw segment CE @ 5.3s (duration: 1.0s)
- Draw segment AM @ 6.3s (duration: 1.0s)

---

**PHASE 5: Intersection Point X**
Time: 7-8s

- Display point X (intersection of AM and EC) @ 7.0s

---

## Solution Phases

**PHASE 1: Finding Similarity**
Time: 0-4.0s

- Add and display point F, midpoint of B and E (label position: -10, +10)
- Draw segment DF @ 0.2s (duration: 1.0s)
- Draw triangle BDF filled with semi-transparent blue @ 1.3s (duration: 1.0s)
- Draw triangle BCE filled with semi-transparent red @ 2.4s (duration: 1.0s)
- Mark equal angles BDF and BCE (with dots) @ 3.5s (duration: 0.5s)

---

**PHASE 2: Finding Additional Similarity**
Time: 4.0-6.3s
Use higher transparency for lighter colors

- Erase filled shapes from previous phase (duration: 0.2s)
- Draw triangle BDE filled with semi-transparent blue,
  Draw triangle DAE filled with semi-transparent red (stroke with emission effect) @ 0.3s (duration: 1.0s)
- Delay (duration: 1.0s)
- Erase triangles BDE and DAE from previous step @ 2.3s (duration: 0.2s)
- Draw triangle BDF filled with semi-transparent blue,
  Draw triangle DAM filled with semi-transparent red @ 2.5s (duration: 1.0s)
- Delay (duration: 1.0s)
- Mark angle DAM (same as angles marked in Phase 1) @ 3.5s (duration: 0.2s)

---

**PHASE 3: Concyclic Points**
Time: 6.3-8.5s
Note: Point X is displayed but without label

- Draw circle passing through points A, C, D (duration: 1.5s)
- Display intersection point X of segments CE and AM (no label needed) @ 1.6s (duration: 0.2s)
- Display right angle CXA (size: 0.3) @ 1.9s (duration: 0.3s)
