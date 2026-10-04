import React, { useState } from 'react';
import { Listing, Category } from '../services/api';
import {
  Printer,
  X,
  Phone,
  MapPin,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface PrintableDirectoryModalProps {
  listings: Listing[];
  categories: Category[];
  onClose: () => void;
}

export const PrintableDirectoryModal: React.FC<PrintableDirectoryModalProps> = ({
  listings,
  categories,
  onClose,
}) => {
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');

  const filteredListings =
    selectedCatId === 'all'
      ? listings
      : listings.filter((l) => l.category_id === selectedCatId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-8 max-h-[92vh]">
        {/* Modal Toolbar - Hidden during print */}
        <div className="print:hidden px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Printable Town Directory</span>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                  Offline Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate an ink-friendly paper emergency guide and directory sheet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Guide (PDF / Paper)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar - Hidden during print */}
        <div className="print:hidden px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-semibold text-slate-500 shrink-0">Filter for print:</span>
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1 rounded-xl font-semibold transition shrink-0 ${
              selectedCatId === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Services ({listings.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3 py-1 rounded-xl font-semibold transition shrink-0 ${
                selectedCatId === c.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Printable Paper Area (Styled for both on-screen preview & @media print) */}
        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900 text-slate-900 print:text-black print:bg-white print:p-0 print:overflow-visible">
          {/* Paper Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏘️</span>
                <h1 className="text-2xl font-black tracking-tight uppercase">TownPulse</h1>
              </div>
              <p className="text-sm font-semibold text-slate-600 print:text-slate-700">
                Official Community Services & Emergency Contact Directory
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 print:text-slate-600">
              <p className="font-bold">Printed: {new Date().toLocaleDateString()}</p>
              <p className="text-[11px]">Keep by your telephone or emergency kit</p>
            </div>
          </div>

          {/* Quick Town Emergency Numbers Box */}
          <div className="mb-6 p-4 rounded-xl border-2 border-red-500 bg-red-50/50 print:bg-white print:border-red-600 text-xs">
            <div className="flex items-center gap-2 font-bold text-red-700 uppercase tracking-wider mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Immediate Emergency & Hotlines</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-semibold">
              <div>
                <span className="block text-slate-500 text-[10px]">ALL EMERGENCIES</span>
                <span className="text-base font-black text-red-600">112 / 911</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">LOCAL POLICE</span>
                <span className="text-base font-black text-slate-900">100 / (Local)</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">FIRE & RESCUE</span>
                <span className="text-base font-black text-slate-900">101</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">AMBULANCE & CLINIC</span>
                <span className="text-base font-black text-slate-900">102 / 108</span>
              </div>
            </div>
          </div>

          {/* Directory Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 print:border-slate-400 bg-slate-50/50 dark:bg-slate-800/30 print:bg-white flex flex-col justify-between text-xs space-y-2 break-inside-avoid"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                        {item.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 print:text-slate-700">
                        {item.category?.name || 'Local Service'}
                      </span>
                    </div>
                    {item.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-400 px-1.5 py-0.5 rounded-md">
                        <ShieldCheck className="w-3 h-3" />
                        <span>VERIFIED</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-800 mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>{item.address}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 print:border-slate-300 flex items-center justify-between">
                  {item.phone ? (
                    <span className="font-bold text-xs text-slate-900 dark:text-white print:text-black flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{item.phone}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No direct phone</span>
                  )}
                  {item.website && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                      {item.website.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Paper Footer */}
          <div className="mt-8 pt-4 border-t border-slate-300 print:border-slate-400 text-center text-[10px] text-slate-500 print:text-slate-600">
            TownPulse Community Network • Privacy-first, open-source local services directory.
          </div>
        </div>
      </div>
    </div>
  );
};
