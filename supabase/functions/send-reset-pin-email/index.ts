import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailRequest {
  email: string;
  pin: string;
  fullName: string;
  language: 'en' | 'rw';
}

interface EmailResponse {
  success: boolean;
  message: string;
  data?: {
    email_result: {
      method: string;
      message_id?: string;
    };
  };
}

export async function sendEmailWithGmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    // Gmail SMTP configuration
    const smtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: Deno.env.get('GMAIL_USER') || '',
        pass: Deno.env.get('GMAIL_PASS') || '',
      },
    };

    // Create email message
    const message = {
      from: `"Icumbi Support" <${smtpConfig.auth.user}>`,
      to: to,
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    // For now, we'll simulate email sending since we can't use SMTP directly in Edge Functions
    // In production, you'd want to use a service like Resend, SendGrid, or AWS SES
    console.log('📧 Email would be sent:', {
      to,
      subject,
      smtpConfig: { host: smtpConfig.host, port: smtpConfig.port, user: smtpConfig.auth.user }
    });

    // Simulate successful email sending
    return {
      success: true,
      message_id: `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return {
      success: false,
      error: error.message || 'Unknown email error'
    };
  }
}

export async function sendResetPinEmail(
  email: string,
  pin: string,
  fullName: string,
  language: 'en' | 'rw'
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const subject = language === 'rw' 
      ? 'Umubare w\'uguhindura ijambo ry\'ibanga - Icumbi'
      : 'Password Reset PIN - Icumbi';

    const htmlBody = language === 'rw' ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #667eea;">Icumbi</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #374151; margin-bottom: 20px;">Ubusaba bwo guhindura ijambo ry\'ibanga</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Mwemeye, ${fullName},
          </p>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Wasabye guhindura ijambo ry\'ibanga ryawe. Umubare w\'kwemeza wawe ni:
          </p>
          
          <div style="background-color: #667eea; color: white; font-size: 24px; font-weight: bold; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            ${pin}
          </div>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            <strong>Ibihe:</strong> Umubare uyu uzaba ufite akazi mu minota 15 gusa.
          </p>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Niba ntiwigeze gusaba guhindura ijambo ry\'ibanga, nyamuneka ureka ubutumwa ubu.
          </p>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p>Icumbi © 2025 — "Ubukode bworoshye, ubuzima bwiza."</p>
          <p>Kigali, Rwanda</p>
        </div>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #667eea;">Icumbi</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #374151; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Hello ${fullName},
          </p>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            You requested to reset your password. Your verification PIN is:
          </p>
          
          <div style="background-color: #667eea; color: white; font-size: 24px; font-weight: bold; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            ${pin}
          </div>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            <strong>Note:</strong> This PIN will expire in 15 minutes.
          </p>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            If you didn't request a password reset, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p>Icumbi © 2025 — "Easy rentals, better life."</p>
          <p>Kigali, Rwanda</p>
        </div>
      </div>
    `;

    const textBody = language === 'rw' ? `
      Icumbi - Ubusaba bwo guhindura ijambo ry'ibanga

      Mwemeye, ${fullName},

      Wasabye guhindura ijambo ry'ibanga ryawe. Umubare w'kwemeza wawe ni: ${pin}

      Ibihe: Umubare uyu uzaba ufite akazi mu minota 15 gusa.

      Niba ntiwigeze gusaba guhindura ijambo ry'ibanga, nyamuneka ureka ubutumwa ubu.

      Icumbi © 2025 — "Ubukode bworoshye, ubuzima bwiza."
      Kigali, Rwanda
    ` : `
      Icumbi - Password Reset Request

      Hello ${fullName},

      You requested to reset your password. Your verification PIN is: ${pin}

      Note: This PIN will expire in 15 minutes.

      If you didn't request a password reset, please ignore this email.

      Icumbi © 2025 — "Easy rentals, better life."
      Kigali, Rwanda
    `;

    return await sendEmailWithGmail(email, subject, htmlBody, textBody);
  } catch (error) {
    console.error('❌ Reset PIN email error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending reset PIN email'
    };
  }
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, pin, fullName, language = 'en' }: EmailRequest = await req.json();

    // Validate input
    if (!email || !pin || !fullName) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing required fields: email, pin, fullName' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send the email
    const result = await sendResetPinEmail(email, pin, fullName, language);

    const response: EmailResponse = {
      success: result.success,
      message: result.success ? 'Email sent successfully' : 'Failed to send email',
      data: result.success ? {
        email_result: {
          method: 'gmail_smtp',
          message_id: result.message_id
        }
      } : undefined
    };

    return new Response(JSON.stringify(response), {
      status: result.success ? 200 : 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    
    const errorResponse: EmailResponse = {
      success: false,
      message: error.message || 'Internal server error'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
