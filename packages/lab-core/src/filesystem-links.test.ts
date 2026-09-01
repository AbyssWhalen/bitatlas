import { describe, expect, it } from 'vitest';

import {
  applyFileLinkAction,
  createFileLinkState,
  FILE_LINK_Q31_PRESET,
  traceFileLinks,
  validateFileLinkState,
  type FileLinkAction,
  type FileLinkInodeState,
} from './filesystem-links';

describe('Q31 filesystem link trace', () => {
  it('replays the symlink, hardlink, and unlink sequence without conflating inode counts', () => {
    const trace = traceFileLinks(FILE_LINK_Q31_PRESET.config);

    expect(trace.steps.map((step) => step.kind)).toEqual([
      'initial',
      'create-symlink',
      'create-hardlink',
      'unlink-target',
    ]);
    expect(trace.steps[0]?.state.directory).toEqual([
      { name: 'F1', inodeId: 'inode-target' },
    ]);
    expect(trace.steps[1]?.state.inodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ inodeId: 'inode-target', kind: 'regular', linkCount: 1 }),
      expect.objectContaining({ inodeId: 'inode-symlink', kind: 'symlink', linkCount: 1, targetName: 'F1', dangling: false }),
    ]));
    expect(trace.steps[2]?.state.inodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ inodeId: 'inode-target', kind: 'regular', linkCount: 2 }),
    ]));

    const finalState = trace.finalState;
    expect(finalState.directory).toEqual([
      { name: 'F2', inodeId: 'inode-symlink' },
      { name: 'F3', inodeId: 'inode-target' },
    ]);
    expect(finalState.inodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ inodeId: 'inode-target', kind: 'regular', linkCount: 1 }),
      expect.objectContaining({ inodeId: 'inode-symlink', kind: 'symlink', linkCount: 1, targetName: 'F1', dangling: true }),
    ]));
    expect(finalState.resolution).toEqual({
      symlink: { targetName: 'F1', dangling: true },
      hardlink: { inodeId: 'inode-target', content: 'Q31 sample file' },
    });
  });

  it('is deterministic and does not mutate the caller config', () => {
    const config = structuredClone(FILE_LINK_Q31_PRESET.config);
    const first = traceFileLinks(config);
    const second = traceFileLinks(config);

    expect(second).toEqual(first);
    expect(config).toEqual(FILE_LINK_Q31_PRESET.config);
  });

  it('rejects unknown actions, duplicate names, and invalid initial counts', () => {
    expect(() => traceFileLinks({
      ...FILE_LINK_Q31_PRESET.config,
      actions: ['unknown-action' as FileLinkAction],
    })).toThrow(/action/u);
    expect(() => traceFileLinks({
      ...FILE_LINK_Q31_PRESET.config,
      hardLinkName: 'F1',
    })).toThrow(/distinct/u);
    expect(() => traceFileLinks({
      ...FILE_LINK_Q31_PRESET.config,
      initialTargetLinkCount: 0,
    })).toThrow(/initialTargetLinkCount/u);
  });

  it('rejects invalid operation ordering instead of producing an impossible state', () => {
    expect(() => traceFileLinks({
      ...FILE_LINK_Q31_PRESET.config,
      actions: ['unlink-target', 'create-hardlink'],
    })).toThrow(/target entry/u);
    expect(() => traceFileLinks({
      ...FILE_LINK_Q31_PRESET.config,
      actions: ['create-symlink', 'create-symlink'],
    })).toThrow(/already exists/u);
  });
});

describe('filesystem link boundary checks', () => {
  it.each([
    ['empty target name', { targetName: '' }],
    ['empty symbolic link name', { symbolicLinkName: '' }],
    ['empty hard link name', { hardLinkName: '' }],
  ])('rejects %s', (_label, override) => {
    expect(() => traceFileLinks({ ...FILE_LINK_Q31_PRESET.config, ...override })).toThrow(/name/u);
  });

  it('rejects an overlong custom trace', () => {
    expect(() => traceFileLinks({
      ...FILE_LINK_Q31_PRESET.config,
      actions: Array.from({ length: 17 }, () => 'create-symlink' as const),
    })).toThrow(/actions/u);
  });

  it.each(['.', '..', 'nested/name', 'nested\\name', 'bad\0name', ' '.repeat(4), 'a'.repeat(65)])(
    'rejects the unsafe directory entry name %j',
    (targetName) => {
      expect(() => traceFileLinks({ ...FILE_LINK_Q31_PRESET.config, targetName })).toThrow(/name/u);
    },
  );
});

describe('filesystem link canonical state validation', () => {
  it('rejects a final state relabeled as the initial state', () => {
    const finalState = traceFileLinks(FILE_LINK_Q31_PRESET.config).finalState;

    expect(() => validateFileLinkState(FILE_LINK_Q31_PRESET.config, {
      ...finalState,
      step: 0,
      appliedActions: [],
    })).toThrow(/canonical action-prefix replay/u);
  });

  it('rejects a hard link redirected to a different locally consistent inode', () => {
    const state = traceFileLinks(FILE_LINK_Q31_PRESET.config).steps[2]!.state;
    const target = state.inodes.find((inode) => inode.inodeId === 'inode-target')!;
    const other: FileLinkInodeState = {
      ...target,
      inodeId: 'inode-other',
      linkCount: 1,
    };
    const inodes = [
      ...state.inodes.map((inode) => (
        inode.inodeId === 'inode-target' ? { ...inode, linkCount: 1 } : inode
      )),
      other,
    ];
    const directory = state.directory.map((entry) => (
      entry.name === FILE_LINK_Q31_PRESET.config.hardLinkName
        ? { ...entry, inodeId: other.inodeId }
        : entry
    ));

    expect(() => validateFileLinkState(FILE_LINK_Q31_PRESET.config, {
      ...state,
      directory,
      inodes,
      resolution: {
        ...state.resolution,
        hardlink: { inodeId: other.inodeId, content: other.content! },
      },
    })).toThrow(/canonical action-prefix replay/u);
  });

  it('rejects a symlink target name that differs from the configured target', () => {
    const state = traceFileLinks(FILE_LINK_Q31_PRESET.config).steps[1]!.state;

    expect(() => validateFileLinkState(FILE_LINK_Q31_PRESET.config, {
      ...state,
      inodes: state.inodes.map((inode) => (
        inode.kind === 'symlink' ? { ...inode, targetName: 'missing', dangling: true } : inode
      )),
      resolution: { symlink: { targetName: 'missing', dangling: true }, hardlink: null },
    })).toThrow(/configured target name/u);
  });

  it('rejects a symlink inode dangling flag that disagrees with derived resolution', () => {
    const finalState = traceFileLinks(FILE_LINK_Q31_PRESET.config).finalState;

    expect(() => validateFileLinkState(FILE_LINK_Q31_PRESET.config, {
      ...finalState,
      inodes: finalState.inodes.map((inode) => (
        inode.kind === 'symlink' ? { ...inode, dangling: false } : inode
      )),
    })).toThrow(/dangling flag/u);
  });

  it('rejects extra directory entries and zero-link orphan inodes', () => {
    const finalState = traceFileLinks(FILE_LINK_Q31_PRESET.config).finalState;
    const extraInode: FileLinkInodeState = {
      inodeId: 'inode-extra',
      kind: 'regular',
      linkCount: 1,
      content: 'extra',
      targetName: null,
      dangling: false,
    };
    const orphanInode: FileLinkInodeState = {
      ...extraInode,
      inodeId: 'inode-orphan',
      linkCount: 0,
    };

    expect(() => validateFileLinkState(FILE_LINK_Q31_PRESET.config, {
      ...finalState,
      directory: [...finalState.directory, { name: 'extra', inodeId: extraInode.inodeId }],
      inodes: [...finalState.inodes, extraInode],
    })).toThrow(/canonical action-prefix replay/u);
    expect(() => validateFileLinkState(FILE_LINK_Q31_PRESET.config, {
      ...finalState,
      inodes: [...finalState.inodes, orphanInode],
    })).toThrow(/canonical action-prefix replay/u);
  });

  it('does not mutate a frozen caller state while applying an action', () => {
    const initial = createFileLinkState(FILE_LINK_Q31_PRESET.config);
    const frozen = Object.freeze({
      ...initial,
      directory: Object.freeze(initial.directory.map((entry) => Object.freeze({ ...entry }))),
      inodes: Object.freeze(initial.inodes.map((inode) => Object.freeze({ ...inode }))),
      resolution: Object.freeze({ ...initial.resolution }),
      appliedActions: Object.freeze([...initial.appliedActions]),
    });
    const snapshot = structuredClone(frozen);

    expect(applyFileLinkAction(
      FILE_LINK_Q31_PRESET.config,
      frozen,
      'create-symlink',
    ).step).toBe(1);
    expect(frozen).toEqual(snapshot);
  });
});
