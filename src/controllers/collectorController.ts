import Route from "../models/Route.js";
import Bin from "../models/Bin.js";

export const todaysAssignments = async (req, res) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start); end.setDate(start.getDate() + 1);
  // For simplicity: return all APPROVED routes in user's zone if set, else all
  const q = { status: { $in: ["APPROVED", "DISPATCHED"] }, date: { $gte: start, $lt: end } };
  const routes = await Route.find(q).populate("stops.binId");
  res.json(routes);
};

export const scan = async (req, res) => {
  const { binId, manualReason } = req.body; // binId could be QR decoded value
  const bin = await Bin.findById(binId);
  if (!bin) return res.status(404).json({ message: "Bin not found" });
  bin.status = "Collected";
  bin.fillLevel = 0;
  bin.lastCollectedAt = new Date();
  await bin.save();
  res.json({ message: "Collected", manual: Boolean(manualReason) });
};

export const syncBatch = async (req, res) => {
  const { items = [] } = req.body; // [{binId, collectedAt, manualReason?}]
  const results = [];
  for (const it of items) {
    const bin = await Bin.findById(it.binId);
    if (!bin) { results.push({ binId: it.binId, ok: false, reason: "not-found" }); continue; }
    bin.status = "Collected";
    bin.fillLevel = 0;
    bin.lastCollectedAt = it.collectedAt ? new Date(it.collectedAt) : new Date();
    await bin.save();
    results.push({ binId: bin._id, ok: true });
  }
  res.json({ count: results.length, results });
};

