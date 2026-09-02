// Vercel API route: emails a new quote/booking request to Parker via Resend.
// Env vars: RESEND_API_KEY (required), PARKER_EMAIL (recipient), optional RESEND_FROM.
//
// The "from" address must be on a domain verified in Resend, OR you can use
// Resend's shared testing sender "onboarding@resend.dev", which works with only
// an API key and no domain setup. We default to that so email works out of the box.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    service = 'Not specified',
    vehicle = 'Not specified',
    date = '—',          // the website sends the customer's free-text notes here
    time = '',
    name = 'Not specified',
    phone = 'Not specified',
    hookups = 'Not specified',
    location = 'Not specified'
  } = req.body || {};

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.PARKER_EMAIL;
  const from = process.env.RESEND_FROM || 'AP Auto Detailing <onboarding@resend.dev>';

  if (!apiKey || !to) {
    console.error('send-sms: missing RESEND_API_KEY or PARKER_EMAIL');
    return res.status(500).json({ error: 'Email is not configured' });
  }

  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const notes = date && date !== '—' ? date : '';

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
      <div style="background: white; padding: 30px; border-radius: 8px; border-left: 4px solid #2b7fff;">
        <h2 style="margin: 0 0 20px 0; color: #04060c; font-size: 24px;">New Quote Request</h2>

        <div style="background: #f0f4ff; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; color: #333;"><strong>Service:</strong> ${esc(service)}</p>
          <p style="margin: 0 0 12px 0; font-size: 15px; color: #333;"><strong>Vehicle:</strong> ${esc(vehicle)}</p>
          <p style="margin: 0 0 12px 0; font-size: 15px; color: #333;"><strong>Location:</strong> ${esc(location)}</p>
          <p style="margin: 0; font-size: 15px; color: #333;"><strong>Water on-site:</strong> ${esc(hookups)}</p>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 15px; margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; font-size: 16px; color: #111;"><strong>${esc(name)}</strong></p>
          <p style="margin: 0; font-size: 18px;"><a href="tel:${esc(phone)}" style="color: #2b7fff; text-decoration: none; font-weight: 700;">${esc(phone)}</a></p>
        </div>

        ${notes ? `<div style="background: #fafafa; padding: 15px; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px; color: #555;"><strong>Notes:</strong> ${esc(notes)}</p>
        </div>` : ''}
        ${time ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #555;"><strong>Preferred time:</strong> ${esc(time)}</p>` : ''}
      </div>
      <p style="text-align:center; color:#888; font-size:12px; margin-top:16px;">Sent from ap-auto-detailing.vercel.app</p>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: undefined,
        subject: `New quote request — ${name} (${service})`,
        html
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('send-sms: Resend returned', r.status, detail);
      return res.status(502).json({ error: 'Email provider rejected the request' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-sms: unexpected failure', err);
    return res.status(500).json({ error: 'Could not send email' });
  }
}
