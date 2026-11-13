import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import VendorNavTabs from '../../components/vendors/VendorNavTabs';
import { Card, EmptyState } from '../../components/common/Card';

export const NearBySendMobiles = () => {
  return (
    <div className="space-y-6 w-full pb-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
          <ArrowUpRight className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[var(--spatial-text-title)] tracking-tight">
            Near By Send Mobiles
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5">
            Track mobiles sent to nearby vendors for repair
          </p>
        </div>
      </div>

      <VendorNavTabs activeTab="/vendors/nearby/send" />

      <Card
        title="Mobiles Sent Locally"
        subtitle="Mobiles currently at nearby repair centers"
      >
        <EmptyState
          icon={ArrowUpRight}
          title="No mobiles sent to nearby vendors"
          description="You haven't sent any mobiles to local vendors yet."
        />
      </Card>
    </div>
  );
};

export default NearBySendMobiles;
