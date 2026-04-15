# Design System Specification: Premium Fintech & Community Savings

## 1. Overview & Creative North Star
**The Creative North Star: "The Sovereign Vault"**

This design system moves away from the "disposable" feel of traditional fintech apps. It is built on the philosophy of **Sovereign Vaulting**—an experience that feels as secure as a physical bank vault but as fluid as a modern digital curator. 

To break the "template" look, we employ **Intentional Asymmetry** and **Tonal Depth**. Instead of rigid, centered grids, we use breathing room (negative space) and overlapping elements to guide the eye. The interface shouldn't feel like a series of buttons; it should feel like a high-end editorial piece where financial data is the hero, and the UI is the sophisticated gallery housing it.

---

## 2. Colors & Surface Architecture

### The Palette
The core of the experience is built on a "Dark Mode First" architecture. We use high-contrast primary accents to punctuate the darkness.

*   **Foundation:** `surface` (#111417) and `surface_container_lowest` (#0B0E11).
*   **The Signature Purple:** `primary` (#D6BAFF) is used for brand moments and "Community" features.
*   **The Action Emerald:** `secondary` (#40E56C) is reserved strictly for growth, success, and final transaction confirmations.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined through:
1.  **Background Color Shifts:** Placing a `surface_container_low` card on a `surface` background.
2.  **Tonal Transitions:** Using the hierarchy of `surface_container` tiers to create perceived edges.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of "Obsidian Glass."
*   **Level 0 (Base):** `surface` (#111417) - The canvas.
*   **Level 1 (Sections):** `surface_container_low` (#191C1F) - Used for grouping content areas.
*   **Level 2 (Cards):** `surface_container` (#1D2023) - The primary interactive unit.
*   **Level 3 (Modals/Popovers):** `surface_container_highest` (#323538) - Floating elements that demand focus.

### The "Glass & Gradient" Rule
To inject "soul" into the UI:
*   **Glow Effects:** Apply a subtle `primary_container` glow (15% opacity, 40px blur) behind major community contribution cards.
*   **Signature Gradients:** Primary CTAs should utilize a linear gradient from `primary` (#D6BAFF) to `primary_container` (#AB73FF) at a 135-degree angle.

---

## 3. Typography
We use a dual-typeface system to balance editorial sophistication with functional clarity.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision. Use `display-lg` and `headline-md` for "Big Numbers" (account balances and savings goals). It conveys authority and financial scale.
*   **Body & Labels (Inter):** The workhorse. Used for all transactional details, micro-copy, and community chat threads. Its high x-height ensures readability against dark backgrounds.

**Hierarchy as Identity:** 
Always lead with a `headline-lg` for financial totals, paired with a `label-md` in `on_surface_variant` (#CDC2D7) for the description. This high contrast in scale (Editorial Style) makes the app feel premium and high-trust.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved by "stacking" tonal tiers. 
*   *Example:* Place a `surface_container_lowest` (#0B0E11) element inside a `surface_container` (#1D2023) card to create an "inset" vault look for sensitive data like PINs or account numbers.

### Ambient Shadows
Shadows are never black. They are "Ambient Tints." 
*   **Specification:** Blur: 32px, Y-Offset: 16px. Color: `on_secondary_fixed_variant` at 8% opacity. This mimics natural light reflecting off a dark surface rather than a synthetic drop shadow.

### Glassmorphism
For floating navigation bars or top headers, use:
*   **Fill:** `surface_container` at 70% opacity.
*   **Effect:** Backdrop Blur (20px).
*   **Edge:** A "Ghost Border" using `outline_variant` (#4B4454) at 20% opacity only on the top edge.

---

## 5. Components

### Buttons
*   **Primary (The Action):** Gradient fill (`primary` to `primary_container`), `on_primary` text, `xl` (3rem) roundedness. High-contrast, glowing.
*   **Secondary (The Ghost):** No fill. `outline` (#968DA0) at 30% opacity for the border, `primary` text.
*   **Tertiary:** Text only in `secondary` (#40E56C) for "Add Money" or positive actions.

### Cards & Lists
*   **Rule:** Forbid divider lines. 
*   **Layout:** Separate list items using 12px of vertical white space. Use `surface_container_low` for the list item background to differentiate it from the `surface` background.
*   **Radius:** Standard cards use `md` (1.5rem/24px). Small nested elements use `sm` (0.5rem/8px).

### Input Fields
*   **State:** Default state is `surface_container_highest` with no border. 
*   **Focus State:** A 1px `primary` "Ghost Border" (40% opacity) and a subtle 4px `primary` outer glow.
*   **Numbers:** All financial inputs must use **Manrope Bold** to emphasize the weight of the transaction.

### Community Specific Components
*   **Contribution Progress Bar:** A `surface_container_highest` track with a `secondary` (Emerald) progress fill and a `secondary_fixed_dim` outer glow to signify "Growth."
*   **Member Avatars:** Stacked with a `surface` 2px stroke to create "cutouts," signifying the collective community.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme typographic scale (e.g., 40pt balance next to 12pt label).
*   **Do** use `secondary` (#40E56C) sparingly—only for moments of financial success or completion.
*   **Do** leverage asymmetry; place "Total Balance" top-left and "Settings" bottom-right to create a dynamic flow.
*   **Do** ensure all text on dark surfaces meets WCAG AA contrast ratios using the `on_surface` and `on_surface_variant` tokens.

### Don't
*   **Don't** use 100% white (#FFFFFF) for text. Use `on_surface` (#E1E2E7) to reduce eye strain.
*   **Don't** use standard "Material Design" blue. It breaks the premium "Vault" aesthetic.
*   **Don't** use hard-edged boxes. If it's a container, it must have at least an `sm` (8px) radius; preferably `md` (24px).
*   **Don't** use dividers to separate content. Use space and tonal shifts. Lines are the "clutter" of the old financial world.