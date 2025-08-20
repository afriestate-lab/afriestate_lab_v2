import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface PasswordUpdateRequest {
  userId: string;
  newPassword: string;
  resetToken: string;
}

interface PasswordUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    user_id: string;
    updated_at: string;
  };
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

    const { userId, newPassword, resetToken }: PasswordUpdateRequest = await req.json();

    // Validate input
    if (!userId || !newPassword || !resetToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing required fields: userId, newPassword, resetToken' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Server configuration error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    try {
      // Verify the reset token is valid and verified
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', resetToken)
        .eq('is_verified', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        console.error('❌ Invalid or expired reset token:', tokenError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid or expired reset token' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verify the token belongs to the user
      if (tokenData.user_id !== userId) {
        console.error('❌ Token user mismatch:', { tokenUserId: tokenData.user_id, requestUserId: userId });
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid reset token for this user' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Update the user's password using Supabase Auth admin API
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to update password: ' + updateError.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Mark the reset token as used
      const { error: tokenUpdateError } = await supabase
        .from('password_reset_tokens')
        .update({ 
          used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('token', resetToken);

      if (tokenUpdateError) {
        console.warn('⚠️ Warning: Could not mark reset token as used:', tokenUpdateError);
        // Don't fail the request for this, the password was updated successfully
      }

      console.log('✅ Password updated successfully for user:', userId);

      const response: PasswordUpdateResponse = {
        success: true,
        message: 'Password updated successfully',
        data: {
          user_id: userId,
          updated_at: new Date().toISOString()
        }
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('❌ Supabase operation error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Database operation failed: ' + (error.message || 'Unknown error') 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    
    const errorResponse: PasswordUpdateResponse = {
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
