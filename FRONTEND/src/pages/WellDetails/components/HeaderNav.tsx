import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface HeaderNavProps {
  wellId: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ wellId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayEmail = user?.email || 'nsrivatsa084@gmail.com';
  const displayRole = user?.role || 'Lead Drilling Engineer';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/workspace');
    }
  };

  return (
    <nav className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-black/10 bg-[#ffdd47] px-8 text-black shadow-xs font-average">
      {/* Left: Back Button (NWIS removed as requested) */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-black/80 hover:text-black font-bold bg-black/10 hover:bg-black/20 px-3.5 py-2 rounded-lg text-xs transition-colors cursor-pointer"
          title="Go to previous page"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Center: Navigation Link */}
      <div className="flex items-center gap-10 text-xs font-bold tracking-[0.15em] text-black">
        <Link
          to={`/wells/${encodeURIComponent(wellId)}`}
          className="border-b-2 border-black pb-1 transition hover:text-[#b78600]"
        >
          WELL OVERVIEW ({wellId})
        </Link>
      </div>

      {/* Right: Standardized User Profile Pill */}
      <div className="flex items-center gap-3 bg-black/10 px-3.5 py-1.5 rounded-full border border-black/15">
        <div className="w-8 h-8 rounded-full bg-black text-[#FDB813] flex items-center justify-center font-extrabold text-sm shadow-xs">
          {displayEmail.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block text-left pr-1">
          <p className="text-xs font-bold text-black leading-none">{displayEmail}</p>
          <p className="text-[9px] text-black/60 font-semibold mt-0.5">{displayRole}</p>
        </div>
      </div>
    </nav>
  );
};
