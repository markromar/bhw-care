import { usePendingRecordStore } from '../pendingRecordStore';

const REF = 'Zx3kQ9vT2mLpA7wRb1YdN4';

beforeEach(() => {
  usePendingRecordStore.setState(usePendingRecordStore.getInitialState(), true);
});

describe('usePendingRecordStore', () => {
  it('starts with nothing pending', () => {
    expect(usePendingRecordStore.getState().ref).toBeNull();
  });

  it('remembers a valid reference', () => {
    usePendingRecordStore.getState().setPending(REF);

    expect(usePendingRecordStore.getState().ref).toBe(REF);
  });

  it('ignores an invalid reference', () => {
    usePendingRecordStore.getState().setPending('not valid!');

    expect(usePendingRecordStore.getState().ref).toBeNull();
  });

  it('forgets the reference when cleared', () => {
    usePendingRecordStore.getState().setPending(REF);
    usePendingRecordStore.getState().clearPending();

    expect(usePendingRecordStore.getState().ref).toBeNull();
  });
});
