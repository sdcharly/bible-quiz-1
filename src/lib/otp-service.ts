import { db } from "@/lib/db";
import { verification } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "./logger";

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// Store for tracking OTP attempts (in production, use Redis or database)
const otpAttempts = new Map<string, { attempts: number; lockedUntil?: Date }>();
const resendCooldowns = new Map<string, Date>();

/**
 * Generate a secure random OTP
 */
export function generateOTP(): string {
  // Generate cryptographically secure random number
  const buffer = crypto.randomBytes(3);
  const otp = parseInt(buffer.toString('hex'), 16) % 1000000;
  
  // Pad with zeros to ensure 6 digits
  return otp.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hash OTP for secure storage
 */
function hashOTP(otp: string): string {
  return crypto
    .createHash('sha256')
    .update(otp + process.env.OTP_SECRET || 'default-secret')
    .digest('hex');
}

/**
 * Create and store OTP for email verification
 */
export async function createOTP(email: string, purpose: string = 'email_verification'): Promise<{ otp: string; expiresAt: Date } | { error: string }> {
  try {
    // Check resend cooldown
    const cooldownKey = `${email}:${purpose}`;
    const lastResend = resendCooldowns.get(cooldownKey);
    
    if (lastResend) {
      const timeSinceLastResend = Date.now() - lastResend.getTime();
      if (timeSinceLastResend < RESEND_COOLDOWN_SECONDS * 1000) {
        const waitTime = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - timeSinceLastResend) / 1000);
        return { error: `Please wait ${waitTime} seconds before requesting a new code` };
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Delete any existing OTP for this email and purpose
    await db
      .delete(verification)
      .where(
        and(
          eq(verification.identifier, `${email}:${purpose}`),
          eq(verification.value, 'otp')
        )
      );
    
    // Store new OTP
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: `${email}:${purpose}`,
      value: JSON.stringify({
        type: 'otp',
        hash: hashedOTP,
        purpose,
        attempts: 0
      }),
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Update resend cooldown
    resendCooldowns.set(cooldownKey, new Date());
    
    // Clean up old cooldowns after 5 minutes
    setTimeout(() => {
      resendCooldowns.delete(cooldownKey);
    }, 5 * 60 * 1000);
    
    logger.log(`OTP created for ${email} (purpose: ${purpose})`);
    
    return { otp, expiresAt };
  } catch (error) {
    logger.error('Error creating OTP:', error);
    return { error: 'Failed to create verification code' };
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(
  email: string, 
  otp: string, 
  purpose: string = 'email_verification'
): Promise<{ success: boolean; error?: string }> {
  try {
    const attemptKey = `${email}:${purpose}`;
    
    // Check if account is locked due to too many attempts
    const attemptData = otpAttempts.get(attemptKey);
    if (attemptData?.lockedUntil && attemptData.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((attemptData.lockedUntil.getTime() - Date.now()) / 60000);
      return { 
        success: false, 
        error: `Too many failed attempts. Please try again in ${waitMinutes} minutes` 
      };
    }
    
    // Get stored OTP
    const [storedOTP] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, `${email}:${purpose}`))
      .limit(1);
    
    if (!storedOTP) {
      return { success: false, error: 'No verification code found. Please request a new one' };
    }
    
    // Check expiry
    if (storedOTP.expiresAt < new Date()) {
      // Delete expired OTP
      await db
        .delete(verification)
        .where(eq(verification.id, storedOTP.id));
      
      return { success: false, error: 'Verification code has expired. Please request a new one' };
    }
    
    // Parse stored data
    let otpData;
    try {
      otpData = JSON.parse(storedOTP.value);
    } catch {
      return { success: false, error: 'Invalid verification data' };
    }
    
    // Verify OTP
    const hashedInput = hashOTP(otp);
    
    if (hashedInput !== otpData.hash) {
      // Increment failed attempts
      const attempts = (attemptData?.attempts || 0) + 1;
      
      if (attempts >= MAX_ATTEMPTS) {
        // Lock account for 30 minutes
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        otpAttempts.set(attemptKey, { attempts, lockedUntil });
        
        // Delete the OTP to prevent further attempts
        await db
          .delete(verification)
          .where(eq(verification.id, storedOTP.id));
        
        return { 
          success: false, 
          error: 'Too many failed attempts. Your account has been locked for 30 minutes' 
        };
      } else {
        otpAttempts.set(attemptKey, { attempts });
        return { 
          success: false, 
          error: `Invalid code. ${MAX_ATTEMPTS - attempts} attempts remaining` 
        };
      }
    }
    
    // OTP is valid - delete it to prevent reuse
    await db
      .delete(verification)
      .where(eq(verification.id, storedOTP.id));
    
    // Clear attempts
    otpAttempts.delete(attemptKey);
    
    logger.log(`OTP verified successfully for ${email} (purpose: ${purpose})`);
    
    return { success: true };
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    return { success: false, error: 'Failed to verify code' };
  }
}

/**
 * Clean up expired OTPs (run periodically)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    const result = await db
      .delete(verification)
      .where(eq(verification.expiresAt, new Date()));
    
    logger.log('Cleaned up expired OTPs');
  } catch (error) {
    logger.error('Error cleaning up expired OTPs:', error);
  }
}