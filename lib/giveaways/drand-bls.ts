import { bls12_381 } from "@noble/curves/bls12-381.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import { QUICKNET } from "./drand";

/**
 * BLS check for drand quicknet (bls-unchained-g1-rfc9380): the signature
 * is a G1 point over sha256(uint64_be(round)), hashed to G1 with the
 * BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_ tag, verified against the
 * PINNED G2 public key. Isomorphic; split out so the browser verifier
 * imports it lazily.
 */
const sigs = bls12_381.shortSignatures;

export function roundMessage(round: number): Uint8Array {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, Math.floor(round / 0x1_0000_0000));
  view.setUint32(4, round >>> 0);
  return sha256(bytes);
}

export function verifyBeaconSignature(round: number, signature: string): boolean {
  try {
    return sigs.verify(
      hexToBytes(signature),
      sigs.hash(roundMessage(round)),
      hexToBytes(QUICKNET.publicKey),
    );
  } catch {
    return false;
  }
}
