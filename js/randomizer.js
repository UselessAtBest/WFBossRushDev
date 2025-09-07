const Randomizer = (() => {
  let poolNormal = [];
  let poolLimited = [];
  const globalItemsMap = new Map();

  async function init() {
    const normalData = await (await fetch("data/poolNormal.json")).json();
    const limitedData = await (await fetch("data/poolLimited.json")).json();

    const allItems = [...normalData, ...limitedData];

    allItems.forEach(item => {
      const name = item.name.trim();
      if (!globalItemsMap.has(name)) {
        globalItemsMap.set(name, { ...item, _remaining: item.rerolls ?? Infinity });
      }
    });

    poolNormal = normalData.map(item => globalItemsMap.get(item.name.trim()));
    poolLimited = limitedData.map(item => globalItemsMap.get(item.name.trim()));
  }

  function refundRoll(item) {
    const globalItem = globalItemsMap.get(item.name.trim());
    if (globalItem) globalItem._remaining++;

    // Show popup only for rerolls
    const catText = item.category?.map(c => capitalize(c)).join(", ") || "";
    const typeText = item.type?.map(t => capitalize(t)).join(", ") || "";
    const msg = `<p class="popup-title">You Rerolled:</p>
                 <p><strong>${item.name}</strong><br>${catText} ${typeText}</p>`;
    UI.showInfoPopup(msg);
  }

  function rollPool(type, addToInventory = true) {
    const pool = type === "A" ? poolNormal : poolLimited;

    const available = pool.filter(i => i._remaining > 0);
    if (available.length === 0) return null;

    // Weighted random selection
    const totalWeight = available.reduce((sum, i) => sum + (i.weight ?? 1), 0);
    let rand = Math.random() * totalWeight;

    let selectedItem;
    for (let item of available) {
      rand -= (item.weight ?? 1);
      if (rand <= 0) {
        selectedItem = item;
        break;
      }
    }
    if (!selectedItem) selectedItem = available[available.length - 1];

    selectedItem._remaining--;

    const rolledItem = { ...selectedItem, sourcePool: type };

    if (addToInventory) Inventory.addItem(rolledItem);

    return rolledItem;
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return { init, refundRoll, rollPool };
})();
