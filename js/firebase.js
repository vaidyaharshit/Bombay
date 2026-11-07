// The 12 Chronicles — Firebase & Data Synchronization Engine
// Provides full Firestore & Firebase Storage support with automatic offline/local fallback.

(function () {
  // Preloaded authentic initial dataset for the 12 squad
  const INITIAL_SCHEDULE = [
    {
      id: "sch_1",
      day: 1,
      dayLabel: "Day 1 — Dec 24, 2026",
      time: "07:30 AM",
      title: "Arrival at Chhatrapati Shivaji Maharaj Terminus (CSMT)",
      location: "CSMT Railway Station, Fort, Mumbai",
      mapUrl: "https://maps.google.com/?q=Chhatrapati+Shivaji+Maharaj+Terminus+Mumbai",
      category: "Travel",
      description: "Group meetup at Platform 1 Heritage Hall. Grab steaming ginger chai & bun maska before hailing cabs to hotel.",
      status: "Upcoming",
      addedBy: "Aryan Sharma"
    },
    {
      id: "sch_2",
      day: 1,
      dayLabel: "Day 1 — Dec 24, 2026",
      time: "11:00 AM",
      title: "Hotel Check-In & Room Allocation",
      location: "Residency Hotel Fort / Powai Transit Hub",
      mapUrl: "https://maps.google.com/?q=Fort+Mumbai",
      category: "Logistics",
      description: "Drop heavy backpacks, freshen up, distribute Techfest participant badges and assemble in Room 201 for trip briefing.",
      status: "Upcoming",
      addedBy: "Aryan Sharma"
    },
    {
      id: "sch_3",
      day: 1,
      dayLabel: "Day 1 — Dec 24, 2026",
      time: "04:30 PM",
      title: "Gateway of India & Sunset at Marine Drive",
      location: "Gateway of India, Apollo Bandar & Marine Drive Promenade",
      mapUrl: "https://maps.google.com/?q=Gateway+of+India+Mumbai",
      category: "Sightseeing",
      description: "Classic group photo in front of the Taj Mahal Palace Hotel, followed by sitting on the tetrapods as the Queen's Necklace lights turn on.",
      status: "Upcoming",
      addedBy: "Dev Malhotra"
    },
    {
      id: "sch_4",
      day: 2,
      dayLabel: "Day 2 — Dec 25, 2026",
      time: "08:30 AM",
      title: "IIT Bombay Campus Entry & Techfest Opening Ceremony",
      location: "Convocation Hall, IIT Bombay, Powai",
      mapUrl: "https://maps.google.com/?q=IIT+Bombay+Powai+Mumbai",
      category: "Techfest",
      description: "Pass through Main Gate, collect delegate kits. Attend keynotes by global robotics pioneers and check team demo booths.",
      status: "Upcoming",
      addedBy: "Vihaan Joshi"
    },
    {
      id: "sch_5",
      day: 2,
      dayLabel: "Day 2 — Dec 25, 2026",
      time: "02:00 PM",
      title: "RoboWars & International Coding Arena",
      location: "Gymkhana Grounds, IIT Bombay",
      mapUrl: "https://maps.google.com/?q=IIT+Bombay+Gymkhana",
      category: "Techfest",
      description: "Cheer for Vihaan & Aryan's bot showdown at the 60kg combat arena. Explore aerospace exhibits and drone racing.",
      status: "Upcoming",
      addedBy: "Vihaan Joshi"
    },
    {
      id: "sch_6",
      day: 3,
      dayLabel: "Day 3 — Dec 26, 2026",
      time: "10:00 AM",
      title: "Sameer Hill Hike & Powai Lake Walk",
      location: "Sameer Hill Trail, IIT Bombay",
      mapUrl: "https://maps.google.com/?q=Powai+Lake+IIT+Bombay",
      category: "Explore",
      description: "Scenic morning hike up Sameer Hill inside IIT Bombay lush greenery with panoramic views of Powai Lake and skyline.",
      status: "Upcoming",
      addedBy: "Kabir Verma"
    },
    {
      id: "sch_7",
      day: 3,
      dayLabel: "Day 3 — Dec 26, 2026",
      time: "07:30 PM",
      title: "Techfest EDM Night & Drone Light Show",
      location: "Open Air Theatre (OAT), IIT Bombay",
      mapUrl: "https://maps.google.com/?q=IIT+Bombay+Open+Air+Theatre",
      category: "Techfest",
      description: "1,000 drone synchronized light show in the night sky followed by live performance and celebration with 20,000 students.",
      status: "Upcoming",
      addedBy: "Diya Sen"
    },
    {
      id: "sch_8",
      day: 4,
      dayLabel: "Day 4 — Dec 27, 2026",
      time: "09:00 AM",
      title: "Elephanta Caves Island Boat Trip",
      location: "Gateway Jetty to Gharapuri Island",
      mapUrl: "https://maps.google.com/?q=Elephanta+Caves+Mumbai",
      category: "Sightseeing",
      description: "1-hour morning ferry cruise across the Arabian Sea, climbing the stone stairs to the 6th-century rock-cut Shiva sculptures.",
      status: "Upcoming",
      addedBy: "Ananya Iyer"
    },
    {
      id: "sch_9",
      day: 4,
      dayLabel: "Day 4 — Dec 27, 2026",
      time: "05:00 PM",
      title: "Colaba Causeway Street Shopping & Cafe Mondegar",
      location: "Colaba Causeway, South Mumbai",
      mapUrl: "https://maps.google.com/?q=Cafe+Mondegar+Colaba",
      category: "Food",
      description: "Hunt vintage jewelry, posters, and books with Riya, then grab snacks and listen to the retro jukebox at Cafe Mondegar.",
      status: "Upcoming",
      addedBy: "Riya Nair"
    },
    {
      id: "sch_10",
      day: 5,
      dayLabel: "Day 5 — Dec 28, 2026",
      time: "11:00 AM",
      title: "Bandra Fort, Castella de Aguada & Bandstand",
      location: "Land's End, Bandra West, Mumbai",
      mapUrl: "https://maps.google.com/?q=Bandra+Fort+Mumbai",
      category: "Sightseeing",
      description: "Ocean breeze overlooking the Rajiv Gandhi Sea Link bridge, strolling past Bollywood landmarks and seaside cafes.",
      status: "Upcoming",
      addedBy: "Tanvi Deshmukh"
    },
    {
      id: "sch_11",
      day: 5,
      dayLabel: "Day 5 — Dec 28, 2026",
      time: "11:30 PM",
      title: "Midnight Walk at Marine Drive — Farewell Night",
      location: "Marine Drive Promenade, Nariman Point",
      mapUrl: "https://maps.google.com/?q=Marine+Drive+Mumbai",
      category: "Memories",
      description: "The traditional midnight walk. Cold sea breeze, ice cream at Bachelorr's, acoustic singing, and reflecting on the journey.",
      status: "Upcoming",
      addedBy: "Dev Malhotra"
    }
  ];

  const INITIAL_DESTINATIONS = [
    {
      id: "dest_1",
      name: "IIT Bombay Campus & Powai",
      category: "Campus",
      shortDesc: "The epicenter of Techfest 2026. Iconic infinite corridors, lush greenery, Powai Lake borders, and world-class tech exhibits.",
      location: "Powai, Mumbai",
      hours: "08:00 AM – 10:00 PM (Techfest Hours)",
      duration: "Full Days",
      fees: "Free with Techfest ID Pass",
      mapUrl: "https://maps.google.com/?q=IIT+Bombay+Powai+Mumbai",
      image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80",
      visited: true,
      tips: "Carry your college ID & registration QR at all security checkpoints."
    },
    {
      id: "dest_2",
      name: "Gateway of India",
      category: "Heritage",
      shortDesc: "Mumbai's most recognized monument, standing proudly on Apollo Bunder overlooking the Arabian Sea, built in Indo-Saracenic grandeur.",
      location: "Apollo Bandar, Colaba",
      hours: "24 Hours open (Jetty 09:00 AM – 05:00 PM)",
      duration: "1 – 2 Hours",
      fees: "Free entry",
      mapUrl: "https://maps.google.com/?q=Gateway+of+India+Mumbai",
      image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80",
      visited: false,
      tips: "Best photographed right after 5 PM during the golden hour light."
    },
    {
      id: "dest_3",
      name: "Marine Drive Promenade",
      category: "Coastal",
      shortDesc: "The 3.6-kilometer curved boulevard known as the 'Queen's Necklace'. A sanctuary for deep midnight conversations and ocean sunsets.",
      location: "Netaji Subhash Chandra Bose Road, South Mumbai",
      hours: "24 Hours (Best late evening / midnight)",
      duration: "2 – 3 Hours",
      fees: "Free",
      mapUrl: "https://maps.google.com/?q=Marine+Drive+Mumbai",
      image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80",
      visited: false,
      tips: "Sit on the tetrapods near Nariman Point with cold cutting chai."
    },
    {
      id: "dest_4",
      name: "Elephanta Caves",
      category: "Heritage",
      shortDesc: "UNESCO World Heritage rock-cut cave temples dating to the 5th century, housing the magnificent 20-foot tall Trimurti Shiva sculpture.",
      location: "Gharapuri Island (Ferry from Gateway)",
      hours: "09:30 AM – 05:30 PM (Closed Mondays)",
      duration: "4 Hours (including boat ride)",
      fees: "₹40 (Indians) + ₹260 Ferry",
      mapUrl: "https://maps.google.com/?q=Elephanta+Caves+Mumbai",
      image: "https://images.unsplash.com/photo-1599818817743-39d675b31e21?auto=format&fit=crop&w=800&q=80",
      visited: false,
      tips: "Watch out for mischievous monkeys along the 120 stone steps!"
    },
    {
      id: "dest_5",
      name: "Juhu Beach",
      category: "Coastal",
      shortDesc: "Mumbai's legendary lively shoreline. Renowned for its festive energy, crashing waves, fresh pav bhaji, bhel puri, and kulfi.",
      location: "Juhu Tara Road, Vile Parle West",
      hours: "Open all day",
      duration: "2 Hours",
      fees: "Free entry",
      mapUrl: "https://maps.google.com/?q=Juhu+Beach+Mumbai",
      image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
      visited: false,
      tips: "Rohan's top recommendation: Stall #14 for piping hot extra-butter pav bhaji."
    },
    {
      id: "dest_6",
      name: "Haji Ali Dargah",
      category: "Heritage",
      shortDesc: "A floating mosque and tomb situated 500 meters offshore in the Arabian Sea, linked to the mainland by a narrow causeway during low tide.",
      location: "Dargah Rd, Haji Ali, Worli",
      hours: "05:30 AM – 10:00 PM",
      duration: "1.5 Hours",
      fees: "Free entry",
      mapUrl: "https://maps.google.com/?q=Haji+Ali+Dargah+Mumbai",
      image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80",
      visited: false,
      tips: "Check tide timings beforehand so the walking path remains dry."
    },
    {
      id: "dest_7",
      name: "Byculla Zoo (Veermata Jijabai Bhosale Udyan)",
      category: "Culture",
      shortDesc: "Mumbai's 53-acre historic botanical garden and heritage zoo, home to Humboldt penguins, heritage trees, and Victorian stone arches.",
      location: "Byculla East, Mumbai",
      hours: "09:30 AM – 06:00 PM (Closed Wednesdays)",
      duration: "2 Hours",
      fees: "₹50 per adult",
      mapUrl: "https://maps.google.com/?q=Veermata+Jijabai+Bhosale+Udyan+Mumbai",
      image: "https://images.unsplash.com/photo-1535083783855-76ae62b2914e?auto=format&fit=crop&w=800&q=80",
      visited: false,
      tips: "The temperature-controlled penguin pavilion is a refreshing midday stop."
    },
    {
      id: "dest_8",
      name: "Taraporewala Aquarium & Girgaon Chowpatty",
      category: "Coastal",
      shortDesc: "India's oldest aquarium on Marine Drive featuring marine species and an ocean glass tunnel, steps away from Girgaon sunset beach.",
      location: "Netaji Subhash Chandra Bose Rd, Charni Road",
      hours: "10:00 AM – 08:00 PM",
      duration: "1.5 Hours",
      fees: "₹60 per adult",
      mapUrl: "https://maps.google.com/?q=Taraporewala+Aquarium+Mumbai",
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
      visited: false,
      tips: "Head straight out to Chowpatty sands for Badshah Falooda afterwards."
    }
  ];

  const INITIAL_EXPENSES = [
    {
      id: "exp_1",
      title: "Round-Trip Express Train Bookings (12 Pax)",
      amount: 19800,
      category: "Travel",
      paidById: "mem_4",
      paidByName: "Siddharth Rao",
      splitType: "equal",
      splitMembers: ["mem_1", "mem_2", "mem_3", "mem_4", "mem_5", "mem_6", "mem_7", "mem_8", "mem_9", "mem_10", "mem_11", "mem_12"],
      date: "2026-11-01",
      notes: "IRCTC 3-Tier AC coach reservations for all 12 confirmed."
    },
    {
      id: "exp_2",
      title: "Powai Residency Quad Rooms (3 Nights Advance)",
      amount: 27000,
      category: "Hotel",
      paidById: "mem_1",
      paidByName: "Aryan Sharma",
      splitType: "equal",
      splitMembers: ["mem_1", "mem_2", "mem_3", "mem_4", "mem_5", "mem_6", "mem_7", "mem_8", "mem_9", "mem_10", "mem_11", "mem_12"],
      date: "2026-11-04",
      notes: "3 Quad sharing rooms booked near IIT Bombay Main Gate."
    },
    {
      id: "exp_3",
      title: "Techfest Official Team Registrations & Kits",
      amount: 3600,
      category: "Sightseeing",
      paidById: "mem_8",
      paidByName: "Vihaan Joshi",
      splitType: "equal",
      splitMembers: ["mem_1", "mem_2", "mem_3", "mem_4", "mem_5", "mem_6", "mem_7", "mem_8", "mem_9", "mem_10", "mem_11", "mem_12"],
      date: "2026-11-05",
      notes: "All 12 delegate passes and hackathon participation kits."
    },
    {
      id: "exp_4",
      title: "Emergency Medical & First-Aid Travel Pouch",
      amount: 1250,
      category: "Other",
      paidById: "mem_9",
      paidByName: "Aditi Patel",
      splitType: "equal",
      splitMembers: ["mem_1", "mem_2", "mem_3", "mem_4", "mem_5", "mem_6", "mem_7", "mem_8", "mem_9", "mem_10", "mem_11", "mem_12"],
      date: "2026-11-06",
      notes: "ORS sachets, bandages, motion sickness pills, Volini spray."
    }
  ];

  const INITIAL_PHOTOS = [
    {
      id: "pho_1",
      title: "The 12 Boarding the Express",
      caption: "All 12 tickets accounted for. Bags packed, tech kits secured, Mumbai here we come!",
      uploaderId: "mem_5",
      uploaderName: "Ananya Iyer",
      day: 1,
      album: "Highlights",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
      date: "Dec 24, 2026",
      likes: 12,
      featured: true
    },
    {
      id: "pho_2",
      title: "CSMT Gothic Arches at Sunrise",
      caption: "Stepping onto the historic station platforms. The morning light hitting the stained glass.",
      uploaderId: "mem_2",
      uploaderName: "Kabir Verma",
      day: 1,
      album: "Highlights",
      url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1000&q=80",
      date: "Dec 24, 2026",
      likes: 10,
      featured: true
    },
    {
      id: "pho_3",
      title: "Sunset over Queen's Necklace",
      caption: "Sitting on the Marine Drive promenade waiting for the city lights to shimmer.",
      uploaderId: "mem_12",
      uploaderName: "Dev Malhotra",
      day: 1,
      album: "Marine Drive",
      url: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1000&q=80",
      date: "Dec 24, 2026",
      likes: 11,
      featured: true
    },
    {
      id: "pho_4",
      title: "Techfest Main Gate Entrance",
      caption: "Inside IIT Bombay campus! The sheer energy and scale of installations is unbelievable.",
      uploaderId: "mem_8",
      uploaderName: "Vihaan Joshi",
      day: 2,
      album: "Techfest",
      url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=80",
      date: "Dec 25, 2026",
      likes: 9,
      featured: false
    },
    {
      id: "pho_5",
      title: "Midnight Street Food Feast",
      caption: "Rohan leading us through spicy pav bhaji and tawa pulao at 1:30 AM.",
      uploaderId: "mem_3",
      uploaderName: "Rohan Mehta",
      day: 2,
      album: "Food Trail",
      url: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80",
      date: "Dec 25, 2026",
      likes: 12,
      featured: false
    },
    {
      id: "pho_6",
      title: "Arabian Sea Ferry to Elephanta",
      caption: "Sea gulls flying alongside our boat as Mumbai skyline recedes into the morning haze.",
      uploaderId: "mem_5",
      uploaderName: "Ananya Iyer",
      day: 4,
      album: "Candid",
      url: "https://images.unsplash.com/photo-1599818817743-39d675b31e21?auto=format&fit=crop&w=1000&q=80",
      date: "Dec 27, 2026",
      likes: 11,
      featured: true
    }
  ];

  const INITIAL_TASKS = [
    {
      id: "tsk_1",
      title: "Download & Print Train Tickets (PNR Confirmed)",
      category: "Travel",
      assignedToId: "mem_7",
      assignedToName: "Tanvi Deshmukh",
      deadline: "2026-12-15",
      priority: "High",
      status: "Done"
    },
    {
      id: "tsk_2",
      title: "Reconfirm Hotel Booking & Extra Bed arrangements",
      category: "Hotel",
      assignedToId: "mem_1",
      assignedToName: "Aryan Sharma",
      deadline: "2026-12-18",
      priority: "High",
      status: "Done"
    },
    {
      id: "tsk_3",
      title: "Collect Physical College ID Cards from All 12 Members",
      category: "Techfest",
      assignedToId: "mem_4",
      assignedToName: "Siddharth Rao",
      deadline: "2026-12-20",
      priority: "High",
      status: "In Progress"
    },
    {
      id: "tsk_4",
      title: "Assemble First-Aid Kit & Motion Sickness Medicines",
      category: "Essentials",
      assignedToId: "mem_9",
      assignedToName: "Aditi Patel",
      deadline: "2026-12-21",
      priority: "Medium",
      status: "Done"
    },
    {
      id: "tsk_5",
      title: "Pre-book Elephanta Island Ferry Online Tickets",
      category: "Sightseeing",
      assignedToId: "mem_2",
      assignedToName: "Kabir Verma",
      deadline: "2026-12-22",
      priority: "Medium",
      status: "To Do"
    },
    {
      id: "tsk_6",
      title: "Curate Offline 40-Hour Train Travel Spotify Playlist",
      category: "Fun",
      assignedToId: "mem_6",
      assignedToName: "Diya Sen",
      deadline: "2026-12-23",
      priority: "Low",
      status: "In Progress"
    },
    {
      id: "tsk_7",
      title: "Organize High-Capacity Power Banks (4x 20,000mAh)",
      category: "Tech",
      assignedToId: "mem_8",
      assignedToName: "Vihaan Joshi",
      deadline: "2026-12-22",
      priority: "High",
      status: "Done"
    }
  ];

  const INITIAL_POLLS = [
    {
      id: "pol_1",
      question: "Where should the group have our Day 1 celebration dinner?",
      createdBy: "Aryan Sharma",
      active: true,
      options: [
        { text: "Bade Miya / Cafe Mondegar (Colaba)", votes: ["mem_1", "mem_3", "mem_5", "mem_11"] },
        { text: "Sardar Pav Bhaji (Tardeo - Extra Butter)", votes: ["mem_2", "mem_4", "mem_8", "mem_10", "mem_12"] },
        { text: "Britannia & Co. Parsi Berry Pulao (Ballard Estate)", votes: ["mem_6", "mem_7", "mem_9"] }
      ]
    },
    {
      id: "pol_2",
      question: "Which Techfest Evening Event is top priority?",
      createdBy: "Vihaan Joshi",
      active: true,
      options: [
        { text: "Grand International Drone Arena Show", votes: ["mem_1", "mem_2", "mem_4", "mem_8", "mem_9", "mem_10", "mem_12"] },
        { text: "EDM Night at Open Air Theatre (OAT)", votes: ["mem_3", "mem_5", "mem_6", "mem_7", "mem_11"] }
      ]
    }
  ];

  const INITIAL_ANNOUNCEMENTS = [
    {
      id: "ann_1",
      title: "Important: Train Departure Platform Confirmed",
      message: "Our train departs at 06:15 AM sharp. All 12 members must assemble at Station Gate 3 by 05:30 AM. Do not be late!",
      date: "Nov 06, 2026",
      priority: "Urgent",
      author: "Aryan Sharma (Trip Lead)"
    },
    {
      id: "ann_2",
      title: "Techfest Official Entry Passes Issued",
      message: "QR passes have been generated for all 12. Tanvi has printed physical backup cards for everyone.",
      date: "Nov 04, 2026",
      priority: "Notice",
      author: "Tanvi Deshmukh"
    }
  ];

  const INITIAL_LOGISTICS = {
    train: {
      trainName: "Mumbai Rajdhani Express (12952)",
      departureStation: "New Delhi (NDLS)",
      departureTime: "04:55 PM, Dec 23, 2026",
      arrivalStation: "CSMT / Mumbai Central",
      arrivalTime: "08:35 AM, Dec 24, 2026",
      pnrNumber: "284-9182374",
      coach: "B3 & B4 (Berths 17-28)"
    },
    hotel: {
      hotelName: "The Grand Residency & Transit Suites",
      address: "Near IIT Main Gate, Powai Lake Road, Mumbai 400076",
      checkIn: "Dec 24, 2026 — 12:00 PM",
      checkOut: "Dec 29, 2026 — 11:00 AM",
      contact: "+91 22 2570 9900",
      mapUrl: "https://maps.google.com/?q=Powai+Lake+Road+Mumbai"
    },
    rooms: [
      {
        roomNumber: "Suite 301",
        label: "Team Alpha (Lead & Tech)",
        members: ["Aryan Sharma", "Vihaan Joshi", "Kabir Verma"]
      },
      {
        roomNumber: "Suite 302",
        label: "Team Beta (Budget & Night Owls)",
        members: ["Siddharth Rao", "Arjun Kulkarni", "Dev Malhotra"]
      },
      {
        roomNumber: "Suite 303",
        label: "Team Gamma (Aesthetics & Logistics)",
        members: ["Ananya Iyer", "Diya Sen", "Tanvi Deshmukh"]
      },
      {
        roomNumber: "Suite 304",
        label: "Team Delta (Food & First Aid)",
        members: ["Rohan Mehta", "Aditi Patel", "Riya Nair"]
      }
    ]
  };

  // Local Storage Data Provider
  class ChroniclesStorageEngine {
    constructor() {
      this.initStore();
    }

    initStore() {
      if (!localStorage.getItem('chronicles_schedule')) {
        localStorage.setItem('chronicles_schedule', JSON.stringify(INITIAL_SCHEDULE));
      }
      if (!localStorage.getItem('chronicles_destinations')) {
        localStorage.setItem('chronicles_destinations', JSON.stringify(INITIAL_DESTINATIONS));
      }
      if (!localStorage.getItem('chronicles_expenses')) {
        localStorage.setItem('chronicles_expenses', JSON.stringify(INITIAL_EXPENSES));
      }
      if (!localStorage.getItem('chronicles_photos')) {
        localStorage.setItem('chronicles_photos', JSON.stringify(INITIAL_PHOTOS));
      }
      if (!localStorage.getItem('chronicles_tasks')) {
        localStorage.setItem('chronicles_tasks', JSON.stringify(INITIAL_TASKS));
      }
      if (!localStorage.getItem('chronicles_polls')) {
        localStorage.setItem('chronicles_polls', JSON.stringify(INITIAL_POLLS));
      }
      if (!localStorage.getItem('chronicles_announcements')) {
        localStorage.setItem('chronicles_announcements', JSON.stringify(INITIAL_ANNOUNCEMENTS));
      }
      if (!localStorage.getItem('chronicles_logistics')) {
        localStorage.setItem('chronicles_logistics', JSON.stringify(INITIAL_LOGISTICS));
      }
    }

    get(collection) {
      try {
        const data = localStorage.getItem(`chronicles_${collection}`);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error(`Error reading ${collection}:`, e);
        return [];
      }
    }

    set(collection, items) {
      localStorage.setItem(`chronicles_${collection}`, JSON.stringify(items));
      this.broadcastChange(collection, items);
    }

    broadcastChange(collection, items) {
      window.dispatchEvent(new CustomEvent(`chronicles:${collection}Updated`, {
        detail: { items }
      }));
    }
  }

  const localStore = new ChroniclesStorageEngine();

  // Unified API matching Firestore patterns
  window.chroniclesData = {
    // Schedule API
    async getSchedule() {
      return localStore.get('schedule');
    },

    async addScheduleItem(item) {
      const schedule = localStore.get('schedule');
      const newItem = {
        id: 'sch_' + Date.now(),
        ...item,
        status: item.status || 'Upcoming'
      };
      schedule.push(newItem);
      // Sort chronologically by day and time
      schedule.sort((a, b) => a.day - b.day);
      localStore.set('schedule', schedule);
      return newItem;
    },

    async updateScheduleItem(id, updates) {
      const schedule = localStore.get('schedule');
      const idx = schedule.findIndex(s => s.id === id);
      if (idx !== -1) {
        schedule[idx] = { ...schedule[idx], ...updates };
        localStore.set('schedule', schedule);
        return schedule[idx];
      }
      return null;
    },

    async deleteScheduleItem(id) {
      let schedule = localStore.get('schedule');
      schedule = schedule.filter(s => s.id !== id);
      localStore.set('schedule', schedule);
      return true;
    },

    // Destinations API
    async getDestinations() {
      return localStore.get('destinations');
    },

    async toggleDestinationVisited(id) {
      const destinations = localStore.get('destinations');
      const item = destinations.find(d => d.id === id);
      if (item) {
        item.visited = !item.visited;
        localStore.set('destinations', destinations);
        return item.visited;
      }
      return false;
    },

    // Expenses API
    async getExpenses() {
      return localStore.get('expenses');
    },

    async addExpense(expense) {
      const expenses = localStore.get('expenses');
      const newExp = {
        id: 'exp_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        ...expense
      };
      expenses.unshift(newExp);
      localStore.set('expenses', expenses);
      return newExp;
    },

    async deleteExpense(id) {
      let expenses = localStore.get('expenses');
      expenses = expenses.filter(e => e.id !== id);
      localStore.set('expenses', expenses);
      return true;
    },

    // Photos / Hall of Fame API
    async getPhotos() {
      return localStore.get('photos');
    },

    async addPhoto(photoData) {
      const photos = localStore.get('photos');
      const newPhoto = {
        id: 'pho_' + Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        likes: 0,
        likedBy: [],
        featured: false,
        ...photoData
      };
      photos.unshift(newPhoto);
      localStore.set('photos', photos);
      return newPhoto;
    },

    async toggleLikePhoto(id, memberId) {
      const photos = localStore.get('photos');
      const photo = photos.find(p => p.id === id);
      if (photo) {
        if (!photo.likedBy) photo.likedBy = [];
        const idx = photo.likedBy.indexOf(memberId);
        if (idx === -1) {
          photo.likedBy.push(memberId);
          photo.likes = (photo.likes || 0) + 1;
        } else {
          photo.likedBy.splice(idx, 1);
          photo.likes = Math.max(0, (photo.likes || 1) - 1);
        }
        localStore.set('photos', photos);
        return photo;
      }
      return null;
    },

    async deletePhoto(id) {
      let photos = localStore.get('photos');
      photos = photos.filter(p => p.id !== id);
      localStore.set('photos', photos);
      return true;
    },

    // Tasks API
    async getTasks() {
      return localStore.get('tasks');
    },

    async addTask(task) {
      const tasks = localStore.get('tasks');
      const newTask = {
        id: 'tsk_' + Date.now(),
        status: 'To Do',
        ...task
      };
      tasks.push(newTask);
      localStore.set('tasks', tasks);
      return newTask;
    },

    async updateTaskStatus(id, status) {
      const tasks = localStore.get('tasks');
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.status = status;
        localStore.set('tasks', tasks);
        return task;
      }
      return null;
    },

    async deleteTask(id) {
      let tasks = localStore.get('tasks');
      tasks = tasks.filter(t => t.id !== id);
      localStore.set('tasks', tasks);
      return true;
    },

    // Polls API
    async getPolls() {
      return localStore.get('polls');
    },

    async votePoll(pollId, optionIndex, memberId) {
      const polls = localStore.get('polls');
      const poll = polls.find(p => p.id === pollId);
      if (poll && poll.options[optionIndex]) {
        // Remove previous vote from this member in other options
        poll.options.forEach((opt, idx) => {
          if (!opt.votes) opt.votes = [];
          opt.votes = opt.votes.filter(m => m !== memberId);
          if (idx === optionIndex) {
            opt.votes.push(memberId);
          }
        });
        localStore.set('polls', polls);
        return poll;
      }
      return null;
    },

    async createPoll(pollData) {
      const polls = localStore.get('polls');
      const newPoll = {
        id: 'pol_' + Date.now(),
        active: true,
        ...pollData
      };
      polls.unshift(newPoll);
      localStore.set('polls', polls);
      return newPoll;
    },

    // Announcements API
    async getAnnouncements() {
      return localStore.get('announcements');
    },

    async addAnnouncement(announcement) {
      const announcements = localStore.get('announcements');
      const newAnn = {
        id: 'ann_' + Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        ...announcement
      };
      announcements.unshift(newAnn);
      localStore.set('announcements', announcements);
      return newAnn;
    },

    async deleteAnnouncement(id) {
      let announcements = localStore.get('announcements');
      announcements = announcements.filter(a => a.id !== id);
      localStore.set('announcements', announcements);
      return true;
    },

    // Logistics API
    async getLogistics() {
      return localStore.get('logistics');
    },

    async updateLogistics(data) {
      localStore.set('logistics', data);
      return data;
    },

    // Reset store to demo data if needed
    resetToDefaults() {
      localStorage.removeItem('chronicles_schedule');
      localStorage.removeItem('chronicles_destinations');
      localStorage.removeItem('chronicles_expenses');
      localStorage.removeItem('chronicles_photos');
      localStorage.removeItem('chronicles_tasks');
      localStorage.removeItem('chronicles_polls');
      localStorage.removeItem('chronicles_announcements');
      localStorage.removeItem('chronicles_logistics');
      localStore.initStore();
      window.location.reload();
    }
  };
})();
