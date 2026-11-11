import { buildReportCsv, reportCsvFileName } from './reportCsv';
import { buildReportHtml } from './reportHtml';
import type { Report } from './types';
import type { Language } from '@/i18n';

// Loaded on first use, like notify.ts: importing a native module at startup would crash a build that lacks it.
const loadPrint = () => import('expo-print');
const loadSharing = () => import('expo-sharing');
const loadFiles = () => import('expo-file-system');

// A4 in CSS pixels at 72 per inch.
const A4 = { width: 595, height: 842 };

export const reportFileName = ({ period }: Pick<Report, 'period'>): string =>
  `Nafaqati-Report-${period.year}-${String(period.month).padStart(2, '0')}.pdf`;

// Makes the PDF of the report and opens the share sheet (save to Files, send, print). Throws when it cannot,
// so the screen can say so.
export async function exportReportPdf(report: Report, language: Language): Promise<void> {
  const [Print, Sharing, Files] = await Promise.all([loadPrint(), loadSharing(), loadFiles()]);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');

  // Ask for the PDF's bytes too. The file Print writes cannot be read back or shared in Expo Go on Android
  // ("Missing READ permission" / "Not allowed to read file"), so our own copy is written into the app's
  // cache folder from the bytes and that copy is shared. It also gets a readable name.
  const printed = await Print.printToFileAsync({ html: buildReportHtml(report, language), base64: true, ...A4 });
  let uri = printed.uri;
  if (printed.base64) {
    const pdf = new Files.File(Files.Paths.cache, reportFileName(report));
    pdf.create({ overwrite: true });
    pdf.write(printed.base64, { encoding: 'base64' });
    uri = pdf.uri;
  }

  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Nafaqati' });
}

// The month's spending rows as a CSV file (opens in Excel), shared the same way. Throws when it cannot.
export async function exportReportCsv(report: Report): Promise<void> {
  const [Sharing, Files] = await Promise.all([loadSharing(), loadFiles()]);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');

  const file = new Files.File(Files.Paths.cache, reportCsvFileName(report));
  file.create({ overwrite: true });
  file.write(buildReportCsv(report));
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Nafaqati' });
}
