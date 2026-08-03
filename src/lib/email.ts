import { Resend } from 'resend';
import { format } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

interface SendConfirmationEmailProps {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  eventSlug: string;
  status: 'confirmed' | 'pending';
  registrationId?: string;
  isInvite?: boolean;
  organizerName?: string;
}

export async function sendConfirmationEmail({
  toEmail,
  attendeeName,
  eventTitle,
  eventDate,
  eventLocation,
  eventSlug,
  status,
  registrationId,
  isInvite,
  organizerName,
}: SendConfirmationEmailProps) {
  // If no API key is set, silently skip email sending but log it
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not set. Skipping email confirmation to:', toEmail);
    return { success: true, skipped: true };
  }

  const eventUrl = `${appUrl}/events/${eventSlug}`;
  const ticketUrl = registrationId ? `${appUrl}/events/${eventSlug}/ticket?id=${registrationId}` : eventUrl;
  const formattedDate = format(new Date(eventDate), "EEEE, MMMM d, yyyy 'at' h:mm a");

  const subject = status === 'pending'
    ? `Registration Request Received: ${eventTitle}`
    : isInvite 
      ? `You've been invited to ${eventTitle}!` 
      : `You're registered for ${eventTitle}!`;

  // Determine sender email
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const hostLabel = organizerName || 'the organizer';

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [toEmail],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #18181b; padding: 24px 32px; text-align: center;">
                      <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 1px;">RADIUS</span>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 32px 32px;">
                      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #18181b; line-height: 1.3;">
                        ${status === 'pending' ? 'Registration Request Received' : isInvite ? "You're Invited!" : "You're Registered!"}
                      </h1>
                      <p style="margin: 0 0 28px; font-size: 15px; color: #52525b; line-height: 1.6;">
                        ${status === 'pending'
                          ? `Hi ${attendeeName}, your request to join <strong>${eventTitle}</strong> from <strong>${hostLabel}</strong> has been received. You'll get another email once approved.`
                          : `Hi ${attendeeName}, you registered for <strong>${eventTitle}</strong> from <strong>${hostLabel}</strong>.`
                        }
                      </p>

                      <!-- Event info mini row -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; margin-bottom: 28px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 6px; font-size: 13px; color: #a1a1aa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📅 ${formattedDate}</p>
                            ${eventLocation ? `<p style="margin: 0; font-size: 13px; color: #a1a1aa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📍 ${eventLocation}</p>` : ''}
                          </td>
                        </tr>
                      </table>

                      <!-- Buttons -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <a href="${status === 'confirmed' && registrationId ? ticketUrl : eventUrl}" style="display: block; background-color: #18181b; color: #ffffff; text-decoration: none; text-align: center; padding: 14px 16px; border-radius: 12px; font-size: 14px; font-weight: 700;">
                              ${status === 'confirmed' && registrationId ? '🎫 View My Ticket' : 'View Event'}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 32px 28px; border-top: 1px solid #f4f4f5;">
                      <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                        Powered by Radius
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    return { success: false, error: err };
  }
}

/* ───── Organizer Notification Email ───── */
interface SendOrganizerNotificationProps {
  organizerEmail: string;
  organizerName: string;
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  eventSlug: string;
  registrationStatus: 'confirmed' | 'pending';
}

export async function sendOrganizerNotificationEmail({
  organizerEmail,
  organizerName,
  attendeeName,
  attendeeEmail,
  eventTitle,
  eventSlug,
  registrationStatus,
}: SendOrganizerNotificationProps) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not set. Skipping organizer notification.');
    return { success: true, skipped: true };
  }

  const manageUrl = `${appUrl}/admin/events/${eventSlug}/manage/guests`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const subject = registrationStatus === 'pending'
    ? `🔔 New registration request for ${eventTitle}`
    : `🎉 New registration for ${eventTitle}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [organizerEmail],
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">Hi ${organizerName || 'there'},</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            ${registrationStatus === 'pending'
              ? `Someone has requested to join your event <strong>${eventTitle}</strong>. Their registration is pending your approval.`
              : `Great news! Someone just registered for your event <strong>${eventTitle}</strong>.`
            }
          </p>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0;"><strong>👤 Name:</strong> ${attendeeName}</p>
            <p style="margin: 0;"><strong>📧 Email:</strong> ${attendeeEmail}</p>
          </div>

          <p style="margin-top: 30px;">
            <a href="${manageUrl}" style="background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              ${registrationStatus === 'pending' ? 'Review Registration' : 'View Guest List'}
            </a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Powered by Radius
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Organizer notification error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to send organizer notification:', err);
    return { success: false, error: err };
  }
}

/* ───── Event Reminder Email ───── */
interface SendReminderEmailProps {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  eventSlug: string;
  reminderType: '24h' | '1h';
  organizerName?: string;
}

export async function sendReminderEmail({
  toEmail,
  attendeeName,
  eventTitle,
  eventDate,
  eventLocation,
  eventSlug,
  reminderType,
  organizerName,
}: SendReminderEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not set. Skipping reminder.');
    return { success: true, skipped: true };
  }

  const eventUrl = `${appUrl}/events/${eventSlug}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const formattedDate = format(new Date(eventDate), "EEEE, MMMM d · h:mm a");
  const timeLabel = reminderType === '1h' ? 'starts in 1 hour' : 'is tomorrow';
  const emoji = reminderType === '1h' ? '⏰' : '📅';

  const subject = `${emoji} Reminder: ${eventTitle} ${timeLabel}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [toEmail],
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f4f4f5;">
            <!-- Header -->
            <tr>
              <td style="padding: 32px 32px 0;">
                <p style="margin: 0 0 6px; font-size: 14px; color: #a1a1aa; font-weight: 600;">
                  ${emoji} EVENT REMINDER
                </p>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #18181b; line-height: 1.3;">
                  ${eventTitle}
                </h1>
                ${organizerName ? `<p style="margin: 6px 0 0; font-size: 13px; color: #a1a1aa;">by ${organizerName}</p>` : ''}
              </td>
            </tr>

            <!-- Reminder message -->
            <tr>
              <td style="padding: 20px 32px;">
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
                  <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">
                    Hey ${attendeeName.split(' ')[0]}! Your event ${timeLabel}. ${reminderType === '1h' ? "Time to get ready! 🚀" : "Don't forget to add it to your calendar."}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Event details -->
            <tr>
              <td style="padding: 0 32px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; padding: 16px;">
                  <tr>
                    <td style="padding: 16px;">
                      <p style="margin: 0 0 8px; font-size: 13px; color: #a1a1aa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📅 ${formattedDate}</p>
                      ${eventLocation ? `<p style="margin: 0; font-size: 13px; color: #a1a1aa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📍 ${eventLocation}</p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Button -->
            <tr>
              <td style="padding: 0 32px 28px;">
                <a href="${eventUrl}" style="display: block; background-color: #18181b; color: #ffffff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-size: 14px; font-weight: 700;">
                  View Event Details
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px 28px; border-top: 1px solid #f4f4f5;">
                <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                  Powered by Radius
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Reminder email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to send reminder email:', err);
    return { success: false, error: err };
  }
}

/* ───── Important Event Change Email ───── */
interface SendEventChangeEmailProps {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  eventSlug: string;
  visibility: 'public' | 'unlisted' | 'invite_only';
  kind: 'updated' | 'cancelled';
  changes?: string[];
}

export async function sendEventChangeEmail({
  toEmail,
  attendeeName,
  eventTitle,
  eventDate,
  eventLocation,
  eventSlug,
  visibility,
  kind,
  changes = [],
}: SendEventChangeEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not set. Skipping event change notification.');
    return { success: true, skipped: true };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const eventUrl = `${appUrl}/events/${eventSlug}`;
  const formattedDate = format(new Date(eventDate), "EEEE, MMMM d, yyyy 'at' h:mm a");
  const cancelled = kind === 'cancelled';
  const subject = cancelled ? `Cancelled: ${eventTitle}` : `Important update: ${eventTitle}`;
  const heading = cancelled ? 'This event has been cancelled' : 'Event details have changed';
  const accent = cancelled ? '#dc2626' : '#d97706';
  const background = cancelled ? '#fef2f2' : '#fffbeb';
  const changeItems = changes.map((change) => `<li style="margin: 6px 0;">${change}</li>`).join('');

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [toEmail],
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #18181b;">
          <div style="border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; background: #ffffff;">
            <div style="padding: 20px 28px; background: #18181b; color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 1px;">RADIUS</div>
            <div style="padding: 30px 28px;">
              <p style="margin: 0 0 8px; color: ${accent}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;">Important notice</p>
              <h1 style="margin: 0 0 14px; font-size: 23px; line-height: 1.3;">${heading}</h1>
              <p style="margin: 0 0 20px; color: #52525b; line-height: 1.6;">Hi ${attendeeName}, ${cancelled ? `<strong>${eventTitle}</strong> will no longer take place.` : `the organizer changed important details for <strong>${eventTitle}</strong>.`}</p>
              ${!cancelled && changeItems ? `<div style="margin-bottom: 20px; padding: 14px 18px; border-radius: 12px; background: ${background}; color: #78350f;"><ul style="margin: 0; padding-left: 18px;">${changeItems}</ul></div>` : ''}
              ${!cancelled ? `<div style="margin-bottom: 22px; padding: 16px 18px; border-radius: 12px; background: #fafafa;">
                <p style="margin: 0 0 7px; font-size: 13px; font-weight: 700;">📅 ${formattedDate}</p>
                ${eventLocation ? `<p style="margin: 0; font-size: 13px; color: #52525b;">📍 ${eventLocation}</p>` : ''}
              </div>` : ''}
              ${!cancelled && visibility !== 'invite_only' ? `<a href="${eventUrl}" style="display: block; padding: 13px 18px; border-radius: 11px; background: #18181b; color: #ffffff; text-decoration: none; text-align: center; font-size: 14px; font-weight: 700;">View updated event</a>` : ''}
              <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px; line-height: 1.5;">If you have questions, please contact the event organizer.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Event change email error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to send event change email:', err);
    return { success: false, error: err };
  }
}

/* ───── Event Invite Email ───── */
interface SendInviteEmailProps {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  eventSlug: string;
  organizerName?: string;
  invitationToken?: string;
  eventType?: string;
  weddingHosts?: string;
  weddingMessage?: string;
  partySize?: number;
  weddingAccent?: string;
}

export async function sendInviteEmail({
  toEmail,
  attendeeName,
  eventTitle,
  eventDate,
  eventLocation,
  eventSlug,
  organizerName,
  invitationToken,
  eventType,
  weddingHosts,
  weddingMessage,
  partySize = 1,
  weddingAccent,
}: SendInviteEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not set. Skipping invite.');
    return { success: false, skipped: true, error: 'Email delivery is not configured.' };
  }

  const eventUrl = invitationToken
    ? `${appUrl}/invitations/${encodeURIComponent(invitationToken)}`
    : `${appUrl}/events/${eventSlug}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const formattedDate = format(new Date(eventDate), "EEEE, MMMM d · h:mm a");
  const firstName = attendeeName.split(' ')[0];

  const isWedding = eventType?.toLowerCase() === 'wedding';
  const inviteAccent = isWedding && weddingAccent ? weddingAccent : '#6366f1';
  const weddingHostLabel = weddingHosts?.trim() || organizerName || 'the couple';
  const safeWeddingMessage = weddingMessage?.trim()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br />');
  const subject = isWedding ? `💍 You're invited to ${eventTitle}` : `🎉 You're invited to ${eventTitle}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [toEmail],
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f4f4f5;">
            <!-- Header -->
            <tr>
              <td style="padding: 32px 32px 0;">
                <p style="margin: 0 0 6px; font-size: 14px; color: #a1a1aa; font-weight: 600;">
                  ${isWedding ? '💍 WEDDING INVITATION' : "🎉 YOU'RE INVITED"}
                </p>
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b; line-height: 1.3;">
                  ${eventTitle}
                </h1>
                ${organizerName ? `<p style="margin: 8px 0 0; font-size: 13px; color: #a1a1aa;">Hosted by <strong style="color: #52525b;">${organizerName}</strong></p>` : ''}
              </td>
            </tr>

            <!-- Invite message -->
            <tr>
              <td style="padding: 20px 32px;">
                <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.6;">
                  ${isWedding
                    ? `Dear ${firstName}, <strong>${weddingHostLabel}</strong> warmly invites you to celebrate their wedding ceremony.${safeWeddingMessage ? `<br /><br />${safeWeddingMessage}` : ''}`
                    : `Hey ${firstName}! <strong>${organizerName || 'The host'}</strong> has personally invited you. We'd love to see you there!`}
                </p>
                ${isWedding ? `<p style="margin: 14px 0 0; font-size: 13px; font-weight: 700; color: #be123c;">This invitation admits ${partySize} ${partySize === 1 ? 'person' : 'people'}.</p>` : ''}
              </td>
            </tr>

            <!-- Event details -->
            <tr>
              <td style="padding: 0 32px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px;">
                  <tr>
                    <td style="padding: 16px;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #52525b;">
                        📅 <strong>${formattedDate}</strong>
                      </p>
                      ${eventLocation ? `<p style="margin: 0; font-size: 14px; color: #52525b;">📍 <strong>${eventLocation}</strong></p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td style="padding: 0 32px 12px;">
                <a href="${eventUrl}" style="display: block; background-color: ${inviteAccent}; color: #ffffff; text-decoration: none; text-align: center; padding: 16px 24px; border-radius: 12px; font-size: 15px; font-weight: 700;">
                  Accept Invitation →
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 28px;">
                <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                  Click the button above to review and accept your invitation
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px 28px; border-top: 1px solid #f4f4f5;">
                <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                  Powered by Radius
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Invite email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to send invite email:', err);
    return { success: false, error: err };
  }
}

export async function sendNewHostEventEmail({
  toEmail,
  unsubscribeToken,
  hostName,
  hostSlug,
  eventTitle,
  eventPublicSlug,
  eventDate,
  eventLocation,
}: {
  toEmail: string;
  unsubscribeToken: string;
  hostName: string;
  hostSlug: string;
  eventTitle: string;
  eventPublicSlug: string;
  eventDate: string;
  eventLocation?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return { success: true, skipped: true };

  const eventUrl = `${appUrl}/hosts/${hostSlug}/events/${eventPublicSlug}`;
  const unsubscribeUrl = `${appUrl}/api/subscriptions/unsubscribe?token=${unsubscribeToken}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const formattedDate = format(new Date(eventDate), "EEEE, MMMM d, yyyy 'at' h:mm a");

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [toEmail],
      subject: `New event from ${hostName}: ${eventTitle}`,
      html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:32px"><p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#71717a">NEW EVENT FROM ${hostName.toUpperCase()}</p><h1 style="font-size:26px;color:#18181b">${eventTitle}</h1><p style="color:#52525b">📅 ${formattedDate}${eventLocation ? `<br>📍 ${eventLocation}` : ''}</p><a href="${eventUrl}" style="display:inline-block;margin-top:16px;background:#18181b;color:white;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">View event</a><p style="margin-top:36px;font-size:11px;color:#a1a1aa">You received this because you followed ${hostName} on Radius. <a href="${unsubscribeUrl}" style="color:#71717a">Unsubscribe</a></p></div>`,
    });
    return error ? { success: false, error } : { success: true, data };
  } catch (error) {
    console.error('New host event email failed:', error);
    return { success: false, error };
  }
}

function escapeEmailText(value: string | null | undefined) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

type VenueEnquiryEmailDetails = {
  venueName: string;
  venueSlug: string;
  requesterName: string;
  requesterEmail?: string | null;
  requesterPhone: string;
  eventType: string;
  eventDate: string;
  timeSlot: string;
  guestCount: number | null;
  reference: string;
};

export async function sendVenueEnquiryCreatedEmails({
  venueEmails,
  details,
}: {
  venueEmails: string[];
  details: VenueEnquiryEmailDetails;
}) {
  if (!process.env.RESEND_API_KEY) return { venueDelivered: false, requesterDelivered: false, skipped: true };
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const date = format(new Date(`${details.eventDate}T12:00:00`), 'EEEE, MMMM d, yyyy');
  const venueUrl = `${appUrl}/venues/manage`;
  const safe = {
    venue: escapeEmailText(details.venueName),
    requester: escapeEmailText(details.requesterName),
    phone: escapeEmailText(details.requesterPhone),
    eventType: escapeEmailText(details.eventType),
    slot: escapeEmailText(details.timeSlot.replaceAll('_', ' ')),
    reference: escapeEmailText(details.reference),
  };

  const uniqueVenueEmails = Array.from(new Set(venueEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
  const venueResults = await Promise.all(uniqueVenueEmails.map(async (toEmail) => {
    try {
      const { error } = await resend.emails.send({
        from: `Radius <${fromEmail}>`,
        to: [toEmail],
        subject: `New venue enquiry for ${details.venueName}`,
        html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:32px;color:#18231d"><p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#ff5e36">NEW VENUE ENQUIRY</p><h1 style="font-size:26px">${safe.venue}</h1><p style="color:#5f6b64;line-height:1.6"><strong>${safe.requester}</strong> asked about hosting a ${safe.eventType} for ${details.guestCount || 'an unspecified number of'} guests.</p><div style="background:#faf6f2;border-radius:14px;padding:18px;margin:20px 0"><p style="margin:0 0 8px">📅 <strong>${date}</strong> · ${safe.slot}</p><p style="margin:0">☎️ ${safe.phone}</p></div><a href="${venueUrl}" style="display:block;background:#173f41;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:11px;font-weight:700">Review enquiry</a><p style="font-size:11px;color:#a1a1aa;margin-top:22px">Reference: ${safe.reference}</p></div>`,
      });
      if (error) console.error('Venue enquiry team email failed:', error);
      return !error;
    } catch (error) {
      console.error('Venue enquiry team email failed:', error);
      return false;
    }
  }));

  let requesterDelivered = false;
  if (details.requesterEmail) {
    try {
      const { error } = await resend.emails.send({
        from: `Radius <${fromEmail}>`,
        to: [details.requesterEmail],
        subject: `We received your enquiry for ${details.venueName}`,
        html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:32px;color:#18231d"><p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#ff5e36">ENQUIRY RECEIVED</p><h1 style="font-size:26px">The venue will confirm your date.</h1><p style="color:#5f6b64;line-height:1.6">Hi ${safe.requester}, your request for <strong>${safe.venue}</strong> has been recorded. This is not a confirmed reservation yet.</p><div style="background:#faf6f2;border-radius:14px;padding:18px;margin:20px 0"><p style="margin:0 0 8px">📅 <strong>${date}</strong> · ${safe.slot}</p><p style="margin:0">👥 ${details.guestCount || 'Guest count not provided'}${details.guestCount ? ' guests' : ''}</p></div><p style="font-size:12px;color:#71717a">We will email you when the venue responds. Reference: <strong>${safe.reference}</strong></p></div>`,
      });
      requesterDelivered = !error;
      if (error) console.error('Venue enquiry requester email failed:', error);
    } catch (error) {
      console.error('Venue enquiry requester email failed:', error);
    }
  }

  return { venueDelivered: venueResults.some(Boolean), requesterDelivered };
}

export async function sendVenueEnquiryResponseEmail({
  toEmail,
  venueName,
  requesterName,
  eventDate,
  timeSlot,
  status,
  responseMessage,
  alternativeDate,
  alternativeTimeSlot,
  reference,
}: {
  toEmail: string;
  venueName: string;
  requesterName: string;
  eventDate: string;
  timeSlot: string;
  status: string;
  responseMessage?: string | null;
  alternativeDate?: string | null;
  alternativeTimeSlot?: string | null;
  reference: string;
}) {
  if (!process.env.RESEND_API_KEY) return { success: false, skipped: true };
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const requestedDate = format(new Date(`${eventDate}T12:00:00`), 'EEEE, MMMM d, yyyy');
  const response: Record<string, { subject: string; heading: string; accent: string; explanation: string }> = {
    available: { subject: 'Your preferred venue date is available', heading: 'The venue says your date is available.', accent: '#059669', explanation: 'Availability has been confirmed, but the venue has not marked this as a final booking yet.' },
    confirmed: { subject: 'Your venue booking has been confirmed', heading: 'Your venue booking is confirmed.', accent: '#0f766e', explanation: 'The venue has reserved the selected date and time for your occasion.' },
    rejected: { subject: 'Update about your venue enquiry', heading: 'The venue cannot accommodate this request.', accent: '#e11d48', explanation: 'You can return to Radius to explore another venue or send a request for another date.' },
    proposed_alternative: { subject: 'The venue suggested another date', heading: 'The venue proposed an alternative.', accent: '#ea580c', explanation: 'Review the suggested option below and contact the venue if it works for you.' },
  };
  const copy = response[status] || { subject: 'Update about your venue enquiry', heading: 'Your venue enquiry has been updated.', accent: '#52525b', explanation: 'Please review the information below.' };
  const alternative = alternativeDate
    ? `${format(new Date(`${alternativeDate}T12:00:00`), 'EEEE, MMMM d, yyyy')} · ${escapeEmailText((alternativeTimeSlot || 'full_day').replaceAll('_', ' '))}`
    : '';

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [toEmail],
      subject: `${copy.subject}: ${venueName}`,
      html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:32px;color:#18231d"><p style="font-size:12px;font-weight:700;letter-spacing:1px;color:${copy.accent}">VENUE ENQUIRY UPDATE</p><h1 style="font-size:26px">${copy.heading}</h1><p style="color:#5f6b64;line-height:1.6">Hi ${escapeEmailText(requesterName)}, ${copy.explanation}</p><div style="background:#faf6f2;border-radius:14px;padding:18px;margin:20px 0"><p style="margin:0 0 8px"><strong>${escapeEmailText(venueName)}</strong></p><p style="margin:0">Requested: ${requestedDate} · ${escapeEmailText(timeSlot.replaceAll('_', ' '))}</p>${alternative ? `<p style="margin:12px 0 0;color:#c2410c"><strong>Suggested: ${alternative}</strong></p>` : ''}</div>${responseMessage ? `<div style="border-left:4px solid ${copy.accent};padding:12px 16px;background:#fafafa;color:#52525b;line-height:1.6">${escapeEmailText(responseMessage)}</div>` : ''}<p style="font-size:11px;color:#a1a1aa;margin-top:22px">Reference: ${escapeEmailText(reference)}</p></div>`,
    });
    return error ? { success: false, error } : { success: true, data };
  } catch (error) {
    console.error('Venue enquiry response email failed:', error);
    return { success: false, error };
  }
}
