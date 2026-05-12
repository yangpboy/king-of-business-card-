const FETCH_WEBHOOK_URL = 'https://yangpoboy.zeabur.app/webhook/70527ea1-4c09-4b5c-992e-640809dc99d2';
const UPDATE_WEBHOOK_URL = 'https://yangpoboy.zeabur.app/webhook/fccaa8c6-e7de-438d-87ff-dd7eab3e9c07';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Accept',
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

async function proxyCards() {
  const upstream = await fetch(FETCH_WEBHOOK_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const body = await upstream.text();

  if (!upstream.ok) {
    return jsonResponse({
      error: `Fetch webhook failed with status ${upstream.status}`,
      detail: body,
    }, { status: upstream.status });
  }

  if (!body.trim()) {
    return jsonResponse({
      error: 'Fetch webhook returned an empty body. Check the n8n Respond to Webhook output.',
    }, { status: 502 });
  }

  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

async function proxyUpdate(request) {
  const contentType = request.headers.get('Content-Type') || 'application/json';
  const body = await request.text();

  const upstream = await fetch(UPDATE_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': contentType,
    },
    body,
  });

  const responseBody = await upstream.text();

  if (!upstream.ok) {
    return jsonResponse({
      error: `Update webhook failed with status ${upstream.status}`,
      detail: responseBody,
    }, { status: upstream.status });
  }

  if (!responseBody.trim()) {
    return jsonResponse({ ok: true });
  }

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.pathname === '/api/cards' && request.method === 'GET') {
      return proxyCards();
    }

    if (url.pathname === '/api/update' && request.method === 'POST') {
      return proxyUpdate(request);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
