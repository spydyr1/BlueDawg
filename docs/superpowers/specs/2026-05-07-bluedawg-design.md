# BlueDawg — Design Spec
**Date:** 2026-05-07  
**Stack:** Vanilla JS + HTML5 Canvas, PWA  
**Purpose:** Help landscape construction contractors plan blue stone patio layouts — generating a visual stone layout and an optimized material order list.

---

## 1. Overview

BlueDawg is a browser-based PWA that lets a contractor:
1. Draw a patio outline (any polygon, including radiused corners)
2. Select a laying pattern
3. Generate a rule-compliant stone layout
4. Export a printable plan and an optimized material list

No server, no login. Fully offline-capable.

---

## 2. Stone Sizes

All sizes in inches. Joints are 1/4" (factored into placement math, not the ordered size).  
12 valid sizes — one dimension ≤ 24", the other ≤ 36", minimum 12"×18", no 12"×12":

| Width \ Length | 18" | 24" | 30" | 36" |
|---|---|---|---|---|
| **12"** | ✓ | ✓ | ✓ | ✓ |
| **18"** | ✓ | ✓ | ✓ | ✓ |
| **24"** | ✓ | ✓ | ✓ | ✓ |

---

## 3. Layout Rules

Applied during generation. All must be satisfied simultaneously:

1. **No 4-corner intersections** — no point where four stone corners meet
2. **No continuous seam > 2 stones** — a straight seam line (horizontal or vertical) cannot align with the edges of more than 2 consecutive stones without being broken by a perpendicular edge
3. **No seam > 5'** — no unbroken straight seam longer than 5 feet in any direction
4. **No two consecutive same-size stones** — two stones sharing a direct edge (left-right or top-bottom, not diagonal) cannot be the same size
5. **20% cap per size** — no single stone size may exceed 20% of the total stone count in the layout

---

## 4. Patterns

### 4a. Random Rectangular
Row-based fill. Each row has a uniform height chosen from {12, 18, 24}" — must differ from the previous row. Within each row, stone lengths vary, constrained by all layout rules. Algorithm:

1. Pick row height (not same as previous row)
2. Fill left-to-right: for each position, build a candidate list of valid stone lengths, filter by layout rules and 20% cap, pick randomly from remaining candidates
3. If no candidate fits, backtrack one stone and try a different choice
4. Repeat for each row until the patio area is filled

### 4b. Running Bond
User selects orientation: horizontal (→) or vertical (↓).  
All stones in a row share the same height (chosen from {12, 18, 24}"). The offset between rows is half the row height (e.g., a 12"-high row offsets the next row by 6"). Stone lengths within a row vary subject to all layout rules. Same-size, seam, and 20% rules apply across rows.

---

## 5. Boundary Handling (Cut Pieces)

When a stone placement crosses the patio boundary polygon:

- **Visual:** stone is clipped at the boundary (drawn as a partial stone with a red dashed cut line)
- **Minimum cut size:** 206 sq in. If the clipped remnant would be < 206 sq in, try the next candidate stone size. If all candidates fail, use the largest fitting option and flag it.
- **Material list:** full (uncut) stone size is listed for ordering
- **Cut notes:** record original size → cut-to dimensions + approximate location (e.g., "east border")
- **Waste optimization:** before adding a new stone to the order, check if the required cut piece can be yielded from the same full stone as another nearby cut piece with compatible dimensions

---

## 6. Drawing Tool

### Canvas
- Dark background with subtle grid
- Default tool on load: Draw mode

### Polygon Input (CAD-style direct distance entry)
1. Click to place anchor point
2. Drag to establish direction (rubber-band line follows cursor)
3. Type dimension in imperial format (e.g., `14' 6 3/4"`) — line locks to that length
4. Press Enter to confirm; next click starts next segment
5. Polygon closes when user clicks back on the first point (snaps) or presses Enter on the closing segment

### Corner Fillets
- After polygon is closed, click any corner node
- Popover appears: type radius (e.g., `18"`) and press Enter
- Corner converts to an arc; can be re-clicked to edit or remove

### Other Controls
- **Undo:** removes last placed point/segment, or last applied fillet
- **Pan mode:** click-drag to navigate large patios
- **Status bar:** live area (sq ft) and perimeter, corner and arc count

### Imperial Input Format
Accepts: `12'`, `6"`, `12' 6"`, `12' 6 3/4"`, `6 3/4"`.  
Fractions: halves, quarters, eighths, sixteenths.

---

## 7. Unit Toggle

Segmented control in the header: **ft/in** | **m/cm**  
Switching converts all displayed dimensions and input prompts. Internal calculations always use inches.

---

## 8. Material List & Output

### Material List Table
| Size | Qty | Sq Ft |
- One row per stone size used
- Grand total row (count + sq ft)

### Cut Notes Section
Below the table — lists each cut required:
```
2× 18"×24" → cut to 18"×14½"   (east border)
1× 24"×36" → cut to 24"×22"    (north arc boundary)
```
Where two cut pieces can be sourced from one full stone, they share one order line item.

### Print / PDF
- Canvas rendered at high resolution + material list below
- Single-page layout via browser print dialog with a print stylesheet
- Stone layout fills the top portion, material list and cut notes fill the bottom

---

## 9. Save / Load / Export

- **Storage:** `localStorage` + JSON — no server required
- **Auto-save:** on every layout generation and shape edit
- **Project data:** name, polygon vertices + fillet radii, pattern choice, unit preference, generated layout (stone positions, sizes, cut flags)
- **Home screen:** list of saved projects (name, date modified, area) — open, duplicate, delete
- **JSON export:** download project as `.json` file
- **JSON import:** drag-and-drop or file picker to load a project file on any device

---

## 10. PWA Requirements

- `manifest.json` with app name, icons, `display: standalone`
- Service worker caching all assets for offline use
- Installable on iOS and Android home screens

---

## 11. Out of Scope

- Accounts, cloud sync, or multi-user collaboration
- Curved/wavy stone edges (only straight-cut rectangular slabs)
- Pricing or supplier integration
- Step, border, or accent stone planning
- Automatic re-layout when shape is edited (user manually triggers Generate)
