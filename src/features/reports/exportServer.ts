import type { Report } from './types';
import { api } from '@/api/client';
import { deviceTimeZone, monthRange } from '@/features/dashboard/dashboardBuilder';

// Loaded on first use, like exportReport.ts: importing a native module at startup would crash a build that lacks it.
const loadSharing = () => import('expo-sharing');
const loadFiles = () => import('expo-file-system');

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// Premium: the server builds the PDF or Excel file (it checks the plan, so a modified app cannot skip the lock) and the
// phone only saves and shares it. A 403 means the plan does not include exports.
export async function exportReportFromServer(kind: 'pdf' | 'xlsx', period: Pick<Report, 'period'>['period']): Promise<void> {
  const [Sharing, Files] = await Promise.all([loadSharing(), loadFiles()]);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');

  const response = await api.get<ArrayBuffer>(`/api/reports/export/${kind}`, {
    params: { ...monthRange(period.year, period.month), timeZone: deviceTimeZone() },
    responseType: 'arraybuffer',
    timeout: 60000,
  });
  const name = `Nafaqati-Report-${period.year}-${String(period.month).padStart(2, '0')}.${kind}`;
  const file = new Files.File(Files.Paths.cache, name);
  file.create({ overwrite: true });
  file.write(toBase64(new Uint8Array(response.data)), { encoding: 'base64' });
  await Sharing.shareAsync(file.uri, {
    mimeType: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    UTI: kind === 'pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: 'Nafaqati',
  });
}
