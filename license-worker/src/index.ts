const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    },
  });
}

function extractMessage(payload) {
  const error = payload.error;
  if (typeof error === 'string') return error;
  const message = payload.message;
  if (typeof message === 'string') return message;
  return undefined;
}

function normalizeLicenseResult(payload) {
  const instanceObj =
    payload.instance && typeof payload.instance === 'object'
      ? payload.instance
      : null;

  const valid =
    payload.valid === true ||
    payload.activated === true ||
    (payload.license_key &&
      typeof payload.license_key === 'object' &&
      payload.license_key.status === 'active');

  return {
    valid,
    instance_id:
      (typeof payload.instance_id === 'string' ? payload.instance_id : null) ??
      (instanceObj && typeof instanceObj.id === 'string' ? instanceObj.id : null),
    message: extractMessage(payload),
    lemon: payload,
  };
}

async function callLemon(endpoint, body, env) {
  const base = (env.LEMON_SQUEEZY_API_BASE ?? 'https://api.lemonsqueezy.com').replace(/\/+$/, '');

  return fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function readJson(request) {
  const parsed = await request.json().catch(() => ({}));
  if (!parsed || typeof parsed !== 'object') return {};
  return parsed;
}

function isAuthorized(request, env) {
  const required = env.WORKER_ACCESS_TOKEN?.trim();
  if (!required) return true;
  const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  return Boolean(provided && provided === required);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: defaultHeaders });
    }

    const { pathname } = new URL(request.url);
    if (pathname === '/health') {
      return json(200, { ok: true, service: 'license-worker' });
    }

    if (!isAuthorized(request, env)) {
      return json(401, { ok: false, message: 'Unauthorized' });
    }

    if (request.method !== 'POST') {
      return json(405, { ok: false, message: 'Method not allowed' });
    }

    const input = await readJson(request);
    const licenseKey = typeof input.license_key === 'string' ? input.license_key.trim() : '';
    const instanceId = typeof input.instance_id === 'string' ? input.instance_id.trim() : '';
    const instanceName = typeof input.instance_name === 'string' ? input.instance_name.trim() : '';

    if (!licenseKey) {
      return json(400, { ok: false, message: 'license_key is required' });
    }

    try {
      if (pathname === '/license/activate') {
        if (!instanceName) {
          return json(400, { ok: false, message: 'instance_name is required for activation' });
        }
        const lemonResponse = await callLemon(
          '/v1/licenses/activate',
          {
            license_key: licenseKey,
            instance_name: instanceName,
          },
          env
        );
        const lemonJson = await lemonResponse.json().catch(() => ({}));
        const normalized = normalizeLicenseResult(lemonJson);
        return json(lemonResponse.ok ? 200 : lemonResponse.status, {
          ok: lemonResponse.ok,
          ...normalized,
        });
      }

      if (pathname === '/license/validate') {
        const lemonResponse = await callLemon(
          '/v1/licenses/validate',
          {
            license_key: licenseKey,
            instance_id: instanceId || undefined,
          },
          env
        );
        const lemonJson = await lemonResponse.json().catch(() => ({}));
        const normalized = normalizeLicenseResult(lemonJson);
        return json(lemonResponse.ok ? 200 : lemonResponse.status, {
          ok: lemonResponse.ok,
          ...normalized,
        });
      }

      if (pathname === '/license/deactivate') {
        if (!instanceId) {
          return json(400, { ok: false, message: 'instance_id is required for deactivation' });
        }
        const lemonResponse = await callLemon(
          '/v1/licenses/deactivate',
          {
            license_key: licenseKey,
            instance_id: instanceId,
          },
          env
        );
        const lemonJson = await lemonResponse.json().catch(() => ({}));
        const normalized = normalizeLicenseResult(lemonJson);
        return json(lemonResponse.ok ? 200 : lemonResponse.status, {
          ok: lemonResponse.ok,
          ...normalized,
        });
      }

      return json(404, { ok: false, message: 'Not found' });
    } catch (error) {
      return json(500, {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
