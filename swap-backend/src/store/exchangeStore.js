const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "exchanges.json");

let loaded = false;
const exchanges = new Map();

function load() {
  if (loaded) return;
  loaded = true;

  if (!fs.existsSync(DATA_FILE)) return;

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const records = JSON.parse(raw);

    if (Array.isArray(records)) {
      records.forEach((record) => {
        if (record?.id) exchanges.set(record.id, record);
      });
    }
  } catch (error) {
    console.warn(`Could not read ${DATA_FILE}: ${error.message}`);
  }
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(Array.from(exchanges.values()), null, 2)
  );
}

function getExchange(id) {
  load();
  return exchanges.get(String(id || ""));
}

function saveExchange(record) {
  load();

  if (!record?.id) {
    throw new Error("Exchange record must include an id");
  }

  exchanges.set(record.id, record);
  persist();
  return record;
}

function updateExchange(id, updater) {
  load();

  const current = exchanges.get(String(id || ""));
  if (!current) return null;

  const next =
    typeof updater === "function" ? updater(current) : { ...current, ...updater };

  exchanges.set(next.id, next);
  persist();
  return next;
}

module.exports = {
  getExchange,
  saveExchange,
  updateExchange,
};
