// app/page.tsx — TENtion v2.5 Web Mini (Next App Router, no deps)
// - 중앙 1열 430px 폭 고정 (데스크톱에서도 모바일처럼 보이게)
// - 브라우저 기본 스크롤바 숨김, 내부 스크롤만 사용
// - Home / Create / My / Details 모두 동일 폭 안에서만 렌더링

"use client";

import React,

{
 useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CategoryRow from "./components/CategoryRow";

/* =========================
   Telegram WebApp bootstrap
========================= */
declare global {
  interface Window {
    Telegram?: any;
  }
}

function useTelegramWebApp() {
  const [theme, setTheme] = useState<{ bg?: string; text?: string }>({});
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand?.();
        const p = tg.themeParams || {};
        setTheme({
          bg: "#0D0F13",
          text: p.text_color || "#fff",
        });
        tg.setHeaderColor?.("#0D0F13");
        tg.setBackgroundColor?.("#0D0F13");
      } catch {}
    }
  }, []);
  return theme;
}

/* =========================
   Constants / Data
========================= */
const ME = "You" as const;

type CatKey = "Vibes" | "Friends" | "Workout" | "Try";

const CATS: { key: CatKey; label: string; icon: string; color: string }[] = [
  { key: "Vibes", label: "Vibes", icon: "✨", color: "#FF5CAB" },
  { key: "Friends", label: "Friends", icon: "🤝", color: "#2EE778" },
  { key: "Workout", label: "Move", icon: "💪", color: "#FFA23B" }, // label만 Move
  { key: "Try", label: "Try", icon: "🧪", color: "#6AAEFF" },
];

const TIME_SLOTS = ["Any", "Morning", "Afternoon", "Evening", "Night"] as const;
const SORTS = ["Ending Soon", "Newest", "Nearest", "Rating"] as const;
const DURATIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

type CityCode =
  | "ALL"
  | "LA"
  | "SF"
  | "NYC"
  | "MIA"
  | "SEA"
  | "CHI"
  | "ATX"
  | "BOS"
  | "ATL";

const CITY_LIST: {
  code: CityCode;
  name: string;
  state: string;
  lat: number;
  lng: number;
  region: string;
}[] = [
  { code: "ALL", name: "All Cities", state: "", lat: 0, lng: 0, region: "All" },
  { code: "LA", name: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, region: "West" },
  { code: "SF", name: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194, region: "West" },
  { code: "NYC", name: "New York City", state: "NY", lat: 40.7128, lng: -74.006, region: "East" },
  { code: "MIA", name: "Miami", state: "FL", lat: 25.7617, lng: -80.1918, region: "South" },
  { code: "SEA", name: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321, region: "West" },
  { code: "CHI", name: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298, region: "Midwest" },
  { code: "ATX", name: "Austin", state: "TX", lat: 30.2672, lng: -97.7431, region: "South" },
  { code: "BOS", name: "Boston", state: "MA", lat: 42.3601, lng: -71.0589, region: "East" },
  { code: "ATL", name: "Atlanta", state: "GA", lat: 33.749, lng: -84.388, region: "South" },
];

const CITY = CITY_LIST.reduce<Record<string, (typeof CITY_LIST)[number]>>((m, c) => {
  m[c.code] = c;
  return m;
}, {});

const cityName = (code: CityCode) => CITY[code]?.name || (code as string);
const cityState = (code: CityCode) => CITY[code]?.state || "";

/* =========================
   Types
========================= */
type Slot = {
  id: number;
  origin: "core" | "user" | "brand";
  type: CatKey;
  city: CityCode;
  timeFilter: (typeof TIME_SLOTS)[number];
  title: string;
  start: string; // "HH:MM"
  end?: string;
  totalMins: number;
  totalSecs: number;
  secsLeft: number;
  attendees: string[];
  max: number;
  desc: string;
  place: string;
  gps: [number, number];
  who: string;
  todo: string[];
  reviews: any[];
  proofScore: number;
  hostType: "me" | "platform";
  deposit: number;
  present: string[];
  extendedBy: number;
  isBrand: boolean;
  brandName: string;
  brandTagline: string;
  reward: string;
};

/* =========================
   Helpers
========================= */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = (a.lat - b.lat) * 69;
  const dy = (a.lng - b.lng) * 54;
  return Math.sqrt(dx * dx + dy * dy);
}
const two = (n: number) => String(n).padStart(2, "0");
const t3 = (s: number) =>
  `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
const ratingStr = (n?: number) =>
  !n ? "⭐ —" : "⭐".repeat(Math.max(1, Math.min(5, Math.round(n))));

function parseHM24(text: string) {
  const m = /^(\d{1,2}):?(\d{0,2})$/.exec(text || "");
  if (!m) return null;
  let H = parseInt(m[1] || "0", 10);
  let M = parseInt((m[2] || "0").padEnd(2, "0"), 10);
  if (isNaN(H) || isNaN(M)) return null;
  H = clamp(H, 0, 23);
  M = clamp(M, 0, 59);
  return H * 60 + M;
}
function parseHM12(text: string, mer: "AM" | "PM") {
  const m = /^(\d{1,2}):?(\d{0,2})$/.exec(text || "");
  if (!m) return null;
  let h = parseInt(m[1] || "0", 10);
  let mm = parseInt((m[2] || "0").padEnd(2, "0"), 10);
  h = clamp(h, 1, 12);
  mm = clamp(mm, 0, 59);
  let H = h % 12;
  if (mer === "PM") H += 12;
  return H * 60 + mm;
}
const minTo24 = (mins: number) =>
  `${two(Math.floor(mins / 60) % 24)}:${two(mins % 60)}`;
function minTo12(mins: number) {
  const H24 = Math.floor(mins / 60) % 24;
  const M = mins % 60;
  const mer: "AM" | "PM" = H24 >= 12 ? "PM" : "AM";
  const h = ((H24 + 11) % 12) + 1;
  return { text: `${two(h)}:${two(M)}`, mer };
}


function guessTimeBucketFromMin(mins: number): (typeof TIME_SLOTS)[number] {
  const h = Math.floor(mins / 60) % 24;
  if (h < 12 && h >= 5) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}
function defaultPlace(city: CityCode) {
  if (city === "LA")
    return {
      place: "Santa Monica Pier",
      gps: [34.0094, -118.4973] as [number, number],
    };
  if (city === "SF")
    return {
      place: "Crissy Field East Beach",
      gps: [37.8043, -122.4649] as [number, number],
    };
  if (city === "NYC")
    return {
      place: "Central Park (Bethesda Terrace)",
      gps: [40.774, -73.97] as [number, number],
    };
  if (city === "MIA")
    return {
      place: "South Pointe Park Pier",
      gps: [25.765, -80.1363] as [number, number],
    };
  return {
    place: `${cityName(city)} Downtown`,
    gps: [CITY[city]?.lat || 0, CITY[city]?.lng || 0] as [number, number],
  };
}
function formatHMInput(raw: string) {
  const d = (raw || "").replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + ":" + d.slice(2);
}
function descFor(type: CatKey) {
  if (type === "Vibes") return "Light, simple, decide fast.";
  if (type === "Friends")
    return "Two people, one theme. Kind feedback only.";
  if (type === "Workout") return "Easy pace; headphones off.";
  if (type === "Try")
    return "Short real-world tryout. No pressure, just taste & see.";
  return "Honest conversation. Presence over performance.";
}
function whoFor(type: CatKey) {
  if (type === "Vibes") return "Casual first meet. Public place only.";
  if (type === "Friends") return "Friendly builders & curious minds.";
  if (type === "Workout") return "Light movers. No pressure.";
  if (type === "Try")
    return "Curious people who like tasting, testing, trying new things.";
  return "Candid talkers. Empathy over advice.";
}
function whatDo(type: CatKey) {
  if (type === "Vibes")
    return ["Say hi & set a single goal", "Walk 2–3 blocks", "Wrap on time"];
  if (type === "Friends")
    return ["Pick one topic only", "Swap one tip each", "Wrap on time"];
  if (type === "Workout")
    return [
      "Warm up together",
      "Choose 2–3 light drills",
      "Cool down & water",
    ];
  if (type === "Try")
    return [
      "Meet at the exact spot or store",
      "Try the thing together (food, product, space)",
      "Share one honest thought each and wrap on time",
    ];
  return [
    "Pick one topic only",
    "One speaks, one listens",
    "Switch and wrap on time",
  ];
}
function titles20(type: CatKey) {
  if (type === "Vibes")
    return [
      "Sunrise Coffee Walk",
      "Silent First Look",
      "Bookstore First Page",
      "Street Art Stroll",
      "Farmer’s Market Loop",
      "Pier Sunset",
      "Two-Song Share",
      "Viewpoint Chill",
      "Dog-Walk Meet",
      "Gallery Micro Tour",
      "City Steps Pulse",
      "Park Bench Hello",
      "Morning Matcha",
      "Rooftop Quick Chat",
      "Riverfront Mini Stroll",
      "Museum One-Piece",
      "Beach Breeze Talk",
      "Fountain Meet",
      "Skyline Snapshot",
      "Garden Micro Walk",
    ];
  if (type === "Friends")
    return [
      "Co-founder Spark",
      "Language Swap Mini",
      "New in Town Loop",
      "Photo Crit Mini",
      "Mentor Ping",
      "No-Phone Bench Talk",
      "Side-Project Show",
      "Parent Reset",
      "Vision Board in 10",
      "Career Fork",
      "Gratitude Walk",
      "Two-Prompt Journal",
      "City Secrets Swap",
      "Hobby Trade",
      "Podcast Rec Swap",
      "Board Games Hello",
      "Sketch & Share",
      "Film Buff Mini",
      "Foodies First Bite",
      "Coffee Recipe Swap",
    ];
  if (type === "Workout")
    return [
      "Jog & Talk",
      "Park Stretch",
      "Mobility Reset",
      "Stairs Sprint",
      "Pickleball Rally",
      "Mini Tennis",
      "Bike Loop",
      "Court Walk",
      "Breath Reset",
      "Stability Flow",
      "Lake Path Walk",
      "Hill Repeats Light",
      "Track Laps Easy",
      "Beach Planks",
      "Core & Posture",
      "Yoga Sun Salute",
      "Balance & Hips",
      "Resistance Band Mini",
      "Walk & Decompress",
      "Tempo Stroll",
    ];
  return [
    "Listen Only",
    "Hard Things",
    "Anxiety Walk",
    "Burnout SOS",
    "Founder Therapy",
    "Immigrant Stories",
    "Stoic Reset",
    "Career Pivot",
    "Study Buddy",
    "No Pitch Hour",
    "Compliment Swap",
    "Grief Minute",
    "Big Decision Draft",
    "Habit Engineering",
    "Deep Work Setup",
    "MBA? PhD?",
    "Job Search Sprint",
    "Boundaries IRL",
    "Minimalism IRL",
    "Morning Refocus",
  ];
}
function defaultTitleFor(cat: CatKey) {
  if (cat === "Vibes") return "Walk & Talk";
  if (cat === "Friends") return "Bench Talk";
  if (cat === "Workout") return "Jog & Talk";
  if (cat === "Try") return "Try Something New";
  return "Honest Talk";
}

function core80(): Slot[] {
  const cities: CityCode[] = ["LA", "SF", "NYC", "MIA"];
  const out: Slot[] = [];
  let id = 1;
  for (const cat of ["Vibes", "Friends", "Workout", "Try"] as CatKey[]) {
    const titles = titles20(cat);
    for (let i = 0; i < 20; i++) {
      const city = cities[i % cities.length];
      const tod =
        ["Morning", "Afternoon", "Evening", "Night"][(i + id) % 4] as Slot["timeFilter"];
      const baseH =
        tod === "Morning"
          ? 8
          : tod === "Afternoon"
          ? 14
          : tod === "Evening"
          ? 18
          : 20;
      const mm = (i * 7) % 60;
      const dur = [10, 20, 30][i % 3];
      const start = `${two((baseH + Math.floor(i / 3)) % 24)}:${two(mm)}`;
      const totalSecs = dur * 60;
      const secsLeft = Math.max(30, Math.floor(totalSecs * 0.8) - (i % 25));
      const { place, gps } = defaultPlace(city);
      out.push({
        id: id++,
        origin: "core",
        type: cat,
        city,
        timeFilter: tod,
        title: titles[i % titles.length],
        start,
        end: "",
        totalMins: dur,
        totalSecs,
        secsLeft,
        attendees: [],
        max: 2,
        desc: descFor(cat),
        place,
        gps,
        who: whoFor(cat),
        todo: whatDo(cat),
        reviews: [],
        proofScore: 3 + (i % 3),
        hostType: "me",
        deposit: 0,
        present: [],
        extendedBy: 0,
        isBrand: false,
        brandName: "",
        brandTagline: "",
        reward: "",
      });
    }
  }
  const demoCity: CityCode = "SF";
  const { place, gps } = defaultPlace(demoCity);
  out.push({
    id: id++,
    origin: "brand",
    type: "Try",
    city: demoCity,
    timeFilter: "Afternoon",
    title: "Try: New cold brew flight",
    start: "15:00",
    end: "",
    totalMins: 30,
    totalSecs: 30 * 60,
    secsLeft: 25 * 60,
    attendees: [],
    max: 4,
    desc: "Short tasting of 3 cold brews. Just taste, talk, and go.",
    place,
    gps,
    who: whoFor("Try"),
    todo: whatDo("Try"),
    reviews: [],
    proofScore: 4.5,
    hostType: "platform",
    deposit: 0,
    present: [],
    extendedBy: 0,
    isBrand: true,
    brandName: "(Demo brand)",
    brandTagline: "Try a real-world product together",
    reward: "Free tasting in this slot",
  });
  return out;
}

/* =========================
   Root
========================= */
export default function Page() {
  useTelegramWebApp();

  const [slots, setSlots] = useState<Slot[]>(() =>
    core80().sort((a, b) => b.id - a.id)
  );
  const [screen, setScreen] = useState<"home" | "detail" | "create" | "my">(
    "home"
  );
  const [selId, setSelId] = useState<number | null>(null);

  const [activeCat, setActiveCat] = useState<CatKey | "">("");
  const [radius, setRadius] = useState(5);
  const [durFilter, setDurFilter] = useState(10);
  const [sortBy, setSortBy] = useState<(typeof SORTS)[number]>("Ending Soon");
  const [timeOfDay, setTimeOfDay] =
    useState<(typeof TIME_SLOTS)[number]>("Any");
  const [city, setCity] = useState<CityCode>("SF");
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [search, setSearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState({
    name: "",
    bio: "",
    avatar: "",
  });

  useEffect(() => {
    const t = setInterval(() => {
      setSlots((prev) =>
        prev.map((s) => ({
          ...s,
          secsLeft: Math.max(0, (s.secsLeft || 0) - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const resetHome = () => {
    setActiveCat("");
    setRadius(5);
    setDurFilter(10);
    setSortBy("Ending Soon");
    setTimeOfDay("Any");
    setCity("SF");
    setSearch("");
    setScreen("home");
    setSelId(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const list = useMemo(() => {
    let arr = slots.slice();

    if (activeCat) arr = arr.filter((s) => s.type === activeCat);
    if (timeOfDay !== "Any")
      arr = arr.filter((s) => s.timeFilter === timeOfDay);

    if (city !== "ALL") {
      const me = CITY[city];
      arr = arr.filter(
        (s) => miles(me, CITY[s.city]) <= radius + 1e-6
      );
    }
    arr = arr.filter((s) => s.totalMins >= durFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((s) => {
        const txt = `${s.title} ${s.type} ${cityName(s.city)}`.toLowerCase();
        return txt.includes(q);
      });
    }

    if (sortBy === "Ending Soon")
      arr.sort((a, b) => (a.secsLeft || 1e9) - (b.secsLeft || 1e9));
    if (sortBy === "Newest") arr.sort((a, b) => b.id - a.id);
    if (sortBy === "Rating")
      arr.sort((a, b) => (b.proofScore || 0) - (a.proofScore || 0));
    if (sortBy === "Nearest") {
      const ref = city === "ALL" ? CITY["SF"] : CITY[city];
      arr.sort(
        (a, b) =>
          miles(ref, CITY[a.city]) - miles(ref, CITY[b.city])
      );
    }
    return arr;
  }, [slots, activeCat, radius, durFilter, sortBy, timeOfDay, city, search]);

  const sel = useMemo(
    () => slots.find((s) => s.id === selId) || null,
    [selId, slots]
  );

  const join = (slot: Slot) => {
    if (slot.attendees.includes(ME)) return;
    if (slot.attendees.length >= slot.max) {
      alert("This slot is already full.");
      return;
    }
    const next = { ...slot, attendees: [...slot.attendees, ME] };
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? next : s))
    );
    alert("Checked In — You’re in!");
  };
  const leave = (slot: Slot) => {
    if (!slot.attendees.includes(ME)) return;
    const next = {
      ...slot,
      attendees: slot.attendees.filter((x) => x !== ME),
      present: (slot.present || []).filter((x) => x !== ME),
    };
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? next : s))
    );
  };
  const arrive = (slot: Slot) => {
    if (slot.present?.includes(ME)) return;
    const next = {
      ...slot,
      present: [...(slot.present || []), ME],
    };
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? next : s))
    );
    alert("Arrived — Let them know you’re at the spot.");
  };
  const extend10 = (slot: Slot) => {
    const maxExtra = 20;
    const already = slot.extendedBy || 0;
    if (already >= maxExtra) {
      alert("Limit — already fully extended.");
      return;
    }
    if ((slot.secsLeft || 0) > 5 * 60) {
      alert("Too early — extend only near the end.");
      return;
    }
    const extra = 10;
    const next = {
      ...slot,
      extendedBy: already + extra,
      totalMins: slot.totalMins + extra,
      totalSecs: slot.totalSecs + extra * 60,
      secsLeft: (slot.secsLeft || 0) + extra * 60,
    };
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? next : s))
    );
    alert("+10 min — only if everyone agrees.");
  };

  const [form, setForm] = useState({
    cat: "Vibes" as CatKey,
    host: "I host" as "I host" | "TENtion hosts",
    cap: 2,
    city: "SF" as CityCode,
    timeFilter: "Any" as (typeof TIME_SLOTS)[number],
    timeMode: "24h" as "24h" | "12h",
    startText: "18:00",
    endText: "18:10",
    startMer: "PM" as "AM" | "PM",
    endMer: "PM" as "AM" | "PM",
    dur: 10,
    title: "",
    desc: "",
    _cityPick: false as boolean | undefined,
    _timePick: false as boolean | undefined,
  });

  const openCreate = () => {
    setForm((f) => {
      const startMin = parseHM24("18:00") ?? 18 * 60;
      const dur = 10;
      const endMin = startMin + dur;
      const s12 = minTo12(startMin);
      const e12 = minTo12(endMin);
      return {
        ...f,
        cat: "Vibes",
        host: "I host",
        cap: 2,
        city: city,
        timeFilter: timeOfDay,
        timeMode: "24h",
        startText: minTo24(startMin),
        endText: minTo24(endMin),
        startMer: s12.mer,
        endMer: e12.mer,
        dur,
        title: "",
        desc: "",
      };
    });
    setScreen("create");
  };

  const createSlot = () => {
    const startMin =
      form.timeMode === "24h"
        ? parseHM24(form.startText) ?? 18 * 60
        : parseHM12(form.startText, form.startMer) ?? 18 * 60;
    const mins = clamp(form.dur, 10, 100);
    const endMin = (startMin + mins) % (24 * 60);
    const start24 = minTo24(startMin);
    const { place, gps } = defaultPlace(form.city);
    const s: Slot = {
      id: Date.now() + Math.floor(Math.random() * 1e6),
      origin: "user",
      type: form.cat,
      hostType: form.host === "TENtion hosts" ? "platform" : "me",
      city: form.city,
      timeFilter:
        form.timeFilter === "Any"
          ? guessTimeBucketFromMin(startMin)
          : form.timeFilter,
      title: form.title || defaultTitleFor(form.cat),
      start: start24,
      totalMins: mins,
      totalSecs: mins * 60,
      secsLeft: Math.max(30, Math.floor(mins * 60 * 0.9)),
      attendees: [],
      max: form.cap,
      desc: form.desc || descFor(form.cat),
      place,
      gps,
      who: whoFor(form.cat),
      todo: whatDo(form.cat),
      reviews: [],
      proofScore: 0,
      deposit: 0,
      present: [],
      extendedBy: 0,
      isBrand: false,
      brandName: "",
      brandTagline: "",
      reward: "",
    };
    setSlots((prev) => [s, ...prev]);
    setScreen("home");
    setActiveCat(form.cat || "");
    setCity(form.city);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const joinedList = useMemo(
    () => slots.filter((s) => s.attendees.includes(ME)),
    [slots]
  );

  return (
    <div style={S.outer}>
      <div style={S.appShell}>
        {/* HEADER */}
        <div style={S.headerRow}>
          <button onClick={resetHome} style={S.logoBtn}>
            <span style={S.logo}>TENtion</span>
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={S.secondarySm}
              onClick={() => setScreen("my")}
            >
              <span style={S.secondarySmT}>My</span>
            </button>
            <button style={S.primarySm} onClick={openCreate}>
              <span style={S.primarySmT}>+ Create</span>
            </button>
          </div>
        </div>

        {screen === "home" && (
          <div
            ref={scrollRef}
            style={{
              paddingBottom: 100,
              overflowY: "auto",
              height: "calc(100vh - 58px)",
            }}
          >
            <CategoryRow
              active={activeCat}
              onPick={(k) =>
                setActiveCat((prev) => (prev === k ? "" : k))
              }
            />

            <div style={S.row3}>
              <Stepper
                label="mi"
                value={radius}
                onMinus={() => setRadius(clamp(radius - 1, 1, 50))}
                onPlus={() => setRadius(clamp(radius + 1, 1, 50))}
              />
              <Stepper
                label="min"
                value={durFilter}
                step={10}
                onMinus={() =>
                  setDurFilter(clamp(durFilter - 10, 10, 100))
                }
                onPlus={() =>
                  setDurFilter(clamp(durFilter + 10, 10, 100))
                }
              />
              <button
                style={S.sortBtn}
                onClick={() => setShowSortSheet(true)}
              >
                <span style={S.sortBtnT}>{sortBy}</span>
              </button>
            </div>

            <div style={S.rowCity}>
              <button
                style={S.filterChip}
                onClick={() => setShowTimeSheet(true)}
              >
                <span style={S.filterChipT}>
                  Time • {timeOfDay}
                </span>
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {(["LA", "SF", "NYC", "MIA"] as CityCode[]).map(
                  (code) => (
                    <button
                      key={code}
                      onClick={() => setCity(code)}
                      style={{
                        ...S.cityChip,
                        ...(city === code ? S.cityChipActive : {}),
                      }}
                    >
                      <span
                        style={{
                          ...S.cityChipT,
                          ...(city === code
                            ? S.cityChipTActive
                            : {}),
                        }}
                      >
                        {code}
                      </span>
                    </button>
                  )
                )}
              </div>
              <button
                style={{ ...S.moreChip, marginLeft: "auto" }}
                onClick={() => setShowCitySheet(true)}
              >
                <span style={S.moreChipT}>More ▾</span>
              </button>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, venue, city, type…"
              style={S.search}
            />

            {list.length === 0 && (
              <div style={S.empty}>
                <div style={S.emptyT as any}>No slots match.</div>
                <div style={S.emptyS as any}>
                  Try widening distance, reducing duration, or
                  clearing filters.
                </div>
              </div>
            )}

            {list.map((s) => (
              <Card
                key={s.id}
                slot={s}
                onDetails={() => {
                  setSelId(s.id);
                  setScreen("detail");
                }}
                onPrimary={() => join(s)}
              />
            ))}

            <div style={S.noteBox}>
              <span style={S.note}>
                Meet in public. No DMs. Decide in 10.
              </span>
            </div>
          </div>
        )}

        {/* SHEETS */}
        {showSortSheet && (
          <ActionSheet
            title="Sort by"
            value={sortBy}
            options={SORTS as unknown as string[]}
            onPick={(v) => {
              setSortBy(v as any);
              setShowSortSheet(false);
            }}
            onCancel={() => setShowSortSheet(false)}
          />
        )}
        {showCitySheet && (
          <CitySheet
            current={city}
            onPick={(v) => {
              setCity(v);
              setShowCitySheet(false);
            }}
            onClose={() => setShowCitySheet(false)}
          />
        )}
        {showTimeSheet && (
          <TimeSheet
            current={timeOfDay}
            onPick={(v) => {
              setTimeOfDay(v);
              setShowTimeSheet(false);
            }}
            onClose={() => setShowTimeSheet(false)}
          />
        )}

        {screen === "create" && (
          <CreateModal
            form={form}
            setForm={setForm}
            onClose={() => setScreen("home")}
            onCreate={createSlot}
          />
        )}

        {screen === "detail" && sel && (
          <Details
            slot={sel}
            onBack={() => setScreen("home")}
            onJoin={() => join(sel)}
            onLeave={() => leave(sel)}
            onArrive={() => arrive(sel)}
            onExtend={() => extend10(sel)}
          />
        )}

        {screen === "my" && (
          <MyScreen
            profile={profile}
            setProfile={setProfile}
            joined={joinedList}
            onBack={() => setScreen("home")}
            onLeave={(slot) => leave(slot)}
          />
        )}

        {/* page-scoped styles */}
        <style jsx>{`
          * {
            -webkit-tap-highlight-color: transparent;
          }
          button {
            cursor: pointer;
          }
          input::placeholder {
            color: #7a8596;
          }
        `}</style>
        {/* 전역: 바깥 스크롤 막대 숨기기 + 배경 고정 */}
        <style jsx global>{`
          html,
          body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }
          body {
            background: #05070b;
          }
          #__next {
            height: 100%;
          }
          ::-webkit-scrollbar {
            width: 0px;
            height: 0px;
          }
        `}</style>
      </div>
    </div>
  );
}

/* =========================
   UI Components (DOM)
========================= */

function Stepper({
  label,
  value,
  step = 1,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  step?: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div style={S.stepper}>
      <button style={S.stepBtn} onClick={onMinus}>
        <span style={S.stepBtnT}>−</span>
      </button>
      <div style={S.stepMid}>
        <div style={S.stepVal as any}>{value}</div>
        <div style={S.stepLbl as any}>{label}</div>
      </div>
      <button style={S.stepBtn} onClick={onPlus}>
        <span style={S.stepBtnT}>＋</span>
      </button>
    </div>
  );
}

function Card({
  slot,
  onDetails,
  onPrimary,
}: {
  slot: Slot;
  onDetails: () => void;
  onPrimary: () => void;
}) {
  const ratio = slot.totalSecs
    ? Math.max(0, slot.secsLeft) / slot.totalSecs
    : 0;
  const color = colorFor(slot.type);
  return (
    <div style={{ ...S.card, borderColor: color }}>
      <div style={S.cardHead}>
        <div style={S.cardType as any}>
          <span style={{ color }}>{iconFor(slot.type)}</span>{" "}
          <span style={{ color }}>
            {slot.type} • {cityName(slot.city)} • {slot.timeFilter}
          </span>
        </div>
        <div style={S.countRight as any}>
          ⏳ {t3(slot.secsLeft || 0)}
        </div>
      </div>

      <div style={S.cardTitle as any} title={slot.title}>
        {slot.title}
      </div>
      <div style={S.cardLine as any}>
        🕓 {slot.start} • {slot.totalMins} min
      </div>
      <div style={S.cardLine as any}>
        👥 {slot.attendees.length}/{slot.max} •{" "}
        {ratingStr(slot.proofScore)}
      </div>

      <div style={S.progOuter}>
        <div
          style={{
            ...S.progInner,
            width: `${Math.max(4, ratio * 100)}%`,
            backgroundColor:
              ratio > 0.3
                ? "#6AAEFF"
                : ratio > 0.1
                ? "#FF9F1A"
                : "#FF5A5A",
          }}
        />
      </div>

      <div style={S.cardDesc as any}>{slot.desc}</div>

      <div style={S.cardFoot}>
        <button style={S.outBtn} onClick={onDetails}>
          <span style={S.outBtnT as any}>Details</span>
        </button>
        <button style={S.inBtn} onClick={onPrimary}>
          <span style={S.inBtnT as any}>Check In</span>
        </button>
      </div>
    </div>
  );
}

function Details({
  slot,
  onBack,
  onJoin,
  onLeave,
  onArrive,
  onExtend,
}: {
  slot: Slot;
  onBack: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onArrive: () => void;
  onExtend: () => void;
}) {
  const joined = slot.attendees.includes(ME);
  const ratio = slot.totalSecs
    ? Math.max(0, slot.secsLeft) / slot.totalSecs
    : 0;
  const here = slot.present?.includes(ME);
  const canExtend =
    joined &&
    here &&
    (slot.secsLeft || 0) > 0 &&
    (slot.secsLeft || 0) <= 5 * 60 &&
    (slot.extendedBy || 0) < 20;

  let primaryLabel: string | null = null;
  let primaryAction: (() => void) | null = null;

  if (!joined && slot.secsLeft > 0) {
    primaryLabel = "Check In";
    primaryAction = onJoin;
  } else if (joined && !here && slot.secsLeft > 0) {
    primaryLabel = "Arrive at spot";
    primaryAction = onArrive;
  } else if (canExtend) {
    primaryLabel = "+10 min (if everyone wants)";
    primaryAction = onExtend;
  }

  return (
    <div style={S.detailWrap}>
      <div style={S.detailInner}>
        <div
          style={{
            padding: 14,
            height: "100%",
            overflowY: "auto",
          }}
        >
          <button onClick={onBack} style={linkBtn}>
            <span style={S.back as any}>← Back</span>
          </button>
          <div
            style={{
              ...S.detailsBox,
              borderColor: colorFor(slot.type),
            }}
          >
            <div style={S.detailsTitle as any}>{slot.title}</div>
            <div style={S.detailsTimer as any}>
              ⏳ {t3(slot.secsLeft || 0)}
            </div>
            <div style={S.detailsLine as any}>
              {cityName(slot.city)} ({cityState(slot.city)}) •{" "}
              {slot.timeFilter}
            </div>
            <div style={S.detailsLine as any}>
              🕓 {slot.start} • {slot.totalMins} min
            </div>
            <div style={S.detailsLine as any}>
              👥 {slot.attendees.length}/{slot.max} •{" "}
              {ratingStr(slot.proofScore)}
            </div>

            <div style={S.progOuterBig}>
              <div
                style={{
                  ...S.progInner,
                  height: 8,
                  width: `${Math.max(4, ratio * 100)}%`,
                  backgroundColor:
                    ratio > 0.3
                      ? "#6AAEFF"
                      : ratio > 0.1
                      ? "#FF9F1A"
                      : "#FF5A5A",
                }}
              />
            </div>

            <div style={S.sectionH as any}>📍 Where</div>
            <div style={S.sceneText as any}>{slot.place}</div>
            <div style={S.gpsT as any}>
              GPS: {twoFixed(slot.gps?.[0])},{" "}
              {twoFixed(slot.gps?.[1])}
            </div>

            <div style={S.sectionH as any}>👥 Who it’s for</div>
            <div style={S.sceneText as any}>{slot.who}</div>

            <div style={S.sectionH as any}>📝 What we’ll do</div>
            <Bullet items={slot.todo} />

            <div style={S.sectionH as any}>🕒 Duration</div>
            <div style={S.sceneText as any}>
              {slot.totalMins} minutes. Extend only if everyone
              agrees.
            </div>

            {slot.isBrand && !!slot.brandName && (
              <>
                <div style={S.sectionH as any}>
                  🤝 Hosted with
                </div>
                <div style={S.sceneText as any}>
                  {slot.brandName}
                </div>
                {slot.brandTagline ? (
                  <div style={S.sceneText as any}>
                    {slot.brandTagline}
                  </div>
                ) : null}
                {slot.reward ? (
                  <div
                    style={{
                      ...(S.sceneText as any),
                      marginTop: 4,
                    }}
                  >
                    Perk: {slot.reward}
                  </div>
                ) : null}
              </>
            )}

            <div style={S.sectionH as any}>⚙️ How it works</div>
            <Bullet
              items={[
                "Check in inside the app before you meet",
                "Find each other at the exact pin/spot",
                "Wrap on time; extend only if everyone says yes",
              ]}
            />

            <div style={S.sectionH as any}>
              ✅ Safety & House Rules
            </div>
            <Bullet
              items={[
                "Meet in bright public places only",
                "No DMs or contact exchange inside the app",
                "You can leave anytime; respect is mandatory",
                "If you share location later, it’s only used during the slot and then deleted.",
              ]}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              {primaryAction && (
                <button
                  style={{ ...S.primaryBtn, flexGrow: 1 }}
                  onClick={primaryAction}
                >
                  <span style={S.primaryText as any}>
                    {primaryLabel}
                  </span>
                </button>
              )}
              {joined && slot.secsLeft > 0 && (
                <button
                  style={{
                    ...S.secondaryBtn,
                    borderColor: "#FF5A5A",
                    backgroundColor: "#FF5A5A22",
                    flexGrow: 1,
                  }}
                  onClick={onLeave}
                >
                  <span
                    style={{
                      ...(S.secondaryText as any),
                      color: "#FF5A5A",
                    }}
                  >
                    Leave
                  </span>
                </button>
              )}
              <button
                style={{ ...S.secondaryBtn, flexGrow: 1 }}
                onClick={() =>
                  (window.navigator as any).share?.({
                    title: "TENtion",
                    text: `${slot.title} — ${slot.type} @ ${cityName(
                      slot.city
                    )} • ${slot.timeFilter}`,
                  })
                }
              >
                <span style={S.secondaryText as any}>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const twoFixed = (n: number | undefined) =>
  typeof n === "number" ? n.toFixed(6) : "—";

function Bullet({ items = [] as string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        marginTop: 6,
      }}
    >
      {items.map((t, i) => (
        <div key={i} style={S.sceneText as any}>
          • {t}
        </div>
      ))}
    </div>
  );
}

function ActionSheet({
  title,
  value,
  options,
  onPick,
  onCancel,
}: {
  title: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <div style={S.sheetWrap}>
      <div style={{ flex: 1 }} onClick={onCancel} />
      <div style={S.sheetCard}>
        <div style={S.sheetHandle} />
        <div style={S.sheetTitle as any}>{title}</div>
        {options.map((opt) => (
          <button
            key={opt}
            style={S.sheetItem}
            onClick={() => onPick(opt)}
          >
            <span
              style={{
                ...(S.sheetItemT as any),
                color: value === opt ? "#3EC6FF" : "#cfd6e4",
              }}
            >
              {opt}
              {value === opt ? " •" : ""}
            </span>
          </button>
        ))}
        <button style={{ ...S.primaryBtn, marginTop: 6 }} onClick={onCancel}>
          <span style={S.primaryText as any}>Done</span>
        </button>
      </div>
    </div>
  );
}

function CitySheet({
  current,
  onPick,
  onClose,
}: {
  current: CityCode;
  onPick: (v: CityCode) => void;
  onClose: () => void;
}) {
  const cities = CITY_LIST.filter(
    (c) => !["ALL", "LA", "SF", "NYC", "MIA"].includes(c.code)
  );
  return (
    <div style={S.sheetWrap}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div style={S.sheetCardTall}>
        <div style={S.sheetHandle} />
        <div style={S.sheetTitle as any}>Select city</div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {(["ALL", "LA", "SF", "NYC", "MIA"] as CityCode[]).map(
            (cc) => (
              <button
                key={cc}
                style={S.cityRow}
                onClick={() => onPick(cc)}
              >
                <span
                  style={{
                    ...(S.cityRowT as any),
                    color: current === cc ? "#3EC6FF" : "#cfd6e4",
                  }}
                >
                  {cityName(cc)} ({cc})
                </span>
              </button>
            )
          )}
          {cities.map((c) => (
            <button
              key={c.code}
              style={S.cityRow}
              onClick={() => onPick(c.code as CityCode)}
            >
              <span
                style={{
                  ...(S.cityRowT as any),
                  color:
                    current === c.code ? "#3EC6FF" : "#cfd6e4",
                }}
              >
                {c.name} ({c.code})
              </span>
            </button>
          ))}
        </div>
        <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={onClose}>
          <span style={S.primaryText as any}>Done</span>
        </button>
      </div>
    </div>
  );
}

function TimeSheet({
  current,
  onPick,
  onClose,
}: {
  current: (typeof TIME_SLOTS)[number];
  onPick: (v: (typeof TIME_SLOTS)[number]) => void;
  onClose: () => void;
}) {
  return (
    <div style={S.sheetWrap}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div style={S.sheetCard}>
        <div style={S.sheetHandle} />
        <div style={S.sheetTitle as any}>Time of day</div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
          }}
        >
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              style={{
                ...S.timeChip,
                ...(current === t ? S.timeChipActive : {}),
              }}
              onClick={() => onPick(t)}
            >
              <span
                style={{
                  ...(S.timeChipT as any),
                  ...(current === t ? S.timeChipTActive : {}),
                }}
              >
                {t}
              </span>
            </button>
          ))}
        </div>
        <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={onClose}>
          <span style={S.primaryText as any}>Done</span>
        </button>
      </div>
    </div>
  );
}

function Picker({
  button,
  value,
  onPress,
}: {
  button: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <button style={S.picker} onClick={onPress}>
      <span style={S.pickerT as any}>
        {button}: <span style={{ color: "#fff" }}>{value}</span>
      </span>
    </button>
  );
}

function CreateModal({
  form,
  setForm,
  onClose,
  onCreate,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onCreate: () => void;
}) {
  const decCap = () =>
    setForm((f: any) => ({
      ...f,
      cap: Math.max(2, (f.cap || 2) - 1),
    }));
  const incCap = () =>
    setForm((f: any) => ({ ...f, cap: (f.cap || 2) + 1 }));

  const startMin = () =>
    form.timeMode === "24h"
      ? parseHM24(form.startText) ?? 18 * 60
      : parseHM12(form.startText, form.startMer) ?? 18 * 60;
  const endMinFromState = () => {
    const m =
      form.timeMode === "24h"
        ? parseHM24(form.endText)
        : parseHM12(form.endText, form.endMer);
    if (m != null) return m;
    return (startMin() + form.dur * 60) % (24 * 60);
  };

  const syncEndFromDuration = (newDur: number) => {
    const sm = startMin();
    const em = (sm + newDur * 60) % (24 * 60);
    if (form.timeMode === "24h") {
      setForm((f: any) => ({
        ...f,
        dur: newDur,
        endText: minTo24(em),
        endMer: minTo12(em).mer,
      }));
    } else {
      const e12 = minTo12(em);
      setForm((f: any) => ({
        ...f,
        dur: newDur,
        endText: e12.text,
        endMer: e12.mer,
      }));
    }
  };

  const onChangeStart = (raw: string) => {
    const txt = formatHMInput(raw);
    let sm = 18 * 60;
    if (form.timeMode === "24h") sm = parseHM24(txt) ?? sm;
    else sm = parseHM12(txt, form.startMer) ?? sm;
    const em = (sm + form.dur * 60) % (24 * 60);
    if (form.timeMode === "24h") {
      setForm((f: any) => ({
        ...f,
        startText: txt,
        endText: minTo24(em),
        startMer: minTo12(sm).mer,
        endMer: minTo12(em).mer,
      }));
    } else {
      const s12 = minTo12(sm);
      const e12 = minTo12(em);
      setForm((f: any) => ({
        ...f,
        startText: formatHMInput(txt),
        startMer: s12.mer,
        endText: e12.text,
        endMer: e12.mer,
      }));
    }
  };

  const onChangeEnd = (raw: string) => {
    const txt = formatHMInput(raw);
    let em = endMinFromState();
    em =
      form.timeMode === "24h"
        ? parseHM24(txt) ?? em
        : parseHM12(txt, form.endMer) ?? em;
    let diff = em - startMin();
    if (diff < 0) diff += 24 * 60;
    let snapped = clamp(Math.round(diff / 10) * 10, 10, 100);
    syncEndFromDuration(snapped);
  };

  const switchMode = (mode: "24h" | "12h") => {
    const sm = startMin();
    const em = (sm + form.dur * 60) % (24 * 60);
    if (mode === "24h") {
      setForm((f: any) => ({
        ...f,
        timeMode: "24h",
        startText: minTo24(sm),
        endText: minTo24(em),
        startMer: minTo12(sm).mer,
        endMer: minTo12(em).mer,
      }));
    } else {
      const s12 = minTo12(sm);
      const e12 = minTo12(em);
      setForm((f: any) => ({
        ...f,
        timeMode: "12h",
        startText: s12.text,
        endText: e12.text,
        startMer: s12.mer,
        endMer: e12.mer,
      }));
    }
  };

  const setDur = (v: number) =>
    syncEndFromDuration(clamp(v, 10, 100));
  const row1 = DURATIONS.slice(0, 5);
  const row2 = DURATIONS.slice(5);
  const Half: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div style={{ flex: 1 }}>{children}</div>
  );

  return (
    <div style={S.modalWrap}>
      <div style={S.modalInner}>
        <div style={S.modalHead}>
          <div style={S.modalTitle as any}>Create a Slot</div>
          <button onClick={onClose} style={linkBtn}>
            <span style={S.modalClose as any}>✕</span>
          </button>
        </div>

        <div
          style={{
            padding: 14,
            paddingBottom: 160,
            height: "calc(100% - 46px)",
            overflowY: "auto",
          }}
        >
          <div style={S.formLabel as any}>Category</div>
          <div style={S.grid2x2}>
            {CATS.map((c) => (
              <button
                key={c.key}
                onClick={() =>
                  setForm((f: any) => ({
                    ...f,
                    cat: c.key,
                    title: defaultTitleFor(c.key),
                    desc: descFor(c.key),
                  }))}
                style={{
                  ...S.formChip,
                  borderColor: c.color,
                  ...(form.cat === c.key
                    ? { backgroundColor: c.color + "22" }
                    : {}),
                }}
              >
                <span
                  style={{
                    ...(S.formChipT as any),
                    color: c.color,
                  }}
                >
                  {c.icon} {c.label}
                </span>
              </button>
            ))}
          </div>

          <div style={S.formLabel as any}>Host</div>
          <div style={S.twoCols}>
            <div style={{ flex: 1 }}>
              <button
                onClick={() =>
                  setForm((f: any) => ({ ...f, host: "I host" }))}
                style={{
                  ...S.toggle,
                  ...(form.host === "I host" ? S.toggleOn : {}),
                }}
              >
                <span
                  style={{
                    ...(S.toggleT as any),
                    ...(form.host === "I host"
                      ? S.toggleTOn
                      : {}),
                  }}
                >
                  I host
                </span>
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <button
                onClick={() =>
                  setForm((f: any) => ({
                    ...f,
                    host: "TENtion hosts",
                  }))}
                style={{
                  ...S.toggle,
                  ...(form.host === "TENtion hosts"
                    ? S.toggleOn
                    : {}),
                }}
              >
                <span
                  style={{
                    ...(S.toggleT as any),
                    ...(form.host === "TENtion hosts"
                      ? S.toggleTOn
                      : {}),
                  }}
                >
                  TENtion hosts
                </span>
              </button>
            </div>
          </div>

          <div style={S.formLabel as any}>Capacity</div>
          <div style={S.stepper}>
            <button style={S.stepBtn} onClick={decCap}>
              <span style={S.stepBtnT}>−</span>
            </button>
            <div style={S.stepMid}>
              <div style={S.stepVal as any}>{form.cap}</div>
              <div style={S.stepLbl as any}>people</div>
            </div>
            <button style={S.stepBtn} onClick={incCap}>
              <span style={S.stepBtnT}>＋</span>
            </button>
          </div>

          <div style={S.formLabel as any}>City & Time</div>
          <div style={S.twoCols}>
            <Half>
              <Picker
                button="City"
                value={cityName(form.city)}
                onPress={() =>
                  setForm((f: any) => ({ ...f, _cityPick: true }))}
              />
            </Half>
            <Half>
              <Picker
                button="Time"
                value={form.timeFilter}
                onPress={() =>
                  setForm((f: any) => ({ ...f, _timePick: true }))}
              />
            </Half>
          </div>
          {form._cityPick && (
            <CitySheet
              current={form.city}
              onPick={(v) =>
                setForm((f: any) => ({
                  ...f,
                  city: v,
                  _cityPick: false,
                }))}
              onClose={() =>
                setForm((f: any) => ({ ...f, _cityPick: false }))}
            />
          )}
          {form._timePick && (
            <TimeSheet
              current={form.timeFilter}
              onPick={(v) =>
                setForm((f: any) => ({
                  ...f,
                  timeFilter: v,
                  _timePick: false,
                }))}
              onClose={() =>
                setForm((f: any) => ({ ...f, _timePick: false }))}
            />
          )}

          <div style={S.formLabel as any}>Start / End</div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <button
              onClick={() => switchMode("24h")}
              style={{
                ...S.modeChip,
                ...(form.timeMode === "24h" ? S.modeChipOn : {}),
              }}
            >
              <span
                style={{
                  ...(S.modeChipT as any),
                  ...(form.timeMode === "24h"
                    ? S.modeChipTOn
                    : {}),
                }}
              >
                24h
              </span>
            </button>
            <button
              onClick={() => switchMode("12h")}
              style={{
                ...S.modeChip,
                ...(form.timeMode === "12h" ? S.modeChipOn : {}),
              }}
            >
              <span
                style={{
                  ...(S.modeChipT as any),
                  ...(form.timeMode === "12h"
                    ? S.modeChipTOn
                    : {}),
                }}
              >
                AM·PM
              </span>
            </button>
          </div>

          <div style={S.twoCols}>
            <Half>
              <input
                placeholder="HH:MM"
                value={form.startText}
                onChange={(e) => onChangeStart(e.target.value)}
                maxLength={5}
                style={{
                  ...S.input,
                  ...S.duo,
                  ...S.timeFont,
                }}
              />
            </Half>
            <Half>
              <input
                placeholder="HH:MM"
                value={form.endText}
                onChange={(e) => onChangeEnd(e.target.value)}
                maxLength={5}
                style={{
                  ...S.input,
                  ...S.duo,
                  ...S.timeFont,
                }}
              />
            </Half>
          </div>

          {form.timeMode === "12h" && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 6,
                marginBottom: 2,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={S.amLabel as any}>Start</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["AM", "PM"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        onChangeStart(form.startText);
                        setForm((f: any) => ({
                          ...f,
                          startMer: m,
                        }));
                      }}
                      style={{
                        ...S.amChip,
                        ...(form.startMer === m ? S.amChipOn : {}),
                      }}
                    >
                      <span
                        style={{
                          ...(S.amChipT as any),
                          ...(form.startMer === m
                            ? S.amChipTOn
                            : {}),
                        }}
                      >
                        {m}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={S.amLabel as any}>End</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["AM", "PM"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        onChangeEnd(form.endText);
                        setForm((f: any) => ({
                          ...f,
                          endMer: m,
                        }));
                      }}
                      style={{
                        ...S.amChip,
                        ...(form.endMer === m ? S.amChipOn : {}),
                      }}
                    >
                      <span
                        style={{
                          ...(S.amChipT as any),
                          ...(form.endMer === m
                            ? S.amChipTOn
                            : {}),
                        }}
                      >
                        {m}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ color: "#9aa", marginTop: 4 }}>
            Preview (AM/PM):{" "}
            {minTo12(startMin()).text} {minTo12(startMin()).mer} —{" "}
            {minTo12((startMin() + form.dur * 60) % (24 * 60)).text}{" "}
            {minTo12(
              (startMin() + form.dur * 60) % (24 * 60)
            ).mer}
          </div>

          <div
            style={{
              ...(S.formLabel as any),
              marginTop: 10,
            }}
          >
            Duration
          </div>
          <div style={S.durRow}>
            {row1.map((n) => (
              <button
                key={n}
                style={{
                  ...S.durChip,
                  ...(form.dur === n ? S.durChipOn : {}),
                }}
                onClick={() => setDur(n)}
              >
                <span
                  style={{
                    ...(S.durChipT as any),
                    ...(form.dur === n ? S.durChipTOn : {}),
                  }}
                >
                  {n} min
                </span>
              </button>
            ))}
          </div>
          <div style={S.durRow}>
            {row2.map((n) => (
              <button
                key={n}
                style={{
                  ...S.durChip,
                  ...(form.dur === n ? S.durChipOn : {}),
                }}
                onClick={() => setDur(n)}
              >
                <span
                  style={{
                    ...(S.durChipT as any),
                    ...(form.dur === n ? S.durChipTOn : {}),
                  }}
                >
                  {n} min
                </span>
              </button>
            ))}
          </div>

          <div style={S.formLabel as any}>Title</div>
          <input
            placeholder="Slot title"
            value={form.title}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                title: e.target.value,
              }))}
            style={S.input}
          />

          <div style={S.formLabel as any}>Description</div>
          <textarea
            placeholder="Short description"
            value={form.desc}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                desc: e.target.value,
              }))}
            style={{ ...S.input, minHeight: 90, maxHeight: 120 }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              style={S.secondaryBtn}
              onClick={() =>
                alert(
                  "Meet in bright public places. Share your plan with a friend."
                )}
            >
              <span style={S.secondaryText as any}>
                Safety Tips
              </span>
            </button>
            <button style={S.primaryBtn} onClick={onCreate}>
              <span style={S.primaryText as any}>Create</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyScreen({
  profile,
  setProfile,
  joined,
  onBack,
  onLeave,
}: {
  profile: { name: string; bio: string; avatar: string };
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  joined: Slot[];
  onBack: () => void;
  onLeave: (s: Slot) => void;
}) {
  return (
    <div style={S.detailWrap}>
      <div style={S.detailInner}>
        <div
          style={{
            padding: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button onClick={onBack} style={linkBtn}>
            <span style={S.back as any}>← Back</span>
          </button>
          <div
            style={{
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            My Profile
          </div>
          <div style={{ width: 40 }} />
        </div>

        <div
          style={{
            padding: 14,
            paddingTop: 0,
            paddingBottom: 120,
            height: "calc(100% - 54px)",
            overflowY: "auto",
          }}
        >
          <div style={S.profileCard}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={S.avatarWrap}>
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt=""
                    style={S.avatarImg as any}
                  />
                ) : (
                  <div style={S.avatarInit as any}>
                    {(profile.name || "Y")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  placeholder="Display name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((p: any) => ({
                      ...p,
                      name: e.target.value,
                    }))}
                  style={S.input}
                />
                <textarea
                  placeholder="Short bio (who you are, what you like)"
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile((p: any) => ({
                      ...p,
                      bio: e.target.value,
                    }))}
                  style={{ ...S.input, minHeight: 70 }}
                />
                <input
                  placeholder="Avatar image URL (optional)"
                  value={profile.avatar}
                  onChange={(e) =>
                    setProfile((p: any) => ({
                      ...p,
                      avatar: e.target.value,
                    }))}
                  style={S.input}
                />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  color: "#9aa",
                  marginBottom: 6,
                }}
              >
                Preview
              </div>
              <div style={S.previewBox}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {profile.name || "Your name"}
                </div>
                <div
                  style={{
                    color: "#cbd3df",
                    marginTop: 4,
                  }}
                >
                  {profile.bio ||
                    "Write a short intro so others can recognize you."}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              ...(S.sectionH as any),
              marginTop: 10,
            }}
          >
            ✅ My Check-ins
          </div>
          {joined.length === 0 && (
            <div style={S.sceneText as any}>No check-ins yet.</div>
          )}
          {joined.map((s) => (
            <div
              key={s.id}
              style={{
                ...S.card,
                borderColor: colorFor(s.type),
              }}
            >
              <div style={S.cardTitle as any}>{s.title}</div>
              <div style={S.cardLine as any}>
                {s.type} • {cityName(s.city)} • {s.start} •{" "}
                {s.totalMins} min
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  style={S.outBtn}
                  onClick={() =>
                    alert(
                      `${cityName(s.city)}\n${s.start} • ${s.totalMins} min`
                    )}
                >
                  <span style={S.outBtnT as any}>Details</span>
                </button>
                <button
                  style={{
                    ...S.secondaryBtn,
                    borderColor: "#FF5A5A",
                    backgroundColor: "#FF5A5A22",
                  }}
                  onClick={() => onLeave(s)}
                >
                  <span
                    style={{
                      ...(S.secondaryText as any),
                      color: "#FF5A5A",
                    }}
                  >
                    Leave
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Visual utils (colors/styles)
========================= */
function colorFor(type: CatKey) {
  if (type === "Vibes") return "#FF5CAB";
  if (type === "Friends") return "#2EE778";
  if (type === "Workout") return "#FFA23B";
  if (type === "Try") return "#6AAEFF";
  return "#6AAEFF";
}
function iconFor(type: CatKey) {
  if (type === "Vibes") return "✨";
  if (type === "Friends") return "🤝";
  if (type === "Workout") return "💪";
  if (type === "Try") return "🧪";
  return "💬";
}

const CONTROL_H = 40 as const;
const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
};

const S: Record<string, React.CSSProperties> & any = {
  outer: {
    height: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
    background: "#05070b",
  },
  appShell: {
    width: "100%",
    maxWidth: 430,
    minWidth: 360,
    height: "100vh",
    background: "#0D0F13",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 0 40px rgba(0,0,0,0.7)",
  },

  container: {
    height: "100vh",
    background: "#0D0F13",
    display: "flex",
    flexDirection: "column",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    marginBottom: 8,
    zIndex: 2,
  },
  logoBtn: { background: "transparent", border: "none", padding: 0 },
  logo: { color: "#fff", fontSize: 28, fontWeight: 900 },

  primarySm: {
    backgroundColor: "#3EC6FF",
    padding: "8px 12px",
    borderRadius: 10,
    border: "none",
  },
  primarySmT: { color: "#0D0F13", fontWeight: 900 },
  secondarySm: {
    backgroundColor: "#3EC6FF22",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#3EC6FF",
    padding: "8px 12px",
    borderRadius: 10,
  },
  secondarySmT: { color: "#3EC6FF", fontWeight: 800 },

  catChipFixed: {
    height: 44,
    padding: "0 10px",
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    display: "flex",
    backgroundColor: "#151821",
  },
  catTextCenter: {
    fontWeight: 900,
    fontSize: 14,
    textAlign: "center",
    whiteSpace: "nowrap",
  },

  row3: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
    padding: "0 12px",
  },
  stepper: {
    flex: 1,
    height: CONTROL_H,
    borderRadius: 12,
    backgroundColor: "#161A22",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#2A2F38",
    display: "flex",
    overflow: "hidden",
  },
  stepBtn: {
    width: 44,
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnT: { color: "#fff", fontSize: 18, fontWeight: 900 },
  stepMid: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderLeft: "1px solid #2A2F38",
    borderRight: "1px solid #2A2F38",
  },
  stepVal: {
    color: "#fff",
    fontWeight: 900,
    fontSize: 16,
    lineHeight: "18px",
  },
  stepLbl: { color: "#9aa", fontWeight: 700, fontSize: 11, marginTop: 2 },

  sortBtn: {
    width: 160,
    height: CONTROL_H,
    borderRadius: 12,
    backgroundColor: "#161A22",
    border: "1px solid #2A2F38",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sortBtnT: { color: "#fff", fontWeight: 900 },

  rowCity: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    padding: "0 12px",
  },
  filterChip: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    backgroundColor: "#151821",
    border: "1px solid #2A2F38",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipT: {
    color: "#ddd",
    fontWeight: 800,
    fontSize: 12,
  },

  cityChip: {
    height: 36,
    minWidth: 52,
    padding: "0 12px",
    borderRadius: 10,
    backgroundColor: "#151821",
    border: "1px solid #2A2F38",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cityChipActive: { backgroundColor: "#3A3F4A" },
  cityChipT: {
    color: "#9aa",
    fontWeight: 800,
    fontSize: 12,
  },
  cityChipTActive: { color: "#fff" },

  moreChip: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    backgroundColor: "#151821",
    border: "1px solid #2A2F38",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  moreChipT: { color: "#ddd", fontWeight: 800, fontSize: 12 },

  search: {
    backgroundColor: "#141821",
    color: "#fff",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #232833",
    marginBottom: 8,
    marginLeft: 12,
    marginRight: 12,
    width: "calc(100% - 24px)",
  },

  empty: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#151821",
    border: "1px solid #2A2F38",
    marginTop: 4,
    marginLeft: 12,
    marginRight: 12,
  },
  emptyT: { color: "#fff", fontWeight: 900, marginBottom: 4 },
  emptyS: { color: "#9aa" },

  card: {
    border: "2px solid #333",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginLeft: 12,
    marginRight: 12,
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  cardType: { fontWeight: 900, fontSize: 12 },
  countRight: { color: "#cfd6e4", fontWeight: 800, fontSize: 12 },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 4,
  },
  cardLine: {
    color: "#bbb",
    fontSize: 12,
    marginBottom: 4,
  },
  cardDesc: { color: "#bfe4bf", fontSize: 12, marginTop: 2 },
  progOuter: {
    height: 6,
    backgroundColor: "#1A1D23",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
    marginTop: 4,
  },
  progOuterBig: {
    height: 8,
    backgroundColor: "#1A1D23",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
    marginTop: 6,
  },
  progInner: { height: 6, borderRadius: 6 },
  cardFoot: { display: "flex", gap: 10, marginTop: 8 },
  outBtn: {
    border: "1px solid #555",
    background: "transparent",
    padding: "8px 14px",
    borderRadius: 10,
  },
  outBtnT: { color: "#ddd", fontWeight: 800, fontSize: 12 },
  inBtn: {
    backgroundColor: "#3EC6FF",
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
  },
  inBtnT: { color: "#0D0F13", fontWeight: 900, fontSize: 12 },

  detailWrap: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    zIndex: 50,
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
  },
  detailInner: {
    width: "100%",
    maxWidth: 430,
    height: "100%",
    background: "#0D0F13",
  },
  back: { color: "#9aa", marginBottom: 10, fontWeight: 800 },
  detailsBox: {
    border: "2px solid #333",
    borderRadius: 16,
    padding: 14,
  },
  detailsTitle: {
    color: "#cfe4ff",
    fontSize: 24,
    fontWeight: 900,
    textAlign: "center",
  },
  detailsTimer: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 900,
    textAlign: "center",
    margin: "6px 0",
  },
  detailsLine: {
    color: "#bbb",
    marginBottom: 6,
    textAlign: "center",
  },

  sectionH: {
    color: "#fff",
    fontWeight: 900,
    marginTop: 10,
    marginBottom: 6,
    fontSize: 16,
  },
  sceneText: { color: "#dfe", lineHeight: "18px", fontSize: 13 },
  gpsT: { color: "#9aa", marginTop: 2, marginBottom: 6 },

  noteBox: {
    marginTop: 10,
    backgroundColor: "#151821",
    border: "1px solid #2A2F38",
    borderRadius: 12,
    padding: 12,
    marginLeft: 12,
    marginRight: 12,
  },
  note: { color: "#cbd3df", textAlign: "center" },

  sheetWrap: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    display: "flex",
    justifyContent: "flex-end",
    zIndex: 60,
    flexDirection: "column",
    alignItems: "center",
  },
  sheetCard: {
    backgroundColor: "#151821",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    border: "1px solid #2A2F38",
    width: "100%",
    maxWidth: 430,
  },
  sheetCardTall: {
    backgroundColor: "#151821",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    border: "1px solid #2A2F38",
    maxHeight: 520,
    overflow: "hidden",
    width: "100%",
    maxWidth: 430,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    backgroundColor: "#2A2F38",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 8,
  },
  sheetItem: {
    padding: "12px 0",
    borderBottom: "1px solid #262B35",
    background: "transparent",
    textAlign: "left",
    width: "100%",
  },
  sheetItemT: {
    color: "#cfd6e4",
    fontSize: 16,
    fontWeight: 800,
  },
  cityRow: {
    padding: "12px 0",
    borderBottom: "1px solid #262B35",
    background: "transparent",
    textAlign: "left",
    width: "100%",
  },
  cityRowT: {
    color: "#cfd6e4",
    fontSize: 16,
    fontWeight: 800,
  },
  timeChip: {
    padding: "8px 12px",
    borderRadius: 10,
    backgroundColor: "#1A1D23",
    border: "1px solid #2A2F38",
  },
  timeChipActive: { backgroundColor: "#3A3F4A" },
  timeChipT: {
    color: "#9aa",
    fontWeight: 800,
    fontSize: 12,
  },
  timeChipTActive: { color: "#fff" },

  modalWrap: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    zIndex: 70,
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
  },
  modalInner: {
    width: "100%",
    maxWidth: 430,
    height: "100%",
    background: "#0D0F13",
    display: "flex",
    flexDirection: "column",
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 14px 10px",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 900,
  },
  modalClose: {
    color: "#9aa",
    fontSize: 22,
    fontWeight: 900,
  },

  formLabel: {
    color: "#9aa",
    marginTop: 10,
    marginBottom: 6,
    fontWeight: 700,
  },
  formChip: {
    width: "48%",
    height: 44,
    padding: "0 12px",
    border: "2px solid #333",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
  },
  formChipT: { fontWeight: 900 },
  grid2x2: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  twoCols: {
    display: "flex",
    gap: 8,
    alignItems: "stretch",
  },

  toggle: {
    padding: "12px",
    borderRadius: 10,
    backgroundColor: "#161A22",
    border: "1px solid #2A2F38",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  toggleOn: { backgroundColor: "#3A3F4A" },
  toggleT: { color: "#9aa", fontWeight: 800 },
  toggleTOn: { color: "#fff" },

  picker: {
    height: 42,
    padding: "0 12px",
    borderRadius: 10,
    backgroundColor: "#151821",
    border: "1px solid #2A2F38",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  pickerT: { color: "#cfd6e4", fontWeight: 800 },

  input: {
    backgroundColor: "#151821",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #2A2F38",
    marginBottom: 8,
    width: "100%",
  },
  timeFont: { fontVariantNumeric: "tabular-nums" },
  duo: { flex: 1 },

  durRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  durChip: {
    flexBasis: "19%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 0",
    borderRadius: 10,
    backgroundColor: "#1A1D23",
    border: "1px solid #2A2F38",
  },
  durChipOn: { backgroundColor: "#3A3F4A" },
  durChipT: {
    color: "#9aa",
    fontWeight: 800,
    fontSize: 12,
  },
  durChipTOn: { color: "#fff" },

  modeChip: {
    padding: "8px 12px",
    borderRadius: 10,
    backgroundColor: "#1A1D23",
    border: "1px solid #2A2F38",
  },
  modeChipOn: { backgroundColor: "#3A3F4A" },
  modeChipT: {
    color: "#9aa",
    fontWeight: 800,
    fontSize: 12,
  },
  modeChipTOn: { color: "#fff" },

  amLabel: {
    color: "#9aa",
    marginBottom: 4,
    fontSize: 12,
  },
  amChip: {
    padding: "6px 12px",
    borderRadius: 10,
    backgroundColor: "#1A1D23",
    border: "1px solid #2A2F38",
  },
  amChipOn: { backgroundColor: "#3A3F4A" },
  amChipT: {
    color: "#9aa",
    fontWeight: 800,
    fontSize: 12,
  },
  amChipTOn: { color: "#fff" },

  primaryBtn: {
    backgroundColor: "#3EC6FF",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    border: "none",
  },
  primaryText: {
    color: "#0D0F13",
    textAlign: "center",
    fontWeight: 900,
  },
  secondaryBtn: {
    backgroundColor: "#3EC6FF22",
    borderColor: "#3EC6FF",
    borderWidth: 1,
    borderStyle: "solid",
    padding: 12,
    borderRadius: 10,
    flex: 1,
  },
  secondaryText: {
    color: "#3EC6FF",
    textAlign: "center",
    fontWeight: 800,
  },

  profileCard: {
    backgroundColor: "#151821",
    border: "1px solid #2A2F38",
    borderRadius: 12,
    padding: 12,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#262B35",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInit: {
    color: "#cfd6e4",
    fontWeight: 900,
    fontSize: 28,
  },
  previewBox: {
    backgroundColor: "#10131a",
    border: "1px solid #2A2F38",
    borderRadius: 10,
    padding: 10,
  },
};
