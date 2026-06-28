import { StarIcon } from "./StarIcon";

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: number;
}

export default function StarRating({ rating, reviewCount, size = 12 }: StarRatingProps) {
  const hasReviews = reviewCount !== undefined && reviewCount > 0;
  const rounded = Math.round(rating);
  const filled = Math.min(rounded, 5);
  const empty = 5 - filled;

  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(filled)].map((_, i) => (
        <StarIcon key={`f-${i}`} size={size} className="text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.35)]" />
      ))}
      {[...Array(empty)].map((_, i) => (
        <StarIcon key={`e-${i}`} size={size} className="text-slate-700" />
      ))}
      {hasReviews ? (
        <span className="text-slate-500 ml-1 font-medium leading-none">{rating.toFixed(1)} ({reviewCount})</span>
      ) : (
        <span className="text-slate-400 ml-1 leading-none">0</span>
      )}
    </span>
  );
}
