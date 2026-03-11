import { ReactNode, useEffect, useMemo, useState } from 'react';
import * as db from '../../services/database';
import {
  activateLicense,
  deactivateLicense,
  isLicenseApiConfigured,
  validateLicense,
} from '../../services/licenseService';

const KEY_LICENSE = 'license_key';
const KEY_EMAIL = 'license_email';
const KEY_INSTANCE_ID = 'license_instance_id';
const KEY_DEVICE_ID = 'license_device_id';
const KEY_LAST_VALIDATED_AT = 'license_last_validated_at';
const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString();
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await db.getSetting(KEY_DEVICE_ID);
  if (existing) return existing;

  const created =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await db.setSetting(KEY_DEVICE_ID, created);
  return created;
}

interface LicenseGateProps {
  children: ReactNode;
}

export function LicenseGate({ children }: LicenseGateProps) {
  const [loading, setLoading] = useState(true);
  const [licensed, setLicensed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [email, setEmail] = useState('');
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiConfigured = useMemo(() => isLicenseApiConfigured(), []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const [savedKey, savedEmail, savedInstanceId, savedLastValidatedAt] = await Promise.all([
          db.getSetting(KEY_LICENSE),
          db.getSetting(KEY_EMAIL),
          db.getSetting(KEY_INSTANCE_ID),
          db.getSetting(KEY_LAST_VALIDATED_AT),
        ]);
        const resolvedDeviceId = await getOrCreateDeviceId();
        if (cancelled) return;

        setDeviceId(resolvedDeviceId);
        setLicenseKey(savedKey ?? '');
        setEmail(savedEmail ?? '');
        setInstanceId(savedInstanceId);

        if (!savedKey) {
          setLicensed(false);
          setLoading(false);
          return;
        }

        if (!apiConfigured) {
          if (import.meta.env.DEV) {
            setLicensed(true);
            setMessage('License API not configured in dev mode; license checks bypassed.');
          } else {
            setLicensed(false);
            setError('License API is not configured. Set VITE_LICENSE_API_BASE.');
          }
          setLoading(false);
          return;
        }

        try {
          const result = await validateLicense({
            licenseKey: savedKey,
            instanceId: savedInstanceId,
            instanceName: `local-player-${resolvedDeviceId}`,
          });
          if (cancelled) return;

          if (result.ok && result.valid) {
            const now = Date.now();
            await db.setSetting(KEY_LAST_VALIDATED_AT, String(now));
            if (result.instanceId && result.instanceId !== savedInstanceId) {
              await db.setSetting(KEY_INSTANCE_ID, result.instanceId);
              setInstanceId(result.instanceId);
            }
            setLicensed(true);
            setMessage('License validated.');
            setLoading(false);
            return;
          }

          setLicensed(false);
          setError(result.message ?? 'License validation failed.');
          setLoading(false);
        } catch (err) {
          const now = Date.now();
          const lastValidAt = Number(savedLastValidatedAt ?? 0);
          const withinGrace = lastValidAt > 0 && now - lastValidAt <= OFFLINE_GRACE_MS;

          if (withinGrace) {
            setLicensed(true);
            setMessage(
              `Offline grace mode active. Last successful validation: ${formatDateTime(lastValidAt)}`
            );
            setLoading(false);
            return;
          }

          setLicensed(false);
          setError(
            `Could not reach license server and offline grace expired: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        setLicensed(false);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [apiConfigured]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Enter your license key.');
      return;
    }
    if (!deviceId) {
      setError('Device identity is not ready. Try again.');
      return;
    }
    if (!apiConfigured) {
      setError('VITE_LICENSE_API_BASE is not configured.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await activateLicense({
        licenseKey,
        email,
        instanceName: `local-player-${deviceId}`,
        instanceId,
      });
      if (!result.ok || !result.valid) {
        setLicensed(false);
        setError(result.message ?? 'Activation failed.');
        return;
      }

      const now = Date.now();
      await db.setSetting(KEY_LICENSE, licenseKey.trim());
      await db.setSetting(KEY_EMAIL, email.trim());
      if (result.instanceId) {
        await db.setSetting(KEY_INSTANCE_ID, result.instanceId);
        setInstanceId(result.instanceId);
      }
      await db.setSetting(KEY_LAST_VALIDATED_AT, String(now));
      setLicensed(true);
      setMessage('License activated successfully.');
    } catch (err) {
      setLicensed(false);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!licenseKey.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (apiConfigured) {
        await deactivateLicense({
          licenseKey,
          instanceId,
        });
      }

      await Promise.all([
        db.setSetting(KEY_LICENSE, ''),
        db.setSetting(KEY_EMAIL, ''),
        db.setSetting(KEY_INSTANCE_ID, ''),
        db.setSetting(KEY_LAST_VALIDATED_AT, '0'),
      ]);
      setLicensed(false);
      setMessage('License deactivated on this device.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="panel w-full max-w-xl p-6">
          <h2 className="panel-title text-lg">Checking License</h2>
          <p className="mt-2 text-sm text-cosmic-light-teal/70">Validating your Local Player license...</p>
        </div>
      </div>
    );
  }

  if (licensed) {
    return (
      <>
        {message && (
          <div className="fixed left-4 top-4 z-50">
            <div className="toast-shell toast-info px-4 py-2 text-xs">{message}</div>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="panel w-full max-w-xl p-6">
        <h2 className="panel-title text-xl">Activate Local Player</h2>
        <p className="mt-2 text-sm text-cosmic-light-teal/70">
          Enter your Lemon Squeezy license key to unlock this app.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="soft-label">License Key</span>
            <input
              type="text"
              value={licenseKey}
              onChange={(event) => setLicenseKey(event.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="terminal-input mt-1 w-full px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="soft-label">Email (Optional)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="terminal-input mt-1 w-full px-3 py-2"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {message && <p className="mt-3 text-sm text-cosmic-light-teal/70">{message}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={handleActivate} disabled={isSubmitting} className="terminal-btn terminal-btn-primary px-4 py-2">
            {isSubmitting ? 'Activating...' : 'Activate License'}
          </button>
          <button onClick={handleDeactivate} disabled={isSubmitting || !licenseKey.trim()} className="terminal-btn px-4 py-2">
            Clear License
          </button>
        </div>

        <p className="mt-4 text-xs text-cosmic-light-teal/60">
          Device ID: {deviceId ?? '...'}
        </p>
      </div>
    </div>
  );
}

