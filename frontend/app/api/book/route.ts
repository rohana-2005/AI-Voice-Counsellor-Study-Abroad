import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

type BookPayload = {
  access_token?: string;
  startTime?: string;
  endTime?: string;
  subject?: string;
  description?: string;
};

function isInvalidDate(value: string | undefined) {
  if (!value) return true;
  return Number.isNaN(new Date(value).getTime());
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BookPayload;
    const { access_token, startTime, endTime, subject, description } = body;

    if (!access_token || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: access_token, startTime, endTime' },
        { status: 400 }
      );
    }

    if (isInvalidDate(startTime) || isInvalidDate(endTime)) {
      return NextResponse.json(
        { error: 'startTime and endTime must be valid date strings' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ access_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: subject?.trim() || 'AI Counselling Session',
        description: description?.trim() || 'Scheduled via StudyAbroad.AI dashboard',
        start: { dateTime: new Date(startTime).toISOString() },
        end: { dateTime: new Date(endTime).toISOString() },
      },
    });

    return NextResponse.json(
      {
        success: true,
        eventId: event.data.id,
        htmlLink: event.data.htmlLink,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Booking failed:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
