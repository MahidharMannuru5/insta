// ReelSlider.jsx
import React, { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";

const allReels = [
  {
    id: 1,
    src: "/public/media/reel1.mp4",
    caption: "You are my forever. #love #romance",
    hashtags: ["love", "romance"],
  },
  {
    id: 2,
    src: "/media/reel2.mp4",
    caption: "Lost in your eyes. #crush #feels",
    hashtags: ["crush", "feels"],
  },
  {
    id: 3,
    src: "/media/reel3.mp4",
    caption: "Our story begins. #romance #relationship",
    hashtags: ["romance", "relationship"],
  },
  {
    id: 4,
    src: "/media/love4.mp4",
    caption: "Just us. #couple #vibes",
    hashtags: ["couple", "vibes"],
  },
];

const uniqueTags = Array.from(new Set(allReels.flatMap((r) => r.hashtags)));

export default function ReelSlider() {
  const [selectedTag, setSelectedTag] = useState("all");
  const videoRefs = useRef([]);

  const filteredReels =
    selectedTag === "all"
      ? allReels
      : allReels.filter((reel) => reel.hashtags.includes(selectedTag));

  useEffect(() => {
    const swiper = document.querySelector(".swiper");
    const observer = new MutationObserver(() => {
      videoRefs.current.forEach((video, index) => {
        if (!video) return;
        if (video.closest(".swiper-slide-active")) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    });
    if (swiper) {
      observer.observe(swiper, { attributes: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [filteredReels]);

  return (
    <div className="h-screen w-screen bg-black text-white font-sans overflow-hidden">
      {/* Hashtag Scroll Bar */}
      <div className="flex gap-2 overflow-x-auto p-4 pb-2 bg-black z-10 relative no-scrollbar">
        <button
          onClick={() => setSelectedTag("all")}
          className={`px-4 py-1 text-sm rounded-full border ${
            selectedTag === "all"
              ? "bg-pink-500 text-white font-bold"
              : "border-pink-500 text-pink-300 hover:bg-pink-600/20"
          }`}
        >
          All
        </button>
        {uniqueTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-1 text-sm rounded-full border ${
              selectedTag === tag
                ? "bg-pink-500 text-white font-bold"
                : "border-pink-500 text-pink-300 hover:bg-pink-600/20"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Swiper */}
      <div className="h-[calc(100vh-64px)] bg-black">
        <Swiper
          direction="vertical"
          slidesPerView={1}
          mousewheel
          modules={[Mousewheel]}
          className="h-full w-full"
        >
          {filteredReels.map((reel, index) => (
            <SwiperSlide key={reel.id}>
              <div className="flex items-center justify-center h-full w-full bg-black relative">
                <video
                  ref={(el) => (videoRefs.current[index] = el)}
                  src={reel.src}
                  autoPlay
                  loop
                  controls
                  playsInline
                  className="mx-auto my-auto max-h-[90vh] max-w-[90vw] rounded-lg"
                />
                <div className="absolute bottom-0 w-full bg-black/60 px-4 pb-6 pt-4 text-center text-white">
                  <p className="text-lg font-medium">{reel.caption}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
