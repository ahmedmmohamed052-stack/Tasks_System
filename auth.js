// ─────────────────────────────────────────────────────────────
//  firebase/auth.js
//  Phone-number authentication + Firestore access control
// ─────────────────────────────────────────────────────────────

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "./config.js";

// ── Constants ─────────────────────────────────────────────────

const ALLOWED_USERS_COLLECTION = "allowedUsers";

// ── reCAPTCHA ─────────────────────────────────────────────────

/**
 * Initializes the invisible reCAPTCHA verifier.
 * Call once before sending an OTP.
 *
 * @param {string} buttonId - ID of the "Send OTP" button element
 * @returns {RecaptchaVerifier}
 */
export function initRecaptcha(buttonId) {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    buttonId,
    { size: "invisible" }
  );

  return window.recaptchaVerifier;
}

// ── Step 1: Send OTP ──────────────────────────────────────────

/**
 * Sends an OTP to the given phone number.
 * Phone number must be in E.164 format, e.g. "+201234567890".
 *
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {string} buttonId    - ID of the "Send OTP" button (for reCAPTCHA)
 * @returns {Promise<import("firebase/auth").ConfirmationResult>}
 */
export async function sendOTP(phoneNumber, buttonId) {
  const recaptcha = initRecaptcha(buttonId);

  try {
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptcha
    );

    // Store for use in verifyOTP
    window.confirmationResult = confirmationResult;
    return confirmationResult;

  } catch (error) {
    console.error("[Auth] Failed to send OTP:", error);
    throw error;
  }
}

// ── Step 2: Verify OTP ────────────────────────────────────────

/**
 * Verifies the OTP entered by the user.
 * If correct, checks Firestore to confirm this phone number is allowed.
 *
 * @param {string} otp - 6-digit OTP from SMS
 * @returns {Promise<{ success: boolean, user?: object, error?: string }>}
 */
export async function verifyOTP(otp) {
  if (!window.confirmationResult) {
    return { success: false, error: "No OTP session found. Please request a new OTP." };
  }

  try {
    const credential = await window.confirmationResult.confirm(otp);
    const user       = credential.user;
    const phone      = user.phoneNumber;

    // ── Firestore access check ────────────────────────────────
    const allowed = await isUserAllowed(phone);

    if (!allowed) {
      await signOut(auth);
      return { success: false, error: "Access denied. This number is not registered." };
    }

    return { success: true, user };

  } catch (error) {
    console.error("[Auth] OTP verification failed:", error);

    const messages = {
      "auth/invalid-verification-code": "Invalid OTP. Please try again.",
      "auth/code-expired":              "OTP expired. Please request a new one.",
    };

    return {
      success: false,
      error: messages[error.code] ?? "Verification failed. Please try again.",
    };
  }
}

// ── Firestore Access Check ────────────────────────────────────

/**
 * Checks if a phone number exists in the Firestore allowedUsers collection.
 *
 * Firestore structure:
 *   allowedUsers/
 *     +201234567890  →  { active: true, name: "Ahmed", addedAt: Timestamp }
 *     +201111111111  →  { active: false, ... }   ← inactive = denied
 *
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Promise<boolean>}
 */
export async function isUserAllowed(phoneNumber) {
  try {
    const ref  = doc(db, ALLOWED_USERS_COLLECTION, phoneNumber);
    const snap = await getDoc(ref);

    if (!snap.exists()) return false;

    const data = snap.data();
    return data.active === true;

  } catch (error) {
    console.error("[Firestore] Access check failed:", error);
    return false;
  }
}

// ── Sign Out ──────────────────────────────────────────────────

/**
 * Signs the current user out.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("[Auth] Sign-out failed:", error);
    throw error;
  }
}

// ── Auth State Observer ───────────────────────────────────────

/**
 * Listens to auth state changes.
 * On each change, re-validates the user against Firestore.
 *
 * @param {(state: { loggedIn: boolean, user?: object }) => void} callback
 * @returns {import("firebase/auth").Unsubscribe}
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ loggedIn: false });
      return;
    }

    const allowed = await isUserAllowed(user.phoneNumber);

    if (!allowed) {
      await signOut(auth);
      callback({ loggedIn: false });
      return;
    }

    callback({ loggedIn: true, user });
  });
}
