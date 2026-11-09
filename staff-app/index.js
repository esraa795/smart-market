const express = require("express");
const cors = require("cors");
const path = require("path"); // ✅ הוספה: כדי להגדיר תיקיית public
const { db } = require("./firebaseAdmin");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ הוספה: הגשת קבצי Frontend מתוך public דרך http://localhost:3001
app.use(express.static(path.join(__dirname, "public")));

// ✅ בדיקה שהשרת עובד
app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// ✅ בדיקה של חיבור ל-Firebase
app.get("/test-firebase", async (req, res) => {
  try {
    const snap = await db.collection("orders").limit(1).get();
    res.json({ ok: true, ordersCount: snap.size });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ✅ יצירת הזמנה לדוגמה
app.get("/demo-create-order", async (req, res) => {
  try {
    await db.collection("orders").doc("demo-001").set({
      externalOrderId: "demo-001",
      customerName: "לקוח בדיקה",
      total: 150,
      items: [
        { name: "חלב", qty: 2 },
        { name: "לחם", qty: 1 },
      ],
      status: "paid",
      createdAt: new Date(),
      source: "demo",
    });

    res.send("✅ הזמנה לדוגמה נוצרה");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ✅ סנכרון הזמנה חיצונית (אם משתמשים בזה)
app.post("/sync-order", async (req, res) => {
  const order = req.body;

  if (!order || !order.id) {
    return res.status(400).json({ error: "Missing order id" });
  }

  if (!order.userId) {
    return res.status(400).json({ error: "Missing userId (customer UID)" });
  }

  try {
    await db.collection("orders").doc(order.id).set({
      externalOrderId: order.id,
      userId: order.userId,
      customerName: order.customerName || "",
      items: order.items || [],
      total: order.total || 0,
      status: "paid",
      source: "legacy_site",
      createdAt: new Date(),
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function calcItemsCount(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
}

async function getCustomerName(order) {
  // אם יש כבר customerName בהזמנה - משתמשים בזה
  if (order.customerName && String(order.customerName).trim()) {
    return String(order.customerName).trim();
  }

  // אחרת ננסה להביא מה- users/{uid}
  if (!order.userId) return "";

  try {
    const userDoc = await db.collection("users").doc(order.userId).get();
    if (!userDoc.exists) return "";

    const u = userDoc.data() || {};
    const first = (u.firstName || "").toString().trim();
    const last = (u.lastName || "").toString().trim();

    const full = `${first} ${last}`.trim();
    return full;
  } catch (e) {
    return "";
  }
}

// ✅ קבלת כל ההזמנות (לעובדים) + שם לקוח + כמות פריטים
app.get("/orders", async (req, res) => {
  try {
    const snap = await db.collection("orders").orderBy("createdAt", "desc").get();

    const orders = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const data = docSnap.data() || {};

        const createdAt = data.createdAt ? data.createdAt.toDate() : null;
        const itemsCount = calcItemsCount(data.items);
        const customerName = await getCustomerName(data);

        return {
          id: docSnap.id,
          customerName: customerName || "",
          userId: data.userId || "",
          itemsCount,
          total: data.total || 0,
          status: data.status || "",
          createdAt,
        };
      })
    );

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ קבלת הזמנה לפי ID
app.get("/orders/:id", async (req, res) => {
  try {
    const docSnap = await db.collection("orders").doc(req.params.id).get();
    if (!docSnap.exists) return res.status(404).send("Not found");

    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ✅ READY FOR PICKUP: מותר רק אם status = paid/pending
app.post("/orders/:id/picked", async (req, res) => {
  try {
    const { id } = req.params;

    const orderRef = db.collection("orders").doc(id);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).send("Order not found");

    const order = snap.data();

    if (!order.userId) {
      return res.status(400).json({ error: "Order missing userId." });
    }

    if (order.status !== "paid" && order.status !== "pending") {
      return res.status(400).json({
        error: `Cannot pick. Current status: ${order.status}`,
      });
    }

    await orderRef.update({ status: "ready_for_pickup" });

    await db.collection("notifications").add({
      userId: order.userId,
      orderId: id,
      message: "📦 ההזמנה שלך מוכנה לאיסוף",
      createdAt: new Date(),
      read: false,
      type: "ready_for_pickup",
    });

    res.send("ok");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ DELIVERED: מותר רק אם status = ready_for_pickup
app.post("/orders/:id/delivered", async (req, res) => {
  try {
    const { id } = req.params;

    const orderRef = db.collection("orders").doc(id);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).send("Order not found");

    const order = snap.data();

    if (!order.userId) {
      return res.status(400).json({ error: "Order missing userId." });
    }

    if (order.status !== "ready_for_pickup") {
      return res.status(400).json({
        error: `Cannot deliver. Current status: ${order.status}`,
      });
    }

    await orderRef.update({ status: "delivered" });

    await db.collection("notifications").add({
      userId: order.userId,
      orderId: id,
      message: "✅ ההזמנה נמסרה בהצלחה",
      createdAt: new Date(),
      read: false,
      type: "delivered",
    });

    res.send("ok");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => {
  console.log("🚀 Backend running on http://localhost:3001");
});
