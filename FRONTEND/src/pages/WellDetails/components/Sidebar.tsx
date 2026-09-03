import React, { useState } from 'react';
import {
  LayoutDashboard,
  CircleDot,
  Compass,
  BarChart3,
  FileText,
  Bell,
  Settings,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

interface SidebarProps {
  activeTab?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab = 'Wells' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentActiveTab, setCurrentActiveTab] = useState<string>(activeTab);

  // Scroll to targeted section on current page or navigate
  const handleNavClick = (itemName: string, path: string) => {
    setCurrentActiveTab(itemName);

    if (itemName === 'Analytics') {
      const elem = document.getElementById('analytics-section');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    if (itemName === 'Reports' || itemName === 'Documents') {
      const elem = document.getElementById('reports-section');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    if (itemName === 'Offset Wells') {
      const elem = document.getElementById('offset-events-section');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    if (itemName === 'Alerts') {
      navigate('/monitor');
      return;
    }

    if (itemName === 'Dashboard' || itemName === 'Wells') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate('/wells/NHK-09');
      return;
    }

    navigate(path);
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/wells/NHK-09' },
    { name: 'Wells', icon: CircleDot, path: '/wells/NHK-09' },
    { name: 'Offset Wells', icon: Compass, path: '/wells/NHK-09' },
    { name: 'Analytics', icon: BarChart3, path: '/wells/NHK-09' },
    { name: 'Reports', icon: FileText, path: '/wells/NHK-09' },
    { name: 'Alerts', icon: Bell, path: '/monitor' },
    { name: 'Documents', icon: FileText, path: '/wells/NHK-09' },
    { name: 'Settings', icon: Settings, path: '/workspace' },
  ];

  // Logged-in user information or default email
  const displayEmail = user?.email || 'nsrivatsa084@gmail.com';
  const displayRole = user?.role || 'Lead Drilling Engineer';

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-20 font-average">
      <div>
        {/* Logo Section matching screenshot */}
        <div className="p-5 flex items-center gap-3 border-b border-gray-100">
          <div className="w-9 h-9 bg-[#D92D20] rounded-md flex items-center justify-center text-white font-extrabold text-lg shadow-xs">
            <span className="text-[#FDB813]">N</span>
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight leading-none text-gray-900">
              NWIS
            </div>
            <div className="text-[9.5px] text-gray-500 font-bold tracking-wider uppercase mt-1">
              WELL INTELLIGENCE
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.name === currentActiveTab;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.name, item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#FFF8E6] text-gray-900 border-l-4 border-[#FDB813] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FDB813]' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Standardized User Profile Section */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        <button
          onClick={() => navigate('/workspace')}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span>Help & Support</span>
        </button>

        <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 mt-2">
          <div className="w-9 h-9 rounded-full bg-[#FDB813] text-gray-900 flex items-center justify-center font-extrabold text-sm border border-gray-200 shrink-0 shadow-2xs">
            {displayEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate" title={displayEmail}>
              {displayEmail}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{displayRole}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </div>
      </div>
    </aside>
  );
};
