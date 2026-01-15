import { NextRequest, NextResponse } from 'next/server';
import { app, receiver } from '@/lib/slack/app';
import { registerAllHandlers } from '@/lib/slack/handlers';

// Register handlers once
let handlersRegistered = false;
if (!handlersRegistered) {
  registerAllHandlers();
  handlersRegistered = true;
}

/**
 * Handle Slack events and commands
 * This is the main endpoint that Slack sends all interactions to
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Create a mock request/response for Express receiver
  const expressReq = {
    body: JSON.parse(body),
    rawBody: Buffer.from(body),
    headers,
  };

  return new Promise<NextResponse>((resolve) => {
    const expressRes = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      setHeader(key: string, value: string) {
        this.headers[key] = value;
        return this;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send(body: string) {
        this.body = body;
        resolve(
          new NextResponse(this.body, {
            status: this.statusCode,
            headers: this.headers,
          })
        );
        return this;
      },
      end() {
        resolve(
          new NextResponse(this.body, {
            status: this.statusCode,
            headers: this.headers,
          })
        );
        return this;
      },
    };

    // Process through Bolt
    receiver.requestHandler(expressReq as any, expressRes as any);
  });
}

/**
 * Handle URL verification challenge from Slack
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' });
}
