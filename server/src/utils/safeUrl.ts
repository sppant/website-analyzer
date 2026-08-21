import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

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
    return ipaddr.parse(normalizedHostname).range() === "unicast";
  }

  try {
    const addresses = await dns.lookup(normalizedHostname, {
      all: true,
    });

    if (!addresses.length) {
      return false;
    }

    return addresses.every(({ address }) => {
      if (!ipaddr.isValid(address)) {
        return false;
      }

      return ipaddr.parse(address).range() === "unicast";
    });
  } catch {
    return false;
  }
}
