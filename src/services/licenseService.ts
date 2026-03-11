type LicensePayload = Record<string, unknown>;

export interface LicenseResponse {
  ok: boolean;
  valid: boolean;
  message?: string;
  instanceId?: string | null;
  raw?: unknown;
}

function getApiBase(): string {
  const base = (import.meta.env.VITE_LICENSE_API_BASE as string | undefined)?.trim();
  return base ? base.replace(/\/+$/, '') : '';
}

async function postLicense(path: string, payload: LicensePayload): Promise<LicenseResponse> {
  const base = getApiBase();
  const token = (import.meta.env.VITE_LICENSE_API_TOKEN as string | undefined)?.trim();
  if (!base) {
    throw new Error('VITE_LICENSE_API_BASE is not set');
  }

  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));
  const valid = Boolean(
    json?.valid ??
      json?.activated ??
      json?.license_key?.status === 'active' ??
      false
  );
  const instanceId =
    (json?.instance_id as string | undefined) ??
    (json?.instance?.id as string | undefined) ??
    null;
  const message =
    (json?.message as string | undefined) ??
    (json?.error as string | undefined) ??
    (!response.ok ? `HTTP ${response.status}` : undefined);

  if (!response.ok) {
    return {
      ok: false,
      valid,
      message,
      instanceId,
      raw: json,
    };
  }

  return {
    ok: true,
    valid,
    message,
    instanceId,
    raw: json,
  };
}

export function isLicenseApiConfigured(): boolean {
  return Boolean(getApiBase());
}

export async function activateLicense(input: {
  licenseKey: string;
  instanceName: string;
  instanceId?: string | null;
  email?: string;
}): Promise<LicenseResponse> {
  return postLicense('/license/activate', {
    license_key: input.licenseKey.trim(),
    instance_name: input.instanceName,
    instance_id: input.instanceId ?? undefined,
    email: input.email?.trim() || undefined,
  });
}

export async function validateLicense(input: {
  licenseKey: string;
  instanceId?: string | null;
  instanceName?: string;
}): Promise<LicenseResponse> {
  return postLicense('/license/validate', {
    license_key: input.licenseKey.trim(),
    instance_id: input.instanceId ?? undefined,
    instance_name: input.instanceName ?? undefined,
  });
}

export async function deactivateLicense(input: {
  licenseKey: string;
  instanceId?: string | null;
}): Promise<LicenseResponse> {
  return postLicense('/license/deactivate', {
    license_key: input.licenseKey.trim(),
    instance_id: input.instanceId ?? undefined,
  });
}
