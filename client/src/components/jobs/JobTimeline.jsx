import React from 'react';
import { Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';

export const JobTimeline = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--spatial-text-muted)] text-xs">
        <Clock className="w-6 h-6 mx-auto mb-2 opacity-60" />
        No activity history recorded yet.
      </div>
    );
  }

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--spatial-border)]">
      {history.map((event, idx) => (
        <div key={event.id || idx} className="relative group">
          {/* Dot */}
          <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-[var(--spatial-bg-app)] bg-apple-blue shadow-sm flex items-center justify-center text-white ring-4 ring-[var(--spatial-bg-card-subtle)] group-hover:scale-110 transition-transform">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>

          <div className="bg-[var(--spatial-bg-card-subtle)] border border-[var(--spatial-border)] rounded-2xl p-4 hover:bg-[var(--spatial-bg-card-hover)] hover:border-[var(--spatial-border-hover)] transition-all duration-200">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <h5 className="text-xs font-semibold text-[var(--spatial-text-title)] tracking-tight">{event.action_title}</h5>
              <span className="text-[11px] text-[var(--spatial-text-muted)] font-mono">{formatDate(event.created_at)}</span>
            </div>

            {event.to_status && (
              <div className="flex items-center gap-1.5 my-2 text-xs text-[var(--spatial-text-body)]">
                {event.from_status && (
                  <>
                    <Badge status={event.from_status} size="sm" />
                    <ArrowRight className="w-3 h-3 text-[var(--spatial-text-muted)]" />
                  </>
                )}
                <Badge status={event.to_status} size="sm" />
              </div>
            )}

            {event.notes && (
              <p className="text-xs text-[var(--spatial-text-body)] mt-2 leading-relaxed bg-[var(--spatial-bg-card)] p-3 rounded-xl border border-[var(--spatial-border)]">
                {event.notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
