import { useEffect } from 'react';

/**
 * Universal Modal UX Hook
 * - Locks background document body scroll when open (prevents awkward double-scrolling on mobile & desktop)
 * - Listens for 'Escape' key to smoothly close the modal
 * - Provides seamless backdrop click dismissal while preventing child click propagation
 */
export const useModalUX = ({ onClose, isOpen = true }) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && typeof onClose === 'function') {
      onClose();
    }
  };

  const handleCardClick = (e) => {
    e.stopPropagation();
  };

  return { handleBackdropClick, handleCardClick };
};

export default useModalUX;
