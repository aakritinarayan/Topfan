/** Route id → component, merged from each area's page map. */
import { pages as core } from "../pages/core";
import { pages as prefsA } from "../pages/prefs-a";
import { pages as prefsB } from "../pages/prefs-b";
import { pages as monetize } from "../pages/monetize";
import { pages as money } from "../pages/money";
import { pages as comms } from "../pages/comms";
import { pages as social } from "../pages/social";
import type { PageMap } from "../pages/types";

export const PAGES: PageMap = { ...prefsA, ...prefsB, ...monetize, ...money, ...comms, ...social, ...core };
