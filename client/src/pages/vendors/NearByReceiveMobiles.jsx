import React from 'react';
import { ArrowDownLeft } from 'lucide-react';
import VendorNavTabs from '../../components/vendors/VendorNavTabs';
import { Card, EmptyState } from '../../components/common/Card';

export const NearByReceiveMobiles = () => {
  return (
    <div className="space-y-6 w-full pb-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <ArrowDownLeft className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[var(--spatial-text-title)] tracking-tight">
            Near By Receive Mobiles
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5">
            Track mobiles received from nearby vendors for repair
          </p>
        </div>
      </div>

      <VendorNavTabs activeTab="/vendors/nearby/receive" />

      <Card
        title="Mobiles Received Locally"
        subtitle="Mobiles from local vendors currently in your shop"
      >
        <EmptyState
          icon={ArrowDownLeft}
          title="No mobiles received from nearby vendors"
          description="You haven't received any mobiles from local vendors for repair yet."
        />
      </Card>
    </div>
  );
};

export default NearByReceiveMobiles;
