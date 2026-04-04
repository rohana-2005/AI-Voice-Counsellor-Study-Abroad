import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

type AuthState = {
  mode?: 'popup' | 'redirect';
  origin?: string;
};

function parseState(value: string | null): AuthState {
  if (!value) {
    return {};
  }

  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    return JSON.parse(decoded) as AuthState;
  } catch {
    return {};
  }
}

function popupResponse(origin: string, payload: Record<string, string>) {
  const safeOrigin = JSON.stringify(origin);
  const safePayload = JSON.stringify(payload);

  const html = `<!doctype html>
<html>
  <body>
    <script>
      (function () {
        var origin = ${safeOrigin};
        var payload = ${safePayload};
        if (window.opener) {
          window.opener.postMessage(payload, origin);
        }
        window.close();
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function GET(req: NextRequest) {
  const state = parseState(req.nextUrl.searchParams.get('state'));
  const mode = state.mode ?? 'redirect';
  const appOrigin = state.origin ?? req.nextUrl.origin;

  const oauthError = req.nextUrl.searchParams.get('error');
  if (oauthError) {
    if (mode === 'popup') {
      return popupResponse(appOrigin, {
        type: 'google-oauth-error',
        error: oauthError,
      });
    }

    return NextResponse.redirect(`${appOrigin}/dashboard?error=${encodeURIComponent(oauthError)}`);
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    if (mode === 'popup') {
      return popupResponse(appOrigin, {
        type: 'google-oauth-error',
        error: 'missing_code',
      });
    }

    return NextResponse.redirect(`${appOrigin}/dashboard?error=missing_code`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      if (mode === 'popup') {
        return popupResponse(appOrigin, {
          type: 'google-oauth-error',
          error: 'missing_access_token',
        });
      }

      return NextResponse.redirect(`${appOrigin}/dashboard?error=missing_access_token`);
    }

    if (mode === 'popup') {
      return popupResponse(appOrigin, {
        type: 'google-oauth-success',
        accessToken: tokens.access_token,
      });
    }

    return NextResponse.redirect(
      `${appOrigin}/dashboard?access_token=${encodeURIComponent(tokens.access_token)}`
    );
  } catch {
    if (mode === 'popup') {
      return popupResponse(appOrigin, {
        type: 'google-oauth-error',
        error: 'token_exchange_failed',
      });
    }

    return NextResponse.redirect(`${appOrigin}/dashboard?error=token_exchange_failed`);
  }
}
