const UI = {
  // --- Inventory Persistence ---
  saveInventory() {
    Inventory.save();
  },

  loadInventory() {
    Inventory.init();
  },

  // --- Button state persistence ---
  saveButtonState(buttonsData) {
    localStorage.setItem("buttonsUsed", JSON.stringify(buttonsData.map(b => b.used || false)));
  },

  loadButtonState(buttonsData) {
    const saved = localStorage.getItem("buttonsUsed");
    if (saved) {
      try {
        const states = JSON.parse(saved);
        buttonsData.forEach((btn, i) => btn.used = states[i] || false);
      } catch (err) {
        console.error("Failed to load button states:", err);
      }
    }
  },

  // --- Reset All ---
  resetAll(buttonsData) {
    // Clear inventory
    Inventory.clear();

    // Reset all button data
    buttonsData.forEach(btn => {
      btn.used = false;
      if (btn.sp) btn.disabled = true; // SP buttons reset to disabled
    });

    // Save button states
    this.saveButtonState(buttonsData);

    // Rebuild button grid
    this.buildButtonGrid(buttonsData);

    // Re-enable the multi-roll button if it exists
    const multiRollBtn = document.getElementById("multiRollBtn");
    if (multiRollBtn) multiRollBtn.disabled = false;
  },

  bindResetButton(buttonsData) {
    const resetBtn = document.getElementById("resetBtn");
    if (!resetBtn) return;
    resetBtn.addEventListener("click", () => this.resetAll(buttonsData));
  },

  // --- Popups ---
  showIntroPopup: async function(filePath = "data/intro.html", afterLoad) {
    const overlay = document.createElement("div");
    overlay.id = "introOverlay";
    overlay.className = "popup-overlay";
    overlay.style.zIndex = 9999;

    const popup = document.createElement("div");
    popup.id = "introPopup";
    popup.className = "popup";
    popup.innerHTML = "Loading...";
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    try {
      const response = await fetch(filePath);
      const html = await response.text();
      popup.innerHTML = html;
      if (afterLoad) afterLoad(popup);
    } catch (err) {
      popup.innerHTML = "<p>Failed to load content.</p>";
      console.error(err);
    }

    requestAnimationFrame(() => {
      overlay.classList.add("show");
      popup.classList.add("show");
    });

    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        popup.classList.remove("show");
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 300);
      }
    });
  },

  showInfoPopup(message) {
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";
    overlay.style.zIndex = 9999;

    const popup = document.createElement("div");
    popup.className = "popup";
    popup.innerHTML = `<div class="popup-content">${message}</div>`;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add("show");
      popup.classList.add("show");
    });

    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        popup.classList.remove("show");
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 300);
      }
    });
  },

  // --- Build Button Grid ---
  buildButtonGrid(buttonsData) {
    const grid = document.getElementById("buttonGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const total = buttonsData.length;
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, auto)`;

    this.loadButtonState(buttonsData);

    buttonsData.forEach((btnData) => {
      const btn = document.createElement("button");
      // SP buttons start disabled unless used
      btn.disabled = btnData.sp && !btnData.used ? true : btnData.used || false;
      if (btnData.sp) btn.dataset.sp = "true";
      if (btnData.id) btn.id = btnData.id;

      if (btnData.image) {
        const img = document.createElement("img");
        img.src = btnData.image;
        img.className = "button-image";
        btn.appendChild(img);
      }

      const labelDiv = document.createElement("div");
      labelDiv.className = `button-label tier-${btnData.tier || 1}-label`;
      labelDiv.innerHTML = btnData.label || "";
      btn.appendChild(labelDiv);

      const nameDiv = document.createElement("div");
      nameDiv.className = "button-name";
      nameDiv.textContent = btnData.name || "";
      btn.appendChild(nameDiv);

      btn.classList.add(`tier-${btnData.tier || 1}-btn`);

btn.addEventListener("click", () => {
  if (btn.disabled) return;

  btnData.used = true;

  // Roll items
  const rolledItems = [];
  for (let i = 0; i < (btnData.rolls?.poolNormal || 0); i++) {
    const item = Randomizer.rollPool("A", true);
    if (item) rolledItems.push(item);
  }
  for (let i = 0; i < (btnData.rolls?.poolLimited || 0); i++) {
    const item = Randomizer.rollPool("B", true);
    if (item) rolledItems.push(item);
  }

  rolledItems.forEach(item => Inventory.addItem(item));
  this.saveInventory();
  this.saveButtonState(buttonsData);

  // Show popup first
  this.showRollPopup(btnData, rolledItems);

  // Then disable the button
  btn.disabled = true;
});


      grid.appendChild(btn);
    });
  },

  // --- Multi-roll SP button ---
  multiRollSP(buttonsData, countA, countB, multiBtnId) {
    const spButtons = buttonsData.filter(b => b.sp);
    const rolledItems = [];

    spButtons.forEach(btnData => {
      const normalRolls = btnData.rolls?.poolNormal || 0;
      for (let i = 0; i < normalRolls; i++) {
        const item = Randomizer.rollPool("A", true);
        if (item) rolledItems.push(item);
      }
      const limitedRolls = btnData.rolls?.poolLimited || 0;
      for (let i = 0; i < limitedRolls; i++) {
        const item = Randomizer.rollPool("B", true);
        if (item) rolledItems.push(item);
      }

      // Enable SP button after multi-roll
      const btn = document.getElementById(btnData.id);
      if (btn) btn.disabled = false;
    });

    rolledItems.forEach(item => Inventory.addItem(item));
    this.saveInventory();
    this.saveButtonState(buttonsData);

    // Disable multi-roll button until reset
    if (multiBtnId) {
      const multiBtn = document.getElementById(multiBtnId);
      if (multiBtn) multiBtn.disabled = true;
    }
  },

  // --- Roll popup ---
  showRollPopup(btnData, rolledItems) {
    const normalItems = rolledItems.filter(i => i.sourcePool === "A");
    const limitedItems = rolledItems.filter(i => i.sourcePool === "B");

    let popupHTML = btnData.popupMessage ? `<p>${btnData.popupMessage}</p>` : "";
    if (rolledItems.length) {
      popupHTML += `<p class="popup-title">You Unlocked:</p>`;
      if (normalItems.length) {
        popupHTML += `<p><strong>General Pool:</strong></p><ul class="roll-list">`;
        normalItems.forEach(i => popupHTML += `<li>${i.name} (${i.category || ""})</li>`);
        popupHTML += `</ul>`;
      }
      if (limitedItems.length) {
        popupHTML += `<hr class="roll-separator">`;
        popupHTML += `<p><strong>Boss Pool:</strong></p><ul class="roll-list">`;
        limitedItems.forEach(i => popupHTML += `<li>${i.name} (${i.category || ""})</li>`);
        popupHTML += `</ul>`;
      }
    }
    popupHTML += `<p class="click-to-close">Click outside to close</p>`;

    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";
    overlay.style.zIndex = 9999;

    const popup = document.createElement("div");
    popup.className = `popup multi-roll-popup tier-${btnData.tier}-popup`;
    popup.innerHTML = `<div class="popup-content">${popupHTML}</div>`;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add("show"));
    requestAnimationFrame(() => popup.classList.add("show"));

    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        popup.classList.remove("show");
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 300);
      }
    });
  }
};

// Auto-load inventory on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => UI.loadInventory());
