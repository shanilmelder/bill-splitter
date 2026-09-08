# Feature: Bill splitter

### Background

Splitting a restaurant bill by hand is slow and error-prone once the split isn't even — someone skipped the wine, two people shared a starter, one person is covering a friend. People currently do this with a phone calculator and mental arithmetic, then argue about the rounding. There is no shared state to get wrong: this is a single-user tool used once per bill, on a phone, often on bad restaurant wifi.

### Goals

- A user can enter a bill and get a per-person amount owed, including tip.
- Uneven splits are first-class: per-item assignment and weighted shares, not just "divide by N".
- Per-person totals always sum exactly to the bill total, with no lost or invented cents.
- The result can be shared as plain text without an account.
- Works offline and survives a page reload mid-bill.

### Out of scope

- Sync between devices.
- Payment collection, payment links, or bank integrations.
- Multi-currency within a single bill, and exchange rate lookup.
- Receipt scanning / OCR.
- Group history, debt tracking between friends over time, or settling up.
- Anything requiring a server.

### Behaviour

**Setting up a bill**

1. A new bill starts empty with one participant row and an empty item list.
2. The user adds participants by name. Names are optional; unnamed participants display as "Person 1", "Person 2", etc. Duplicate names are allowed and are not merged.
3. A participant can be removed. Removing a participant unassigns them from every item; it does not delete the items.

**Entering the bill**

4. The user can enter the bill in either of two modes, switchable at any time:
  - **Total mode** — a single bill total.
  - **Itemised mode** — a list of items, each with a name, unit price, and quantity. The bill total is the sum of items and is not directly editable.
5. Switching from itemised to total mode keeps the computed sum as the total and retains the items so the switch is reversible. Switching from total to itemised mode does not fabricate items.
6. Prices accept up to 2 decimal places. Negative prices are rejected with an inline message; zero is allowed (e.g. a comped dish).

**Splitting**

7. In total mode, the split is by **weighted shares**: each participant has a share count defaulting to 1. Equal shares for everyone is therefore the default behaviour with no extra input.
8. In itemised mode, each item is assigned to one or more participants and its cost is divided equally among its assignees. An item assigned to everyone behaves the same as an evenly split item.
9. An unassigned item is highlighted and its cost is split equally across all participants, so the totals still reconcile. The UI must make clear this is a fallback, not a choice the user made.
10. Charges that apply to the whole bill — tax, service charge, delivery fee, discount — are entered separately from items and are apportioned across participants in proportion to their pre-charge subtotal. A discount is entered as a negative adjustment and apportioned the same way.

**Tip**

11. Tip is entered as either a percentage of the pre-tip subtotal or a fixed amount. Switching between the two carries the current computed value over so the number doesn't jump.
12. Percentage tip presets are offered (10 / 15 / 20%) alongside free entry.
13. Tip is apportioned in proportion to each participant's pre-tip subtotal.
14. A "round up the total" option rounds the grand total up to the next whole currency unit and treats the difference as additional tip.

**Rounding and reconciliation**

15. All money is computed in integer minor units (cents) internally. Displayed values are always exactly 2 decimal places.
16. Per-person totals must sum to the grand total exactly. Where a division leaves a remainder of *n* cents, those *n* cents are distributed one cent at a time to participants in descending order of their unrounded fractional part, ties broken by participant order.
17. The UI shows the grand total and the sum of per-person totals; if they ever disagree, that is a bug, and the app shows an error rather than a wrong number.

**Output**

18. Each participant's row shows their total and, on expansion, the breakdown: their items or share, their portion of each whole-bill charge, and their tip.
19. A "copy summary" action puts a plain-text summary on the clipboard: bill total, tip, and one line per participant with their amount.
20. A "start new bill" action clears everything after a confirmation step.

**Persistence**

21. The in-progress bill is saved locally after every change and restored on reload. Only one bill is retained; there is no history list.
22. Nothing is transmitted off the device.

### Constraints

- Should have a frontend and backend.
- Must be fully usable offline after first load.
- Mobile-first: primary target is a phone held one-handed in a restaurant. All controls reachable without zooming; numeric inputs must bring up the numeric keypad.
- Currency symbol and decimal separator follow the device locale. The user can override the symbol, but the app does not convert between currencies.
- Reasonable upper bounds: 20 participants, 100 items. Beyond that the app should degrade gracefully rather than break.
- Accessible: keyboard-operable, labelled inputs, and per-person totals announced to screen readers when they change.

### Open questions

- Should a participant be able to have a fixed amount assigned to them directly ("Sam is putting in exactly 20"), with the remainder split among the others? Useful, but interacts awkwardly with tip apportionment. (BA: treat as a separate story and mark it lower priority than the core split.)
- Should the copy-summary output be plain text only, or should a shareable URL that encodes the bill state also be offered? A URL leaves the device, which cuts against the privacy constraint above. (BA: default to plain text only, note the URL variant as a follow-up.)
- For itemised mode, is per-item quantity needed at launch, or is "add the item twice" acceptable for v1? (BA: pick a sensible default and note it.)
- Where tax is already included in listed item prices (common outside the US), should the whole-bill tax field be hidden or just default to zero? (BA: default to zero and visible; flag if a locale-aware default is wanted.)

