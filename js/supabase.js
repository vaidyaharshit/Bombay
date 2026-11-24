// The 12 Chronicles — Supabase Data Synchronization Engine
// Powers PostgreSQL tables, Realtime subscriptions, and Supabase Storage.

(function () {
  "use strict";

  const DEFAULT_CATEGORIES = ["Food", "Travel", "Hotel", "Sightseeing", "Shopping", "Other"];

  function getClient() {
    if (window.authService && window.authService.supabase) {
      return window.authService.supabase;
    }
    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.supabase) {
      const cfg = window.supabaseConfig;
      if (!window._supabaseDataClient) {
        window._supabaseDataClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      }
      return window._supabaseDataClient;
    }
    return null;
  }

  function getAuthUser() {
    return (window.authService && window.authService.getCurrentUser()) || {
      uid: "squad-editor",
      id: "squad-editor",
      fullName: "Harshit Vaidya (Admin)",
      name: "Harshit Vaidya",
      role: "Admin"
    };
  }

  function requireExpenseManager() {
    return getAuthUser();
  }

  function normalizeExpense(row) {
    const s = row || {};
    const splitBetween = Array.isArray(s.split_between) ? s.split_between : [];
    return {
      id: s.id || "",
      title: s.title || "",
      description: s.description || "",
      amount: Number(s.amount || 0),
      category: s.category || "Other",
      date: s.date || "",
      paidById: s.paid_by_id || "",
      paidByName: s.paid_by_name || "",
      splitType: s.split_type || "equal",
      splitBetween: splitBetween,
      splitMembers: splitBetween,
      paymentStatus: s.payment_status || "pending",
      createdBy: s.created_by || "",
      createdByName: s.created_by_name || s.paid_by_name || "",
      createdAt: s.created_at || s.date || "",
      updatedBy: s.updated_by || "",
      updatedByName: s.updated_by_name || "",
      updatedAt: s.updated_at || s.created_at || ""
    };
  }

  function normalizeDestination(row) {
    const s = row || {};
    return {
      id: s.id || s.place_id || "",
      placeId: s.place_id || s.id || "",
      osmId: s.osm_id || "",
      osmType: s.osm_type || "",
      name: s.name || "",
      description: s.description || "",
      address: s.address || "",
      coordinates: s.coordinates || null,
      category: s.category || "Destination",
      photos: Array.isArray(s.photos) ? s.photos : [],
      photoUrl: s.photo_url || "",
      wikipediaUrl: s.wikipedia_url || "",
      osmUrl: s.osm_url || "",
      website: s.website || "",
      phone: s.phone || "",
      openingHours: s.opening_hours || "",
      entryFee: s.entry_fee || "",
      bestTime: s.best_time || "",
      visitorTips: s.visitor_tips || "",
      accessibility: s.accessibility || "",
      status: s.status || "Yet to Visit",
      visited: !!s.visited,
      addedById: s.added_by_id || "",
      addedByName: s.added_by_name || "",
      addedAt: s.added_at || ""
    };
  }

  window.chroniclesData = {
    // ------------------------------------------------------------------------
    // EXPENSES API (Supabase PostgreSQL + Realtime)
    // ------------------------------------------------------------------------
    async getExpenses() {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      if (error) {
        console.error("Error fetching expenses from Supabase:", error);
        throw new Error(error.message || "Could not load expenses.");
      }
      return (data || []).map(normalizeExpense);
    },

    subscribeExpenses(callback) {
      const client = getClient();
      if (!client) {
        callback([]);
        return () => {};
      }

      this.getExpenses().then(callback).catch(console.error);

      const channel = client
        .channel("realtime:expenses")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "expenses" },
          () => {
            this.getExpenses().then(callback).catch(console.error);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    },

    async addExpense(expense) {
      const user = requireExpenseManager();
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const splitBetween = Array.isArray(expense.splitBetween)
        ? expense.splitBetween
        : (Array.isArray(expense.splitMembers) ? expense.splitMembers : []);

      const payload = {
        title: String(expense.title || "").trim(),
        description: String(expense.description || "").trim(),
        amount: Number(expense.amount || 0),
        category: expense.category || "Other",
        date: expense.date ? new Date(expense.date).toISOString() : new Date().toISOString(),
        paid_by_id: expense.paidById || user.uid,
        paid_by_name: expense.paidByName || user.fullName,
        split_type: expense.splitType || "equal",
        split_between: splitBetween,
        payment_status: expense.paymentStatus || "pending",
        created_by: user.uid,
        created_by_name: user.fullName,
        updated_by: user.uid,
        updated_by_name: user.fullName
      };

      const { data, error } = await client
        .from("expenses")
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Could not save expense.");
      }
      return normalizeExpense(data);
    },

    async updateExpense(id, updates) {
      const user = requireExpenseManager();
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const dbUpdates = {
        updated_by: user.uid,
        updated_by_name: user.fullName,
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) dbUpdates.title = String(updates.title).trim();
      if (updates.description !== undefined) dbUpdates.description = String(updates.description).trim();
      if (updates.amount !== undefined) dbUpdates.amount = Number(updates.amount || 0);
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.date !== undefined) dbUpdates.date = new Date(updates.date).toISOString();
      if (updates.paidById !== undefined) dbUpdates.paid_by_id = updates.paidById;
      if (updates.paidByName !== undefined) dbUpdates.paid_by_name = updates.paidByName;
      if (updates.splitType !== undefined) dbUpdates.split_type = updates.splitType;
      if (updates.splitBetween !== undefined) dbUpdates.split_between = updates.splitBetween;
      if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;

      const { data, error } = await client
        .from("expenses")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Could not update expense.");
      }
      return normalizeExpense(data);
    },

    async updateExpensePaymentStatus(id, status) {
      if (["pending", "paid", "settled"].indexOf(status) === -1) {
        throw new Error("Invalid payment status.");
      }
      return this.updateExpense(id, { paymentStatus: status });
    },

    async deleteExpense(id) {
      requireExpenseManager();
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const { error } = await client
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message || "Could not delete expense.");
      }
      return true;
    },

    async getExpenseCategories() {
      const client = getClient();
      if (!client) return DEFAULT_CATEGORIES.slice();

      const { data, error } = await client
        .from("expense_categories")
        .select("categories")
        .eq("id", "default")
        .maybeSingle();

      if (!error && data && Array.isArray(data.categories) && data.categories.length) {
        return data.categories;
      }
      return DEFAULT_CATEGORIES.slice();
    },

    async saveExpenseCategories(categories) {
      requireExpenseManager();
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const clean = Array.from(new Set((categories || []).map(function (c) {
        return String(c || "").trim();
      }).filter(Boolean)));

      if (!clean.length) {
        throw new Error("Please keep at least one expense category.");
      }

      const user = getAuthUser();
      const { error } = await client
        .from("expense_categories")
        .upsert({
          id: "default",
          categories: clean,
          updated_by: user ? user.uid : null,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(error.message || "Could not save expense categories.");
      }

      window.dispatchEvent(new CustomEvent("chronicles:expenseCategoriesUpdated", {
        detail: { categories: clean }
      }));
      return clean;
    },

    // ------------------------------------------------------------------------
    // EXPLORE DESTINATIONS API (Realtime Shared Mumbai Places)
    // ------------------------------------------------------------------------
    async getDestinations() {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client
        .from("explore_destinations")
        .select("*")
        .order("added_at", { ascending: false });
      if (error) {
        console.error("Error fetching destinations:", error);
        return [];
      }
      return (data || []).map(normalizeDestination);
    },

    subscribeDestinations(callback) {
      const client = getClient();
      if (!client) {
        callback([]);
        return () => {};
      }

      this.getDestinations().then(callback).catch(console.error);

      const channel = client
        .channel("realtime:explore_destinations")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "explore_destinations" },
          () => {
            this.getDestinations().then(callback).catch(console.error);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    },

    async addDestination(destination) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const user = getAuthUser();

      const id = destination.placeId || destination.id || "dest_" + Date.now();
      const payload = {
        id: id,
        place_id: destination.placeId || id,
        osm_id: destination.osmId ? String(destination.osmId) : null,
        osm_type: destination.osmType || null,
        name: String(destination.name || "").trim(),
        description: destination.description || "",
        address: destination.address || "",
        coordinates: destination.coordinates || null,
        category: destination.category || "Destination",
        photos: Array.isArray(destination.photos) ? destination.photos : [],
        photo_url: destination.photoUrl || "",
        wikipedia_url: destination.wikipediaUrl || "",
        osm_url: destination.osmUrl || "",
        website: destination.website || "",
        phone: destination.phone || "",
        opening_hours: destination.openingHours || "",
        entry_fee: destination.entryFee || "",
        best_time: destination.bestTime || "",
        visitor_tips: destination.visitorTips || "",
        accessibility: destination.accessibility || "",
        status: destination.status || "Yet to Visit",
        visited: !!destination.visited,
        added_by_id: user ? user.uid : null,
        added_by_name: user ? user.fullName : "A squad member"
      };

      const { data, error } = await client
        .from("explore_destinations")
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") { // duplicate key
          return { exists: true };
        }
        throw new Error(error.message || "Could not add destination.");
      }
      return normalizeDestination(data);
    },

    async toggleDestinationVisited(id) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const { data: current } = await client
        .from("explore_destinations")
        .select("visited, status")
        .or(`id.eq.${id},place_id.eq.${id}`)
        .maybeSingle();

      if (!current) return false;

      const nextVisited = !current.visited;
      const nextStatus = nextVisited ? "Visited" : "Yet to Visit";

      const { error } = await client
        .from("explore_destinations")
        .update({ visited: nextVisited, status: nextStatus })
        .or(`id.eq.${id},place_id.eq.${id}`);

      if (error) {
        throw new Error(error.message || "Could not update visited status.");
      }
      return nextVisited;
    },

    async deleteDestination(id) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const { error } = await client
        .from("explore_destinations")
        .delete()
        .or(`id.eq.${id},place_id.eq.${id}`);

      if (error) {
        throw new Error(error.message || "Could not delete destination.");
      }
      return true;
    },

    // ------------------------------------------------------------------------
    // SCHEDULE API (Supabase PostgreSQL)
    // ------------------------------------------------------------------------
    async getSchedule() {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client
        .from("schedule")
        .select("*")
        .order("day", { ascending: true })
        .order("time", { ascending: true });
      if (error) {
        console.error("Error fetching schedule:", error);
        return [];
      }
      return (data || []).map(r => ({
        id: r.id,
        day: r.day,
        dayLabel: r.day_label,
        time: r.time,
        title: r.title,
        location: r.location,
        mapUrl: r.map_url,
        category: r.category,
        description: r.description,
        status: r.status,
        addedBy: r.added_by
      }));
    },

    async addScheduleItem(item) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const user = getAuthUser();

      const id = "sch_" + Date.now();
      const payload = {
        id: id,
        day: Number(item.day || 1),
        day_label: item.dayLabel || ("Day " + (item.day || 1)),
        time: item.time || "",
        title: String(item.title || "").trim(),
        location: item.location || "",
        map_url: item.mapUrl || "",
        category: item.category || "Activity",
        description: item.description || "",
        status: item.status || "Upcoming",
        added_by: user ? user.fullName : (item.addedBy || "Admin")
      };

      const { data, error } = await client
        .from("schedule")
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(error.message || "Could not add schedule item.");
      return data;
    },

    async updateScheduleItem(id, updates) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const payload = {};
      if (updates.day !== undefined) payload.day = Number(updates.day);
      if (updates.dayLabel !== undefined) payload.day_label = updates.dayLabel;
      if (updates.time !== undefined) payload.time = updates.time;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.mapUrl !== undefined) payload.map_url = updates.mapUrl;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;

      const { data, error } = await client
        .from("schedule")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message || "Could not update schedule item.");
      return data;
    },

    async deleteScheduleItem(id) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");

      const { error } = await client.from("schedule").delete().eq("id", id);
      if (error) throw new Error(error.message || "Could not delete schedule item.");
      return true;
    },

    // ------------------------------------------------------------------------
    // PHOTOS API (Hall of Fame Gallery + Supabase Storage)
    // ------------------------------------------------------------------------
    async getPhotos() {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching photos:", error);
        return [];
      }
      return (data || []).map(r => ({
        id: r.id,
        url: r.url,
        title: r.title,
        caption: r.caption,
        date: r.date,
        day: r.day,
        album: r.album,
        likes: r.likes || 0,
        likedBy: Array.isArray(r.liked_by) ? r.liked_by : [],
        uploaderId: r.uploader_id,
        uploaderName: r.uploader_name,
        featured: !!r.featured
      }));
    },

    async uploadPhoto(file) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const user = getAuthUser();
      if (!user) throw new Error("Please log in to upload photos.");

      const fileExt = file.name ? file.name.split(".").pop() : "jpg";
      const filePath = `${user.uid}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await client.storage
        .from("chronicles-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Could not upload image to Supabase Storage.");
      }

      const { data } = client.storage
        .from("chronicles-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    },

    async addPhoto(photoData) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const user = getAuthUser();

      const id = "pho_" + Date.now();
      const payload = {
        id: id,
        url: photoData.url,
        title: photoData.title || "",
        caption: photoData.caption || "",
        date: photoData.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        day: Number(photoData.day || 1),
        album: photoData.album || "All",
        likes: 0,
        liked_by: [],
        uploader_id: user ? user.uid : null,
        uploader_name: user ? user.fullName : (photoData.uploaderName || "Squad Member"),
        featured: !!photoData.featured
      };

      const { data, error } = await client
        .from("photos")
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(error.message || "Could not save photo record.");
      return data;
    },

    async toggleLikePhoto(id, memberId) {
      const client = getClient();
      if (!client) return null;

      const { data: photo } = await client
        .from("photos")
        .select("likes, liked_by")
        .eq("id", id)
        .single();

      if (!photo) return null;

      let likedBy = Array.isArray(photo.liked_by) ? photo.liked_by.slice() : [];
      let likes = Number(photo.likes || 0);

      const idx = likedBy.indexOf(memberId);
      if (idx === -1) {
        likedBy.push(memberId);
        likes += 1;
      } else {
        likedBy.splice(idx, 1);
        likes = Math.max(0, likes - 1);
      }

      const { data, error } = await client
        .from("photos")
        .update({ likes: likes, liked_by: likedBy })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async deletePhoto(id) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const { error } = await client.from("photos").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    },

    // ------------------------------------------------------------------------
    // TASKS & POLLS API (Planner)
    // ------------------------------------------------------------------------
    async getTasks() {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client.from("tasks").select("*").order("created_at", { ascending: true });
      if (error) return [];
      return (data || []).map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        assignedTo: r.assigned_to,
        dueDate: r.due_date,
        priority: r.priority,
        status: r.status
      }));
    },

    async addTask(task) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const payload = {
        id: "tsk_" + Date.now(),
        title: String(task.title || "").trim(),
        category: task.category || "General",
        assigned_to: task.assignedTo || "",
        due_date: task.dueDate || "",
        priority: task.priority || "Medium",
        status: task.status || "To Do"
      };
      const { data, error } = await client.from("tasks").insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    async updateTaskStatus(id, status) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const { data, error } = await client.from("tasks").update({ status: status }).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    async deleteTask(id) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const { error } = await client.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    },

    async getPolls() {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client.from("polls").select("*").order("created_at", { ascending: false });
      if (error) return [];
      return (data || []).map(r => ({
        id: r.id,
        question: r.question,
        createdBy: r.created_by,
        active: !!r.active,
        options: Array.isArray(r.options) ? r.options : []
      }));
    },

    async votePoll(pollId, optionIndex, memberId) {
      const client = getClient();
      if (!client) return null;

      const { data: poll } = await client.from("polls").select("options").eq("id", pollId).single();
      if (!poll || !poll.options || !poll.options[optionIndex]) return null;

      const options = poll.options.map((opt, idx) => {
        const votes = (Array.isArray(opt.votes) ? opt.votes : []).filter(m => m !== memberId);
        if (idx === optionIndex) {
          votes.push(memberId);
        }
        return { text: opt.text, votes: votes };
      });

      const { data, error } = await client.from("polls").update({ options: options }).eq("id", pollId).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    async createPoll(pollData) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const payload = {
        id: "pol_" + Date.now(),
        question: String(pollData.question || "").trim(),
        created_by: pollData.createdBy || "Squad Member",
        active: true,
        options: Array.isArray(pollData.options) ? pollData.options : []
      };
      const { data, error } = await client.from("polls").insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    // ------------------------------------------------------------------------
    // ANNOUNCEMENTS & LOGISTICS
    // ------------------------------------------------------------------------
    async getAnnouncements() {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) return [];
      return (data || []).map(r => ({
        id: r.id,
        title: r.title,
        message: r.message,
        date: r.date,
        priority: r.priority,
        author: r.author
      }));
    },

    async addAnnouncement(announcement) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const payload = {
        id: "ann_" + Date.now(),
        title: announcement.title || "",
        message: announcement.message || "",
        date: announcement.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        priority: announcement.priority || "Notice",
        author: announcement.author || "Trip Lead"
      };
      const { data, error } = await client.from("announcements").insert([payload]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    async deleteAnnouncement(id) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const { error } = await client.from("announcements").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    },

    async getLogistics() {
      const client = getClient();
      if (!client) return null;
      const { data, error } = await client.from("logistics").select("train, hotel, rooms").eq("id", "default").maybeSingle();
      if (error || !data) return null;
      return data;
    },

    async updateLogistics(data) {
      const client = getClient();
      if (!client) throw new Error("Supabase is not connected.");
      const { error } = await client.from("logistics").upsert({
        id: "default",
        train: data.train,
        hotel: data.hotel,
        rooms: data.rooms,
        updated_at: new Date().toISOString()
      });
      if (error) throw new Error(error.message);
      return data;
    }
  };
})();
