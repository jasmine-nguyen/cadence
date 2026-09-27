# Handoff: Ask Abundo (AI spending chat)

## Overview
A floating **Ask** button, present on every tab, opens a chat sheet where the user asks questions about their own spending in plain language, e.g. *"What was the average of my eating out budget in the last 3 months?"*

It extends the existing AI insights feature (WHIT-104 / WHIT-137). It does not replace it:
- The **Spending insights card** on Insights stays. It is the passive, per-cycle summary.
- The **chat** answers specific questions on demand.
- The two connect: the card gets an **"Ask a follow-up →"** link that opens the chat, and **"Analyse my spending"** is the first suggested prompt in the chat.

## About the design files
`AI Chat.dc.html` is a **design reference built in HTML**. It shows the intended look and behaviour. It is not production code. Recreate it in the app's existing stack (React Native / Expo, per the rest of the codebase), using existing components, theme tokens and navigation patterns. Open the file in a browser to view it (keep `support.js` next to it).

## Fidelity
**High fidelity.** Colours, type, spacing and radii are final and use the Tokyo Night theme already in the app (`design_handoff_tokyo_night_theme/`). Where a value below matches an existing theme token, use the token rather than the literal hex.

---

## Decisions already made (do not re-open)
| Topic | Decision |
| --- | --- |
| Where the button shows | **Every tab** (Budgets, Transactions, Accounts, Insights, Goals). Not on pushed screens like Settings or transaction detail. |
| Button style | **"Ask" pill** with label. Not a round icon, because a round button on Budgets reads as "add". |
| Data the AI can see | **Everything needed for spending questions**: transactions (date, amount, merchant, description, category), categories, budgets, pay cycles. **Never** account numbers, BSBs, card numbers, account balances or credentials. |
| How numbers are calculated | **The app calculates, the AI explains.** The AI calls lookup tools and the server computes every figure. The AI must never add up transactions itself when a tool can do it. See *AI architecture*. |
| Access | **Available to everyone.** No premium gate, no per-user daily cap (the app has one user). |
| Cost protection | Keep only the **spend alarm** from WHIT-604: a monthly budget alert on the AI provider account. |

---

## Screens

All measurements are in pt at a 393pt-wide device. The mock shows four screens.

### 1. Floating "Ask" button (all five tabs)
- **Position:** absolute, `right: 18`, bottom **16pt above the top of the tab bar**. Respect the safe area.
- **Size:** height 50, horizontal padding 16 left / 20 right, fully rounded (radius 25).
- **Fill:** linear gradient 135°, `#7aa2f7` → `#bb9af7`.
- **Shadow:** `0 10 24 -6 rgba(0,0,0,0.6)`, plus a 1px ring `rgba(192,202,245,0.08)`.
- **Content:** icon (22pt, chat bubble containing a four-point sparkle, stroke/fill `#16161e`, stroke 1.9) + 8pt gap + label **"Ask"**, 15pt / weight 700 / `#16161e`.
- **Touch target:** the full pill (at least 44pt tall, satisfied).
- **Accessibility label:** "Ask about your spending".
- **Tap:** opens the chat sheet (screen 2 or 3).
- **Scroll clearance:** every scrolling list on every tab needs **72pt of extra bottom content padding**, so the last row can scroll clear of the button. The mock shows this as the dashed box on the Budgets screen. The box is an annotation only; don't render it.
- **Do not** hide the button on scroll in v1.

### 2. Chat sheet, first use (empty state)
Presented as a **large modal sheet** (iOS page sheet / near full height), top radius 24, background `#1a1b26`. Behind it the app dims to `#0b0b10`.

Top to bottom:
- **Grabber:** 38×5, radius 3, `#3b4261`, 8pt from the top.
- **Header row** (padding 8/18/12): title **"Ask Abundo"** in Inter Tight 17 / 700 / `#c0caf5` on the left. Close button on the right: 32×32 circle, `#24283b`, × glyph 15pt `#a9b1d6` stroke 2.2. Swipe down also closes.
- **Empty-state block**, pinned to the bottom of the message area (above the input), gap 22:
  - Heading: **"What do you want to know about your spending?"** in Inter Tight 24 / 800 / letter-spacing −0.5 / line-height 1.15.
  - Subhead: **"Ask about your transactions, budgets and categories, across your last 12 pay cycles."** 13.5 / `#a9b1d6` / line-height 1.5. *(This replaces the mock's "Answers come from your category totals…" copy, which predates the privacy decision.)*
  - **Suggested prompts** (vertical stack, gap 8, each padding 13/14, radius 14):
    1. **"Analyse my spending"**: highlighted. Background `#24283b`, no border, sparkle icon 18pt `#bb9af7` on the left, text 14.5 / 600.
    2. "Average Eating Out over the last 3 months"
    3. "Where did I overspend this cycle?"
    4. "How does this cycle compare to last?"

    Prompts 2–4: background `#1f2335`, 1px border `#292e42`, 14.5 / 400 / `#c0caf5`.

    Tapping a prompt sends it immediately as the user's message.
- **Composer** (see *Composer*, below).

### 3. Chat sheet, answer
Same sheet. The header row gains a 1px bottom border `#24283b`. The message list scrolls, padding 18, gap 16 between messages.

- **User message:** right-aligned, max width 82%, background `#7aa2f7`, text `#16161e` 14.5 / 500 / line-height 1.45, padding 11/14, radius `18 18 6 18`.
- **Assistant message:** left-aligned, full width, no bubble. A vertical stack with gap 12:
  1. **Text:** 14.5 / line-height 1.55 / `#c0caf5`. Key figures are **bold (700)**. Keep it to 1–3 sentences.
  2. **Answer card** (optional; only when the answer includes a figure or series):
     - Background `#1f2030`, 1px border `rgba(122,162,247,0.12)`, radius 18, padding 16, gap 14.
     - Top row: label on the left (8pt category-colour dot + "Eating Out · 3-cycle average", 12 / `#a9b1d6`), big value below it ("$214", Inter Tight 30 / 800 / letter-spacing −0.8). On the right, a delta ("+$14 vs budget", 12.5 / 700): `#f7768e` if over budget, `#9ece6a` if under.
     - **Bar chart:** one bar per period, gap 18, bar radius `7 7 3 3`, bars filled with the **category colour from `getCategoryColor(category.colorSlot)`** (see `design_handoff_chart_palette/`). Bar height is proportional to the value. The value label sits **inside the bar at the bottom** (12 / 700 / `#16161e`, tabular numbers). A dashed budget line (1.5px, `#c0caf5` at 70% opacity) goes at the budget value's height, labelled "$200 budget" (10.5 / `#a9b1d6`) at the right, just above the line. The x-axis labels (Jun / Jul / Aug) go below, 11.5 / `#787c99`, centred.
     - Chart height: 124pt plot area.
  3. **Source line:** what the figure covers, e.g. "3 completed pay cycles · 12 Jun – 11 Sep", 11.5 / `#787c99`. **Always show this when a figure is given**, so the user knows exactly which period was used.
  4. **Action chips** (wrap, gap 8): height 34, padding 0/13, radius 17, 1px border `#3b4261`, 13 / 600. The first action is `#7aa2f7`; the rest are `#c0caf5`.
     - Deep-link actions navigate inside the app and close the sheet. For example, "See Eating Out transactions" opens Transactions filtered to that category and date range.
     - Prompt actions ("Compare to Cafes") send that text as a new user message.

### 4. Budgets tab with the button
This screen confirms the button coexists with the header: the gear stays top-left (WHIT-495), `+` stays top-right, and the Ask pill sits bottom-right. Nothing new to build beyond screen 1 and the 72pt list padding.

### Insights card change
On the existing **Spending insights** card (WHIT-137), add **"Ask a follow-up →"** (13 / 600 / `#bb9af7`), right-aligned in the card's footer row, opposite the existing "Re-analyse" link. Tapping it opens the chat with the card's summary already shown as the first assistant message, so the user can continue from it.

### Composer (screens 2 & 3)
- Container: top border 1px `#24283b`, padding `12 14`, plus the bottom safe area.
- Row, gap 8:
  - Text field: height 46 (grows up to 4 lines), radius 23, background `#16161e`, 1px border `#292e42`, padding 0/16, text 15 / `#c0caf5`. Placeholder `#565f89`: **"Ask about your spending"** when empty, **"Ask a follow-up"** once a conversation exists.
  - Send button: 46×46 circle, up-arrow 20pt stroke 2.2.
    - Disabled (empty input): background `#24283b`, arrow `#565f89`.
    - Enabled: background `#7aa2f7`, arrow `#16161e`.
    - While a reply is streaming: becomes a **stop** button (same size, `#24283b`, square glyph `#c0caf5`).
- Footnote, centred, 11.5 / `#787c99`: **"Uses your transactions to answer · AI can make mistakes"**. *(This replaces the mock's "Totals only…" copy.)*

---

## Interactions & behaviour
- **Opening:** the sheet slides up with the platform default modal animation. The keyboard does **not** auto-open on first use (the suggested prompts are the main path). It does auto-focus when the sheet is opened from "Ask a follow-up".
- **Sending:** the user message appears immediately. The assistant slot shows a **typing indicator** (three 6pt dots, `#565f89`, staggered pulse) until the first token arrives, then the text streams in. The answer card and chips appear once the reply is complete. They are not streamed.
- **Tool activity:** while the server is running lookups, show a one-line status under the typing indicator, e.g. "Looking at Eating Out, last 3 cycles…" (12 / `#787c99`). Generate it from the tool call arguments; don't have the model write it.
- **Scrolling:** auto-scroll to the newest message unless the user has scrolled up. If they have, show a small "↓" jump button.
- **Closing:** × or swipe down. The conversation **persists in memory until the app is killed**, so reopening the sheet shows the same thread. Add a **"New chat"** action (header, left of ×, 13 / 600 / `#7aa2f7`), visible only when a conversation exists.
- **Errors:**
  - Network/provider failure: an inline assistant message "Couldn't reach the assistant. Try again." with a **Retry** chip that resends the last user message.
  - The question can't be answered from the data: the AI says so plainly and suggests a question it *can* answer. It must never invent figures.
- **Haptics:** light impact on send.

## First-use consent
The chat sends transaction-level data (merchants, descriptions, amounts) to the AI provider. This is more than the current insights feature sends. On the **first ever** open, show a one-time consent step inside the sheet, before the empty state:
- Title: "Let Abundo's assistant read your transactions?"
- Body: "To answer questions, your transactions, categories and budgets are sent to our AI provider. Account and card numbers are never shared."
- Primary: **"Continue"**. Secondary: **"Not now"** (closes the sheet).
- Store the acceptance with a timestamp. Don't show it again once accepted.

---

## AI architecture (the maths decision)

**Principle: the server computes every number; the model picks which lookups to run and writes the sentence.** Models make arithmetic errors over large sets of transactions, and a figure in the chat must match what the Budgets and Insights screens show.

### Flow
1. The client sends `{ conversation, message }` to a new endpoint, e.g. `POST /ai/chat` (streaming response).
2. The server calls the model with the system prompt + tool definitions + conversation.
3. The model calls tools. The server runs them **against the user's own data only** (scope every query to the authenticated user) and returns the results.
4. The model writes its final answer by calling `respond` (below). The server streams `text` to the client as it arrives, then sends the structured `card` and `actions`.

Reuse the model/provider setup from WHIT-104. **Check the existing insights code first** and put the chat alongside it rather than creating a second AI client.

### Tools
Keep this set small and general. **Do not build one tool per question type.**

```ts
query_transactions({
  filters: {
    category_ids?: string[],
    merchant_contains?: string,       // case-insensitive
    description_contains?: string,
    date_from?: string, date_to?: string,  // ISO dates
    pay_cycles?: { last_n: number, include_current?: boolean },  // default include_current: false
    min_amount?: number, max_amount?: number,
    direction?: "spend" | "income"    // default "spend"
  },
  group_by?: "none" | "category" | "merchant" | "month" | "pay_cycle",
  metric: "sum" | "avg" | "count" | "min" | "max" | "list",
  limit?: number                      // for "list"; default 20, max 200
}) → { rows: [...], period: { from, to, cycles? } }

get_budgets({ pay_cycle?: "current" | { offset: number } })
  → [{ category_id, name, limit, spent, remaining, color_slot }]

get_pay_cycles({ last_n: number }) → [{ start, end, is_current }]

get_categories() → [{ id, name, color_slot, is_builtin }]

respond({
  text: string,
  card?: {
    type: "metric_bars",
    label: string,          // "Eating Out · 3-cycle average"
    value: number,
    delta?: { amount: number, vs: "budget" | "previous" },
    category_id?: string,   // client resolves colour via colorSlot
    budget_line?: number,
    series: [{ label: string, value: number }]
  },
  source: string,           // "3 completed pay cycles · 12 Jun – 11 Sep"
  actions?: [
    { kind: "deeplink", label: string, route: "transactions",
      params: { category_id?, merchant?, date_from?, date_to? } }
    | { kind: "prompt", label: string, text: string }
  ]
})
```

**Averaging rules** (enforce in `query_transactions`, not in the prompt):
- `avg` grouped by `pay_cycle` or `month` **includes periods with zero spend** as 0.
- "Last N months/cycles" means **completed** periods by default. Only include the current partial period if the user asks for it.
- Amounts are positive numbers in the user's currency. Format them on the client.

**Fuzzy groupings** (e.g. "date nights", where there's no category): the model may call `metric: "list"` and group the rows itself. In that case the answer text **must** say it's an estimate and name the merchants it counted.

### System prompt (starting point)
> You are Abundo's spending assistant. Answer questions about the user's own transactions, budgets, categories and pay cycles. Always get figures from the tools; never calculate totals or averages yourself when a tool can. Pay cycles are the primary time unit. Say "per cycle" unless the user asks for months. Keep answers to 1–3 sentences, bold the key figure, and always fill `source` with the exact period used. Include a `metric_bars` card when the answer is a figure over time. Offer at most 2 actions. If the data can't answer the question, say so and suggest one that it can. Don't give investment, tax or credit advice. Don't mention tools or internal ids.

### Privacy guardrails (server-side)
- Tool results may include date, amount, merchant, description and category. **Strip** account numbers, BSB, card numbers, balances and any bank credentials before anything reaches the model.
- Don't log conversation content server-side beyond what is needed for debugging, and never log it with account identifiers.

### Cost
- No gating. Add the WHIT-604 **monthly spend alarm** on the provider account if it doesn't already exist.
- Cap tool-call rounds at **6 per user message** so a loop fails fast.
- Send only the last **20 messages** of a conversation as context.

---

## State (client)
```ts
chat: {
  consented: boolean,               // persisted
  messages: Array<
    | { role: "user", id, text }
    | { role: "assistant", id, text, card?, source?, actions?, status: "streaming" | "done" | "error" }
  >,                                // in-memory only
  inFlight: boolean,
  toolStatus?: string
}
```
Keep this in a global store, not screen-local state, because it has to survive switching tabs while the sheet is closed.

## Design tokens used
| Role | Value |
| --- | --- |
| App background | `#16161e` |
| Sheet background | `#1a1b26` |
| Dimmed backdrop | `#0b0b10` |
| Raised surface / card | `#1f2030`, border `rgba(122,162,247,0.12)` |
| Chip / prompt surface | `#1f2335`, border `#292e42` |
| Highlighted prompt / controls | `#24283b` |
| Strong border / grabber | `#3b4261` |
| Divider | `#24283b` |
| Text primary / secondary / muted | `#c0caf5` / `#a9b1d6` / `#787c99` |
| Placeholder | `#565f89` |
| Accent | `#7aa2f7` |
| AI accent | `#bb9af7` |
| Over budget / under budget | `#f7768e` / `#9ece6a` |
| Button gradient | `#7aa2f7 → #bb9af7`, 135° |
| Fonts | Inter (UI), Inter Tight (titles, big numbers) |
| Radii | pill 25, sheet 24, user bubble 18/18/6/18, card 18, prompt 14, chip 17, field 23 |

## Acceptance checks
1. The Ask pill appears on all five tabs in the same position, and the last row of every list can scroll fully above it.
2. Asking **"What was the average of my eating out budget in the last 3 months?"** returns a figure that **exactly matches** a manual sum of Eating Out spend across the last 3 completed pay cycles ÷ 3, including any zero cycle.
3. The source line names the exact cycle dates used.
4. The answer card's bars use Eating Out's category colour (`colorSlot`), not a hardcoded colour.
5. "See Eating Out transactions" opens Transactions filtered to that category and those dates, and closes the sheet.
6. No model request contains an account number, BSB, card number or balance (check with a logged request in dev).
7. "Ask a follow-up →" on the insights card opens the chat seeded with the card's summary.
8. The consent step appears once and never again after "Continue".

## Unverified — check before building
- Where the WHIT-104 insights client/endpoint lives, and whether its provider setup supports tool calling and streaming.
- Whether the Transactions screen already accepts category and date filters as route params. If not, adding that is part of this work.
- How pay cycles are stored and queried. `query_transactions` must use the same definition the Budgets screen uses.

## Files
- `AI Chat.dc.html`: the four-screen design reference (open in a browser with `support.js` alongside).
- `support.js`: the runtime needed to open the reference file.
- Related handoffs: `design_handoff_chart_palette/` (category colours, `colorSlot`), `design_handoff_tokyo_night_theme/` (theme tokens).
