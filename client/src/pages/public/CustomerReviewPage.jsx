import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Smartphone,
  Star,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { reviewService } from "../../services/reviewService";
import { LoadingSpinner } from "../../components/common/Card";
import { copyTextToClipboard } from "../../utils/clipboard";

// Delicate Laurel Leaves component matching image 19
const LaurelBranch = ({ className = "" }) => (
  <svg
    viewBox="0 0 32 64"
    fill="currentColor"
    className={`w-6 h-12 sm:w-7 sm:h-14 shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Delicate Curved Stem */}
    <path
      d="M18 60 C 16 44, 18 26, 26 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
      opacity="0.5"
    />
    {/* Paired climbing leaves with elegant curvature */}
    <path d="M14 54 C 8 53, 5 47, 8 41 C 12 43, 16 47, 16 53 Z" />
    <path d="M12 44 C 6 42, 3 36, 7 30 C 11 32, 14 37, 14 43 Z" />
    <path d="M12 34 C 7 31, 4 25, 8 19 C 13 21, 15 26, 15 33 Z" />
    <path d="M15 24 C 10 20, 8 14, 12 9 C 16 11, 18 17, 18 23 Z" />
    <path d="M19 14 C 15 10, 14 4, 18 1 C 21 3, 23 8, 22 13 Z" />
    <path d="M23 7 C 20 4, 20 1, 23 0 C 25 1, 26 4, 25 7 Z" />
  </svg>
);

export const CustomerReviewPage = () => {
  const { uniqueToken } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [lastGeneratedText, setLastGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const fetchReviewDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await reviewService.getPublicPage(uniqueToken);
        setData(res);
        if (res.rating) setRating(res.rating);
        const existingText =
          res.edited_review || res.generated_review || res.customer_feedback;
        if (existingText) {
          setReviewText(existingText);
        }
        if (res.generated_review) {
          setLastGeneratedText(res.generated_review);
        }
        if (res.google_redirected) {
          setHasRedirected(true);
        }
      } catch (err) {
        setError(
          err.message ||
            "This review link is invalid, expired, or has been revoked.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (uniqueToken) {
      fetchReviewDetails();
    }
  }, [uniqueToken]);

  const getDynamicPlaceholder = () => {
    if (isGenerating) {
      return "AI is crafting your review suggestion...";
    }
    if (rating === 5) {
      return "Write your review here (e.g. Fast screen repair, friendly staff, great quality) or tap Generate to create an AI review draft...";
    }
    if (rating === 4) {
      return "Share what went well and what we could do even better, or tap Generate to create an AI review draft...";
    }
    if (rating === 3) {
      return "Tell us how your repair was and how we can improve, or tap Generate...";
    }
    return "Please share what went wrong with your repair experience so we can make it right...";
  };

  const handleGenerateAiReview = async () => {
    try {
      setIsGenerating(true);
      // If reviewText equals the last generated AI text, user hasn't typed custom notes.
      // Pass previousDraft to guarantee the backend AI creates a fresh, different variant!
      const isCustomFeedback =
        reviewText.trim() && reviewText.trim() !== lastGeneratedText.trim();
      const prevDraft = lastGeneratedText.trim() || reviewText.trim();

      const res = await reviewService.generateAiReview(uniqueToken, {
        rating,
        customerFeedback: isCustomFeedback ? reviewText.trim() : "",
        previousDraft: prevDraft,
        regenerate: Boolean(prevDraft),
      });

      if (res.reviewText) {
        setReviewText(res.reviewText);
        setLastGeneratedText(res.reviewText);
        toast.success("New AI review suggestion ready! Feel free to edit.");
      }
    } catch (err) {
      toast.error(
        err.message ||
          "Could not generate suggestion. You can type your review directly.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyReview = async () => {
    if (!reviewText.trim()) return;
    await copyTextToClipboard(reviewText.trim());
    setCopied(true);
    toast.success("Review copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleContinueToGoogle = async () => {
    // 1. Auto-copy review text across all devices & OS (Android, iOS, iPadOS, macOS, Windows)
    if (reviewText.trim()) {
      await copyTextToClipboard(reviewText.trim());
      setCopied(true);
      toast.success(
        "Review text copied! Paste it into the Google review box.",
        { duration: 4000 },
      );
    }

    const fallbackUrl =
      data?.shop?.google_review_url ||
      "https://g.page/r/CX_tsygbzKLqEBM/review";

    // 2. Open window immediately during the direct user touch/click gesture
    // to prevent browser popup blockers on mobile and desktop from suppressing the tab.
    let newWindow = null;
    try {
      newWindow = window.open("about:blank", "_blank");
    } catch (_) {
      newWindow = null;
    }

    try {
      setRedirecting(true);
      // Save feedback & mark redirected asynchronously
      const res = await reviewService.continueToGoogle(uniqueToken, {
        rating,
        editedReview: reviewText,
      });

      const targetUrl = res?.google_review_url || fallbackUrl;
      setHasRedirected(true);

      if (newWindow && !newWindow.closed) {
        newWindow.location.href = targetUrl;
      } else {
        window.location.href = targetUrl;
      }
    } catch (err) {
      if (newWindow && !newWindow.closed) {
        newWindow.location.href = fallbackUrl;
      } else {
        window.location.href = fallbackUrl;
      }
    } finally {
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-500 text-sm font-medium">
          Loading review details...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Review Link Expired or Invalid
          </h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {error ||
              "This review invitation link is no longer active. If you recently had a repair, please contact our support team."}
          </p>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-900">Mobotech Mobile Care</p>
            <p className="text-slate-500">Support: 080000 24439</p>
          </div>
        </div>
      </div>
    );
  }

  const { shop, repair, ai_enabled } = data;

  const ratingLabels = {
    1: "Disappointing Experience",
    2: "Needs Improvement",
    3: "Average / Fair",
    4: "Good Service",
    5: "Excellent Experience",
  };

  return (
    <div className="public-review-page min-h-screen bg-gradient-to-br from-[#eef5fc] via-[#f7faff] to-[#edf4fc] text-slate-800 py-8 pt-5 px-4 sm:px-6 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Ethereal fluid ribbon waves & ambient blooms matching image 19 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-[420px] h-[420px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 w-[520px] h-[520px] rounded-full bg-sky-100/50 blur-3xl" />

        {/* Translucent silk ribbon waves curving in the corners */}
        <svg
          className="absolute -bottom-16 -left-16 w-[560px] h-[560px] max-w-none"
          viewBox="0 0 600 600"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M-40 380 C 140 280, 240 480, 440 330 C 530 260, 560 300, 600 260 L 600 600 L -40 600 Z"
            fill="url(#wave-grad-1)"
            opacity="0.45"
          />
          <path
            d="M-70 460 C 110 360, 190 530, 390 400 C 490 330, 550 380, 600 340 L 600 600 L -70 600 Z"
            fill="url(#wave-grad-2)"
            opacity="0.35"
          />
          <defs>
            <linearGradient
              id="wave-grad-1"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient
              id="wave-grad-2"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-xl mx-auto space-y-3 sm:space-y-4 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-1 pb-0.5">
          {shop?.logo_url && !logoError ? (
            <div className="flex flex-col items-center justify-center">
              <img
                src={shop.logo_url}
                alt={shop.name || "Shop Logo"}
                className="h-11 sm:h-16 max-w-[220px] sm:max-w-[320px] w-auto object-contain drop-shadow-xs"
                onError={() => setLogoError(true)}
              />
              {/* {shop.tagline && (
                <p className="text-[11px] sm:text-[13px] text-[#0066ee] font-semibold tracking-wide mt-1">
                  {shop.tagline}
                </p>
              )} */}
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 mb-1">
                <Smartphone className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {shop.name}
              </h1>
              {shop.tagline && (
                <p className="text-[11px] sm:text-[13px] text-[#0066ee] font-semibold tracking-wide">
                  {shop.tagline}
                </p>
              )}
            </>
          )}
        </div>

        {/* Card 1: REPAIR COMPLETED matching mobile image 20 */}
        <div className="public-review-card rounded-[22px] sm:rounded-[28px] p-4 sm:p-5 flex items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1ea2ff] via-[#006ee6] to-[#0052cc] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(0,110,255,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.6)] shrink-0">
              <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            </div>

            {/* Desktop: single line with divider */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-7 w-[1.5px] bg-[#0066ee]/20" />
              <span className="text-base sm:text-lg font-black tracking-wide text-[#0052cc] uppercase truncate">
                Repair Completed
              </span>
            </div>

            {/* Mobile: stacked two lines matching image 20 */}
            <div className="sm:hidden flex flex-col leading-[1.15]">
              <span className="text-[12px] font-black tracking-wider text-[#0052cc] uppercase">
                Repair
              </span>
              <span className="text-[12px] font-black tracking-wider text-[#0052cc] uppercase">
                Completed
              </span>
            </div>
          </div>

          <div className="px-2.5 sm:px-3.5 py-1 rounded-full bg-[#e8f2fc] border border-[#cfe2f7] text-[#0066ee] text-[11px] sm:text-xs font-mono font-bold shrink-0 shadow-[0_1px_3px_rgba(0,100,250,0.06)]">
            #{repair.job_number}
          </div>
        </div>

        {/* Card 2: Rating Selection matching mobile image 20 */}
        <div className="public-review-card rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-0.5 sm:py-1">
            {/* Laurel branches on desktop, clean centered stars on mobile matching image 20 */}
            <div className="hidden sm:block">
              <LaurelBranch className="text-[#93c5fd]/80" />
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-all duration-150 hover:scale-120 active:scale-90 cursor-pointer focus:outline-none"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-all ${
                        isSelected
                          ? "fill-[#ffaa00] text-[#ffaa00] drop-shadow-[0_4px_12px_rgba(255,170,0,0.55)]"
                          : "fill-transparent text-slate-200 hover:text-slate-300 stroke-[1.6]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:block">
              <LaurelBranch className="text-[#93c5fd]/80 scale-x-[-1]" />
            </div>
          </div>

          <div className="text-center pt-0.5">
            <span className="inline-block px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-[13px] font-bold bg-[#fffdf7] text-[#8a4a06] border border-[#fde68a] shadow-[0_2px_8px_rgba(245,158,11,0.12)]">
              {rating} Star{rating > 1 ? "s" : ""} — {ratingLabels[rating]}
            </span>
          </div>
        </div>

        {/* Card 3: Unified Review Input Card matching mobile image 20 */}
        <div className="public-review-card rounded-[22px] sm:rounded-[28px] p-4 sm:p-5 space-y-3">
          {/* Header Row: Separate rows on mobile (Row 1: prompt text, Row 2: action buttons), inline row on desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
            <div className="flex items-start gap-2 min-w-0 flex-1 w-full sm:w-auto">
              <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#0066ee] stroke-[2.2] shrink-0 mt-0.5" />
              <p className="text-[11.5px] sm:text-xs text-[#0066ee] leading-snug">
                Type your thoughts or tap Generate to let AI craft your review
                draft.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-0.5 sm:pt-0">
              {reviewText.trim() && (
                <button
                  type="button"
                  onClick={handleCopyReview}
                  className="h-7 sm:h-8 px-3 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-[11px] sm:text-xs font-semibold border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span className="text-emerald-600 font-bold">
                        Copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}

              {ai_enabled && (
                <button
                  type="button"
                  onClick={handleGenerateAiReview}
                  disabled={isGenerating}
                  className="h-7 sm:h-8 px-3.5 rounded-full bg-gradient-to-r from-[#0099ff] via-[#0077ff] to-[#0055ff] hover:from-[#0088ee] hover:to-[#0048e0] text-white text-[11px] sm:text-xs font-bold shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{reviewText ? "Regenerate" : "Generate"}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Highlighted Inner Text Box Well */}
          <div className="rounded-[18px] sm:rounded-2xl bg-white border-2 border-sky-300/85 p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(0,110,255,0.08),inset_0_1px_2px_rgba(255,255,255,1)] focus-within:border-sky-500 focus-within:ring-3 focus-within:ring-sky-500/20 transition-all">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={getDynamicPlaceholder()}
              rows={4}
              className="public-review-textarea w-full bg-white border-0 text-[13px] sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Sub-footer inside Card 3 */}
          <div className="flex items-start justify-between gap-2 text-[10.5px] sm:text-[11px] text-slate-400 font-medium px-0.5">
            <span className="leading-tight max-w-[210px] sm:max-w-none">
              Editable draft — will auto-copy when clicking continue
            </span>
            <span className="shrink-0">{reviewText.trim().length} chars</span>
          </div>
        </div>

        {/* Action: Continue to Google Reviews Button matching mobile image 20 */}
        <div className="space-y-2.5 pt-0.5">
          <button
            type="button"
            onClick={handleContinueToGoogle}
            disabled={redirecting}
            className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-gradient-to-r from-[#0099ff] via-[#0066ff] to-[#4338ca] hover:from-[#0088ee] hover:to-[#3730a3] text-white font-bold text-sm sm:text-base shadow-[0_12px_28px_-6px_rgba(0,102,255,0.45),inset_0_1.5px_1.5px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.12)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 relative overflow-hidden"
          >
            {/* Luminous gloss highlight curve on button */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.35),transparent_60%)]" />

            {redirecting ? (
              <>
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin relative z-10" />
                <span className="relative z-10">
                  Opening Google Review Box...
                </span>
              </>
            ) : (
              <>
                <span className="relative z-10">
                  Continue to Google Reviews
                </span>
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2] relative z-10" />
              </>
            )}
          </button>

          {/* Status Banner matching mobile image 20 */}
          {(hasRedirected || copied) && (
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl sm:rounded-full bg-white/80 backdrop-blur-xl border border-white/95 shadow-[0_8px_24px_rgba(0,100,250,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] text-[11.5px] sm:text-[13px] text-[#0055d4] font-semibold flex items-start sm:items-center justify-start sm:justify-center gap-2.5 transition-all">
              <Check className="w-4 h-4 text-[#0066ee] stroke-[3] shrink-0 mt-0.5 sm:mt-0" />
              <span className="text-left leading-snug">
                Review copied to clipboard! Paste it inside the Google review
                box.
              </span>
            </div>
          )}
        </div>

        {/* Footer matching mobile image 20 */}
        <div className="text-center text-xs text-slate-400 pt-1 pb-6 font-medium">
          Powered by {shop.name || "Mobotech mobile care"} ❤️
        </div>
      </div>
    </div>
  );
};
