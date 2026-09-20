import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import ipaddr from "ipaddr.js";

/**
 * True when `ip` is a normal, publicly-routable unicast address. This is the
 * single definition of "safe destination" used by both the up-front URL check
 * (`isSafeUrl`) and the connection-time DNS pin (`ssrfSafeLookup`). Loopback,
 * private, link-local (incl. the cloud metadata endpoint), unique-local,
 * multicast, reserved and IPv4-mapped IPv6 addresses are all rejected.
 */
export function isUnicastAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) {
    return false;
  }
  return ipaddr.parse(ip).range() === "unicast";
}

export async function isSafeUrl(url: string): Promise<boolean> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return false;
  }

  if (parsedUrl.username || parsedUrl.password) {
    return false;
  }

  const hostname = parsedUrl.hostname;

  if (!hostname) {
    return false;
  }

  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");

  if (ipaddr.isValid(normalizedHostname)) {
    return isUnicastAddress(normalizedHostname);
  }

  try {
    const addresses = await dnsPromises.lookup(normalizedHostname, {
      all: true,
    });

    if (!addresses.length) {
      return false;
    }

    return addresses.every(({ address }) => isUnicastAddress(address));
  } catch {
    return false;
  }
}

/**
 * Raised inside `ssrfSafeLookup` when a hostname resolves to an address that
 * fails the safety check. Surfaces as a normal connection error to the caller.
 */
export class BlockedAddressError extends Error {
  code = "ERR_SSRF_BLOCKED";

  constructor(message: string) {
    super(message);
    this.name = "BlockedAddressError";
  }
}

type LookupAllCallback = (
  err: NodeJS.ErrnoException | null,
  addresses: { address: string; family: number }[],
) => void;

type LookupSingleCallback = (
  err: NodeJS.ErrnoException | null,
  address: string,
  family: number,
) => void;

/**
 * A `dns.lookup`-compatible function that closes the DNS-rebinding / TOCTOU
 * hole: the same resolution that is validated here is the one the socket
 * connects to (undici calls this to obtain the target IP). Every resolved
 * address must pass `isUnicastAddress` — if *any* is unsafe the whole lookup
 * fails, so a hostname that mixes a public and a private record is rejected.
 *
 * The original hostname is preserved by undici for the HTTP `Host` header and
 * the TLS SNI; only the IP the connection dials is pinned here.
 */
export function ssrfSafeLookup(
  hostname: string,
  options: dns.LookupOptions | number | LookupAllCallback | LookupSingleCallback,
  callback?: LookupAllCallback | LookupSingleCallback,
): void {
  const cb = (typeof options === "function" ? options : callback) as
    | LookupAllCallback
    | LookupSingleCallback;
  const opts: dns.LookupOptions =
    typeof options === "object" && options !== null ? options : {};

  const finish = (
    err: NodeJS.ErrnoException | null,
    records: { address: string; family: number }[],
  ): void => {
    if (err) {
      (cb as LookupSingleCallback)(err, "", 0);
      return;
    }
    if (opts.all) {
      (cb as LookupAllCallback)(null, records);
    } else {
      const first = records[0]!;
      (cb as LookupSingleCallback)(null, first.address, first.family);
    }
  };

  // A literal IP host never hits DNS; validate it directly.
  if (ipaddr.isValid(hostname)) {
    if (!isUnicastAddress(hostname)) {
      finish(new BlockedAddressError(`Blocked address: ${hostname}`), []);
      return;
    }
    finish(null, [
      { address: hostname, family: ipaddr.parse(hostname).kind() === "ipv6" ? 6 : 4 },
    ]);
    return;
  }

  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) {
      finish(err, []);
      return;
    }
    const records = Array.isArray(addresses)
      ? addresses
      : [{ address: addresses as unknown as string, family: 0 }];

    if (records.length === 0) {
      finish(new BlockedAddressError(`${hostname} did not resolve`), []);
      return;
    }

    const unsafe = records.find((r) => !isUnicastAddress(r.address));
    if (unsafe) {
      finish(
        new BlockedAddressError(
          `${hostname} resolves to a blocked address (${unsafe.address})`,
        ),
        [],
      );
      return;
    }

    // Honour a requested address family when possible, otherwise pin the first.
    const family = typeof opts === "object" ? opts.family : undefined;
    const chosen =
      (family === 4 || family === 6
        ? records.find((r) => r.family === family)
        : undefined) ?? records[0]!;
    finish(null, [chosen]);
  });
}
