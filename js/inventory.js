const Inventory = {
  items: [],
  currentCategory: "all",
  currentSubtab: null,
  subtabOptions: {
    warframe: ["warframe", "mods"],
    primary: ["weapons", "mods"],
    secondary: ["weapons", "mods"],
    melee: ["weapons", "mods"],
    all: ["warframe", "weapons", "mods"]
  },

  // Initialize inventory from localStorage
  init: function() {
    const saved = localStorage.getItem("inventory");
    if (saved) {
      try {
        this.items = JSON.parse(saved);
      } catch (err) {
        console.error("Failed to load inventory:", err);
        this.items = [];
      }
    }

    // Setup main tabs
    document.querySelectorAll("#mainTabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        this.currentCategory = "all";
        this.currentSubtab = null;
        this.setActive("#mainTabs", btn);
        this.clearActive("#categoryTabs");
        this.buildSubtabs();
        this.render();
      });
    });

    // Setup category tabs
    document.querySelectorAll("#categoryTabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        this.currentCategory = btn.dataset.tab;
        this.currentSubtab = null;
        this.setActive("#categoryTabs", btn);
        this.clearActive("#mainTabs");
        this.buildSubtabs();
        this.render();
      });
    });

    this.setActive("#mainTabs", document.querySelector("#mainTabs button[data-tab='all']"));
    this.buildSubtabs();
    this.render();
  },

  // Save inventory to localStorage
  save: function() {
    try {
      localStorage.setItem("inventory", JSON.stringify(this.items));
    } catch (err) {
      console.error("Failed to save inventory:", err);
    }
  },

  // Add a new item (accepts single item or array)
  addItem: function(item) {
    const itemsToAdd = Array.isArray(item) ? item : [item];
    const newItems = [];

    itemsToAdd.forEach(i => {
      if (!i || !i.name) return;
      if (!Array.isArray(i.category)) i.category = [i.category];
      if (!Array.isArray(i.type)) i.type = [i.type];

      const exists = this.items.find(x => x.name === i.name && x.sourcePool === i.sourcePool);
      if (exists) return;

      i._id = crypto.randomUUID();
      this.items.push(i);
      newItems.push(i);
    });

    if (newItems.length > 0) this.save();
    this.render(newItems);
  },

  // Remove an item by its _id
  removeItem: function(id) {
    this.items = this.items.filter(i => i._id !== id);
    this.save();
    this.render();
  },

refundItem: function(item) {
  // Remove the old item
  this.items = this.items.filter(i => i._id !== item._id);
  this.save();

  const sourcePool = item?.sourcePool || "A";
  let newItem = null;
  try {
    newItem = Randomizer.rollPool(sourcePool, true);
  } catch (err) {
    console.error("Reroll failed:", err);
  }

  let popupMsg = `<p class="popup-title">Reroll</p><p>No item available from pool ${sourcePool}.</p>`;

  if (newItem) {
    const catText = Array.isArray(newItem.category) ? newItem.category.join(", ") : (newItem.category || "");
    const typeText = Array.isArray(newItem.type) ? newItem.type.join(", ") : (newItem.type || "");
    popupMsg = `<p class="popup-title">Rerolled:</p><p><strong>${newItem.name}</strong><br>${catText} ${typeText}</p>`;

    // Only add if not duplicate
    const exists = this.items.find(i => i.name === newItem.name && i.sourcePool === newItem.sourcePool);
    if (!exists) {
      newItem._id = crypto.randomUUID();
      this.items.push(newItem);
      this.save();
      this.render([newItem]);
    } else {
      // Still render normally to ensure UI updates
      this.render();
    }
  } else {
    this.render();
  }

  // Show the popup after render
  if (typeof UI?.showInfoPopup === "function") {
    UI.showInfoPopup(popupMsg);
  }
},





  // Clear all inventory
  clear: function() {
    this.items = [];
    this.save();
    this.render();
  },

  // Build subtabs based on current category
  buildSubtabs: function() {
    const subtabContainer = document.getElementById("subTabs");
    if (!subtabContainer) return;
    subtabContainer.innerHTML = "";

    const group = this.currentCategory === "all" ? "all" : this.currentCategory;
    this.subtabOptions[group].forEach(option => {
      const btn = document.createElement("button");
      btn.textContent = this.capitalize(option);
      btn.dataset.subtab = option;
      btn.addEventListener("click", () => {
        this.currentSubtab = option;
        this.setActive("#subTabs", btn);
        this.render();
      });
      subtabContainer.appendChild(btn);
    });

    this.currentSubtab = null;
    this.clearActive("#subTabs");
  },

  // Set active button styling
  setActive: function(groupSelector, activeBtn) {
    document.querySelectorAll(`${groupSelector} button`).forEach(b => b.classList.remove("active"));
    if (activeBtn) activeBtn.classList.add("active");
  },

  // Clear active button styling
  clearActive: function(groupSelector) {
    document.querySelectorAll(`${groupSelector} button`).forEach(b => b.classList.remove("active"));
  },

  // Capitalize string
  capitalize: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Render inventory DOM
  render: function(newItems = []) {
    const list = document.getElementById("inventoryList");
    if (!list) return;

    list.innerHTML = ""; // Clear existing items

    let filtered = [...this.items];

    if (this.currentCategory !== "all") {
      filtered = filtered.filter(i =>
        i.category.map(c => c.toLowerCase()).includes(this.currentCategory) ||
        i.category.map(c => c.toLowerCase()).includes("all")
      );
    }

    if (this.currentSubtab) {
      filtered = filtered.filter(i =>
        i.type.map(t => t.toLowerCase()).includes(this.currentSubtab)
      );
    }

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-message">Inventory is empty.</div>';
      return;
    }

    filtered.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "inventory-item";
      div.dataset.id = item._id;
      div.style.opacity = 0;
      div.style.transform = "translateX(30px)";
      div.style.transition = "all 0.15s ease";

      const content = document.createElement("div");
      content.className = "inventory-content";

      const shownCategory = item.displayCategory || item.category.map(this.capitalize).join(", ");
      const shownType = item.displayType || item.type.map(this.capitalize).join(", ");
      let details = shownCategory;
      if (!shownType.toLowerCase().includes(shownCategory.toLowerCase())) {
        details += `, ${shownType}`;
      }

      const span = document.createElement("span");
      span.textContent = `${item.name} (${details})`;
      content.appendChild(span);

      const btnContainer = document.createElement("div");
      btnContainer.className = "inventory-btns";

const refundBtn = document.createElement("button");
refundBtn.className = "refund-btn";
refundBtn.textContent = "↩ Reroll";
refundBtn.addEventListener("click", () => this.refundItem(item));


      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "✖";
      removeBtn.addEventListener("click", () => this.removeItem(item._id));

      btnContainer.appendChild(refundBtn);
      btnContainer.appendChild(removeBtn);
      content.appendChild(btnContainer);
      div.appendChild(content);
      list.appendChild(div);

      // Animate only new items
      if (newItems.find(n => n._id === item._id)) {
        setTimeout(() => {
          div.style.opacity = 1;
          div.style.transform = "translateX(0)";
        }, index * 50);
      } else {
        div.style.opacity = 1;
        div.style.transform = "translateX(0)";
      }
    });
  }
};

// Auto-init on page load
document.addEventListener("DOMContentLoaded", () => Inventory.init());
