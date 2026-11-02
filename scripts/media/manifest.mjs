/**
 * Demo media manifest: every photo the demo uses, with the Wikimedia Commons search that sources it,
 * the output size (aspect ratio of the slot it fills) and alt text. `pick` chooses among the license-
 * filtered results after visual review. Output: public/assets/<key>.webp (+ credits in media.json).
 *
 * People: photos of real, identifiable people are never used as a fictional creator's or fan's face.
 * Creator avatars are action shots where the rider isn't identifiable; fans get original illustrations.
 */
const W = (w, h) => ({ w, h });
const L = W(1600, 900); // 16:9
const SQ = W(800, 800);
const CARD = W(800, 640); // product / media cards (cover-cropped to their slot)
const POR = W(720, 960); // 3:4 portrait

export const PHOTOS = [
  /* AJ White · athlete (snowboarder) */
  { key: "creators/ajwhite/cover", q: "snowboarder powder mountain ridge", ...W(1800, 600), alt: "Snowboarder riding a mountain ridge" },
  { key: "creators/ajwhite/hero-1", q: "snowboard big air jump", ...W(1800, 800), alt: "Snowboarder in the air above a jump" },
  { key: "creators/ajwhite/hero-2", q: "snowboard halfpipe", ...W(1800, 800), alt: "Halfpipe run" },
  { key: "creators/ajwhite/hero-3", q: "snowboarders mountain panorama", ...W(1800, 800), alt: "Riders on a mountain" },
  { key: "posts/opening-ceremony", q: "winter games ceremony fireworks stadium", ...CARD, alt: "Opening ceremony fireworks" },
  { key: "posts/on-the-hill", q: "snowboarder on slope sunny", ...CARD, alt: "Snowboarder on the hill" },
  { key: "posts/halfpipe-run", q: "snowboard halfpipe competition", ...CARD, alt: "Halfpipe run" },
  { key: "posts/glacier-park", q: "glacier ski area snow", ...CARD, alt: "Glacier ski area" },
  { key: "posts/fundraiser", q: "snowboarder airport travel bag", ...CARD, alt: "Snowboard bags ready for travel" },
  { key: "posts/riding-switch", q: "snowboarder carving turn", ...CARD, alt: "Snowboarder carving a turn" },
  { key: "posts/big-air", q: "snowboard jump terrain park", ...CARD, alt: "Big air in the terrain park" },
  { key: "posts/beanie", q: "knitted beanie hat", ...SQ, alt: "Knit beanie" },
  { key: "posts/offseason-training", q: "athlete training gym squat", ...L, alt: "Off-season strength training" },
  { key: "posts/podcast", q: "podcast microphone studio", ...SQ, alt: "Podcast microphone" },
  { key: "posts/goggles", q: "ski goggles", ...CARD, alt: "Snow goggles" },
  { key: "posts/two-boards", q: "snowboards rack", ...CARD, alt: "Snowboards side by side" },
  { key: "posts/contest-1", q: "snowboard slopestyle competition", ...SQ, alt: "Slopestyle contest" },
  { key: "posts/contest-2", q: "snowboard competition rail", ...SQ, alt: "Rail feature at a contest" },
  { key: "posts/contest-3", q: "snowboard competition spectators finish", ...SQ, alt: "Contest finish area" },
  { key: "posts/contest-4", q: "snowboard competition podium snow", ...SQ, alt: "Contest venue" },
  { key: "posts/northpeak-shoot", q: "snowboarder photo shoot mountain", ...CARD, alt: "Photo shoot on the mountain" },
  /* Home (white-label site) sections */
  { key: "creators/ajwhite/about-curiosity", q: "child learning snowboard", ...CARD, alt: "First days on a snowboard" },
  { key: "creators/ajwhite/about-content", q: "camera filming snow mountain", ...CARD, alt: "Filming on the mountain" },
  { key: "creators/ajwhite/about-community", q: "group snowboarders chairlift", ...CARD, alt: "Riding with friends" },
  { key: "creators/ajwhite/about-style", q: "snowboarder style backcountry", ...CARD, alt: "Backcountry riding" },
  { key: "creators/ajwhite/slope-tall", q: "snowboarders snowy slope trees", ...W(700, 1000), alt: "Riders on a snowy slope" },
  { key: "creators/ajwhite/mountain-wide", q: "ski resort mountain panorama", ...W(1800, 700), alt: "Riders on the mountain" },
  /* Products: merchandise */
  { key: "merchandise/airbag-pack", q: "avalanche airbag backpack", ...CARD, alt: "Avalanche airbag pack" },
  /* Products: experiences, course */
  { key: "experiences/video-call", q: "video call laptop", ...CARD, alt: "Live video call" },
  { key: "experiences/personal-video", q: "smartphone recording video", ...CARD, alt: "Recording a personalized video" },
  { key: "experiences/social", q: "smartphone social media", ...CARD, alt: "Social media on a phone" },
  { key: "experiences/park-session", q: "terrain park snowboard rail", ...CARD, alt: "Terrain park session" },
  { key: "courses/learn-to-snowboard", q: "snowboard lesson instructor beginners", ...CARD, alt: "Snowboard lesson" },
  /* Events, videos, VIP, newsletters */
  { key: "events/banner", q: "snowboard event crowd night", ...W(1800, 600), alt: "Snowboard event" },
  { key: "events/poster", q: "big air competition night lights", ...CARD, alt: "Big air under the lights" },
  { key: "videos/banner", q: "snowboard filming camera", ...W(1800, 600), alt: "Filming a snowboard run" },
  { key: "posts/nl-culture", q: "snowboarding history", ...L, alt: "Snowboarding culture" },
  { key: "posts/nl-new-ride", q: "new snowboard close", ...L, alt: "New snowboard" },
  { key: "posts/nl-japan", q: "japan powder ski", ...L, alt: "Deep powder in Japan" },
  { key: "posts/nl-austria", q: "austria alps ski resort", ...L, alt: "Austrian Alps" },
  { key: "posts/nl-training", q: "athlete training snow", ...L, alt: "Training progress" },
  { key: "posts/nl-snow-report", q: "fresh powder ski resort", ...L, alt: "Fresh snow report" },
  { key: "posts/nl-welcome", q: "mountain sunrise snow", ...L, alt: "Mountain sunrise" },
  /* Other demo creator profiles */
  { key: "creators/raecalder/avatar", q: "guitarist stage silhouette", ...SQ, alt: "Rae Calder on stage" },
  { key: "creators/raecalder/cover", q: "concert stage lights crowd", ...W(1800, 600), alt: "Concert stage" },
  { key: "creators/raecalder/studio", q: "recording studio mixing console", ...CARD, alt: "Recording studio" },
  { key: "creators/ninaoduya/avatar", q: "books desk study", ...SQ, alt: "Study desk" },
  { key: "creators/ninaoduya/cover", q: "library reading room", ...W(1800, 600), alt: "Library" },
  { key: "creators/ninaoduya/lesson", q: "notebook studying", ...CARD, alt: "Study notes" },
  { key: "creators/marcoreyesfit/avatar", q: "kettlebell workout", ...SQ, alt: "Kettlebell workout" },
  { key: "creators/marcoreyesfit/cover", q: "gym weights", ...W(1800, 600), alt: "Gym" },
  { key: "creators/marcoreyesfit/workout", q: "stretching exercise mat", ...CARD, alt: "Mobility routine" },
  { key: "creators/julesbrennan/avatar", q: "microphone podcast", ...SQ, alt: "Podcast microphone" },
  { key: "creators/julesbrennan/cover", q: "radio studio", ...W(1800, 600), alt: "Recording studio" },
  { key: "creators/kaimorrow/avatar", q: "gaming controller", ...SQ, alt: "Game controller" },
  { key: "creators/kaimorrow/cover", q: "computer gaming setup", ...W(1800, 600), alt: "Streaming setup" },
  { key: "creators/kaimorrow/clip", q: "esports tournament screen", ...CARD, alt: "Gaming event" },
  { key: "creators/lenawhitfield/avatar", q: "paint palette brushes", ...SQ, alt: "Paint palette" },
  { key: "creators/lenawhitfield/cover", q: "artist studio painting", ...W(1800, 600), alt: "Art studio" },
  { key: "creators/northridge/avatar", q: "band stage drums", ...SQ, alt: "North Ridge Collective on stage" },
  { key: "creators/northridge/cover", q: "music festival stage", ...W(1800, 600), alt: "Festival stage" },
  { key: "creators/northridge/rehearsal", q: "band rehearsal", ...CARD, alt: "Rehearsal" },
  /* Backgrounds */
  { key: "backgrounds/snow-texture", q: "snow surface texture", ...W(1600, 900), alt: "" },
];

/** Short clips. `src` is a Commons video search (transcoded, muted) or `stills` for an original
 * slow-pan sequence built from photos above. All are muted demo clips. */
export const VIDEOS = [
  { key: "videos/welcome", stills: ["creators/ajwhite/hero-1", "creators/ajwhite/cover", "creators/ajwhite/about-community"], ...W(1280, 720), alt: "Welcome video" },
  { key: "videos/competition-run", q: "snowboard", ...W(1280, 720), alt: "Competition run" },
  { key: "videos/big-air", stills: ["posts/big-air", "creators/ajwhite/hero-1", "posts/contest-1"], ...W(1280, 720), alt: "Big air session" },
  { key: "videos/halfpipe", stills: ["posts/halfpipe-run", "creators/ajwhite/hero-2", "posts/contest-3"], ...W(1280, 720), alt: "Halfpipe finals run" },
  { key: "videos/slopestyle", q: "ski slope", ...W(1280, 720), alt: "Slopestyle practice" },
  { key: "videos/course-preview", stills: ["courses/learn-to-snowboard", "posts/riding-switch", "posts/on-the-hill"], ...W(1280, 720), alt: "Course preview" },
  { key: "videos/event-highlights", stills: ["events/poster", "posts/contest-3", "posts/contest-1"], ...W(1280, 720), alt: "Event highlights" },
  { key: "videos/livestream-preview", q: "snowboard run", ...W(1280, 720), alt: "Recorded livestream preview" },
  { key: "videos/reel-park", stills: ["posts/big-air", "experiences/park-session"], ...W(720, 1280), alt: "Park reel" },
  { key: "videos/fitness-mobility", stills: ["creators/marcoreyesfit/workout", "creators/marcoreyesfit/avatar"], ...W(1280, 720), alt: "Mobility routine" },
  { key: "videos/gaming-clip", stills: ["creators/kaimorrow/cover", "creators/kaimorrow/clip"], ...W(1280, 720), alt: "Clip of the week" },
];
