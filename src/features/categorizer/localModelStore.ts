import { getModelJson } from './modelClient';
import { isValidModel, predictLocal, SUPPORTED_FORMAT, type LocalModel } from './localModel';
import { devLog } from '@/utils/devLog';

// The merchant model lives on the phone. A copy ships inside the app (localModelBase.json, so the first
// launch works offline); the server's newer models are downloaded into the app's document folder and
// used from then on. A new model never needs an app update: only a new model *format* would.
const FILE_NAME = 'merchant-model.json';

const loadFiles = () => import('expo-file-system');

let loading: Promise<LocalModel> | null = null;
let active: LocalModel | null = null;

async function readStored(): Promise<LocalModel | null> {
  try {
    const Files = await loadFiles();
    const file = new Files.File(Files.Paths.document, FILE_NAME);
    if (!file.exists) return null;
    const parsed: unknown = JSON.parse(await file.text());
    return isValidModel(parsed) ? parsed : null;
  } catch (error) {
    devLog(`[local model] stored model unreadable: ${String(error)}`);
    return null;
  }
}

async function writeStored(model: LocalModel): Promise<void> {
  const Files = await loadFiles();
  const file = new Files.File(Files.Paths.document, FILE_NAME);
  file.create({ overwrite: true });
  file.write(JSON.stringify(model));
}

// The model in use: the downloaded one if there is one, else the one bundled with the app.
export function getLocalModel(): Promise<LocalModel> {
  loading ??= (async () => {
    const model = (await readStored()) ?? ((await import('./localModelBase.json')).default as unknown as LocalModel);
    active = model;
    devLog(`[local model] using ${model.version}`);
    return model;
  })();
  return loading;
}

export type LocalAnswer = { category: string; confidence: number };

// The on-device answer for a merchant, only when the model is sure enough (same threshold as the server).
// null means: ask the server, which can use its verified list and the LLM. Never throws.
export async function predictOnDevice(merchant: string): Promise<LocalAnswer | null> {
  try {
    const model = await getLocalModel();
    const answer = predictLocal(model, merchant);
    return answer && answer.confidence >= model.threshold ? answer : null;
  } catch (error) {
    devLog(`[local model] failed, asking the server: ${String(error)}`);
    return null;
  }
}

export type UpdateResult = 'updated' | 'current' | 'unsupported' | 'failed';

// Asks the server which model it uses and downloads it when the phone has another one (a newer model,
// or an older one after a rollback). Keeps the current model on any failure. Never throws.
export async function updateLocalModel(): Promise<UpdateResult> {
  try {
    const info = (await getModelJson('/model/mobile/version')) as { version?: unknown; format?: unknown } | null;
    if (typeof info?.version !== 'string') return 'failed';
    // A newer model format needs a newer app: keep what works.
    if (info.format !== SUPPORTED_FORMAT) return 'unsupported';
    const current = await getLocalModel();
    if (current.version === info.version) return 'current';

    const next = await getModelJson('/model/mobile');
    if (!isValidModel(next) || next.version !== info.version) return 'failed';
    await writeStored(next);
    active = next;
    loading = Promise.resolve(next);
    devLog(`[local model] updated ${current.version} -> ${next.version}`);
    return 'updated';
  } catch (error) {
    devLog(`[local model] update failed: ${String(error)}`);
    return 'failed';
  }
}

// For tests and for forgetting what was loaded.
export function resetLocalModel(): void {
  loading = null;
  active = null;
}

export function activeModelVersion(): string | null {
  return active?.version ?? null;
}
