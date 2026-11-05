import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Smartphone,
  Star,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Wrench,
  Heart,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewService } from '../../services/reviewService';
import { LoadingSpinner } from '../../components/common/Card';

export const CustomerReviewPage = () => {
  const { uniqueToken } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Form state
  const [rating, setRating] = useState(5);
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const fetchReviewDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await reviewService.getPublicPage(uniqueToken);
        setData(res);
        if (res.rating) setRating(res.rating);
        if (res.customer_feedback) setCustomerFeedback(res.customer_feedback);
        if (res.edited_review || res.generated_review) {
          setReviewText(res.edited_review || res.generated_review);
        }
        if (res.google_redirected) {
          setHasRedirected(true);
        }
      } catch (err) {
        setError(err.message || 'This review link is invalid, expired, or has been revoked.');
      } finally {
        setLoading(false);
      }
    };

    if (uniqueToken) {
      fetchReviewDetails();
    }
  }, [uniqueToken]);

  const handleGenerateAiReview = async () => {
    try {
      setIsGenerating(true);
      const res = await reviewService.generateAiReview(uniqueToken, {
        rating,
        customerFeedback,
      });

      if (res.reviewText) {
        setReviewText(res.reviewText);
        toast.success('AI review suggestion ready! Feel free to edit.');
      }
    } catch (err) {
      toast.error(err.message || 'Could not generate suggestion. You can type your review directly.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyReview = () => {
    if (!reviewText.trim()) return;
    navigator.clipboard.writeText(reviewText.trim());
    setCopied(true);
    toast.success('Review copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleContinueToGoogle = async () => {
    // 1. Auto-copy review text immediately synchronously on user click
    if (reviewText.trim()) {
      try {
        await navigator.clipboard.writeText(reviewText.trim());
        toast.success('Review text copied! Paste it into the Google review box.', { duration: 4000 });
      } catch (_) {}
    }

    const fallbackUrl = data?.shop?.google_review_url || 'https://g.page/r/CX_tsygbzKLqEBM/review';

    // 2. Open window immediately during the direct user touch/click gesture
    // to prevent browser popup blockers on mobile and desktop from suppressing the tab.
    let newWindow = null;
    try {
      newWindow = window.open('about:blank', '_blank');
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-400 text-sm font-medium">Loading review details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Review Link Expired or Invalid</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {error || 'This review invitation link is no longer active. If you recently had a repair, please contact our support team.'}
          </p>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white">Mobotech Mobile Care</p>
            <p className="text-slate-400">Support: 080000 24439</p>
          </div>
        </div>
      </div>
    );
  }

  const { shop, repair, customer, ai_enabled } = data;

  const ratingLabels = {
    1: 'Disappointing Experience',
    2: 'Needs Improvement',
    3: 'Average / Fair',
    4: 'Good Service',
    5: 'Excellent Experience',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 mb-1">
            <Smartphone className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            {shop.name}
          </h1>
          <p className="text-xs text-sky-400 font-semibold tracking-wide">
            {shop.tagline}
          </p>
        </div>

        {/* Welcome & Device Summary Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                Repair Completed
              </p>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Hello {customer.first_name || 'Valued Customer'}!
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Thank you for trusting us with your phone. We hope your device is working like new!
              </p>
            </div>
            <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 shrink-0">
              #{repair.job_number}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">
                {repair.device_brand} {repair.device_model}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Service: {repair.service_summary || repair.problem}
              </p>
            </div>
          </div>
        </div>

        {/* Rating Selection Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>How was your repair experience?</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tap a star to rate your overall experience with our service.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const isSelected = star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-2.5 sm:p-3 rounded-2xl transition-all active:scale-90 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30 shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/60 text-slate-600 border border-slate-800 hover:text-slate-400'
                  }`}
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
                      isSelected ? 'fill-amber-400 scale-105' : 'stroke-[1.5]'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-amber-300 border border-slate-700">
              {rating} Star{rating > 1 ? 's' : ''} — {ratingLabels[rating]}
            </span>
          </div>
        </div>

        {/* Optional Customer Feedback Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Add Your Personal Thoughts (Optional)
          </label>
          <textarea
            value={customerFeedback}
            onChange={(e) => setCustomerFeedback(e.target.value)}
            placeholder="e.g. Display looks clear, replaced screen quickly, or anything else you'd like to mention..."
            rows={2}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/60 transition-colors resize-none"
          />
        </div>

        {/* AI Review Generation Helper Card */}
        {ai_enabled && (
          <div className="bg-gradient-to-b from-sky-950/30 to-slate-900/90 border border-sky-500/20 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>AI Review Assistant</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Need help writing? Let our AI draft an authentic review suggestion based on your repair.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiReview}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-950/40 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{reviewText ? 'Regenerate' : 'Generate'}</span>
                  </>
                )}
              </button>
            </div>

            {reviewText && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-sky-300 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Your Review Draft (Editable):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReview}
                    className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy text</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-400 transition-colors leading-relaxed"
                />

                <p className="text-[11px] text-slate-500 italic">
                  Tip: You can freely edit or rewrite this text before posting it on Google.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action: Continue to Google Reviews */}
        <div className="space-y-3 pt-2">
          {reviewText.trim() && (
            <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Review draft ready! It auto-copies when clicking below.</span>
              </span>
              <button
                type="button"
                onClick={handleCopyReview}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleContinueToGoogle}
            disabled={redirecting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {redirecting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Opening Google Review Box...</span>
              </>
            ) : (
              <>
                <span>Continue to Google Reviews</span>
                <ExternalLink className="w-5 h-5" />
              </>
            )}
          </button>

          {hasRedirected && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Review copied to clipboard! Paste it inside the Google review box.</span>
            </div>
          )}

          {/* Policy Compliance Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-500 leading-relaxed space-y-1">
            <p className="font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Google Review Policy Compliance</span>
            </p>
            <p>
              Review submission is completely voluntary and published directly by you on Google.
              Any AI-generated text is only an editable draft suggestion. We do not gate, filter, or incentivize reviews.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pt-4 pb-8">
          <p className="flex items-center justify-center gap-1">
            <span>Powered by</span>
            <span className="font-bold text-slate-400">{shop.name}</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </div>
  );
};
