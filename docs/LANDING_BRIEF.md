# Landing page: creative brief and asset plan

Written 27 Sep 2026 for the rebuild of `src/routes/public/landing/**`. The product name on the page
always comes from `BRAND.name` in `src/config/brand.ts`; "Slate" below stands for whatever that
constant says. Everything shown is fictional: the people, house numbers, registration numbers and
ratings. The neighbourhoods are real Aberdeen ones.

## 1. Concept

**"On the record."** A repair is a small story with three people in it, and today each of them
keeps their own version of it. The page tells that story once, in the order it happens (a drip,
three people, a fair ending), and shows the real product at every step. It looks and reads like a
well-set magazine about a Scottish street: Fraunces set large on oat-linen paper, one italic phrase
where it matters, generous white space, hairline rules like a ledger, and the three role colours
used only as small accents (a chip, an underline, a 4px bar). There is one dark spruce band, for
the part that makes Slate different: the rules that keep ratings fair. Motion is slow and
purposeful. The hero breathes, words firm up as you read, the record fills in as you scroll, and
two sealed ratings open together when you ask them to. No glass, no gradients for their own sake,
no stock handshakes, no icon grids. The tone is warm, dry and specific: dates, streets, the
48-hour rule, "Paid on time on 9 of 9 jobs".

**The single argument.** A repair gets lost between the tenant, the landlord and the trade. Slate
puts all three on one record, and because ratings open only after real work and stay hidden until
both sides are in, the ratings on that record can be trusted.

**Conversion path.**

* Primary: **Try the demo** goes to `/demo`, Sarah's, Graham's and Kev's phones side by side, live
  on the same data. It appears in the hero, after the walkthrough and at the close.
* Secondary: **Sign up free** goes to `/signup` (and `/signup/:role` from the price cards).
* Persona shortcuts: "Try as Sarah / Graham / Kev" sign a tab straight into each portal (the
  existing `?as=` links), with **More people to try** going to `/start`, the persona picker. The
  shortcuts appear in the hero, on each door card and at the close.
* Depth for the undecided: `/how-it-works/:role` from each door and from the walkthrough, and the
  review and reporting policies from the fair-ratings band.

## 2. Sections, copy and components

Copy is final. `’` is the typographic apostrophe the product already uses in its UI strings.

### 2.1 Hero

* Eyebrow: "Launching in Aberdeen · Free during launch"
* H1: `BRAND.tagline`, "Every home, *on the record.*" (the words after the comma set in Fraunces
  italic, on their own line).
* Subhead: "Tenants, landlords and trades share one record of every repair. When the work is done,
  they rate each other in plain words, and each rating stays hidden until both sides are in."
* CTAs: **Try the demo** (`/demo`), **Sign up free** (`/signup`).
* Under the CTAs: "Opens Sarah’s, Graham’s and Kev’s phones side by side. No sign-up, and everyone
  in it is made up."
* Shortcuts: "Or go straight in as" Sarah · Tenant, Graham · Landlord, Kev · Trade, then "More
  people to try" (`/start`).
* **The film.** A wide frame (4:3 on phones, 16:9 on tablets, 19:10 on desktop) that plays the
  15-second hero video, or its fallback, in three chapters. A solid caption plate across the top
  of the frame, in view with the headline, carries the chapter titles as real HTML, with a
  progress line under each and a Pause button (phones and tablets name only the chapter playing):
  1. "A drip in Rosemount" (0 to 5 s)
  2. "Three people, one record" (5 to 10 s)
  3. "Rated fairly, revealed together" (10 to 15 s)

  Chapter titles are buttons that jump to that chapter. Beside the frame (inside it on desktop,
  overlapping its foot on phones) a stack of real product cards changes with the chapter:
  1. Sarah’s report: `RoleChip`, the job title and address, room, urgency and access, her two
     photos as attachment tiles, and a `JobTimeline` (compact) waiting on Graham. A small note:
     "Graham sees it at once".
  2. One record: three `Avatar` rows with `RoleChip`s. Sarah reported it, Graham approved it and
     chose Kev, Kev booked Saturday at 1:30pm. Note: "Written notice sent 4 days ahead".
  3. Revealed together: Sarah on Kev ("Turned up when agreed: Outstanding", "Is the problem
     fixed? Yes") and Kev on the visit ("Access given as arranged: Yes", "Gave clear information
     about the problem: Better than expected"), with labels and answers from the real criteria
     and scales (phones show the first answer on each side). Note: "Neither saw the other’s
     first".

  All three cards share one height, so nothing below moves and the card never jumps in size.

### 2.2 The idea

* Label (H2): "The idea"
* Statement, set large, each word firming from pale to full ink as it scrolls past (full ink at
  once with reduced motion): "Every repair passes through three people: the tenant who reports it,
  the landlord who pays for it and the trade who fixes it. Usually it gets lost somewhere in
  between. On Slate, all three work from one record, from the first photo of the drip to the day
  it’s fixed. Then they rate each other, by the same rules."
* "the tenant", "the landlord" and "the trade" carry a thick underline in clay, moss and ochre.

### 2.3 How it works

* Label: "How it works" · H2: "One repair, from drip to done."
* Intro: "Follow Sarah’s leaking radiator valve. Every step lands on the same record, so nobody has
  to chase anyone."
* Desktop: a sticky record card on the left ("The record", "Radiator valve leaking in the hall",
  "Flat 3, 41 Rosemount Place · AB25", the three people, and a full `JobTimeline`) fills in as the
  five steps on the right scroll past the middle of the screen. Phones: the steps stack, each with
  its picture.
  1. Tenant. "Sarah reports it in about a minute." "One question per screen: which room, what’s
     wrong, a photo or two and when someone can get in. Graham sees it at once." Picture: the
     report phone (`ProgressSteps`, `RadioGroup` cards, `Button`).
  2. Landlord. "Graham approves it and chooses who fixes it." "It’s at the top of his home screen.
     He picks Kev, a plumber he has used before, or posts the job for quotes. Slate never chooses
     for him." Picture: "Who should fix it?" as a `RadioGroup` of three routes, Kev chosen.
  3. Landlord to tenant. "Written notice, 48 hours ahead." "Kev books a time and Sarah gets written
     notice in the thread, at least 48 hours before anyone comes round. Scottish law asks for it,
     so Slate won’t book sooner." Picture: the notice `MessageBubble`.
  4. Trade. "Kev fixes it, and Sarah confirms." "He marks the job done. Sarah confirms the leak has
     stopped. If it hasn’t, she says so and the job stays open." Picture: `PlainWordsScale`
     ("Is the problem fixed?", Yes chosen).
  5. Everyone. "Everyone rates. Nobody peeks." "Sarah rates Kev, Kev rates the visit and Graham
     rates the work. Each rating stays sealed until the other side’s is in." Picture: two
     `SealedReviewCard`s. Link: "How ratings stay fair" (`#fair-ratings`). The story ends with
     "Rated" as the current stage, "Sealed until both sides are in", because that is the point
     the next section picks up.
* After the steps: **Try the demo**, and "The full walkthrough for tenants · landlords · trades"
  (`/how-it-works/:role`).

### 2.4 Fair ratings (dark spruce band, `#fair-ratings`)

* Label: "Fair ratings" · H2: "Nobody rates in revenge."
* Intro: "Ratings open only after real work, and both sides’ ratings stay hidden until both are in.
  Then they appear together, so nobody can answer back with a low score."
* **Try it** (interactive, on a light panel): "Kev fixed Sarah’s radiator. Now they rate each
  other." Left, the visitor rates Kev as Sarah with the real `PlainWordsScale` ("Turned up when
  agreed"). Right, Kev’s rating of the visit is sealed: "Kev has rated. You’ll see what he said
  once yours is in." Button: "Send and reveal both" (error if nothing chosen: "Choose an answer
  first."). Both cards open at the same moment; Sarah’s answer shows large with "Kev saw yours
  at the same moment you saw his. Neither of you can change it now."; a live region says "Both
  ratings revealed together." and focus moves to "Start again". Small print: "In the app each side has 14 days. If one side never
  rates, the other’s rating is revealed when the time runs out. Nobody can change a rating after
  the reveal."
* Four rules, numbered in Fraunces:
  1. "Only after real work." "A rating opens only after a finished job, or a tenancy both sides
     confirmed. Reviewers show as “Verified tenant · AB25 · 2025”, never by name."
  2. "Hidden until both are in." "Neither side sees the other’s rating until both have rated or
     the window closes. Then they appear together, and nobody can change theirs."
  3. "Sealed while you live there." "What a tenant says about their current landlord stays sealed
     until the tenancy ends, or until 5 different tenants have rated them."
  4. "Plain words, never stars." "Every question is answered in words, from “Well below” to
     “Outstanding”, or “Never” to “Always”, so a score always means something."
  * Footnote: "No score until 3 different people have reviewed. Recent reviews count most, and
    reviews are deleted after 36 months."
* Two panels:
  * "The tenant passport." "What landlords say about a tenant is never public and never becomes a
    single score. The tenant sees every answer and shares all of it or none of it when applying
    for their next home." Component: `PassportCard` with its share footer.
  * "Trades finally rate their customers." "After each job, the trade rates the landlord on the
    brief, the access and whether they paid on time. Other trades see it before they quote. It
    appears once the landlord’s rating of that trade is locked in, so nobody can swap favours."
    Component: `ScoreSummary` (compact) for Graham, "Paid on time on 9 of 9 jobs", `RatingActions`
    (review policy link and Report).
* Links: "Read the review policy" (`/policies/reviews`), "How reporting works"
  (`/policies/reporting`).

### 2.5 Three doors

* Label: "Who it’s for" · H2: "Three doors, one record."
* Intro: "Each of you gets your own home screen, in your own words. Pick yours."
* Three cards, each with a 4:5 photograph (image plan 2 to 4), the door ("I rent", "I let", "I’m a
  trade"), its line and three points from `content/roles.ts`, the price ("Free, always" for
  tenants, "Free during launch" for the others), **Try as Sarah / Graham / Kev** and "How it works
  for tenants / landlords / trades" (`/how-it-works/:role`).

### 2.6 Scotland first

* Label: "Scotland first" · H2: "Built for how letting works in Scotland."
* Intro: "Scottish rules and Scottish words from day one, starting in Aberdeen. England and Wales
  follow, with their own."
* A wide 21:9 photograph of an Aberdeen granite street (image plan 1) with the caption "Aberdeen,
  where we’re starting."
* Six rules as a ruled ledger: "48 hours’ notice", "Landlord registration", "The Repairing
  Standard", "Approved deposit schemes", "Certificates on time", "Private residential tenancies"
  (body copy in the build).
* Components: `ComplianceTable` for Flat 4, 118 King Street and a `VerifiedBadge` ("Registration
  verified").

### 2.7 Pricing (`#pricing`)

* "No card needed" · H2: "Free during launch."
* Intro: "Everyone uses Slate free while we launch in Aberdeen. Tenants never pay. Here’s what we
  plan to charge afterwards."
* One ruled panel with three columns from `content/pricing.ts` (£0 now, the later price, three
  features, **Sign up as a tenant / landlord / trade**), and the existing small print.

### 2.8 Questions (`#faq`)

* H2: "Questions people ask" with the existing answers from `content/faq.ts`.

### 2.9 Close

* H2: "See one repair from all three sides."
* Body: "Open Sarah’s, Graham’s and Kev’s phones side by side. Report a leak as Sarah and watch it
  reach Graham and Kev as it happens."
* CTAs: **Try the demo**, **Sign up free**, the three shortcuts and "More people to try".
* Picture: three front doors on one tenement landing (image plan 5).

## 3. Hero video (Seedance 2.5, text-to-video, 16:9, 15 s, one generation)

**Structure.** Three beats of five seconds that match the HTML chapters exactly: the problem (a
drip nobody has dealt with), the three parties (each doing their part), and the fair ending (three
doors opening at the same moment, the picture for "revealed together").

**Why no rating card on screen.** A hand marking a card would need legible words, and generated
text and interfaces look wrong. The real rating card appears in HTML beside the film during beat
3, so the film only has to carry the feeling.

**Composition rules.** Keep faces, hands and the key action between 15% and 65% of the frame
width and below the top 15%. On desktop the chapter plate sits over the top-left strip and product
cards over the right third; on phones the frame crops to the centre 4:3, with the plate over the
top and the cards below the frame.

| Time | Shot | What we see | Camera and light |
| --- | --- | --- | --- |
| 0.0 to 2.5 s | 1 (poster) | A terrace of four-storey silver-grey granite tenements in Aberdeen at golden hour. Mica in the stone glints, slate roofs and chimney pots stand against a pale apricot sky, a gull crosses. | 35 mm, eye level from the opposite pavement, slow push-in. Warm low sun from the left, long soft shadows. |
| 2.5 to 5.0 s | 2 | Inside a tenement hallway, a single drop swells on a brass radiator valve and falls into a small white bowl. A young woman’s hand enters holding a phone, screen facing away, and takes a photo. | 100 mm macro, very shallow focus, soft window light, dust in the air. |
| 5.0 to 6.8 s | 3 | A man in his late fifties in a moss-green jumper at a pine kitchen table glances at his phone (screen unseen), nods once and sets it down. | 50 mm, medium shot, warm afternoon side light, slight handheld drift. |
| 6.8 to 8.4 s | 4 | On a granite-setted street, the side door of a plain white van slides open on neatly racked tools. A plumber in navy workwear lifts a canvas tool bag. | 35 mm low angle, crisp morning light on granite. |
| 8.4 to 10.0 s | 5 | Back in the hallway, the plumber’s hands tighten the valve with a spanner. The drip stops. The tenant watches from the doorway with a mug, out of focus. | 85 mm close-up, the valve catches the light as it goes dry. |
| 10.0 to 12.6 s | 6 | The shared stair landing of the tenement. Three front doors side by side, painted terracotta, moss green and ochre, open at the same moment. Warm light spills onto worn stone. The tenant, the landlord and the plumber step into the light and share a small nod. | 28 mm, eye level, near-symmetrical, slow dolly back. |
| 12.6 to 15.0 s | 7 | The same granite terrace at blue hour, windows lighting up one by one. Calm. | 35 mm, slow pull-back, hold on the last frame. |

The film ends on the terrace it opened on, so the loop reads as the next day starting rather than
a jump.

**Final prompt (paste as one block):**

> A 15-second cinematic short film, 16:9, 24 fps, one continuous generation with seven shots and
> clean cuts, shot on ARRI Alexa 35 with soft vintage spherical primes, natural film grain, warm
> golden-hour grade: oat-linen highlights, silver-grey granite midtones, deep spruce-green
> shadows, small accents of terracotta clay, moss green and ochre. Aberdeen, Scotland. Quiet,
> warm, human, unhurried. Everyone is an ordinary adult, dressed for autumn, never looking at the
> camera. [0.0-2.5s] Wide establishing shot, slow push-in: a terrace of four-storey silver-grey
> granite tenements at golden hour, mica in the stone glinting, dark slate roofs, dormers and
> chimney pots against a pale apricot sky, a gull gliding across, long soft shadows on granite
> setts. [2.5-5.0s] Macro close-up in a tenement hallway: a single drop of water swells on a brass
> radiator valve and falls into a small white bowl; a young woman's hand enters holding a phone,
> screen facing away from the camera, and takes a photo; very shallow depth of field, soft window
> light, dust in the air. [5.0-6.8s] Medium shot: a man in his late fifties in a moss-green
> jumper at a pine kitchen table by a window glances at his phone, screen unseen, nods once and
> sets it down; warm afternoon side light. [6.8-8.4s] Low angle on a granite-setted street: the
> side door of a plain white van slides open, revealing neatly racked tools; a plumber in navy
> workwear lifts a canvas tool bag; crisp morning light. [8.4-10.0s] Close-up in the hallway: the
> plumber's hands tighten the radiator valve with a spanner, the drip stops, the valve gleams dry;
> the young woman watches from the doorway holding a mug, out of focus. [10.0-12.6s] The shared
> stone stair landing of the tenement: three front doors side by side, painted terracotta, moss
> green and ochre, swing open at the same moment, warm lamplight spilling onto worn stone steps;
> the young woman, the older man and the plumber step into the light and share a small, relaxed nod;
> slow dolly back. [12.6-15.0s] Wide exterior of the same granite terrace at blue hour, windows
> lighting up one by one, slow pull-back, calm hold on the final frame. Keep the key action left
> of centre and below the top sixth of the frame. No text of any kind.

**Negative (avoid):** text, captions, subtitles, logos, lettering on the van, house numbers,
street signs, legible paper, phone or laptop screens, app interfaces, star ratings, thumbs-up
symbols, handshakes, people looking into the lens, posed smiles, cheering, whip pans, drone
swoops, sun flares straight into the lens, rain, grey overcast gloom, purple or teal-and-orange
grading, neon, glossy CGI, extra or merged fingers, warped hands, melting faces, flicker,
morphing buildings, red-brick English terraces, American suburbs.

**Sound.** None. The page plays the film muted with no unmute control. If the model adds an audio
track, strip it (`-an` below) so the file is smaller and never surprises anyone.

**Delivery.**

* `public/media/hero.mp4`: H.264, yuv420p, 1920×1080, no audio, fast start, 3 to 5 MB.
  `ffmpeg -i seedance.mp4 -an -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -vf scale=1920:-2 -movflags +faststart public/media/hero.mp4`
* `public/media/hero-poster.webp`: the frame at **0.5 s** (shot 1, the golden-hour terrace), the
  same frame the film starts on, so nothing jumps when it begins.
  `ffmpeg -ss 0.5 -i public/media/hero.mp4 -frames:v 1 -vf scale=1920:-2 -c:v libwebp -quality 78 public/media/hero-poster.webp`
  (aim for under 200 KB).

## 4. Images (five)

None of these shows app UI or a readable screen. Export each as WebP, quality about 78.

| # | File | Where | Ratio and size | Model |
| --- | --- | --- | --- | --- |
| 1 | `public/images/landing/aberdeen-street.webp` | Scotland section, full width | 21:9, 2400×1029, under 350 KB | gpt_image_2_5 |
| 2 | `public/images/landing/door-tenant.webp` | "I rent" card | 4:5, 1200×1500, under 200 KB | soul_2 |
| 3 | `public/images/landing/door-landlord.webp` | "I let" card | 4:5, 1200×1500, under 200 KB | soul_2 |
| 4 | `public/images/landing/door-trade.webp` | "I’m a trade" card | 4:5, 1200×1500, under 200 KB | soul_2 |
| 5 | `public/images/landing/three-doors.webp` | Closing section | 4:3, 1600×1200, under 250 KB | gpt_image_2_5 |

If a model can’t produce the exact ratio, generate at the nearest wider size and crop: for 1, keep
the full roofline and the pavement; for 2 to 4, keep the face in the upper third.

**1. Aberdeen street** (purpose: place, and proof that this is built here).

> Editorial architecture photograph of a quiet residential street of four-storey silver-grey
> granite tenements in Aberdeen, Scotland, at golden hour in early autumn. Dressed granite ashlar
> fronts with fine mica sparkle catching low warm sun from the left, dark grey slate roofs with
> dormer windows, tall chimney stacks with clay pots, white timber sash windows, two or three
> windows lit warm from inside, black cast-iron railings, a pavement and road of granite setts, a
> single rowan tree with orange berries, long soft shadows. No people and no cars. Shot on a 35 mm
> lens at eye level from the opposite pavement, gentle one-point perspective, faint haze, natural
> colour with warm highlights and cool spruce-green shadows, fine film grain, calm and
> unpretentious. No text, no signage, no shop fronts, no house numbers, no road markings, no logos.

**2. Tenant** (purpose: the person who reports the repair; warm, at home, unposed).

> Candid editorial portrait of a woman in her late twenties standing at the tall sash window of
> her rented tenement flat in Aberdeen on a soft autumn morning, holding a mug of tea in both
> hands, looking out of the window with a relaxed half-smile, not at the camera. Rust-coloured
> knitted jumper, dark hair loosely tied back. Warm natural window light on her face; the room
> behind in soft focus: pale plaster walls, a painted cast-iron radiator under the window, a
> trailing houseplant. Shot on 50 mm at f/2, eye level, natural colour, gentle film grain, quiet
> and warm. No phone or screen visible, no text, no logos.

**3. Landlord** (purpose: a small landlord, not a corporation; one person at a kitchen table).

> Candid editorial portrait of a man in his late fifties sitting at a scrubbed pine kitchen table
> in a Scottish granite house, reading glasses pushed up on his head, a folder of papers and a
> cup of coffee beside him, holding a phone low in one hand with the screen facing away from the
> camera, a thoughtful, settled expression, looking down and slightly to the side. Moss-green wool
> jumper over a checked shirt. Late-afternoon light from a side window, warm wood, a dresser with
> plates in soft focus behind. Shot on 50 mm at f/2.2, eye level, natural colour, gentle film
> grain. No visible screen, no readable paper, no text, no logos.

**4. Trade** (purpose: a working plumber, capable and good-humoured, on an Aberdeen street).

> Candid editorial portrait of a plumber in his forties standing beside the open sliding side door
> of his plain white van on a granite-setted street in Aberdeen, lifting a canvas tool bag,
> looking off to one side with a relaxed, friendly expression. Navy work jacket and trousers, a
> faded ochre-yellow beanie. Inside the van, neatly racked copper pipe and tool cases in soft
> focus. Early morning low sun, a silver-grey granite tenement behind, crisp air. Shot on 35 mm at
> f/2.8, natural colour, gentle film grain. Plain van with no lettering, no logos, no text, no
> signage, no number plate visible.

**5. Three doors** (purpose: the closing image; three parties, one shared landing).

> Interior of the shared stone stair landing of an old Aberdeen granite tenement, three front
> doors side by side on one landing, painted in heritage colours: terracotta red, deep moss green
> and ochre yellow, each slightly ajar with warm lamplight spilling onto worn stone steps and a
> polished timber banister. Evening, a tall stair window at the side showing a dusky blue sky.
> Calm, welcoming and quiet. Shot on a 28 mm lens at eye level, near-symmetrical composition,
> natural colour, soft film grain. No people, no nameplates, no door numbers, no text, no signage.

## 5. Asset slots and fallbacks

| Slot | Path | Fallback until the file exists |
| --- | --- | --- |
| Hero film | `public/media/hero.mp4` | An illustrated Aberdeen terrace in Hearth tones (golden hour in light mode, dusk in dark mode) with a slow sun glow and a drifting far row. The chapters, captions and product cards run exactly as they would over the film. |
| Hero poster | `public/media/hero-poster.webp` | The same illustration. |
| Images 1 to 5 | `public/images/landing/*.webp` | 1: the illustrated terrace, wide. 2 to 4: a close crop of the drawn tenements on the role’s tint (a lit window, the front door, the chimneys) with a paper grain. 5: a drawn landing with three doors in clay, moss and ochre. |

How the page decides:

* **Film.** On load, a `HEAD` request asks for `hero.mp4` (and falls back to a one-byte ranged
  `GET` if the host refuses `HEAD`). Only a `video/*` answer counts, because the dev server answers
  missing files with the app’s HTML. Only then is a `<video muted autoplay loop playsinline>` put
  on the page, with the poster; it fades in once it is actually playing, and any error removes it
  and leaves the fallback. No broken player can show.
* **Poster.** Preloaded at high priority and drawn over the illustration once it has loaded. If it
  is missing, the illustration stays.
* **Autoplay.** Off with reduced motion or Save-Data: the poster (or illustration) shows with a
  Play button. The film and the chapter cycle pause off screen, in a background tab and with the
  Pause button (WCAG 2.2.2).
* **Images.** Each photo sits over its drawn fallback, loads lazily (except the poster), fades in
  when decoded, and is removed if it fails, so the drawing is all anyone sees. Frames keep their
  aspect ratio, so nothing shifts when a photo arrives.

Dropping a file into place is the whole job: no code change, no rebuild of anything else.
