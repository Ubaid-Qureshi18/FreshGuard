// js/scanner.js — Camera Capture + AI OCR Pipeline

import { analyzeFoodLabel } from './gemini.js';

let stream = null;
let flashEnabled = false;

/**
 * Start the camera stream.
 * @param {HTMLVideoElement} videoEl
 */
export async function startCamera(videoEl) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline', true);
    await videoEl.play();
    return true;
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('PERMISSION_DENIED');
    }
    throw new Error('CAMERA_ERROR');
  }
}

/**
 * Stop the camera stream.
 */
export function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  flashEnabled = false;
}

/**
 * Toggle flash/torch if supported.
 */
export async function toggleFlash() {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track || !track.getCapabilities) return false;
  const caps = track.getCapabilities();
  if (!caps.torch) return false;
  flashEnabled = !flashEnabled;
  await track.applyConstraints({ advanced: [{ torch: flashEnabled }] });
  return flashEnabled;
}

/**
 * Capture a frame from the video element.
 * Returns { base64, mimeType }
 */
export function captureFrame(videoEl, canvasEl) {
  const { videoWidth: w, videoHeight: h } = videoEl;
  canvasEl.width  = w || 1280;
  canvasEl.height = h || 720;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  const dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
  const base64  = dataUrl.split(',')[1];
  return { base64, mimeType: 'image/jpeg' };
}

/**
 * Capture from a file input (gallery fallback).
 * Returns { base64, mimeType }
 */
export function captureFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      const base64  = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Full pipeline: capture → analyze → return result
 */
export async function runScanPipeline(base64, mimeType) {
  const result = await analyzeFoodLabel(base64, mimeType);
  return result;
}

/**
 * Validate a scan result — returns { valid, issues }
 */
export function validateScanResult(result) {
  const issues = [];
  if (!result.productName) issues.push('Product name not detected');
  if (!result.listedDate)  issues.push('Date not detected');
  if (!result.dateType)    issues.push('Date type not detected');
  if (result.confidence < 0.6) issues.push('Low confidence reading');
  return {
    valid: issues.length === 0 && result.confidence >= 0.6,
    issues,
  };
}
