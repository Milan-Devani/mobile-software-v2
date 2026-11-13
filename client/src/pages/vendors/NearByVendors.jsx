import React from 'react';
import { MapPin } from 'lucide-react';
import VendorNavTabs from '../../components/vendors/VendorNavTabs';
import { Card, EmptyState } from '../../components/common/Card';

export const NearByVendors = () => {
  return (
    <div className="space-y-6 w-full pb-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[var(--spatial-text-title)] tracking-tight">
            Near By Vendors
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--spatial-text-muted)] mt-0.5">
            View and manage vendors in your local vicinity
          </p>
        </div>
      </div>

      <VendorNavTabs activeTab="/vendors/nearby" />

      <Card
        title="Local Vendors Directory"
        subtitle="Manage repair shops and partners nearby"
      >
        <EmptyState
          icon={MapPin}
          title="No nearby vendors found"
          description="You haven't registered any nearby vendors yet. Use this section to track local partners."
        />
      </Card>
    </div>
  );
};

export default NearByVendors;
