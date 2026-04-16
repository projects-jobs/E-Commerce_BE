const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ── Order confirmation email ───────────────────────────────────────────────
const sendOrderConfirmation = async (user, order) => {
  const itemRows = order.items.map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${i.price.toLocaleString()}</td>
    </tr>`
  ).join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9f9f9;padding:20px;border-radius:10px">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;border-radius:10px;text-align:center;margin-bottom:20px">
      <h1 style="color:white;margin:0;font-size:24px">🛍️ Order Confirmed!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:10px 0 0">Thank you for shopping with us</p>
    </div>
    <div style="background:white;padding:25px;border-radius:10px;margin-bottom:15px">
      <p style="font-size:16px;color:#333">Hi <strong>${user.name}</strong>,</p>
      <p style="color:#666">Your order <strong>#${order._id}</strong> has been confirmed!</p>
      <table style="width:100%;border-collapse:collapse;margin-top:15px">
        <thead>
          <tr style="background:#f0f0f0">
            <th style="padding:10px;text-align:left">Product</th>
            <th style="padding:10px;text-align:center">Qty</th>
            <th style="padding:10px;text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="margin-top:15px;text-align:right;border-top:2px solid #eee;padding-top:15px">
        <p style="color:#666;margin:5px 0">Items: ₹${order.itemsPrice.toLocaleString()}</p>
        <p style="color:#666;margin:5px 0">Shipping: ₹${order.shippingPrice.toLocaleString()}</p>
        <p style="color:#666;margin:5px 0">Tax: ₹${order.taxPrice.toLocaleString()}</p>
        <p style="font-size:20px;font-weight:bold;color:#333;margin:10px 0">Total: ₹${order.totalPrice.toLocaleString()}</p>
      </div>
    </div>
    <div style="background:white;padding:20px;border-radius:10px;margin-bottom:15px">
      <h3 style="color:#333;margin-top:0">📦 Shipping Address</h3>
      <p style="color:#666;line-height:1.6;margin:0">
        ${order.shippingAddress.street}<br/>
        ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}<br/>
        ${order.shippingAddress.country}
      </p>
    </div>
    <p style="text-align:center;color:#999;font-size:12px">© ${new Date().getFullYear()} ShopEase. All rights reserved.</p>
  </div>`;

  await transporter.sendMail({
    from: `"ShopEase 🛍️" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `✅ Order Confirmed - #${order._id}`,
    html,
  });
};

// ── Payment success email ──────────────────────────────────────────────────
const sendPaymentSuccess = async (user, order) => {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9f9f9;padding:20px;border-radius:10px">
    <div style="background:linear-gradient(135deg,#11998e,#38ef7d);padding:30px;border-radius:10px;text-align:center;margin-bottom:20px">
      <h1 style="color:white;margin:0;font-size:24px">💳 Payment Successful!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:10px 0 0">₹${order.totalPrice.toLocaleString()} received</p>
    </div>
    <div style="background:white;padding:25px;border-radius:10px">
      <p style="font-size:16px;color:#333">Hi <strong>${user.name}</strong>,</p>
      <p style="color:#666">Payment of <strong>₹${order.totalPrice.toLocaleString()}</strong> for order <strong>#${order._id}</strong> was successful.</p>
      <p style="color:#666">Payment ID: <code style="background:#f0f0f0;padding:2px 8px;border-radius:4px">${order.paymentInfo.razorpay_payment_id}</code></p>
      <p style="color:#888;font-size:14px">We'll notify you when your order ships. 🚚</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"ShopEase 🛍️" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `💳 Payment Successful - ₹${order.totalPrice.toLocaleString()}`,
    html,
  });
};

// ── Shipping update email ──────────────────────────────────────────────────
const sendShippingUpdate = async (user, order, status) => {
  const icons = { Processing:"⚙️", Shipped:"🚚", Delivered:"✅", Cancelled:"❌" };
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9f9f9;padding:20px;border-radius:10px">
    <div style="background:linear-gradient(135deg,#f093fb,#f5576c);padding:30px;border-radius:10px;text-align:center;margin-bottom:20px">
      <h1 style="color:white;margin:0;font-size:24px">${icons[status] || "📦"} Order ${status}!</h1>
    </div>
    <div style="background:white;padding:25px;border-radius:10px">
      <p style="font-size:16px;color:#333">Hi <strong>${user.name}</strong>,</p>
      <p style="color:#666">Your order <strong>#${order._id}</strong> status has been updated to <strong>${status}</strong>.</p>
      ${status === "Shipped" ? `<p style="color:#666">🚚 Your package is on its way! Expected delivery in 3-5 business days.</p>` : ""}
      ${status === "Delivered" ? `<p style="color:#666">✅ Your order has been delivered. Enjoy your purchase! Please leave a review.</p>` : ""}
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"ShopEase 🛍️" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `${icons[status] || "📦"} Order ${status} - #${order._id}`,
    html,
  });
};

module.exports = { sendOrderConfirmation, sendPaymentSuccess, sendShippingUpdate };