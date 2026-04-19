const crypto   = require("crypto");
const Razorpay = require("razorpay");
const { Order, Cart } = require("../model/Cart");
const Product  = require("../model/Product");
const User     = require("../model/User");
const { sendOrderConfirmation, sendPaymentSuccess, sendShippingUpdate } = require("../utility/Email");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// STEP 1 — Create Razorpay order
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    if (!items?.length)
      return res.status(400).json({ success: false, message: "No items provided" });

    let itemsPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product)
        return res.status(400).json({ success: false, message: `Product not found` });
      if (product.stock < item.quantity)
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });

      itemsPrice += product.price * item.quantity;
      validatedItems.push({
        product:  product._id,
        name:     product.name,
        image:    product.images?.[0] || "",
        price:    product.price,
        quantity: item.quantity,
      });
    }

    const shippingPrice = itemsPrice > 999 ? 0 : 50;
    const taxPrice      = Math.round(itemsPrice * 0.18);
    const totalPrice    = itemsPrice + shippingPrice + taxPrice;

    // Create Razorpay order (amount in paise)
    const rzpOrder = await razorpay.orders.create({
      amount:   totalPrice * 100,
      currency: "INR",
      receipt:  `rcpt_${Date.now()}`,
    });

    res.json({
      success:        true,
      razorpayOrderId: rzpOrder.id,
      amount:         totalPrice,   // in rupees — frontend multiplies by 100
      currency:       "INR",
      key:            process.env.RAZORPAY_KEY_ID,
      orderData: {
        items:          validatedItems,
        shippingAddress,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
      },
    });
  } catch (err) {
    next(err);
  }
};

// STEP 2 — Verify signature + save order
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderData)
      return res.status(400).json({ success: false, message: "Missing payment details" });

    // Verify HMAC signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: "Payment verification failed — invalid signature" });

    // Save order
    const order = await Order.create({
      user:            req.user._id,
      items:           orderData.items,
      shippingAddress: orderData.shippingAddress,
      paymentInfo:     { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      itemsPrice:      orderData.itemsPrice,
      shippingPrice:   orderData.shippingPrice,
      taxPrice:        orderData.taxPrice,
      totalPrice:      orderData.totalPrice,
      isPaid:          true,
      paidAt:          new Date(),
      orderStatus:     "Processing",
      statusHistory:   [{ status: "Processing", note: "Payment received & verified", updatedAt: new Date() }],
    });

    // Reduce stock
    for (const item of orderData.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sold: item.quantity },
      });
    }

    // Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    // Push notification to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: {
          message: `✅ Order #${order._id} confirmed! Payment received.`,
          read:    false,
        },
      },
    });

    // Send emails (non-blocking)
    const user = await User.findById(req.user._id);
    if (user) {
      sendOrderConfirmation(user, order).catch(e => console.error("Email error:", e.message));
      sendPaymentSuccess(user, order).catch(e => console.error("Email error:", e.message));
    }

    // Socket.IO notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${req.user._id}`).emit("notification", {
        message: `✅ Order #${order._id} confirmed!`,
        orderId: order._id,
      });
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden" });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

const adminGetOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query  = status ? { orderStatus: status } : {};
    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("user", "name email");
    res.json({ success: true, orders, total });
  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || "", updatedAt: new Date() });
    if (status === "Delivered") order.deliveredAt = new Date();
    await order.save();

    await User.findByIdAndUpdate(order.user._id, {
      $push: {
        notifications: {
          message: `${status === "Shipped" ? "🚚" : status === "Delivered" ? "✅" : "📦"} Order #${order._id} is now ${status}`,
          read:    false,
        },
      },
    });

    sendShippingUpdate(order.user, order, status).catch(e => console.error("Email error:", e.message));

    const io = req.app.get("io");
    if (io) io.to(`user_${order.user._id}`).emit("notification", { message: `Order #${order._id} is now ${status}!` });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

const adminStats = async (req, res, next) => {
  try {
    const [totalOrders, revenueAgg, totalUsers, totalProducts, pendingOrders, deliveredOrders] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match: { isPaid: true } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({ orderStatus: "Pending" }),
      Order.countDocuments({ orderStatus: "Delivered" }),
    ]);

    const monthly = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: {
        _id:     { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
        revenue: { $sum: "$totalPrice" },
        orders:  { $sum: 1 },
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 6 },
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue:    revenueAgg[0]?.total || 0,
        totalUsers,
        totalProducts,
        pendingOrders,
        deliveredOrders,
        monthly,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
  getOrder,
  adminGetOrders,
  updateOrderStatus,
  adminStats,
};