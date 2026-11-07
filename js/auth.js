// The 12 Chronicles — Squad Members & Authentication System
// Defines the 12 verified friends, their roles, and auth states.

const SQUAD_MEMBERS = [
  {
    id: "mem_1",
    name: "Aryan Sharma",
    nickname: "The Captain",
    email: "aryan@12chronicles.trip",
    role: "Admin",
    tripRole: "Trip Lead & Techfest Hackathon Head",
    funFact: "Has an alarm for 5 AM but hits snooze 7 times. Holds the master Excel sheet.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11001",
    collegeId: "IITB-REG-2026-001"
  },
  {
    id: "mem_2",
    name: "Kabir Verma",
    nickname: "Navigator",
    email: "kabir@12chronicles.trip",
    role: "Member",
    tripRole: "Maps, Routes & Metro Master",
    funFact: "Knows every Mumbai Local train route by memory. Dislikes Google Maps recalculating.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11002",
    collegeId: "IITB-REG-2026-002"
  },
  {
    id: "mem_3",
    name: "Rohan Mehta",
    nickname: "The Foodie",
    email: "rohan@12chronicles.trip",
    role: "Member",
    tripRole: "Vada Pav & Street Food Connoisseur",
    funFact: "Can evaluate the quality of a stall solely by the chutney smell from 50 meters away.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11003",
    collegeId: "IITB-REG-2026-003"
  },
  {
    id: "mem_4",
    name: "Siddharth Rao",
    nickname: "Finance Czar",
    email: "siddharth@12chronicles.trip",
    role: "Admin",
    tripRole: "Budget Keeper & Splitwise Guru",
    funFact: "Sends UPI payment reminders within 3 minutes of the bill arriving at the table.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11004",
    collegeId: "IITB-REG-2026-004"
  },
  {
    id: "mem_5",
    name: "Ananya Iyer",
    nickname: "Shutterbug",
    email: "ananya@12chronicles.trip",
    role: "Member",
    tripRole: "Chief Photographer & Aesthetics Lead",
    funFact: "Carries 3 camera lenses and refuses to eat until photos of the meal are aesthetic.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11005",
    collegeId: "IITB-REG-2026-005"
  },
  {
    id: "mem_6",
    name: "Diya Sen",
    nickname: "The Vibe",
    email: "diya@12chronicles.trip",
    role: "Member",
    tripRole: "Music Playlists & Energy Booster",
    funFact: "Created a 42-hour roadtrip playlist with transition crossfades timed to sunset.",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11006",
    collegeId: "IITB-REG-2026-006"
  },
  {
    id: "mem_7",
    name: "Tanvi Deshmukh",
    nickname: "Scheduler",
    email: "tanvi@12chronicles.trip",
    role: "Member",
    tripRole: "Timeline Keeper & PNR Tracker",
    funFact: "Calculates buffer time for traffic down to the exact second. Holds color-coded stickers.",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11007",
    collegeId: "IITB-REG-2026-007"
  },
  {
    id: "mem_8",
    name: "Vihaan Joshi",
    nickname: "Tech Wizard",
    email: "vihaan@12chronicles.trip",
    role: "Member",
    tripRole: "IIT Bombay Robotics Competitor",
    funFact: "Brought a soldering iron and 4 Arduino kits in his backpack as 'casual luggage'.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11008",
    collegeId: "IITB-REG-2026-008"
  },
  {
    id: "mem_9",
    name: "Aditi Patel",
    nickname: "The Doc",
    email: "aditi@12chronicles.trip",
    role: "Member",
    tripRole: "First-Aid, Essentials & Safety Lead",
    funFact: "Has band-aids, ORS, electral, blister patches and 4 types of antacids in her pouch.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11009",
    collegeId: "IITB-REG-2026-009"
  },
  {
    id: "mem_10",
    name: "Arjun Kulkarni",
    nickname: "Late-Night Maestro",
    email: "arjun@12chronicles.trip",
    role: "Member",
    tripRole: "Board Games, Mafia & Night Talks",
    funFact: "Undefeated in late night Mafia for 3 consecutive college fests.",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11010",
    collegeId: "IITB-REG-2026-010"
  },
  {
    id: "mem_11",
    name: "Riya Nair",
    nickname: "Souvenir Scout",
    email: "riya@12chronicles.trip",
    role: "Member",
    tripRole: "Colaba Causeway & Shopping Queen",
    funFact: "Can bargain a ₹1200 jacket down to ₹350 without breaking eye contact.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11011",
    collegeId: "IITB-REG-2026-011"
  },
  {
    id: "mem_12",
    name: "Dev Malhotra",
    nickname: "Night Owl",
    email: "dev@12chronicles.trip",
    role: "Member",
    tripRole: "Marine Drive Midnight Strolls Lead",
    funFact: "Genuinely believes Mumbai is 500% better between 2:00 AM and 5:00 AM.",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
    phone: "+91 98201 11012",
    collegeId: "IITB-REG-2026-012"
  }
];

class AuthService {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    // Check saved session
    const savedUserId = localStorage.getItem('chronicles_active_member_id');
    if (savedUserId) {
      this.currentUser = SQUAD_MEMBERS.find(m => m.id === savedUserId) || SQUAD_MEMBERS[0];
    } else {
      // Default to Aryan Sharma (Admin) so the user experiences full interactive capabilities immediately
      this.currentUser = SQUAD_MEMBERS[0];
      localStorage.setItem('chronicles_active_member_id', this.currentUser.id);
    }
    
    // Listen for cross-tab auth change
    window.addEventListener('storage', (e) => {
      if (e.key === 'chronicles_active_member_id') {
        this.currentUser = SQUAD_MEMBERS.find(m => m.id === e.newValue) || SQUAD_MEMBERS[0];
        this.notifyAuthChanged();
      }
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'Admin';
  }

  getAllMembers() {
    return SQUAD_MEMBERS;
  }

  getMemberById(id) {
    return SQUAD_MEMBERS.find(m => m.id === id);
  }

  switchMember(memberId) {
    const member = SQUAD_MEMBERS.find(m => m.id === memberId);
    if (member) {
      this.currentUser = member;
      localStorage.setItem('chronicles_active_member_id', member.id);
      this.notifyAuthChanged();
      return member;
    }
    return null;
  }

  loginWithInviteCode(code, memberId) {
    // Secret invite code for the 12 squad: TECHFEST2026 or BOMBAY12
    const validCodes = ['TECHFEST2026', 'BOMBAY12', 'CHRONICLES2026'];
    const cleanCode = (code || '').trim().toUpperCase();
    if (validCodes.includes(cleanCode)) {
      return this.switchMember(memberId);
    }
    throw new Error('Invalid squad invite code. Use code: TECHFEST2026');
  }

  notifyAuthChanged() {
    window.dispatchEvent(new CustomEvent('chronicles:authChanged', {
      detail: { user: this.currentUser, isAdmin: this.isAdmin() }
    }));
  }
}

window.authService = new AuthService();
