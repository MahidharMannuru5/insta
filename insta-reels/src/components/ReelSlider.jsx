import React, { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";
import "bootstrap/dist/css/bootstrap.min.css";

/** 🔗 Remote JSON of reels (update this file to add/edit reels without rebuild) */
const REMOTE_REELS_URL =
  "https://raw.githubusercontent.com/MahidharMannuru5/insta/main/insta-reels/src/components/reels.json";

export default function ReelSlider() {
  /** allReels only from remote JSON */
  const [allReels, setAllReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /** load JSON (no-store to avoid stale cache) */
  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(REMOTE_REELS_URL, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setAllReels(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load reels");
          setAllReels([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  // hashtag filter
  const [selectedTag, setSelectedTag] = useState("all");

  // calendar filter
  const [calOpen, setCalOpen] = useState(false);
  const [mode, setMode] = useState("all"); // "all" | "year" | "month" | "day"
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });

  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRefs = useRef(new Map());

  const uniqueTags = useMemo(
    () => Array.from(new Set(allReels.flatMap((r) => r.hashtags || []))),
    [allReels]
  );

  // Base: hashtag filtering
  const tagFiltered = useMemo(() => {
    return selectedTag === "all"
      ? allReels
      : allReels.filter((r) => (r.hashtags || []).includes(selectedTag));
  }, [allReels, selectedTag]);

  // Calendar filtering by mode (year/month/day)
  const timeFiltered = useMemo(() => {
    if (mode === "all") return tagFiltered;

    const d = new Date(selectedDate);
    const selY = d.getFullYear();
    const selM = d.getMonth();
    const selD = d.getDate();

    return tagFiltered.filter((r) => {
      const rd = new Date(r.datetime);
      if (mode === "year") return rd.getFullYear() === selY;
      if (mode === "month")
        return rd.getFullYear() === selY && rd.getMonth() === selM;
      if (mode === "day")
        return (
          rd.getFullYear() === selY &&
          rd.getMonth() === selM &&
          rd.getDate() === selD
        );
      return true;
    });
  }, [tagFiltered, mode, selectedDate]);

  // Sort newest first
  const reels = useMemo(
    () =>
      [...timeFiltered].sort(
        (a, b) => new Date(b.datetime) - new Date(a.datetime)
      ),
    [timeFiltered]
  );

  const playActiveOnly = (activeIndex) => {
    reels.forEach((reel, idx) => {
      const v = videoRefs.current.get(reel.id);
      if (!v) return;
      v.muted = !hasInteracted;
      if (idx === activeIndex) v.play().catch(() => {});
      else {
        v.pause();
        v.currentTime = 0;
      }
    });
  };

  useEffect(() => {
    const id = setTimeout(() => {
      const active = document.querySelector(".swiper-slide-active");
      const slides = Array.from(document.querySelectorAll(".swiper-slide"));
      const idx = Math.max(0, slides.indexOf(active));
      playActiveOnly(idx);
    }, 0);
    return () => clearTimeout(id);
  }, [reels, hasInteracted]);

  useEffect(() => {
    const enableSound = () => setHasInteracted(true);
    window.addEventListener("pointerdown", enableSound, { once: true });
    window.addEventListener("keydown", enableSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enableSound);
      window.removeEventListener("keydown", enableSound);
    };
  }, []);

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

  const CalendarIcon = ({ className }) => (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 8H5v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9ZM6 8h12V6H6v2Z" />
    </svg>
  );

  if (loading)
    return <div className="text-white text-center mt-5">Loading reels…</div>;
  if (error)
    return <div className="text-danger text-center mt-5">Error: {error}</div>;

  return (
    <div
      className="bg-black text-white w-100 p-0 m-0"
      style={{ height: "100svh", overflow: "hidden", position: "fixed", inset: 0 }}
    >
      {/* HEADER */}
      <div className="position-fixed top-0 start-0 end-0 d-flex align-items-center gap-2 px-2 py-2 z-3">
        <div className="d-flex flex-nowrap overflow-auto bg-dark bg-opacity-75 rounded-pill p-1">
          <button
            onClick={() => setSelectedTag("all")}
            className={`btn btn-sm me-2 ${selectedTag === "all" ? "btn-danger" : "btn-outline-light"}`}
          >
            All
          </button>
          {uniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`btn btn-sm me-2 ${selectedTag === tag ? "btn-danger" : "btn-outline-light"}`}
            >
              #{tag}
            </button>
          ))}
        </div>

        <button
          className="btn btn-sm ms-auto btn-outline-light bg-dark bg-opacity-75 rounded-pill d-flex align-items-center"
          onClick={() => setCalOpen((v) => !v)}
        >
          <CalendarIcon className="me-1" />
          Date
        </button>

        {calOpen && (
          <div
            className="position-absolute end-0 mt-2 p-2 rounded-3"
            style={{
              top: "2.75rem",
              background: "rgba(0,0,0,0.9)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div className="d-flex align-items-center mb-2">
              <label className="me-2 small text-white-50">Mode:</label>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  className={`btn ${mode === "all" ? "btn-danger" : "btn-outline-light"}`}
                  onClick={() => setMode("all")}
                >
                  All
                </button>
                <button
                  className={`btn ${mode === "year" ? "btn-danger" : "btn-outline-light"}`}
                  onClick={() => setMode("year")}
                >
                  Year
                </button>
                <button
                  className={`btn ${mode === "month" ? "btn-danger" : "btn-outline-light"}`}
                  onClick={() => setMode("month")}
                >
                  Month
                </button>
                <button
                  className={`btn ${mode === "day" ? "btn-danger" : "btn-outline-light"}`}
                  onClick={() => setMode("day")}
                >
                  Day
                </button>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <CalendarIcon />
              <input
                type="date"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 180 }}
              />
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => {
                  setMode("all");
                  setSelectedDate(selectedDate);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SWIPER */}
      <Swiper
        direction="vertical"
        slidesPerView={1}
        mousewheel
        modules={[Mousewheel]}
        className="w-100"
        style={{ height: "100svh" }}
        onInit={(swiper) => playActiveOnly(swiper.activeIndex)}
        onSlideChange={(swiper) => playActiveOnly(swiper.activeIndex)}
      >
        {reels.map((reel) => {
          // 🚀 cache-bust per reel so new uploads show immediately
          const srcWithBust =
            reel.src +
            (reel.src.includes("?") ? "&" : "?") +
            "v=" +
            encodeURIComponent(reel.datetime || "");

          return (
            <SwiperSlide key={reel.id + "::" + srcWithBust} style={{ height: "100svh" }}>
              <div className="position-relative w-100 h-100 bg-black">
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(reel.id, el);
                    else videoRefs.current.delete(reel.id);
                  }}
                  src={srcWithBust}
                  muted={!hasInteracted}
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{ objectFit: "cover" }}
                />
                <div
                  className="position-absolute bottom-0 w-100 py-3 px-3"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0))",
                    zIndex: 2,
                  }}
                >
                  <div className="d-flex align-items-center mb-1 small text-white-50">
                    <CalendarIcon className="me-1" />
                    <span>
                      {fmtDate(reel.datetime)} • {fmtTime(reel.datetime)}
                    </span>
                  </div>
                  <p
                    className="fw-semibold fs-6 m-0"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                  >
                    {reel.caption}
                  </p>
                </div>
                {!hasInteracted && (
                  <div
                    className="position-absolute top-0 start-0 end-0 text-center mt-2"
                    style={{ zIndex: 3, opacity: 0.85, fontSize: 12 }}
                  >
                    <span className="px-2 py-1 bg-dark bg-opacity-75 rounded-pill">
                      Tap once for sound
                    </span>
                  </div>
                )}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
