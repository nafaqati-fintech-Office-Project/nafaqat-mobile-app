import type { ImagePickerOptions, ImagePickerResult } from 'expo-image-picker';

import type { ReceiptFile } from './receiptApi';

// canceled: the user backed out. denied: camera access refused. unsupported: this build of the app was
// made before the pickers were added, so their native code is missing (rebuild the app).
export type PickResult = ReceiptFile | 'canceled' | 'denied' | 'unsupported';

// Photos are sent as JPEG; a lower quality keeps a phone-camera shot small enough to upload on mobile data.
const PHOTO_OPTIONS: ImagePickerOptions = { mediaTypes: ['images'], quality: 0.25, base64: true };

// Loaded when used, not at startup, so a build without these native modules still opens the Transactions screen.
async function loadPicker() {
  try {
    return await import('expo-image-picker');
  } catch {
    return null;
  }
}

function fromPicker(result: ImagePickerResult): PickResult {
  const base64 = result.canceled ? null : result.assets[0]?.base64;
  return base64 ? { base64, mimeType: 'image/jpeg' } : 'canceled';
}

export async function takeReceiptPhoto(): Promise<PickResult> {
  const picker = await loadPicker();
  if (!picker) return 'unsupported';
  const permission = await picker.requestCameraPermissionsAsync();
  if (!permission.granted) return 'denied';
  return fromPicker(await picker.launchCameraAsync(PHOTO_OPTIONS));
}

export async function chooseReceiptPhoto(): Promise<PickResult> {
  const picker = await loadPicker();
  if (!picker) return 'unsupported';
  return fromPicker(await picker.launchImageLibraryAsync(PHOTO_OPTIONS));
}

export async function chooseReceiptPdf(): Promise<PickResult> {
  try {
    const [documents, { File }] = await Promise.all([import('expo-document-picker'), import('expo-file-system')]);
    const result = await documents.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return 'canceled';
    return { base64: await new File(result.assets[0].uri).base64(), mimeType: 'application/pdf' };
  } catch (error) {
    if (String(error).includes('native module')) return 'unsupported';
    throw error;
  }
}
