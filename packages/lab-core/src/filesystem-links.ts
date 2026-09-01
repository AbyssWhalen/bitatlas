export type FileLinkAction = 'create-symlink' | 'create-hardlink' | 'unlink-target';

export interface FileLinkConfig {
  readonly targetName: string;
  readonly symbolicLinkName: string;
  readonly hardLinkName: string;
  readonly targetContent: string;
  readonly initialTargetLinkCount: number;
  readonly actions: readonly FileLinkAction[];
}

export type FileLinkInodeKind = 'regular' | 'symlink';

export interface FileLinkInodeState {
  readonly inodeId: string;
  readonly kind: FileLinkInodeKind;
  readonly linkCount: number;
  readonly content: string | null;
  readonly targetName: string | null;
  readonly dangling: boolean;
}

export interface FileLinkDirectoryEntry {
  readonly name: string;
  readonly inodeId: string;
}

export interface FileLinkResolution {
  readonly symlink: { readonly targetName: string; readonly dangling: boolean } | null;
  readonly hardlink: { readonly inodeId: string; readonly content: string } | null;
}

export interface FileLinkState {
  readonly configFingerprint: string;
  readonly step: number;
  readonly directory: readonly FileLinkDirectoryEntry[];
  readonly inodes: readonly FileLinkInodeState[];
  readonly resolution: FileLinkResolution;
  readonly appliedActions: readonly FileLinkAction[];
}

export type FileLinkTraceStepKind = 'initial' | FileLinkAction;

export interface FileLinkTraceStep {
  readonly kind: FileLinkTraceStepKind;
  readonly description: string;
  readonly state: FileLinkState;
}

export interface FileLinkTrace {
  readonly initialState: FileLinkState;
  readonly steps: readonly FileLinkTraceStep[];
  readonly finalState: FileLinkState;
}

const FILE_LINK_ACTIONS: readonly FileLinkAction[] = [
  'create-symlink',
  'create-hardlink',
  'unlink-target',
];
const MAX_FILE_LINK_ACTIONS = 16;

function assertName(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 64) {
    throw new RangeError(`${label} must be a non-empty name of at most 64 characters`);
  }
  const hasControlCharacter = [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint < 32 || codePoint === 127;
  });
  if (value.includes('/') || value.includes('\\') || hasControlCharacter || value === '.' || value === '..') {
    throw new RangeError(`${label} must be a simple directory entry name`);
  }
}

function assertSafeInteger(value: number, label: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be a safe integer greater than or equal to ${minimum}`);
  }
}

function assertAction(action: FileLinkAction): void {
  if (!FILE_LINK_ACTIONS.includes(action)) {
    throw new RangeError(`unknown action: ${String(action)}`);
  }
}

function configFingerprint(config: FileLinkConfig): string {
  return JSON.stringify({
    targetName: config.targetName,
    symbolicLinkName: config.symbolicLinkName,
    hardLinkName: config.hardLinkName,
    targetContent: config.targetContent,
    initialTargetLinkCount: config.initialTargetLinkCount,
    actions: [...config.actions],
  });
}

function validateConfig(config: FileLinkConfig): void {
  assertName(config.targetName, 'targetName');
  assertName(config.symbolicLinkName, 'symbolicLinkName');
  assertName(config.hardLinkName, 'hardLinkName');
  if (new Set([config.targetName, config.symbolicLinkName, config.hardLinkName]).size !== 3) {
    throw new RangeError('targetName, symbolicLinkName, and hardLinkName must be distinct');
  }
  if (typeof config.targetContent !== 'string' || config.targetContent.length > 4096) {
    throw new RangeError('targetContent must be a string of at most 4096 characters');
  }
  assertSafeInteger(config.initialTargetLinkCount, 'initialTargetLinkCount', 1);
  if (config.initialTargetLinkCount !== 1) {
    throw new RangeError('initialTargetLinkCount must be 1 for the named Q31 sequence');
  }
  if (!Array.isArray(config.actions) || config.actions.length > MAX_FILE_LINK_ACTIONS) {
    throw new RangeError(`actions must contain at most ${MAX_FILE_LINK_ACTIONS} operations`);
  }
  for (const action of config.actions) assertAction(action);
}

function cloneInodes(inodes: readonly FileLinkInodeState[]): FileLinkInodeState[] {
  return inodes.map((inode) => ({ ...inode }));
}

function deriveResolution(
  config: FileLinkConfig,
  directory: readonly FileLinkDirectoryEntry[],
  inodes: readonly FileLinkInodeState[],
): FileLinkResolution {
  const inodeById = new Map(inodes.map((inode) => [inode.inodeId, inode]));
  const entryByName = new Map(directory.map((entry) => [entry.name, entry]));
  const symlinkEntry = entryByName.get(config.symbolicLinkName);
  const symlinkInode = symlinkEntry === undefined ? undefined : inodeById.get(symlinkEntry.inodeId);
  const targetName = symlinkInode?.kind === 'symlink' ? symlinkInode.targetName : null;
  const targetEntry = targetName === null ? undefined : entryByName.get(targetName);
  const targetInode = targetEntry === undefined ? undefined : inodeById.get(targetEntry.inodeId);
  const hardlinkEntry = entryByName.get(config.hardLinkName);
  const hardlinkInode = hardlinkEntry === undefined ? undefined : inodeById.get(hardlinkEntry.inodeId);

  return {
    symlink: symlinkInode?.kind === 'symlink'
      ? { targetName: symlinkInode.targetName!, dangling: targetInode?.kind !== 'regular' }
      : null,
    hardlink: hardlinkInode?.kind === 'regular'
      ? { inodeId: hardlinkInode.inodeId, content: hardlinkInode.content! }
      : null,
  };
}

export function validateFileLinkState(config: FileLinkConfig, state: FileLinkState): void {
  validateConfig(config);
  if (state.configFingerprint !== configFingerprint(config)) {
    throw new Error('state was created for a different filesystem-link configuration');
  }
  assertSafeInteger(state.step, 'state.step');
  if (state.step !== state.appliedActions.length) {
    throw new Error('state.step must equal the number of applied actions');
  }
  for (const action of state.appliedActions) assertAction(action);
  if (state.appliedActions.length > config.actions.length
    || state.appliedActions.some((action, index) => action !== config.actions[index])) {
    throw new Error('state actions do not match the configured operation prefix');
  }

  const inodeById = new Map<string, FileLinkInodeState>();
  for (const inode of state.inodes) {
    if (inodeById.has(inode.inodeId)) throw new Error('state contains duplicate inode ids');
    inodeById.set(inode.inodeId, inode);
    assertSafeInteger(inode.linkCount, `link count for ${inode.inodeId}`);
    if (inode.kind === 'regular' && (inode.content === null || inode.targetName !== null || inode.dangling)) {
      throw new Error('regular inode has invalid content or target fields');
    }
    if (inode.kind === 'symlink' && (inode.content !== null || inode.targetName === null)) {
      throw new Error('symlink inode has invalid content or target fields');
    }
    if (inode.kind === 'symlink' && inode.targetName !== config.targetName) {
      throw new Error('symlink inode target does not match the configured target name');
    }
  }

  const directoryNames = new Set<string>();
  const entryCounts = new Map<string, number>();
  for (const entry of state.directory) {
    if (directoryNames.has(entry.name)) throw new Error('state contains duplicate directory names');
    directoryNames.add(entry.name);
    if (!inodeById.has(entry.inodeId)) throw new Error('directory entry references an unknown inode');
    entryCounts.set(entry.inodeId, (entryCounts.get(entry.inodeId) ?? 0) + 1);
  }
  for (const inode of state.inodes) {
    if (inode.linkCount !== (entryCounts.get(inode.inodeId) ?? 0)) {
      throw new Error(`inode ${inode.inodeId} link count does not match directory entries`);
    }
  }

  const expectedResolution = deriveResolution(config, state.directory, state.inodes);
  if (JSON.stringify(state.resolution) !== JSON.stringify(expectedResolution)) {
    throw new Error('state resolution does not match directory and inode state');
  }

  for (const inode of state.inodes) {
    if (inode.kind !== 'symlink') continue;
    const expectedDangling = expectedResolution.symlink?.dangling ?? true;
    if (inode.dangling !== expectedDangling) {
      throw new Error(`symlink inode ${inode.inodeId} dangling flag does not match resolution`);
    }
  }

  const canonical = createFileLinkStateUnchecked(config);
  let replayed = canonical;
  for (const action of state.appliedActions) {
    replayed = applyFileLinkActionUnchecked(config, replayed, action);
  }
  if (JSON.stringify(replayed) !== JSON.stringify(state)) {
    throw new Error('state does not match the canonical action-prefix replay');
  }
}

function createFileLinkStateUnchecked(config: FileLinkConfig): FileLinkState {
  const target: FileLinkInodeState = {
    inodeId: 'inode-target',
    kind: 'regular',
    linkCount: config.initialTargetLinkCount,
    content: config.targetContent,
    targetName: null,
    dangling: false,
  };
  const directory = [{ name: config.targetName, inodeId: target.inodeId }];
  const state: FileLinkState = {
    configFingerprint: configFingerprint(config),
    step: 0,
    directory,
    inodes: [target],
    resolution: deriveResolution(config, directory, [target]),
    appliedActions: [],
  };
  return state;
}

export function createFileLinkState(config: FileLinkConfig): FileLinkState {
  validateConfig(config);
  const state = createFileLinkStateUnchecked(config);
  validateFileLinkState(config, state);
  return state;
}

function stateWithUnchecked(
  config: FileLinkConfig,
  state: FileLinkState,
  directory: readonly FileLinkDirectoryEntry[],
  inodes: readonly FileLinkInodeState[],
  action: FileLinkAction,
): FileLinkState {
  const normalizedInodes = cloneInodes(inodes).map((inode) => (
    inode.kind === 'symlink'
      ? {
        ...inode,
        dangling: directory.find((entry) => entry.name === inode.targetName) === undefined
          || inodes.find((candidate) => candidate.inodeId === directory.find((entry) => entry.name === inode.targetName)?.inodeId)?.kind !== 'regular',
      }
      : inode
  ));
  const next: FileLinkState = {
    configFingerprint: state.configFingerprint,
    step: state.step + 1,
    directory: directory.map((entry) => ({ ...entry })),
    inodes: normalizedInodes,
    resolution: deriveResolution(config, directory, normalizedInodes),
    appliedActions: [...state.appliedActions, action],
  };
  return next;
}

function applyFileLinkActionUnchecked(
  config: FileLinkConfig,
  state: FileLinkState,
  action: FileLinkAction,
): FileLinkState {
  const directory = [...state.directory];
  const inodes = cloneInodes(state.inodes);
  const entryIndex = (name: string) => directory.findIndex((entry) => entry.name === name);

  if (action === 'create-symlink') {
    if (entryIndex(config.symbolicLinkName) !== -1) throw new Error('symbolic link entry already exists');
    inodes.push({
      inodeId: 'inode-symlink',
      kind: 'symlink',
      linkCount: 1,
      content: null,
      targetName: config.targetName,
      dangling: false,
    });
    directory.push({ name: config.symbolicLinkName, inodeId: 'inode-symlink' });
  } else if (action === 'create-hardlink') {
    if (entryIndex(config.targetName) === -1) throw new Error('target entry is required before creating a hard-link');
    if (entryIndex(config.hardLinkName) !== -1) throw new Error('hard link entry already exists');
    const targetInodeIndex = inodes.findIndex((inode) => inode.inodeId === 'inode-target' && inode.kind === 'regular');
    const targetInode = inodes[targetInodeIndex];
    if (targetInode === undefined) throw new Error('target regular inode is unavailable for hard-link');
    inodes[targetInodeIndex] = { ...targetInode, linkCount: targetInode.linkCount + 1 };
    directory.push({ name: config.hardLinkName, inodeId: targetInode.inodeId });
  } else {
    const targetIndex = entryIndex(config.targetName);
    if (targetIndex === -1) throw new Error('target entry is required before unlink-target');
    const targetEntry = directory[targetIndex];
    directory.splice(targetIndex, 1);
    const targetInodeIndex = inodes.findIndex((inode) => inode.inodeId === targetEntry?.inodeId);
    const targetInode = inodes[targetInodeIndex];
    if (targetInode === undefined || targetInode.kind !== 'regular') throw new Error('target entry does not reference a regular inode');
    if (targetInode.linkCount <= 0) throw new Error('target inode has no link count to release');
    const nextLinkCount = targetInode.linkCount - 1;
    if (nextLinkCount === 0) inodes.splice(targetInodeIndex, 1);
    else inodes[targetInodeIndex] = { ...targetInode, linkCount: nextLinkCount };
  }

  return stateWithUnchecked(config, state, directory, inodes, action);
}

export function applyFileLinkAction(
  config: FileLinkConfig,
  state: FileLinkState,
  action: FileLinkAction,
): FileLinkState {
  validateFileLinkState(config, state);
  assertAction(action);
  const next = applyFileLinkActionUnchecked(config, state, action);
  validateFileLinkState(config, next);
  return next;
}

export function traceFileLinks(config: FileLinkConfig): FileLinkTrace {
  validateConfig(config);
  const initialState = createFileLinkState(config);
  const steps: FileLinkTraceStep[] = [{
    kind: 'initial',
    description: `目录中只有 ${config.targetName}，目标 inode link count=${config.initialTargetLinkCount}`,
    state: initialState,
  }];
  let state = initialState;
  for (const action of config.actions) {
    state = applyFileLinkAction(config, state, action);
    const descriptions: Record<FileLinkAction, string> = {
      'create-symlink': `建立符号链接 ${config.symbolicLinkName} -> ${config.targetName}`,
      'create-hardlink': `建立硬链接 ${config.hardLinkName}，目标 inode link count=${state.inodes.find((inode) => inode.inodeId === 'inode-target')?.linkCount ?? 0}`,
      'unlink-target': `删除目录项 ${config.targetName}，保留其他链接并重新解析符号链接`,
    };
    steps.push({ kind: action, description: descriptions[action], state });
  }
  return { initialState, steps, finalState: state };
}

export const FILE_LINK_Q31_PRESET = {
  sourceQuestionId: 'cn408-2009-q31',
  reviewStatus: 'needs-review',
  config: {
    targetName: 'F1',
    symbolicLinkName: 'F2',
    hardLinkName: 'F3',
    targetContent: 'Q31 sample file',
    initialTargetLinkCount: 1,
    actions: ['create-symlink', 'create-hardlink', 'unlink-target'],
  },
} as const satisfies {
  readonly sourceQuestionId: string;
  readonly reviewStatus: 'needs-review';
  readonly config: FileLinkConfig;
};
