// ═══════════════════════════════════════════════════════════
//  server/services/emailService.js
//  Handles ALL email notifications via Resend API
//  Called from controllers — never blocks the main response
// ═══════════════════════════════════════════════════════════

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'UniTrade <onboarding@resend.dev>';

// ── Send helper ────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  if (!to) return;
  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to} — "${subject}"`);
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
  }
}

// ── Base HTML template ─────────────────────────────────────
function baseTemplate(title, content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center;">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;">
      <span style="color:#fff;font-size:22px;font-weight:900;">UT</span>
    </div>
    <h1 style="color:#fff;margin:12px 0 0;font-size:20px;font-weight:800;">UniTrade</h1>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:12px;">Campus Marketplace · Student Portal</p>
  </div>
  <div style="max-width:540px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
      ${content}
    </div>
    <div style="text-align:center;padding:20px 0 8px;">
      <p style="color:#9898b8;font-size:11px;margin:0;">
        You are receiving this email because you have an account on UniTrade.<br/>
        Campus Marketplace · KIET Group of Institutions
      </p>
      <p style="margin:8px 0 0;">
        <a href="https://unitrade-project.onrender.com" style="color:#4f46e5;font-size:11px;text-decoration:none;">
          Visit UniTrade →
        </a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════
//  1. WELCOME EMAIL — on registration
// ══════════════════════════════════════════════════════════
async function emailWelcome({ name, email }) {
  const content = `
    <h2 style="color:#18182a;font-size:22px;margin:0 0 8px;">Welcome to UniTrade, ${name}! 🎓</h2>
    <p style="color:#52527a;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Your campus marketplace account has been created successfully.
      You can now buy, sell, and exchange items with verified students on your campus.
    </p>
    <div style="background:#eef2ff;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <p style="margin:0 0 10px;color:#4f46e5;font-weight:700;font-size:13px;">What you can do on UniTrade:</p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">📦 &nbsp; List items you want to sell</p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">🔍 &nbsp; Browse listings from campus students</p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">💬 &nbsp; Message sellers directly</p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">🔔 &nbsp; Get notified when requested items are listed</p>
    </div>
    <div style="text-align:center;">
      <a href="https://unitrade-project.onrender.com/home/index.html"
         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        Start Browsing →
      </a>
    </div>
    <p style="color:#9898b8;font-size:12px;text-align:center;margin:20px 0 0;">
      Registered with: <strong>${email}</strong>
    </p>`;

  await sendEmail({
    to:      email,
    subject: '🎓 Welcome to UniTrade — Your account is ready!',
    html:    baseTemplate('Welcome to UniTrade', content),
  });
}

// ══════════════════════════════════════════════════════════
//  2. NEW LISTING EMAIL — seller confirmation
// ══════════════════════════════════════════════════════════
async function emailListingPublished({ sellerName, email, productTitle, price, productId }) {
  const productUrl = `https://unitrade-project.onrender.com/product/index.html?id=${productId}`;
  const content = `
    <h2 style="color:#18182a;font-size:20px;margin:0 0 8px;">Your listing is live! 📦</h2>
    <p style="color:#52527a;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi ${sellerName}, your item has been successfully listed on UniTrade.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#15803d;font-weight:700;font-size:13px;">Listing Details</p>
      <p style="margin:4px 0;color:#18182a;font-size:14px;font-weight:600;">📦 ${productTitle}</p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">💰 Price: <strong>₹${Number(price).toLocaleString('en-IN')}</strong></p>
    </div>
    <div style="text-align:center;">
      <a href="${productUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        View My Listing →
      </a>
    </div>`;

  await sendEmail({
    to:      email,
    subject: `✅ Your listing "${productTitle}" is now live on UniTrade!`,
    html:    baseTemplate('Listing Published', content),
  });
}

// ══════════════════════════════════════════════════════════
//  3. NEW MESSAGE EMAIL — seller gets notified
// ══════════════════════════════════════════════════════════
async function emailNewMessage({ sellerEmail, sellerName, buyerName, productTitle, messageBody }) {
  const dashboardUrl = `https://unitrade-project.onrender.com/dashboard/index.html`;
  const content = `
    <h2 style="color:#18182a;font-size:20px;margin:0 0 8px;">New message from a buyer! 💬</h2>
    <p style="color:#52527a;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi ${sellerName}, <strong>${buyerName}</strong> has sent you a message about your listing.
    </p>
    <div style="background:#f5f3ff;border-left:4px solid #4f46e5;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#4f46e5;font-size:12px;font-weight:700;">About listing</p>
      <p style="margin:0;color:#18182a;font-size:14px;font-weight:600;">📦 ${productTitle}</p>
    </div>
    <div style="background:#f8f8fc;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 8px;color:#52527a;font-size:12px;font-weight:700;">Message from ${buyerName}</p>
      <p style="margin:0;color:#18182a;font-size:14px;line-height:1.6;font-style:italic;">"${messageBody}"</p>
    </div>
    <div style="text-align:center;">
      <a href="${dashboardUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        Reply in Dashboard →
      </a>
    </div>`;

  await sendEmail({
    to:      sellerEmail,
    subject: `💬 ${buyerName} messaged you about "${productTitle}" — UniTrade`,
    html:    baseTemplate('New Message', content),
  });
}

// ══════════════════════════════════════════════════════════
//  4. REQUEST MATCH EMAIL
// ══════════════════════════════════════════════════════════
async function emailRequestMatch({ email, requesterName, requestTitle, productTitle, sellerName, price, productId }) {
  const productUrl = `https://unitrade-project.onrender.com/product/index.html?id=${productId}`;
  const content = `
    <h2 style="color:#18182a;font-size:20px;margin:0 0 8px;">Your requested item is available! 🎉</h2>
    <p style="color:#52527a;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi ${requesterName}, an item matching your request has just been listed!
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:4px 0;color:#18182a;font-size:15px;font-weight:700;">📦 ${productTitle}</p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">👤 Seller: <strong>${sellerName}</strong></p>
      <p style="margin:4px 0;color:#15803d;font-size:16px;font-weight:800;">💰 ₹${Number(price).toLocaleString('en-IN')}</p>
    </div>
    <div style="text-align:center;">
      <a href="${productUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);
                color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        View Item Now →
      </a>
    </div>`;

  await sendEmail({
    to:      email,
    subject: `🎉 Item you requested is now available — "${productTitle}" on UniTrade!`,
    html:    baseTemplate('Request Matched!', content),
  });
}

// ══════════════════════════════════════════════════════════
//  5. REPORT RESOLVED EMAIL
// ══════════════════════════════════════════════════════════
async function emailReportResolved({ email, userName, productTitle, status }) {
  const statusText = status === 'resolved'
    ? 'has been reviewed and the listing has been removed'
    : 'has been reviewed and dismissed after investigation';

  const content = `
    <h2 style="color:#18182a;font-size:20px;margin:0 0 8px;">Your report has been reviewed ✅</h2>
    <p style="color:#52527a;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi ${userName}, the UniTrade admin team has reviewed your report about <strong>"${productTitle}"</strong>.
    </p>
    <div style="background:#eef2ff;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;color:#18182a;font-size:14px;">Your report ${statusText}. Thank you for helping keep UniTrade safe.</p>
    </div>
    <div style="text-align:center;">
      <a href="https://unitrade-project.onrender.com/home/index.html"
         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        Back to Marketplace →
      </a>
    </div>`;

  await sendEmail({
    to:      email,
    subject: `✅ Your report has been reviewed — UniTrade`,
    html:    baseTemplate('Report Reviewed', content),
  });
}

// ══════════════════════════════════════════════════════════
//  6. ACCOUNT BLOCKED EMAIL
// ══════════════════════════════════════════════════════════
async function emailAccountBlocked({ email, name }) {
  const content = `
    <h2 style="color:#18182a;font-size:20px;margin:0 0 8px;">Account Suspended ⚠️</h2>
    <p style="color:#52527a;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi ${name}, your UniTrade account has been temporarily suspended by our admin team.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;">
      <p style="margin:0;color:#9a1515;font-size:13px;line-height:1.6;">
        If you believe this was a mistake, please contact your college admin for assistance.
      </p>
    </div>`;

  await sendEmail({
    to:      email,
    subject: `⚠️ Your UniTrade account has been suspended`,
    html:    baseTemplate('Account Suspended', content),
  });
}

// ══════════════════════════════════════════════════════════
//  7. NEW PRODUCT BROADCAST
// ══════════════════════════════════════════════════════════
async function emailNewProductBroadcast({ email, recipientName, sellerName, productTitle, price, category, productId }) {
  const productUrl = `https://unitrade-project.onrender.com/product/index.html?id=${productId}`;
  const content = `
    <h2 style="color:#18182a;font-size:20px;margin:0 0 8px;">New item listed on UniTrade! 🛒</h2>
    <p style="color:#52527a;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi ${recipientName}, a new item has just been listed by a campus student.
    </p>
    <div style="background:#eef2ff;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <p style="margin:4px 0;color:#18182a;font-size:15px;font-weight:700;">📦 ${productTitle}</p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">👤 Seller: <strong>${sellerName}</strong></p>
      <p style="margin:4px 0;color:#52527a;font-size:13px;">🏷️ Category: ${category}</p>
      <p style="margin:4px 0;color:#4f46e5;font-size:16px;font-weight:800;">💰 ₹${Number(price).toLocaleString('en-IN')}</p>
    </div>
    <div style="text-align:center;">
      <a href="${productUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        View Listing →
      </a>
    </div>`;

  await sendEmail({
    to:      email,
    subject: `🛒 New listing: "${productTitle}" for ₹${Number(price).toLocaleString('en-IN')} — UniTrade`,
    html:    baseTemplate('New Item Listed', content),
  });
}

module.exports = {
  emailWelcome,
  emailListingPublished,
  emailNewProductBroadcast,
  emailNewMessage,
  emailRequestMatch,
  emailReportResolved,
  emailAccountBlocked,
};