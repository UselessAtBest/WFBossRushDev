window.addEventListener("DOMContentLoaded", async () => {
  try {
    const toggle = document.getElementById("themeToggle");
    const root = document.documentElement;

    const themes = ["labra-mode", "light-mode", "dark-mode"];

    const applyTheme = theme => {
      root.classList.remove("light-mode", "dark-mode");
      if (theme === "light-mode" || theme === "dark-mode") root.classList.add(theme);
      localStorage.setItem("theme", theme);

      if (theme === "light-mode") toggle.textContent = "☀️";
      else if (theme === "dark-mode") toggle.textContent = "🌙";
      else toggle.textContent = "🐾"; // labra default
    };

    let savedTheme = localStorage.getItem("theme");
    if (!savedTheme || !themes.includes(savedTheme)) savedTheme = "labra-mode";
    applyTheme(savedTheme);

    const cycleTheme = () => {
      let current = localStorage.getItem("theme") || "labra-mode";
      let nextIndex = (themes.indexOf(current) + 1) % themes.length;
      applyTheme(themes[nextIndex]);
    };

    toggle.addEventListener("click", cycleTheme);

    await Randomizer.init();
    Inventory.init();

    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

    const handleHeaderRoll = (poolName, title) => {
      const item = Randomizer.rollPool(poolName);
      if (!item) return;
      const catText = item.category.map(capitalize).join(", ");
      const typeText = item.type.map(capitalize).join(", ");
      const msg = `<p class="popup-title">${title}</p><p><strong>${item.name}</strong><br>${catText} ${typeText}</p>`;
      UI.showInfoPopup(msg);
    };

    const btnBig = document.getElementById("randomBtnA");
    if (btnBig) btnBig.addEventListener("click", () => handleHeaderRoll("A", "General Pool Roll"));

    const btnSmall = document.getElementById("randomBtnB");
    if (btnSmall) btnSmall.addEventListener("click", () => handleHeaderRoll("B", "Boss Pool Roll"));

    const multiRoll = (countA, countB) => {
      const rolledItems = [];
      for (let i = 0; i < countA; i++) {
        const itemA = Randomizer.rollPool("A", false, true);
        if (itemA) {
          rolledItems.push(itemA);
          Inventory.addItem(itemA);
        }
      }
      for (let j = 0; j < countB; j++) {
        const itemB = Randomizer.rollPool("B", false, true);
        if (itemB) {
          rolledItems.push(itemB);
          Inventory.addItem(itemB);
        }
      }
      // Save inventory after multi-roll
      UI.saveInventory();
      return rolledItems;
    };

const btnMulti = document.getElementById("multiRollBtn");
if (btnMulti) {
  btnMulti.addEventListener("click", () => {
    // Perform the multi-roll exactly as before
    multiRoll(60, 30);

    // Disable multi-roll button until reset
    btnMulti.disabled = true;

    // Enable SP buttons in the grid so they can be clicked and show popups
    const grid = document.getElementById("buttonGrid");
    const spButtons = grid.querySelectorAll("button[data-sp='true']");
    spButtons.forEach(btn => {
      // Only enable if not already used
      if (!btn.dataset.used || btn.dataset.used === "false") btn.disabled = false;
    });

    // No need to save button states here; UI.buildButtonGrid click listeners handle it
  });
};



    const buttonsData = await (await fetch("data/buttons.json")).json();
    window.buttonsData = buttonsData; // <-- expose globally
    UI.buildButtonGrid(buttonsData);

    // Bind Reset All button
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => UI.resetAll(buttonsData));
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("noIntro")) {
      await UI.showIntroPopup("data/intro.html", attachPopupLinks);
    }

    // Header buttons
    const aboutBtn = document.getElementById("aboutBtn");
    if (aboutBtn) aboutBtn.addEventListener("click", e => {
      e.preventDefault();
      UI.showIntroPopup("data/intro.html", attachPopupLinks);
    });

    const faqBtn = document.getElementById("faqBtn");
    if (faqBtn) faqBtn.addEventListener("click", e => {
      e.preventDefault();
      UI.showIntroPopup("data/faq.html", attachPopupLinks);
    });

    const howBtn = document.getElementById("howBtn");
    if (howBtn) howBtn.addEventListener("click", e => {
      e.preventDefault();
      UI.showIntroPopup("data/howto.html", attachPopupLinks);
    });


    function attachPopupLinks(popup) {
      try {
        const themeLink = popup.querySelector("#themeLink");
        if (themeLink) {
          themeLink.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            cycleTheme();
          });
        }
      } catch (err) {
        console.warn("Popup link listener error", err);
      }
    }
  } catch (err) {
    console.error("Error initializing page:", err);
  }


  const resetBtnpopup = document.getElementById("resetBtnpopup");
if (resetBtnpopup) resetBtnpopup.addEventListener("click", e => {
  e.preventDefault();
  UI.showIntroPopup("data/reset.html", popup => {
    // Attach button listeners AFTER popup is loaded
    const closeBtn = popup.querySelector("#closePopupBtn");
    const resetBtn = popup.querySelector("#confirmResetBtn");

    if (closeBtn) closeBtn.addEventListener("click", () => {
      const overlay = popup.parentElement; // the overlay div
      if (overlay) overlay.remove();
    });

    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (window.buttonsData) {
        UI.resetAll(window.buttonsData);
      }
      const overlay = popup.parentElement;
      if (overlay) overlay.remove();
    });
  });
});


});
