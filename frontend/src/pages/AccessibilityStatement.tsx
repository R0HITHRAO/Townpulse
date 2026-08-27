import React from 'react';
import { Accessibility, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AccessibilityStatement: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 sm:p-12 rounded-3xl border border-gray-200 shadow-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="bg-blue-100 text-blue-700 p-3 rounded-2xl">
            <Accessibility className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accessibility Statement</h1>
            <p className="text-xs text-gray-500">WCAG 2.1 AA Compliance Commitment</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            TownPulse is committed to ensuring digital accessibility for all community members, including elderly citizens, people with disabilities, and users on low-bandwidth rural networks.
          </p>

          <h2 className="text-base font-bold text-gray-900 pt-2">Measures to Support Accessibility</h2>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>Keyboard Navigation:</strong> All interactive elements and map markers are fully accessible via Tab and Enter keys.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>Skip Links:</strong> Top-level bypass link to skip navigation directly to main content.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>Color Contrast:</strong> Text elements adhere to WCAG AA minimum 4.5:1 contrast ratios.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>ARIA Labels:</strong> Screen reader friendly button and form descriptions.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>Offline & PWA:</strong> Service worker caching allows offline reading during rural connectivity disruptions.</span>
            </li>
          </ul>

          <h2 className="text-base font-bold text-gray-900 pt-4">Feedback & Assistance</h2>
          <p className="text-xs text-gray-600">
            If you encounter any accessibility barriers on TownPulse, please email our maintainers at <a href="mailto:accessibility@townpulse.dev" className="text-blue-600 underline">accessibility@townpulse.dev</a>.
          </p>
        </div>
      </div>
    </div>
  );
};
