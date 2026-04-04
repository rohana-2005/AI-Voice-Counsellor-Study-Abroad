import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

type AuthState = {
  mode: 'popup' | 'redirect';
  origin: string;
};

function parseMode(value: string | null): 'popup' | 'redirect' {
  return value === 'popup' ? 'popup' : 'redirect';
}

export async function GET(req: NextRequest) {
  const mode = parseMode(req.nextUrl.searchParams.get('mode'));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const state: AuthState = {
    mode,
    origin: req.nextUrl.origin,
  };

  const encodedState = Buffer.from(JSON.stringify(state)).toString('base64url');

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: encodedState,
  });

  return NextResponse.json({ url });
}
