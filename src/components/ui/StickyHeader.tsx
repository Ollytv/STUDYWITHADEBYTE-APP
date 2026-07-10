// src/components/ui/StickyHeader.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StickyHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightActions?: React.ReactNode;
}

export function StickyHeader({ title, showBackButton = false, rightActions }: StickyHeaderProps) {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger soft shadow transition after scrolling down 10px
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full bg-dark-950/95 backdrop-blur-md pt-safe transition-all duration-300"
      style={{
        borderBottom: isScrolled ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: isScrolled 
          ? '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 2px 12px rgba(0, 0, 0, 0.3)' 
          : 'none',
      }}
    >
      <div className="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between relative select-none">
        
        {/* Left Slot: Back Button */}
        <div className="flex items-center min-w-[64px] justify-start z-10">
          {showBackButton && (
            <motion.button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/8 text-dark-200 transition-colors hover:text-white"
              whileTap={{ scale: 0.92 }}
            >
              <ChevronLeft size={18} />
            </motion.button>
          )}
        </div>

        {/* Center Slot: Title */}
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-sm font-black tracking-wide text-white uppercase pointer-events-auto">
            {title}
          </h1>
        </div>

        {/* Right Slot: Context Actions */}
        <div className="flex items-center min-w-[64px] justify-end z-10 gap-2">
          {rightActions}
        </div>

      </div>
    </header>
  );
}