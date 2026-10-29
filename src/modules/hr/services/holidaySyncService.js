/**
 * @file holidaySyncService.js
 * @description Google Calendar India & Pan-India Major Festivals sync, full 12-month calendar,
 * and Admin/HR Confirmation & Cancellation Engine.
 */

import { KEYS } from '../../../shared/services/storageService';
import { API_BASE } from '../../../shared/config/apiConfig';

// Master Curated Major Indian Festivals & National Holidays Across All 12 Months
export const MAJOR_INDIAN_HOLIDAYS_MASTER = {
  2026: [
    // --- JANUARY ---
    {
      code: 'in_new_year_2026',
      name: "New Year's Day",
      date: '2026-01-01',
      dayOfWeek: 'Thursday',
      month: 1,
      type: 'Gazetted Holiday',
      category: 'national',
      icon: '🎉',
      isGazetted: true,
      description: 'Beginning of the Gregorian calendar year celebrations worldwide.'
    },
    {
      code: 'in_lohri_2026',
      name: 'Lohri',
      date: '2026-01-13',
      dayOfWeek: 'Tuesday',
      month: 1,
      type: 'Major Festival',
      category: 'festival',
      icon: '🔥',
      isGazetted: false,
      description: 'Traditional Punjabi winter solstice harvest festival celebrating warmth and fertility.'
    },
    {
      code: 'in_makar_sankranti_2026',
      name: 'Makar Sankranti / Pongal',
      date: '2026-01-14',
      dayOfWeek: 'Wednesday',
      month: 1,
      type: 'Major Festival',
      category: 'festival',
      icon: '🪁',
      isGazetted: false,
      description: 'Harvest festival celebrated across India marking the transition of the sun into Makara rashi.'
    },
    {
      code: 'in_netaji_jayanti_2026',
      name: 'Netaji Subhas Chandra Bose Jayanti (Parakram Diwas)',
      date: '2026-01-23',
      dayOfWeek: 'Friday',
      month: 1,
      type: 'National Holiday',
      category: 'national',
      icon: '🎖️',
      isGazetted: false,
      description: 'Honoring Netaji Subhas Chandra Bose and his leadership in the Indian National Army.'
    },
    {
      code: 'in_republic_day_2026',
      name: 'Republic Day',
      date: '2026-01-26',
      dayOfWeek: 'Monday',
      month: 1,
      type: 'National Holiday',
      category: 'national',
      icon: '🇮🇳',
      isGazetted: true,
      description: 'Honoring the date on which the Constitution of India came into effect in 1950.'
    },

    // --- FEBRUARY ---
    {
      code: 'in_basant_panchami_2026',
      name: 'Basant Panchami / Saraswati Puja',
      date: '2026-02-01',
      dayOfWeek: 'Sunday',
      month: 2,
      type: 'Major Festival',
      category: 'festival',
      icon: '🌸',
      isGazetted: false,
      description: 'Welcoming the spring season and worshiping Goddess Saraswati, patron of wisdom and arts.'
    },
    {
      code: 'in_maha_shivratri_2026',
      name: 'Maha Shivratri',
      date: '2026-02-15',
      dayOfWeek: 'Sunday',
      month: 2,
      type: 'Major Festival',
      category: 'festival',
      icon: '🔱',
      isGazetted: true,
      description: 'The great night of Lord Shiva observed with night vigils, prayers and fasting across India.'
    },

    // --- MARCH ---
    {
      code: 'in_holika_dahan_2026',
      name: 'Holika Dahan / Chhoti Holi',
      date: '2026-03-03',
      dayOfWeek: 'Tuesday',
      month: 3,
      type: 'Major Festival',
      category: 'festival',
      icon: '🔥',
      isGazetted: false,
      description: 'Ceremonial bonfire celebrating the burning of evil demoness Holika and victory of Bhakt Prahlad.'
    },
    {
      code: 'in_holi_2026',
      name: 'Holi (Festival of Colors)',
      date: '2026-03-04',
      dayOfWeek: 'Wednesday',
      month: 3,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🎨',
      isGazetted: true,
      description: 'Vibrant festival celebrating the arrival of spring, joy, and the victory of good over evil.'
    },
    {
      code: 'in_eid_ul_fitr_2026',
      name: 'Eid-ul-Fitr (Ramzan Eid)',
      date: '2026-03-21',
      dayOfWeek: 'Saturday',
      month: 3,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🌙',
      isGazetted: true,
      description: 'Joyous celebration marking the conclusion of the holy Islamic fasting month of Ramadan.'
    },
    {
      code: 'in_mahavir_jayanti_2026',
      name: 'Mahavir Jayanti',
      date: '2026-03-31',
      dayOfWeek: 'Tuesday',
      month: 3,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🕊️',
      isGazetted: true,
      description: 'Birth anniversary of Bhagwan Mahavira, the twenty-fourth and last Tirthankara of Jainism.'
    },

    // --- APRIL ---
    {
      code: 'in_good_friday_2026',
      name: 'Good Friday',
      date: '2026-04-03',
      dayOfWeek: 'Friday',
      month: 4,
      type: 'Gazetted Holiday',
      category: 'national',
      icon: '✝️',
      isGazetted: true,
      description: 'Christian holy day commemorating the crucifixion and death of Jesus Christ at Calvary.'
    },
    {
      code: 'in_easter_sunday_2026',
      name: 'Easter Sunday',
      date: '2026-04-05',
      dayOfWeek: 'Sunday',
      month: 4,
      type: 'Major Festival',
      category: 'festival',
      icon: '🥚',
      isGazetted: false,
      description: 'Celebration of the resurrection of Jesus Christ from the dead.'
    },
    {
      code: 'in_ambedkar_jayanti_2026',
      name: 'Dr. B.R. Ambedkar Jayanti / Baisakhi',
      date: '2026-04-14',
      dayOfWeek: 'Tuesday',
      month: 4,
      type: 'National Holiday',
      category: 'national',
      icon: '🏛️',
      isGazetted: true,
      description: 'Honoring Dr. Bhimrao Ramji Ambedkar, Chief Architect of the Constitution of India.'
    },
    {
      code: 'in_parshuram_jayanti_2026',
      name: 'Parshuram Jayanti',
      date: '2026-04-20',
      dayOfWeek: 'Monday',
      month: 4,
      type: 'Major Festival',
      category: 'festival',
      icon: '🪓',
      isGazetted: false,
      description: 'Birth anniversary of Lord Parshuram, sixth avatar of Lord Vishnu.'
    },

    // --- MAY ---
    {
      code: 'in_buddha_purnima_2026',
      name: 'Buddha Purnima / May Day',
      date: '2026-05-01',
      dayOfWeek: 'Friday',
      month: 5,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '☸️',
      isGazetted: true,
      description: 'Commemorating the birth, enlightenment, and nirvana of Gautama Buddha.'
    },
    {
      code: 'in_eid_al_adha_2026',
      name: 'Bakrid / Eid al-Adha',
      date: '2026-05-27',
      dayOfWeek: 'Wednesday',
      month: 5,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🌙',
      isGazetted: true,
      description: 'Feast of the Sacrifice honoring Ibrahim readiness to sacrifice his son in obedience.'
    },

    // --- JUNE ---
    {
      code: 'in_yoga_day_2026',
      name: 'International Yoga Day',
      date: '2026-06-21',
      dayOfWeek: 'Sunday',
      month: 6,
      type: 'Major Festival',
      category: 'national',
      icon: '🧘',
      isGazetted: false,
      description: 'Worldwide promotion of physical, mental and spiritual wellness through ancient Yoga.'
    },
    {
      code: 'in_muharram_2026',
      name: 'Muharram (Ashura)',
      date: '2026-06-26',
      dayOfWeek: 'Friday',
      month: 6,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🕌',
      isGazetted: true,
      description: 'Tenth day of Muharram commemorating the martyrdom of Imam Hussain at the Battle of Karbala.'
    },

    // --- JULY ---
    {
      code: 'in_rath_yatra_2026',
      name: 'Puri Rath Yatra',
      date: '2026-07-16',
      dayOfWeek: 'Thursday',
      month: 7,
      type: 'Major Festival',
      category: 'festival',
      icon: '🚩',
      isGazetted: false,
      description: 'Annual grand chariot procession of Lord Jagannath, Balabhadra and Subhadra at Puri, Odisha.'
    },
    {
      code: 'in_guru_purnima_2026',
      name: 'Guru Purnima',
      date: '2026-07-29',
      dayOfWeek: 'Wednesday',
      month: 7,
      type: 'Major Festival',
      category: 'festival',
      icon: '🪔',
      isGazetted: false,
      description: 'Sacred day honoring spiritual teachers, mentors, and the sage Ved Vyasa.'
    },

    // --- AUGUST ---
    {
      code: 'in_independence_day_2026',
      name: 'Independence Day',
      date: '2026-08-15',
      dayOfWeek: 'Saturday',
      month: 8,
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
      month: 8,
      type: 'Major Festival',
      category: 'festival',
      icon: '🪢',
      isGazetted: false,
      description: 'Sacred festival celebrating the bond of love and protection between brothers and sisters.'
    },
    {
      code: 'in_onam_2026',
      name: 'Onam (Thiruvonam)',
      date: '2026-08-29',
      dayOfWeek: 'Saturday',
      month: 8,
      type: 'Major Festival',
      category: 'festival',
      icon: '🌼',
      isGazetted: false,
      description: 'Harvest festival of Kerala welcoming the mythical King Mahabali with pookkalam and feasts.'
    },

    // --- SEPTEMBER ---
    {
      code: 'in_janmashtami_2026',
      name: 'Krishna Janmashtami',
      date: '2026-09-04',
      dayOfWeek: 'Friday',
      month: 9,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🦚',
      isGazetted: true,
      description: 'Grand celebration marking the divine birth of Lord Krishna, eighth avatar of Vishnu.'
    },
    {
      code: 'in_ganesh_chaturthi_2026',
      name: 'Ganesh Chaturthi',
      date: '2026-09-14',
      dayOfWeek: 'Monday',
      month: 9,
      type: 'Major Festival',
      category: 'festival',
      icon: '🐘',
      isGazetted: false,
      description: 'Grand ten-day celebration honoring the elephant-headed deity of wisdom, Lord Ganesha.'
    },
    {
      code: 'in_anant_chaturdashi_2026',
      name: 'Anant Chaturdashi (Ganesh Visarjan)',
      date: '2026-09-24',
      dayOfWeek: 'Thursday',
      month: 9,
      type: 'Major Festival',
      category: 'festival',
      icon: '🌊',
      isGazetted: false,
      description: 'Final day of Ganeshotsav marked by grand immersion processions in rivers and oceans.'
    },
    {
      code: 'in_milad_un_nabi_2026',
      name: 'Eid-e-Milad (Milad-un-Nabi)',
      date: '2026-09-28',
      dayOfWeek: 'Monday',
      month: 9,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🌙',
      isGazetted: true,
      description: 'Observance of the birth anniversary of Prophet Muhammad.'
    },

    // --- OCTOBER ---
    {
      code: 'in_gandhi_jayanti_2026',
      name: 'Mahatma Gandhi Jayanti',
      date: '2026-10-02',
      dayOfWeek: 'Friday',
      month: 10,
      type: 'National Holiday',
      category: 'national',
      icon: '👓',
      isGazetted: true,
      description: 'National holiday honoring Mahatma Gandhi, Father of the Nation.'
    },
    {
      code: 'in_durga_ashtami_2026',
      name: 'Maha Navami / Durga Puja',
      date: '2026-10-19',
      dayOfWeek: 'Monday',
      month: 10,
      type: 'Major Festival',
      category: 'festival',
      icon: '🔱',
      isGazetted: false,
      description: 'Culmination of Navratri celebrating Goddess Durga triumph over the buffalo demon Mahishasura.'
    },
    {
      code: 'in_dussehra_2026',
      name: 'Dussehra (Vijayadashami)',
      date: '2026-10-20',
      dayOfWeek: 'Tuesday',
      month: 10,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🏹',
      isGazetted: true,
      description: 'Grand celebration of the victory of Lord Rama over Ravana and good over evil.'
    },
    {
      code: 'in_karwa_chauth_2026',
      name: 'Karwa Chauth',
      date: '2026-10-29',
      dayOfWeek: 'Thursday',
      month: 10,
      type: 'Major Festival',
      category: 'festival',
      icon: '🌕',
      isGazetted: false,
      description: 'Fasting day observed by married Hindu women praying for longevity and safety of their spouses.'
    },

    // --- NOVEMBER ---
    {
      code: 'in_dhanteras_2026',
      name: 'Dhanteras',
      date: '2026-11-06',
      dayOfWeek: 'Friday',
      month: 11,
      type: 'Major Festival',
      category: 'festival',
      icon: '🪙',
      isGazetted: false,
      description: 'First day of Diwali festivities honoring Lord Dhanvantari and Goddess Lakshmi.'
    },
    {
      code: 'in_diwali_2026',
      name: 'Diwali (Deepavali)',
      date: '2026-11-08',
      dayOfWeek: 'Sunday',
      month: 11,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🪔',
      isGazetted: true,
      description: 'The national Festival of Lights illuminating homes across India with diyas and sweets.'
    },
    {
      code: 'in_govardhan_puja_2026',
      name: 'Govardhan Puja',
      date: '2026-11-09',
      dayOfWeek: 'Monday',
      month: 11,
      type: 'Major Festival',
      category: 'festival',
      icon: '🌿',
      isGazetted: false,
      description: 'Commemorating the lifting of Govardhan Hill by Lord Krishna to protect residents of Gokul.'
    },
    {
      code: 'in_bhai_dooj_2026',
      name: 'Bhai Dooj',
      date: '2026-11-10',
      dayOfWeek: 'Tuesday',
      month: 11,
      type: 'Major Festival',
      category: 'festival',
      icon: '🌸',
      isGazetted: false,
      description: 'Traditional festival celebrating the sacred bond of protection and love between siblings.'
    },
    {
      code: 'in_chhath_puja_2026',
      name: 'Chhath Puja',
      date: '2026-11-15',
      dayOfWeek: 'Sunday',
      month: 11,
      type: 'Major Festival',
      category: 'festival',
      icon: '🌅',
      isGazetted: false,
      description: 'Ancient Vedic Sun worship festival offering prayers to Surya Devta and Chhathi Maiya.'
    },
    {
      code: 'in_guru_nanak_jayanti_2026',
      name: 'Guru Nanak Jayanti (Gurpurab)',
      date: '2026-11-24',
      dayOfWeek: 'Tuesday',
      month: 11,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '☬',
      isGazetted: true,
      description: 'Celebrating the birth anniversary of Guru Nanak Dev Ji, founder of Sikhism.'
    },

    // --- DECEMBER ---
    {
      code: 'in_christmas_eve_2026',
      name: 'Christmas Eve',
      date: '2026-12-24',
      dayOfWeek: 'Thursday',
      month: 12,
      type: 'Major Festival',
      category: 'festival',
      icon: '🔔',
      isGazetted: false,
      description: 'Evening preceding Christmas Day celebrated with prayers, carols, and gift exchanges.'
    },
    {
      code: 'in_christmas_2026',
      name: 'Christmas Day',
      date: '2026-12-25',
      dayOfWeek: 'Friday',
      month: 12,
      type: 'Gazetted Holiday',
      category: 'festival',
      icon: '🎄',
      isGazetted: true,
      description: 'Worldwide celebration of the birth of Jesus Christ.'
    },
    {
      code: 'in_new_year_eve_2026',
      name: "New Year's Eve",
      date: '2026-12-31',
      dayOfWeek: 'Thursday',
      month: 12,
      type: 'Major Festival',
      category: 'festival',
      icon: '🎆',
      isGazetted: false,
      description: 'Welcoming the coming year with joyful family and community gatherings.'
    }
  ]
};

// Mirror for 2025
MAJOR_INDIAN_HOLIDAYS_MASTER[2025] = (MAJOR_INDIAN_HOLIDAYS_MASTER[2026] || []).map(item => ({
  ...item,
  code: item.code.replace('2026', '2025'),
  date: item.date.replace('2026-', '2025-')
}));

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
   * Return master list of holidays covering all 12 months for a given year
   */
  getMasterHolidaysForYear(year = 2026) {
    return MAJOR_INDIAN_HOLIDAYS_MASTER[year] || MAJOR_INDIAN_HOLIDAYS_MASTER[2026];
  },

  /**
   * Fetch online Google Calendar / Indian festival feed or return curated fallback
   */
  async fetchLiveOrCuratedFestivals(year = 2026) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s quick timeout

      const res = await fetch(`https://namantam1.github.io/holidays?format=json&country=indian`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const yearStr = String(year);
          const master = this.getMasterHolidaysForYear(year);

          // Merge live data with our curated master
          const merged = [...master];
          data.forEach(item => {
            if (item.date && item.date.startsWith(yearStr)) {
              const exists = merged.some(m => m.date === item.date);
              if (!exists) {
                merged.push({
                  code: `live_${item.date}`,
                  name: item.name || 'Festival',
                  date: item.date,
                  dayOfWeek: new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
                  month: parseInt(item.date.split('-')[1], 10),
                  type: 'Major Festival',
                  category: 'festival',
                  icon: '🪔',
                  isGazetted: false,
                  description: item.description || 'Indian public holiday.'
                });
              }
            }
          });

          return merged.sort((a, b) => a.date.localeCompare(b.date));
        }
      }
    } catch {
      // Seamlessly fallback to our rich 12-month master
    }

    return this.getMasterHolidaysForYear(year);
  },

  /**
   * Get all suggested holidays for the year, annotated with confirmation status
   */
  async getSuggestedHolidays(year = 2026) {
    const masterList = await this.fetchLiveOrCuratedFestivals(year);
    const confirmed = getConfirmedHolidays();

    return masterList.map(item => {
      const existingRecord = confirmed.find(c => 
        c.date === item.date && 
        (c.name?.toLowerCase().trim() === item.name.toLowerCase().trim() || c.code === item.code)
      );

      const isConfirmed = !!existingRecord;

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
  async confirmHolidayAsCompanyOff(suggestedHoliday, adminUser) {
    const confirmed = getConfirmedHolidays();

    // Check if duplicate exists
    const existingIdx = confirmed.findIndex(c => 
      c.date === suggestedHoliday.date && 
      (c.name?.toLowerCase().trim() === suggestedHoliday.name.toLowerCase().trim() || c.code === suggestedHoliday.code)
    );

    const payload = {
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
      confirmedAt: new Date().toISOString()
    };

    // Attempt cloud database write
    try {
      const res = await fetch(`${API_BASE}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?._id) payload._id = json.data._id;
      }
    } catch {}

    if (!payload._id) {
      payload._id = `hol_conf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    if (existingIdx !== -1) {
      confirmed[existingIdx] = { ...confirmed[existingIdx], ...payload };
    } else {
      confirmed.push(payload);
    }

    saveConfirmedHolidays(confirmed);
    return payload;
  },

  /**
   * Admin / HR 1-Click: Confirm ALL suggested holidays for the year as Company Holidays
   */
  async confirmAllSuggestedHolidays(year = 2026, adminUser) {
    const suggested = await this.getSuggestedHolidays(year);
    const confirmed = getConfirmedHolidays();
    let newlyAddedCount = 0;

    for (const item of suggested) {
      const alreadyConfirmed = confirmed.some(c => 
        c.date === item.date && 
        (c.name?.toLowerCase().trim() === item.name.toLowerCase().trim() || c.code === item.code)
      );

      if (!alreadyConfirmed) {
        const newRecord = {
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
        };

        // Try backend write
        try {
          fetch(`${API_BASE}/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord)
          }).catch(() => {});
        } catch {}

        confirmed.push(newRecord);
        newlyAddedCount++;
      }
    }

    saveConfirmedHolidays(confirmed);
    return { newlyAddedCount, totalConfirmed: confirmed.length };
  },

  /**
   * Admin / HR: Cancel / Revert / Delete an accidental holiday (Restores regular work day)
   */
  async cancelOrDeleteHoliday(holidayIdentifier, adminUser) {
    let confirmed = getConfirmedHolidays();
    const target = confirmed.find(c => 
      c._id === holidayIdentifier || 
      c.code === holidayIdentifier || 
      c.date === holidayIdentifier ||
      c.name?.toLowerCase().trim() === String(holidayIdentifier).toLowerCase().trim()
    );

    // 1. Send DELETE to backend MongoDB Atlas if ID exists
    const delId = target?._id || holidayIdentifier;
    try {
      await fetch(`${API_BASE}/holidays/${delId}`, {
        method: 'DELETE'
      });
    } catch {}

    // 2. Remove from local confirmed storage
    confirmed = confirmed.filter(c => 
      c._id !== holidayIdentifier && 
      c.code !== holidayIdentifier && 
      c.date !== holidayIdentifier &&
      c.name?.toLowerCase().trim() !== String(holidayIdentifier).toLowerCase().trim()
    );

    saveConfirmedHolidays(confirmed);

    // 3. Dispatch events
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.HOLIDAYS } }));
    window.dispatchEvent(new CustomEvent('ems_holidays_updated', { detail: { cancelledHoliday: target || holidayIdentifier } }));

    return { success: true, cancelledName: target?.name || 'Holiday' };
  },

  /**
   * Sync and Upgrade: Replaces stale hardcoded stub data with rich 12-month calendar
   */
  autoUpgradeStaleHolidays(year = 2026) {
    try {
      let current = getConfirmedHolidays();
      // Detect if user has only old stub data (e.g. <= 14 records or has obsolete foundation day)
      const hasObsoleteFoundation = current.some(c => c.date === '2026-10-15' && (c.name?.toLowerCase().includes('foundation') || c.title?.toLowerCase().includes('foundation')));
      const isStaleStub = current.length <= 14 || hasObsoleteFoundation;

      if (isStaleStub) {
        const master = this.getMasterHolidaysForYear(year);
        // Filter out obsolete foundation
        current = current.filter(c => !(c.date === '2026-10-15' && (c.name?.toLowerCase().includes('foundation') || c.title?.toLowerCase().includes('foundation'))));

        // Add missing gazetted and national holidays with icons
        master.forEach(m => {
          const exists = current.some(c => c.date === m.date);
          if (!exists && m.isGazetted) {
            current.push({
              _id: `hol_${m.code}`,
              code: m.code,
              name: m.name,
              holidayName: m.name,
              title: m.name,
              date: m.date,
              dayOfWeek: m.dayOfWeek,
              type: m.type,
              category: m.category,
              icon: m.icon,
              isGazetted: m.isGazetted,
              isConfirmed: true,
              confirmedBy: 'Admin',
              description: m.description,
              createdAt: new Date().toISOString()
            });
          }
        });

        current.sort((a, b) => a.date.localeCompare(b.date));
        saveConfirmedHolidays(current);
      }
      return current;
    } catch {
      return getConfirmedHolidays();
    }
  }
};
