const EMOJI_IMAGES = {
  1: { src: "/émojiscolère.png",   alt: "Pas satisfaisant"  },
  2: { src: "/satisfait.png",      alt: "Satisfaisant"      },
  3: { src: "/trèssatisfait.png",  alt: "Très satisfaisant" },
  4: { src: "/mentionspécial.png", alt: "Mention spéciale"  },
};

export default function RatingFace({ value }) {
  const img = EMOJI_IMAGES[value];
  if (!img) return null;
  return (
    <img
      src={img.src}
      alt={img.alt}
      className="rating-face-img"
      width="120"
      height="120"
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
