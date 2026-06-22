"use client";

import { useEffect, useState } from "react";
import { serviceAPI, orderAPI } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";
import StarRating from "@/components/StarRating";
import Image from "next/image";

interface ExpertProfile {
  fullName: string | null;
  photoUrl: string | null;
  specialization: string | null;
  bio: string | null;
  yearsExperience: number | null;
  achievements: string[];
  certifications: string[];
  portfolioPhotos: string[];
}

interface Expert {
  id: string;
  email: string;
  isSuspended?: boolean;
  averageRating?: number;
  totalReviews?: number;
  oneStarCount?: number;
  profile: ExpertProfile | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  user: { email: string };
}

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  createdAt: string;
  expert: Expert;
  reviews: Review[];
  averageRating?: number;
}

export default function ServiceDetails() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLocale();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [orderMsg, setOrderMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await serviceAPI.getById(params.id as string);
        setService(data);
      } catch {
        setService(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  const handleOrder = async () => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setOrdering(true);
    setOrderMsg("");
    try {
      await orderAPI.create(service!.id);
      router.push(`/messages?expertId=${service!.expert.id}`);
    } catch (err: unknown) {
      setOrderMsg((err as Error).message);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-slate-800/40 rounded w-48" />
        <div className="glass p-8 space-y-4">
          <div className="h-10 bg-slate-800/60 rounded w-3/4" />
          <div className="h-20 bg-slate-800/40 rounded" />
          <div className="h-16 bg-slate-800/40 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="py-10 max-w-4xl mx-auto text-center">
        <div className="glass p-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Service not found</h2>
          <p className="text-slate-400 mb-6">This service may have been removed or doesn&apos;t exist.</p>
          <Link href="/marketplace" className="btn-primary inline-block">
            <span>← Back to Marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  const expert = service.expert;
  const profile = expert?.profile;
  const expertName = profile?.fullName || expert?.email || "Expert";
  const expertPhoto = profile?.photoUrl;

  return (
    <div className="py-10 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex gap-3 mb-6 text-sm text-slate-400 animate-fade-up flex-wrap items-center">
        <Link href="/marketplace" className="hover:text-emerald-400 transition-colors">Marketplace</Link>
        <span>/</span>
        <Link
          href={`/marketplace/${service.category?.toLowerCase()}`}
          className={`hover:text-emerald-400 transition-colors ${service.category === "SPORTS" ? "text-amber-400" : "text-emerald-400"}`}
        >
          {service.category === "SPORTS" ? "🏋️ Sports" : "🥗 Nutrition"}
        </Link>
        <span>/</span>
        <span className="text-slate-300 truncate">{service.title}</span>
      </div>

      <div className="glass p-8 animate-fade-up-d1">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1">
            {/* Service Image */}
            {service.imageUrl && (
              <div className="rounded-xl overflow-hidden mb-6 border border-white/5 relative h-56">
                <Image
                  src={service.imageUrl}
                  alt={service.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4">
              {service.title}
            </h1>
            <p className="text-slate-400 mb-8 leading-relaxed">{service.description}</p>

            {/* About The Expert */}
            <h3 className="text-xl font-bold mb-4 border-b border-slate-700/50 pb-2 text-white flex items-center gap-2">
              <span>👤</span> {t("marketplace.expert")}
            </h3>

            {service.expert?.isSuspended && (
              <div className="p-4 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                ⚠️ {t("marketplace.suspended")}
              </div>
            )}

            <div className="flex items-center gap-5 mb-6 p-4 glass-sm rounded-xl">
              {expertPhoto ? (
                <Image
                  src={expertPhoto}
                  alt={expertName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/30 shadow-lg flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xl font-bold text-black flex-shrink-0">
                  {expertName[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-bold text-lg text-white">
                  {expertName}
                  {profile?.specialization && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded ml-2 font-normal">
                      {profile.specialization}
                    </span>
                  )}
                </p>
                {service.averageRating !== undefined && service.averageRating > 0 && (
                  <p className="text-sm">
                    <StarRating rating={service.averageRating} reviewCount={service.expert?.totalReviews} size={14} />
                  </p>
                )}
                {profile?.yearsExperience && (
                  <p className="text-slate-400 text-sm">
                    {profile.yearsExperience} years experience
                  </p>
                )}
                {profile?.bio && (
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Expert Achievements & Certifications */}
            {((profile?.achievements && profile.achievements.length > 0) ||
              (profile?.certifications && profile.certifications.length > 0)) && (
              <div className="mb-6 space-y-3">
                {profile!.achievements!.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      🏆 Achievements
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile!.achievements!.map((a, i) => (
                        <span key={i} className="badge badge-emerald text-xs">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile!.certifications!.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      📜 Certifications
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile!.certifications!.map((c, i) => (
                        <span key={i} className="badge badge-blue text-xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews */}
            {service.reviews && service.reviews.length > 0 && (
              <>
                <h3 className="text-xl font-bold mb-4 border-b border-slate-700/50 pb-2 text-white flex items-center gap-2">
                  <span>⭐</span> Reviews ({service.reviews.length})
                </h3>
                <div className="space-y-3 mb-6">
                  {service.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-white">
                          {review.user.email}
                        </span>
                        <span className="text-amber-400 text-sm">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm italic">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Order confirmation */}
            {orderMsg && (
              <div
                className={`p-4 rounded-xl text-sm mb-4 ${
                  orderMsg.includes("success")
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {orderMsg}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-80">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sticky top-24">
              <h2 className="text-3xl font-bold text-white mb-2">
                {fDZD(service.price)}
                <span className="text-lg text-slate-400 font-normal">/month</span>
              </h2>
              <div className="flex items-center gap-2 text-sm text-emerald-400 mb-6 font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guaranteed Response
              </div>
              <ul className="text-slate-300 text-sm flex flex-col gap-3 mb-6">
                <li className="flex gap-2">
                  <span className="text-emerald-400">•</span> Custom Diet Plan
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">•</span> Custom Workout Plan
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">•</span> 1x Video Call / Week
                </li>
              </ul>
              <button
                onClick={handleOrder}
                disabled={ordering}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold py-3 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {ordering ? "Processing..." : "Order Now"}
              </button>
              <p className="text-center text-slate-500 text-xs mt-3">
                Secure payment via AthletiX
              </p>

              {/* Expert info mini card */}
              <div className="mt-6 pt-6 border-t border-slate-700/50">
                <div className="flex items-center gap-3">
                  {expertPhoto ? (
                    <Image
                      src={expertPhoto}
                      alt={expertName}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-500/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-black">
                      {expertName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{expertName}</p>
                    <p className="text-[11px] text-slate-500">{t("marketplace.expert")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
