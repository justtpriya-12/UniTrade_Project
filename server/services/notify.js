// ═══════════════════════════════════════════════════════════
//  server/services/notify.js
//  Handles WhatsApp + SMS notifications via Twilio
//  Called from controllers — never blocks the main response
// ═══════════════════════════════════════════════════════════

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // whatsapp:+14155238886
const SMS_FROM      = process.env.TWILIO_SMS_FROM;      // +14155238886

// ── Format phone number ────────────────────────────────────────
// Ensures number has country code — adds +91 if Indian number
function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, ''); // remove non-digits
  if (cleaned.startsWith('91') && cleaned.length === 12) return '+' + cleaned;
  if (cleaned.length === 10) return '+91' + cleaned; // Indian mobile
  if (cleaned.startsWith('+')) return phone;
  return '+' + cleaned;
}

// ── Send WhatsApp message ──────────────────────────────────────
async function sendWhatsApp(to, message) {
  const phone = formatPhone(to);
  if (!phone) return;
  try {
    await client.messages.create({
      from: WHATSAPP_FROM,
      to:   'whatsapp:' + phone,
      body: message
    });
    console.log(`✅ WhatsApp sent to ${phone}`);
  } catch (err) {
    console.error(`❌ WhatsApp failed to ${phone}:`, err.message);
    // Never throw — notification failure should never break the main flow
  }
}

// ── Send SMS ───────────────────────────────────────────────────
async function sendSMS(to, message) {
  const phone = formatPhone(to);
  if (!phone) return;
  try {
    await client.messages.create({
      from: SMS_FROM,
      to:   phone,
      body: message
    });
    console.log(`✅ SMS sent to ${phone}`);
  } catch (err) {
    console.error(`❌ SMS failed to ${phone}:`, err.message);
  }
}

// ── Send both WhatsApp + SMS ───────────────────────────────────
async function notify(phone, message) {
  await Promise.allSettled([
    sendWhatsApp(phone, message),
    sendSMS(phone, message)
  ]);
}

// ══════════════════════════════════════════════════════════════
//  NOTIFICATION TEMPLATES
// ══════════════════════════════════════════════════════════════

// 1. Student registers successfully
async function notifyRegistration({ name, phone }) {
  const msg = `🎓 Welcome to UniTrade, ${name}!

Your account has been created successfully.

✅ You can now:
• Browse campus listings
• Sell your items
• Message sellers directly

Visit: https://unitrade-project-1.onrender.com

Happy trading! 🛒`;

  await notify(phone, msg);
}

// 2. Seller publishes a new product
async function notifySellerProductListed({ sellerName, phone, productTitle, price, productId }) {
  const msg = `📦 Your listing is LIVE on UniTrade!

✅ Item: ${productTitle}
💰 Price: ₹${Number(price).toLocaleString('en-IN')}

Your product is now visible to all campus students. You will be notified when someone messages you about it.

View your listing:
https://unitrade-project-1.onrender.com/product/index.html?id=${productId}

— UniTrade 🎓`;

  await notify(phone, msg);
}

// 3. Broadcast to ALL users when new product is listed
async function notifyAllUsersNewProduct({ sellerName, productTitle, price, category, productId, allPhones }) {
  const msg = `🛒 New item listed on UniTrade!

👤 Seller: ${sellerName}
📦 Item: ${productTitle}
🏷️ Category: ${category}
💰 Price: ₹${Number(price).toLocaleString('en-IN')}

Interested? View and contact the seller:
https://unitrade-project-1.onrender.com/product/index.html?id=${productId}

— UniTrade Campus Marketplace 🎓`;

  // Send to all users in batches of 10 to avoid rate limiting
  const BATCH_SIZE = 10;
  for (let i = 0; i < allPhones.length; i += BATCH_SIZE) {
    const batch = allPhones.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(phone => notify(phone, msg))
    );
    // Small delay between batches
    if (i + BATCH_SIZE < allPhones.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  console.log(`✅ Broadcast sent to ${allPhones.length} users`);
}

// 4. Notify student when their request is matched
async function notifyRequestMatch({ phone, requesterName, requestTitle, productTitle, sellerName, price, productId }) {
  const msg = `🎉 Great news, ${requesterName}!

An item matching your request is now available on UniTrade!

📋 Your request: "${requestTitle}"
📦 Listed item: ${productTitle}
👤 Seller: ${sellerName}
💰 Price: ₹${Number(price).toLocaleString('en-IN')}

View it now before it's gone:
https://unitrade-project-1.onrender.com/product/index.html?id=${productId}

— UniTrade 🎓`;

  await notify(phone, msg);
}

// 5. Notify seller when someone messages them
async function notifySellerNewMessage({ phone, sellerName, buyerName, productTitle, productId }) {
  const msg = `💬 New message on UniTrade!

${buyerName} is interested in your listing:
📦 "${productTitle}"

Check your dashboard to reply:
https://unitrade-project-1.onrender.com/dashboard/index.html

— UniTrade 🎓`;

  await notify(phone, msg);
}

module.exports = {
  notifyRegistration,
  notifySellerProductListed,
  notifyAllUsersNewProduct,
  notifyRequestMatch,
  notifySellerNewMessage,
};