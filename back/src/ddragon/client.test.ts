import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Unit tests for the Data Dragon client. Mocks global fetch — no network
  // calls. Covers version parsing, champion/item/spell/rune mappings, icon URL
// construction, and the refresh-if-needed logic.
//
// We instantiate a fresh DdragonClient per test (via a private import) to
// avoid the singleton's cross-test state leaking. The singleton is
// re-imported for the icon URL tests where we need init() to have run.

describe('ddragon/client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    // Reset modules so the singleton is fresh per test.
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper: builds mock fetch responses for a full init() cycle.
  function mockFullInit(version = '16.15.1') {
    fetchMock
      // versions.json
      .mockResolvedValueOnce(
        new Response(JSON.stringify([version, '16.14.1', '16.13.1']), { status: 200 }),
      )
      // champion.json
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            Aatrox: { id: 'Aatrox', key: '266', name: 'Aatrox', title: 'the Darkin Blade', tags: ['Fighter'] },
            Ahri: { id: 'Ahri', key: '157', name: 'Ahri', title: 'the Nine-Tailed Fox', tags: ['Mage', 'Assassin'] },
          },
        }), { status: 200 }),
      )
      // item.json
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            '1001': { name: 'Boots', gold: { total: 300, base: 300, sell: 210, purchasable: true } },
            '3157': { name: 'Zhonya\'s Hourglass', gold: { total: 2600 } },
          },
        }), { status: 200 }),
      )
      // summoner.json
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            SummonerFlash: { key: '4', name: 'Flash', id: 'SummonerFlash' },
            SummonerIgnite: { key: '14', name: 'Ignite', id: 'SummonerIgnite' },
          },
        }), { status: 200 }),
      )
      // runesReforged.json
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          {
            id: 8100,
            key: 'Domination',
            name: 'Domination',
            icon: 'perk-images/Styles/7200_Domination.png',
            slots: [{ runes: [{
              id: 8112,
              key: 'Electrocute',
              name: 'Electrocute',
              icon: 'perk-images/Styles/Domination/Electrocute/Electrocute.png',
              shortDesc: 'desc',
              longDesc: 'long desc',
            }] }],
          },
        ]), { status: 200 }),
      );
  }

  describe('init()', () => {
    it('fetches versions.json and takes the first element as the current version', async () => {
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      expect(ddragonClient.getVersion()).toBe('16.15.1');
    });

    it('builds a champion map keyed by numeric key', async () => {
      mockFullInit();
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      const champs = ddragonClient.getChampions();
      expect(champs.get(266)).toEqual({
        key: 266, id: 'Aatrox', name: 'Aatrox', title: 'the Darkin Blade', tags: ['Fighter'],
      });
      expect(champs.get(157)).toEqual({
        key: 157, id: 'Ahri', name: 'Ahri', title: 'the Nine-Tailed Fox', tags: ['Mage', 'Assassin'],
      });
    });

    it('builds an item map keyed by numeric ID', async () => {
      mockFullInit();
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      const items = ddragonClient.getItems();
      expect(items.get(1001)).toEqual({ id: 1001, name: 'Boots', gold: 300 });
      expect(items.get(3157)).toEqual({ id: 3157, name: 'Zhonya\'s Hourglass', gold: 2600 });
    });

    it('builds a spell map keyed by numeric key', async () => {
      mockFullInit();
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      const spells = ddragonClient.getSpells();
      expect(spells.get(4)).toEqual({ key: 4, name: 'Flash', id: 'SummonerFlash' });
      expect(spells.get(14)).toEqual({ key: 14, name: 'Ignite', id: 'SummonerIgnite' });
    });

    it('builds a rune map keyed by numeric ID', async () => {
      mockFullInit();
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      expect(ddragonClient.getRunes().get(8112)).toEqual({
        id: 8112,
        key: 'Electrocute',
        name: 'Electrocute',
        shortDesc: 'desc',
        longDesc: 'long desc',
        icon: 'perk-images/Styles/Domination/Electrocute/Electrocute.png',
        styleId: 8100,
        styleKey: 'Domination',
        styleName: 'Domination',
      });
    });

    it('marks the client as initialized after init()', async () => {
      mockFullInit();
      const { ddragonClient } = await import('./client.js');
      expect(ddragonClient.isInitialized()).toBe(false);
      await ddragonClient.init();
      expect(ddragonClient.isInitialized()).toBe(true);
    });
  });

  describe('icon URLs', () => {
    it('constructs champion icon URLs with the cached version + champion name', async () => {
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      expect(ddragonClient.championIconUrl('Ahri'))
        .toBe('https://ddragon.leagueoflegends.com/cdn/16.15.1/img/champion/Ahri.png');
    });

    it('constructs item icon URLs with the cached version + item ID', async () => {
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      expect(ddragonClient.itemIconUrl(3157))
        .toBe('https://ddragon.leagueoflegends.com/cdn/16.15.1/img/item/3157.png');
    });

    it('constructs spell icon URLs with the cached version + spell key', async () => {
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      expect(ddragonClient.spellIconUrl('SummonerFlash'))
        .toBe('https://ddragon.leagueoflegends.com/cdn/16.15.1/img/spell/SummonerFlash.png');
    });

    it('constructs profile icon URLs with the cached version + icon ID', async () => {
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      expect(ddragonClient.profileIconUrl(654))
        .toBe('https://ddragon.leagueoflegends.com/cdn/16.15.1/img/profileicon/654.png');
    });

    it('constructs rune icon URLs from the Data Dragon icon path', async () => {
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      expect(ddragonClient.runeIconUrl('perk-images/Styles/7200_Domination.png'))
        .toBe('https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7200_Domination.png');
    });
  });

  describe('refreshIfNeeded()', () => {
    it('does not refetch when version has not changed', async () => {
      vi.useFakeTimers();
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      // Advance past the version-check interval (1 hour) so the check runs.
      fetchMock.mockClear();
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(['16.15.1']), { status: 200 }),
      );
      vi.advanceTimersByTime(61 * 60 * 1000);
      await ddragonClient.refreshIfNeeded();

      // Only the versions.json call should have happened (no champion/item/spell refetch).
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(ddragonClient.getVersion()).toBe('16.15.1');
      vi.useRealTimers();
    });

    it('refetches all data when version changes', async () => {
      vi.useFakeTimers();
      mockFullInit('16.15.1');
      const { ddragonClient } = await import('./client.js');
      await ddragonClient.init();

      // Advance past the version-check interval (1 hour) so the check runs.
      fetchMock.mockClear();
      mockFullInitWithVersion('16.16.1');
      vi.advanceTimersByTime(61 * 60 * 1000);

      await ddragonClient.refreshIfNeeded();

      expect(ddragonClient.getVersion()).toBe('16.16.1');
      // 5 fetches: versions + champion + item + spell + runes.
      expect(fetchMock).toHaveBeenCalledTimes(5);
      vi.useRealTimers();
    });
  });

  // Helper for the "version changed" test — mocks a full init with a
  // different version + slightly different champion data to confirm refresh.
  function mockFullInitWithVersion(version: string) {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([version]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          Aatrox: { id: 'Aatrox', key: '266', name: 'Aatrox', title: 'the Darkin Blade', tags: ['Fighter'] },
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
  }

  // Need to override the versionCheckInterval so refreshIfNeeded runs
  // immediately in tests — we do this by waiting for the module's
  // internal timer to be old enough. Since lastVersionCheck is private,
  // we rely on the fact that init() just set it, and the default interval
  // is 1 hour. To make the test deterministic, we use vi.useFakeTimers
  // and advance time past 1 hour.
  it('respects the version check interval (skips if checked recently)', async () => {
    vi.useFakeTimers();
    mockFullInit('16.15.1');
    const { ddragonClient } = await import('./client.js');
    await ddragonClient.init();

    fetchMock.mockClear();
    // Advance only 30 minutes — within the 1-hour interval, so no check.
    vi.advanceTimersByTime(30 * 60 * 1000);
    await ddragonClient.refreshIfNeeded();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
