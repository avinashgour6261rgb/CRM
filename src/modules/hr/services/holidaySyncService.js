/**
 * @file holidaySyncService.js
 * @description Google Calendar India & Pan-India Major Festivals sync and Admin/HR Confirmation Engine.
 * 
 * CORE ARCHITECTURE:
 * 1. Curated National Gazetted Holidays + Major Festivals with rich festive icons and descriptions.
 * 2. Online Google Calendar / India Public API sync with 100% offline fallback.
 * 3. Two-Tier Approval Pipeline:
 *    - Suggested / Pending: Visible as festival celebrations / observances.
 *    - Confirmed by Admin/HR: Elevated to official paid company offs (in KEYS.HOLIDAYS).
 * 4. Reactive synchronization across tabs and pages via `hrms_storage_change`.
 */

import { KEYS } from '../../../shared/services/storageService';

// Master Curated Major Indian Festivals & National Holidays
const MAJOR_INDIAN_HOLIDAYS_MASTER = {
  2026: [
    {
      code: 'in_new_year_2026',
      name: "New Year's Day",
      date: '2026-01-01',
      dayOfWeek: 'Thursday',
      type: 'Gazetted Holiday',
      category: 'national',
      icon: '🎉',
      isGazetted: true,
      description: 'Beginning of the Gregorian calendar year celebrations worldwide.'
    },
    {
      code: 'in_makar_sankranti_2026',
      name: 'Makar Sankranti / Pongal',
      date: '2026-01-14',
      dayOfWeek: 'Wednesday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🪁',
      isGazetted: false,
      description: 'Harvest festival celebrated across India marking the transition of the sun into Makara rashi.'
    },
    {
      code: 'in_republic_day_2026',
      name: 'Republic Day',
      date: '2026-01-26',
      dayOfWeek: 'Monday',
      type: 'National Holiday',
      category: 'national',
      icon: '🇮🇳',
      isGazetted: true,
      description: 'Honoring the date on which the Constitution of India came into effect in 1950.'
    },
    {
      code: 'in_maha_shivratri_2026',
      name: 'Maha Shivratri',
      date: '2026-02-15',
      dayOfWeek: 'Sunday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🔱',
      isGazetted: false,
      description: 'Great night of Lord Shiva celebrated with prayers and fasting across India.'
    },
    {
      code: 'in_holi_2026',
      name: 'Holi (Festival of Colors)',
      date: '2026-03-04',
      dayOfWeek: 'Wednesday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🎨',
      isGazetted: true,
      description: 'Vibrant festival celebrating the arrival of spring and victory of good over evil.'
    },
    {
      code: 'in_eid_ul_fitr_2026',
      name: 'Eid-ul-Fitr',
      date: '2026-03-21',
      dayOfWeek: 'Saturday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🌙',
      isGazetted: true,
      description: 'Joyous celebration marking the conclusion of the holy month of Ramadan.'
    },
    {
      code: 'in_good_friday_2026',
      name: 'Good Friday',
      date: '2026-04-03',
      dayOfWeek: 'Friday',
      type: 'Gazetted Holiday',
      category: 'national',
      icon: '✝️',
      isGazetted: true,
      description: 'Christian holiday commemorating the crucifixion of Jesus Christ.'
    },
    {
      code: 'in_ambedkar_jayanti_2026',
      name: 'Dr. B.R. Ambedkar Jayanti',
      date: '2026-04-14',
      dayOfWeek: 'Tuesday',
      type: 'National Holiday',
      category: 'national',
      icon: '🏛️',
      isGazetted: true,
      description: 'Annual observance honoring Dr. Bhimrao Ramji Ambedkar, Father of the Indian Constitution.'
    },
    {
      code: 'in_buddha_purnima_2026',
      name: 'Buddha Purnima',
      date: '2026-05-01',
      dayOfWeek: 'Friday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '☸️',
      isGazetted: true,
      description: 'Commemorating the birth, enlightenment, and death of Gautama Buddha.'
    },
    {
      code: 'in_eid_al_adha_2026',
      name: 'Bakrid / Eid al-Adha',
      date: '2026-05-27',
      dayOfWeek: 'Wednesday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🌙',
      isGazetted: true,
      description: 'Feast of the Sacrifice honoring Ibrahim willingness to sacrifice his son.'
    },
    {
      code: 'in_independence_day_2026',
      name: 'Independence Day',
      date: '2026-08-15',
      dayOfWeek: 'Saturday',
      type: 'National Holiday',
      category: 'national',
      icon: '🇮🇳',
      isGazetted: true,
      description: 'Commemorating India independence from British rule in 1947.'
    },
    {
      code: 'in_raksha_bandhan_2026',
      name: 'Raksha Bandhan',
      date: '2026-08-28',
      dayOfWeek: 'Friday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🪢',
      isGazetted: false,
      description: 'Traditional Hindu ceremony celebrating the sacred bond between brothers and sisters.'
    },
    {
      code: 'in_janmashtami_2026',
      name: 'Krishna Janmashtami',
      date: '2026-09-04',
      dayOfWeek: 'Friday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🦚',
      isGazetted: true,
      description: 'Celebration of the birth of Lord Krishna, avatar of Vishnu.'
    },
    {
      code: 'in_ganesh_chaturthi_2026',
      name: 'Ganesh Chaturthi',
      date: '2026-09-14',
      dayOfWeek: 'Monday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🐘',
      isGazetted: false,
      description: 'Ten-day celebration honoring the elephant-headed deity Lord Ganesha.'
    },
    {
      code: 'in_gandhi_jayanti_2026',
      name: 'Mahatma Gandhi Jayanti',
      date: '2026-10-02',
      dayOfWeek: 'Friday',
      type: 'National Holiday',
      category: 'national',
      icon: '👓',
      isGazetted: true,
      description: 'National holiday honoring Mahatma Gandhi, pioneer of non-violence.'
    },
    {
      code: 'in_dussehra_2026',
      name: 'Dussehra (Vijayadashami)',
      date: '2026-10-20',
      dayOfWeek: 'Tuesday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🏹',
      isGazetted: true,
      description: 'Grand festival celebrating victory of Lord Rama over Ravana and Goddess Durga over Mahishasura.'
    },
    {
      code: 'in_karwa_chauth_2026',
      name: 'Karwa Chauth',
      date: '2026-10-29',
      dayOfWeek: 'Thursday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🌕',
      isGazetted: false,
      description: 'Fasting day observed by married Hindu women praying for longevity and safety of their spouses.'
    },
    {
      code: 'in_dhanteras_2026',
      name: 'Dhanteras',
      date: '2026-11-06',
      dayOfWeek: 'Friday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🪙',
      isGazetted: false,
      description: 'First day of the five-day Diwali celebrations honoring Lord Dhanvantari and Goddess Lakshmi.'
    },
    {
      code: 'in_diwali_2026',
      name: 'Diwali (Deepavali)',
      date: '2026-11-08',
      dayOfWeek: 'Sunday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🪔',
      isGazetted: true,
      description: 'The Festival of Lights illuminating homes across the nation with diyas and joy.'
    },
    {
      code: 'in_govardhan_bhai_dooj_2026',
      name: 'Govardhan Puja & Bhai Dooj',
      date: '2026-11-10',
      dayOfWeek: 'Tuesday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🌸',
      isGazetted: false,
      description: 'Festive celebrations of sibling affection and devotion to Lord Krishna.'
    },
    {
      code: 'in_chhath_puja_2026',
      name: 'Chhath Puja',
      date: '2026-11-15',
      dayOfWeek: 'Sunday',
      type: 'Major Festival',
      category: 'festival',
      icon: '🌅',
      isGazetted: false,
      description: 'Ancient Hindu Vedic festival dedicated to Surya Dev and Chhathi Maiya.'
    },
    {
      code: 'in_guru_nanak_jayanti_2026',
      name: 'Guru Nanak Jayanti',
      date: '2026-11-24',
      dayOfWeek: 'Tuesday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '☬',
      isGazetted: true,
      description: 'Celebrating the birth of the first Sikh Guru, Guru Nanak Dev Ji.'
    },
    {
      code: 'in_christmas_2026',
      name: 'Christmas Day',
      date: '2026-12-25',
      dayOfWeek: 'Friday',
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🎄',
      isGazetted: true,
      description: 'Worldwide celebration of the birth of Jesus Christ.'
    }
  ]
};

/**
 * Safe local storage reader for confirmed company holidays
 */
export const getConfirmedHolidays = () => {
  try {
    const raw = localStorage.getItem(KEYS.HOLIDAYS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Safe local storage saver for confirmed company holidays
 */
export const saveConfirmedHolidays = (list) => {
  try {
    localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.HOLIDAYS } }));
    window.dispatchEvent(new CustomEvent('ems_holidays_updated'));
  } catch (err) {
    console.error('[holidaySyncService] Failed to save confirmed holidays:', err);
  }
};

export const holidaySyncService = {
  /**
   * Fetch online Google Calendar / Indian festival feed or return curated fallback
   */
  async fetchLiveOrCuratedFestivals(year = 2026) {
    try {
      // 1. Attempt lightweight Google Holidays wrapper
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s quick timeout

      const res = await fetch(`https://namantam1.github.io/holidays?format=json&country=indian`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Merge with curated icons and metadata
          const yearStr = String(year);
          const filtered = data
            .filter(item => (item.date || '').startsWith(yearStr))
            .map(item => {
              const matchedMaster = (MAJOR_INDIAN_HOLIDAYS_MASTER[year] || []).find(m => m.date === item.date);
              return {
                code: matchedMaster?.code || `g_hol_${item.date}`,
                name: item.name || matchedMaster?.name || 'Holiday',
                date: item.date,
                dayOfWeek: matchedMaster?.dayOfWeek || new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' }),
                type: matchedMaster?.type || 'Gazetted Holiday',
                category: matchedMaster?.category || 'festival',
                icon: matchedMaster?.icon || '🏖️',
                isGazetted: matchedMaster ? matchedMaster.isGazetted : true,
                description: item.description || matchedMaster?.description || 'Indian public holiday and celebration.'
              };
            });

          if (filtered.length >= 10) {
            return filtered;
          }
        }
      }
    } catch {
      // Fallback seamlessly to robust curated list
    }

    return MAJOR_INDIAN_HOLIDAYS_MASTER[year] || MAJOR_INDIAN_HOLIDAYS_MASTER[2026];
  },

  /**
   * Get all suggested holidays for the year, annotated with confirmation status
   */
  async getSuggestedHolidays(year = 2026) {
    const masterList = await this.fetchLiveOrCuratedFestivals(year);
    const confirmed = getConfirmedHolidays();

    return masterList.map(item => {
      // Check if already in confirmed company holidays
      const isConfirmed = confirmed.some(c => 
        c.date === item.date && 
        (c.name?.toLowerCase().trim() === item.name.toLowerCase().trim() || c.code === item.code)
      );

      const existingRecord = confirmed.find(c => 
        c.date === item.date && 
        (c.name?.toLowerCase().trim() === item.name.toLowerCase().trim() || c.code === item.code)
      );

      return {
        ...item,
        isConfirmed,
        confirmedRecordId: existingRecord?._id || null,
        confirmedBy: existingRecord?.confirmedBy || null,
        confirmedAt: existingRecord?.confirmedAt || null
      };
    });
  },

  /**
   * Admin / HR 1-Click: Confirm a suggested holiday as an official Company Holiday
   */
  confirmHolidayAsCompanyOff(suggestedHoliday, adminUser) {
    const confirmed = getConfirmedHolidays();

    // Check if duplicate exists
    const exists = confirmed.find(c => 
      c.date === suggestedHoliday.date && 
      (c.name?.toLowerCase().trim() === suggestedHoliday.name.toLowerCase().trim() || c.code === suggestedHoliday.code)
    );

    if (exists) {
      exists.isConfirmed = true;
      exists.confirmedBy = adminUser?.name || 'Admin';
      exists.confirmedAt = new Date().toISOString();
      saveConfirmedHolidays(confirmed);
      return exists;
    }

    const newRecord = {
      _id: `hol_conf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      code: suggestedHoliday.code || `hol_${suggestedHoliday.date}`,
      name: suggestedHoliday.name,
      holidayName: suggestedHoliday.name,
      title: suggestedHoliday.name,
      date: suggestedHoliday.date,
      dayOfWeek: suggestedHoliday.dayOfWeek,
      type: suggestedHoliday.type || 'Company Declared Holiday',
      category: suggestedHoliday.category || 'festival',
      icon: suggestedHoliday.icon || '🏖️',
      description: suggestedHoliday.description || 'Declared company holiday.',
      isConfirmed: true,
      confirmedBy: adminUser?.name || 'Admin',
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    confirmed.push(newRecord);
    saveConfirmedHolidays(confirmed);
    return newRecord;
  },

  /**
   * Admin / HR 1-Click: Confirm ALL suggested holidays for the year as Company Holidays
   */
  async confirmAllSuggestedHolidays(year = 2026, adminUser) {
    const suggested = await this.getSuggestedHolidays(year);
    const confirmed = getConfirmedHolidays();
    let newlyAddedCount = 0;

    suggested.forEach(item => {
      const alreadyConfirmed = confirmed.some(c => 
        c.date === item.date && 
        (c.name?.toLowerCase().trim() === item.name.toLowerCase().trim() || c.code === item.code)
      );

      if (!alreadyConfirmed) {
        confirmed.push({
          _id: `hol_conf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          code: item.code || `hol_${item.date}`,
          name: item.name,
          holidayName: item.name,
          title: item.name,
          date: item.date,
          dayOfWeek: item.dayOfWeek,
          type: item.type || 'Company Declared Holiday',
          category: item.category || 'festival',
          icon: item.icon || '🏖️',
          description: item.description,
          isConfirmed: true,
          confirmedBy: adminUser?.name || 'Admin',
          confirmedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        newlyAddedCount++;
      }
    });

    saveConfirmedHolidays(confirmed);
    return { newlyAddedCount, totalConfirmed: confirmed.length };
  },

  /**
   * Admin / HR: Revert / Remove holiday from official company offs
   */
  unconfirmHoliday(holidayId) {
    let confirmed = getConfirmedHolidays();
    confirmed = confirmed.filter(c => c._id !== holidayId);
    saveConfirmedHolidays(confirmed);
    return true;
  }
};
