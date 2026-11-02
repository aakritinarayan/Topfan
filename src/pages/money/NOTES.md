# Money area notes (Wallet + Insights & Fans)

Sources: `pages/15-wallet.md`, `pages/16-insights-fans.md`, every `15*` / `16*` screenshot. All people, products, links and numbers are fictional; only non-personal figures (balance, earning totals, engagement counts) keep the captured values.

## Routes built

| Route id | URL | Status | Component |
|---|---|---|---|
| wallet | /wallet → redirect to wallet-balance | captured | (redirect) |
| wallet-balance | /wallet/current-balance | captured | WalletBalance.tsx |
| wallet-referrals | /wallet/referrals | captured | WalletHistory.tsx |
| wallet-transactions | /wallet/transaction-history | captured | WalletHistory.tsx |
| wallet-loyalty | /wallet/loyalty-history | captured (empty state) | WalletHistory.tsx |
| wallet-purchases | /wallet/my-purchases (Subscription Plans) | captured | WalletPurchases.tsx |
| wallet-purchases-category | /wallet/my-purchases/:category | captured (newsletter, merchandise, skeleton); other categories built from the spec text | WalletPurchases.tsx |
| wallet-refunds | /wallet/refund-requests | captured | WalletRefunds.tsx |
| wallet-fulfillment | /wallet/my-fulfillment-requests | captured | WalletFulfillment.tsx |
| insights | /insights (+ `?tab=engagement`, `?tab=fan-relationship-management`) | captured | Insights.tsx, InsightsFans.tsx |

Helpers: `ui.tsx` (pills, filters, tables, empty state, skeleton, px-accurate button wrappers), `charts.tsx` (SVG donut + legend, bar chart), `insightsData.ts` (period ranges + derived metrics), `WalletLayout.tsx` (title + 7 tab pills with live badges).

## Store actions (src/store/slices/money.ts)

Run inside `act(label, (d) => fn(d, …), { need })`:

| Function | need | Tier |
|---|---|---|
| `withdraw(d, amount)` (no-op unless `withdrawBlocker` is null) | finance.write | Protected (modal + type WITHDRAW) |
| `connectPayoutAccount(d, label, country)` / `disconnectPayoutAccount(d)` | finance.write | Protected (type CONNECT / DISCONNECT) |
| `addCard(d, card)` / `removeCard(d, id)` | finance.write | Protected (type ADD CARD / DELETE) |
| `approveRefund(d, id)` / `declineRefund(d, id)` | finance.write | Confirm (details modal → confirm step; never automatic) |
| `markExperienceFulfilled(d, id)` → "Awaiting Fan Confirmation" | content.write | Confirm |
| `cancelAndRefundFulfillment(d, id)` | finance.write | Confirm |
| `renewPlan`, `cancelAutoRenewal`, `removePurchasedPlan` | finance.write | Confirm |
| `createSegment(d, name, criteria)` | content.write | Draft |

Selectors/helpers: `pendingRefunds(d)` (badge 3), `openFulfillments(d)` (badge 9), `refundStatusLabel`, `fulfillmentStatusLabel`, `withdrawBlocker(d, amount)`, `MONEY_TODAY` ("2026-11-02", the capture date), `EARNING_CATEGORIES`.

Accepting a refund or cancel-and-refund lowers `balance.available` and adds a "Fan Refund Issued" transaction; a withdrawal adds a pending "Withdrawal" transaction.

Contract fields kept: `fans` (54, `MoneyFan extends Fan`), `transactions` (`MoneyTransaction`: net `amount` + optional `gross` + `category`), `balance`, `payoutAccount` (starts not connected), `refundRequests` (10 rows, 3 actionable Pending), `fulfillmentRequests` (95 items, 9 Open), `loyaltyHistory` (empty).

## Internal consistency

- Earning Metrics use the gross amounts of earning transactions in the period. This Month = the Nov 1 subscription ($67.50 gross, +$49.60 net in Transaction History) + the Nov 1 ad ($0.07) = $67.57 (2). This reconciles the two captured numbers.
- Top Supporters (This Month) = the fan who paid that subscription ($67.50).
- Post Engagements (This Month) = 21 + 53 = 74 = the two bars in Post Engagement Trends. WLS visits = 3.
- Every period (Today … All Time, Custom Dates) is computed from the same seed, so other periods show other non-zero values.

## Source quirks reproduced

- Benefit copy typo "fedwrikcs" in the first purchased plan.
- One merchandise purchase row has an empty price cell.
- A course price is shown in EUR (€52.62) among USD prices.
- Last Session times carry the capture machine's "IST" suffix.
- Donut legend list box clips its last row; zero-value callouts cluster at the top of the ring (max 4 per side).
- Radio pairs in Segmentation render dimmed.
- Merchandise items have no "mark fulfilled" action (only CANCEL & REFUND); only experiences get MARK EXPERIENCE AS FULFILLED.

## Inferred (marked `// inferred:` in code)

- All modals: Withdraw (amount → typed confirm), Connect payout (fake test accounts + "Demo: no real bank connection"), Add card (fake test-card picker + demo notice, no card inputs), Delete card, Disconnect payout, refund details + Accept/Decline confirm, fulfillment confirms, plan Renew/Cancel/Remove/Details, purchase/transaction detail views, Create Segment naming step, Import Completed dialog.
- The connected payout account row (not captured).
- Transaction types after "Portfolio Purchase" (list was truncated); page-2 donut colours.
- Header labels for Direct Messages / Downloadables / Livestreams purchase tables.
- Segmentation select options (time period, engagement range, purchases); the map is a neutral SVG placeholder (no map service).
- Most Engaged / Top Recruiters table columns (only their empty states were captured).
- Fulfillment list shows 20 rows + "Load More" instead of rendering all 95 at once.
- Weeks start on Sunday for This Week / Last Week.
- A delegate without finance.read sees a notice instead of Earning Metrics (Insights itself stays open to content delegates).
- Extra query params on /insights: `sub=segmentation`, `status=<filter>` (used by VIEW SUBSCRIBERS >).

## Open questions

- My Content Posts uses its own `contentPosts` stats in this slice; switch to `d.social.posts` once Social seeds posts with engagement numbers.
- Should fulfillment status "Disputed" be a contract status? It is an extra `disputed` flag here because `FulfillmentRequest.status` has no such value.
- Refund admin outcomes (Admin Declined/Accepted, Escalated) are an extra `adminOutcome` field for the same reason.
- The shell's content column is ~953px at 1512 (reference 939) and the title sits ~11px higher than captured; both are shell layout, not this area.
- A saved localStorage mock from before this build overrides the new seed; use `?resetMock=1`.
