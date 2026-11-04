# TopFan — Exact Demo Prompts (presenter guide)

Live site: https://topfan-one.vercel.app

- **Demo 1:** https://topfan-one.vercel.app/demo/setup-navigation
- **Demo 2:** https://topfan-one.vercel.app/demo/ai-content

Add `?resetMock=1` to either link to start from clean mock data. Every step below was typed word for word into the real app by an automated browser:

- Demo 1 is tested by `tests/e2e/script-demo1.mjs`.
- Demo 2 is tested by `tests/e2e/script-demo2.mjs`.

**Status key**
- ✅ Verified: passed locally, on the production build, and on the Vercel deployment named in `TOPFAN_DEPLOYMENT_TEST_RESULTS.md`.
- ⚠️ Works with a stated limitation.

**Ground rules to say out loud if asked**
- Everything is simulated. No real payments, OAuth, DNS checks, email sending, uploads or analytics happen.
- Create, save and publish change only the demo's mock data.
- "AI images" are sample artwork labelled as simulated. No image-generation service is connected.
- Chat replies come from the built-in demo engine. The hosted site has no model API key configured.

To type a prompt, open the assistant with the red **AI** button at the bottom right. Clicking the microphone also works.

---

## Demo 1 — Account setup and navigation

### Part A: Onboarding (domain → GoDaddy → DNS → verification → provisioning → Creator Quest)

| # | Starting page | Say / click exactly | Expected AI response | What to click next | Main-screen result | Status |
|---|---|---|---|---|---|---|
| O1 | `/demo/setup-navigation` opens Account setup, Step 1 · Domain | Click **LET'S GET STARTED** | "Do you already have a domain name?" | **No, help me find one** | Original domain page stays visible behind the panel | ✅ |
| O2 | Same | (Optional: show the existing-domain path) | The original page keeps its provider dropdown for creators who already own a domain | — | — | ✅ |
| O3 | Same | **No, help me find one** → **Suggest names** (your name is prefilled) | Name ideas labelled **SIMULATED**: one *Recommended*, one *Not confirmed*, one *Taken*. Each says **Price shown at checkout**; no prices are invented | **SELECT** on the recommended name | — | ✅ |
| O4 | Same | **SELECT** → **CONTINUE TO PURCHASE** | "Where to buy: GoDaddy". It also says it will never ask for your password or card details | — | GoDaddy domain search opens in a **new tab** (real GoDaddy page; nothing is bought by the demo) | ✅ |
| O5 | Same | **I'M BACK FROM GODADDY** → **Yes, I purchased it** → **CONFIRM** → **At GoDaddy** | "Next step: Save & Continue" | **SAVE & CONTINUE** | Domain fields are filled in on the original form | ✅ |
| O6 | Step 2 · DNS | (automatic) | "Want me to handle the DNS setup?" | **PREPARE IT FOR ME** | — | ✅ |
| O7 | Step 2 · DNS | **Continue** → **Approve** → **Done** in the dialog | A *Simulated* GoDaddy connect dialog with no password fields. Then "Review your DNS changes" (two records), then "DNS setup prepared". It never claims the records were added at GoDaddy | **Verify & Continue** on the page | DNS step complete | ✅ |
| O8 | Step 3 · Provisioning | (automatic) | Offers **PLAY CREATOR QUEST** / **DRAFT MY FIRST POST** while the site is set up | **Simulate: finish provisioning** → **Go to my site** | Provisioning screen with Creator Quest | ✅ |
| O9 | — | — | — | — | You land on the creator platform | ✅ |

### Part B: The ten navigation prompts

Start on the creator platform (`/ajwhite`) with the assistant open.

| # | Say / type exactly | Expected AI response | What to click | Main-screen result | Next step | Status |
|---|---|---|---|---|---|---|
| 1 | Help me set up my cover page using what TopFan already knows about me. | Starts the cover-page task and offers **PREPARE MY COVER PAGE** / **I'LL FILL IT MYSELF** | **PREPARE MY COVER PAGE** (optional) | Opens White Label Site › Cover page editor | 2 | ✅ |
| 2 | Help me customize my website branding and logo. | "Brand your White Label Site. Your logo, colors and domain." | **OPEN WHITE LABEL SITE** | White Label Site | 3 | ✅ |
| 3 | I want to change my website logo. | Branding task progress. "Next: Update your logo and colors, then click Update & Publish." | **CUSTOMIZE APPEARANCE** | White Label Site, with Customize Appearance highlighted | 4 | ✅ |
| 4 | I want to change my account settings. | "Which settings would you like to change?" with chips My profile / My website / Notifications / Privacy & password | **My profile** | Profile settings open | 5 | ✅ |
| 5 | Take me to my wallet. | "Do you mean your earnings and withdrawals, or your connected NFT wallet?" | **Earnings & withdrawals** | Wallet page opens | 6 | ✅ |
| 6 | I want to start earning money from my fans. What options do I have? | Earning categories: Memberships and exclusive content; Knowledge and personal experiences; Products and creative work; Events and brand opportunities; plus **Explore all earning options**. No invented numbers | Any category (optional) | — | 7 | ✅ |
| 7 | I want to earn through brand collaborations. What should I focus on? | Focus on **Advertisements** (brands pay to advertise; you approve them). A **Portfolio** helps brands see your work, and **Insights & Fans** shows your audience. "I can't see or promise any brand offers." It starts the *Earn from brand ads* task | The task's **Open Advertisements** button | Monetize › Advertisements |  8 | ✅ |
| 8 | Create a group called Inner Circle. | "I've opened Add Group with Inner Circle filled in… The group is created only when you save." | — (don't save yet) | The original **Add Group** form with *Inner Circle* in the title | 9 | ✅ |
| 9 | Where can I see my fans and identify my most engaged supporters? | Points to **Insights & Fans › Fan Relationship Management** (top supporters, most engaged, top recruiters) | **OPEN FAN RELATIONSHIP MANAGEMENT** | Insights › Fan Relationship Management tab | 10 | ✅ |
| 10 | Let's continue setting up my Inner Circle group. | "Create the Inner Circle group: 1 of 3 steps done. Next: Fill in the group and click Save." | **Open Add Group**, then **Save** on the page | Back on Add Group with *Inner Circle* still filled in. After Save, the group appears in Groups (created only once) | Done | ✅ |

---

## Demo 2 — AI-assisted content

Start at `/demo/ai-content`, open the assistant, and type each prompt in order.

| # | Say / type exactly | Expected AI response | What to click | Main-screen result | Status |
|---|---|---|---|---|---|
| 1 | Help me create a post about my snowboarding journey. | "Here's a draft from your training notes…" An Images post draft with a [bracketed] part for you to write, plus image choices labelled *Simulated AI image (sample photo)* | — | Stays on your page; the draft is in the chat card | ✅ |
| 2 | Generate an image for this post. | "Choose an image for your post." with **Cinematic** / **Minimal** | **Cinematic** | "Attached to your post." | ⚠️ Sample artwork, not a live image generator |
| 3 | Make the image more cinematic. | "Here's the new version." | — | Image attached to the draft | ⚠️ Same |
| 4 | Make the caption shorter. | "Shorter now." The bracketed part stays whole for you to fill in | — | — | ✅ |
| 5 | I want to monetize this post. What do you recommend? | Suggests a **$5 one-time unlock** (an example price, explained as one) and mentions 500 loyalty points and Gold/Silver/Bronze access. "NFT access needs a contract address from you; I won't suggest one." | — | — | ✅ |
| 6 | Let fans unlock it for $5, or use loyalty points if supported. | "Fans can unlock it by paying $5 or with 500 loyalty points. I've put it in the Lock dialog for you to review and save. Nothing is published." | **REVIEW IT IN THE LOCK DIALOG** (optional) | New Post › Lock prefilled | ✅ |
| 7 | Create a public teaser for this exclusive post. | "Here's a separate public teaser. It mentions the topic only…" Audience: Public | **OPEN TEASER IN NEW POST** (optional) | — | ✅ |
| 8 | Help me create a newsletter for my fans. Show me a few topic ideas. | "Newsletter topics from your notes, recent posts and offerings." Four topics, each with **Use this topic** | — | — | ✅ |
| 9 | Use the second topic and prepare the full newsletter with a cover image. | "Your full newsletter draft is ready, with a cover image. Email sending needs verification, so you can save it as a draft for now." Topic: *3 Tricks I'm Working On* | **OPEN IN NEW NEWSLETTER** (optional) | Add Newsletter prefilled | ⚠️ Cover is sample artwork |
| 10 | Help me plan an experience for my fans. Show me some ideas. | "Experience ideas from your riding…" Four ideas, each with **Explore idea** | — | — | ✅ |
| 11 | Use the first experience idea and prepare the full description and cover image. | "Here's the full proposal with a preview image. What price would you like? (You decide; I won't set one.)" *1:1 Riding Technique Coaching Call* | — | — | ✅ |
| 12 | Help me promote my training experience through Link in Bio. | "I found your training session. I'd recommend featuring its booking link first…" | **UPDATE MY LINK IN BIO** (optional) | Preferences › Link in Bio | ✅ (features your already-live session, because the new draft has no booking link until it's published) |
| 13 | Plan my entire week with posts, a newsletter, and a fan experience. | "Here's a plan for your week. Nothing is created until you approve it." Mon post · Wed members-only post · Fri newsletter · Sat experience | — | — | ✅ |
| 14 | Show me the weekly plan before preparing the drafts. | "Here's your plan. Nothing is created until you approve it." | — | — | ✅ |
| 15 | Move the newsletter to Thursday and make one post exclusive. | "Moved Friday's newsletter to Thursday. Wednesday's post is already exclusive for members…" | — | — | ✅ |
| 16 | Approve this plan and prepare all the drafts. | "Your week is ready for review. I've prepared your posts, newsletter, and experience. A few details need your approval." Each row has its own button | — | Nothing is published | ✅ |
| 17 | Open Monday's post. | "Opening Monday's post. It's already filled in…" | — | **New Post** opens, filled in, with the *Your week* strip above it | ✅ |
| 18 | Make the caption shorter and update it in the post editor. | "Shorter now. Only the training update changed." | — | The caption in the open New Post editor updates immediately | ✅ |
| 19 | Open my newsletter draft. | "Opening Thursday's newsletter…" | — | **Add Newsletter** opens, filled in | ✅ |
| 20 | What still needs my approval before I publish everything? | "3 need you: Wednesday's members-only post (ready for access review), Thursday's newsletter (email needs verifying), Saturday's experience (needs price and availability). 1 is ready to publish when you are." | Any row button | — | ✅ |
| 21 | Save the remaining drafts and let me continue later. | "Saved. Your drafts stay as drafts in TopFan; nothing is published or sent." | — | — | ✅ |
| 22 | Continue my weekly plan. | The same week, with its current statuses | — | — | ✅ |

### Variations (all verified ✅)

| Say | What happens |
|---|---|
| Give me more ideas. | A new round of ideas for the list on screen |
| Use the fourth option. / Use the last idea. | Opens that idea's full proposal |
| Make it shorter. | Shortens the draft you're working on |
| Change the image. | Shows image choices for the current draft |
| Use this for my newsletter. | Prepares a newsletter draft |
| Go back to the previous draft. | Reopens the draft you worked on before this one |
| What was I working on? / Show me my unfinished tasks. | Lists unfinished drafts and the weekly plan; each one opens where you left off |

## If something goes off-script
- Say "Show my weekly plan" to get back to the plan card.
- Reload the page with `?resetMock=1` to start over with clean mock data.
