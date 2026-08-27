import React from 'react';
import { Listing } from '../services/api';
import { QrCode, X, Download, Printer, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ listing, isOpen, onClose }) => {
  if (!isOpen) return null;

  const listingUrl = `${window.location.origin}/listings/${listing.id}`;
  // Generate high quality QR code using public reliable QR API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    listingUrl
  )}&margin=10`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800 animate-scale-in text-center relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close QR Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 pt-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Storefront QR Code
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scan to view <strong>{listing.name}</strong> on TownPulse
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center justify-center max-w-[240px] mx-auto">
          <img
            src={qrImageUrl}
            alt={`QR Code for ${listing.name}`}
            className="w-48 h-48 object-contain"
          />
          <div className="text-[10px] text-slate-500 font-mono mt-2 truncate w-full text-center">
            {listing.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <a
            href={qrImageUrl}
            download={`townpulse_${listing.name.replace(/\s+/g, '_')}_qr.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>

          <button
            onClick={handlePrint}
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm hover:scale-105 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Flyer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
