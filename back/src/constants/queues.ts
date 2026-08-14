export interface QueueDefinition {
  id: number;
  key: string;
  name: string;
  gameMode: string;
  custom: boolean;
  analyticsEligible: boolean;
}

export const QUEUES: QueueDefinition[] = [
  { id: 400, key: 'NORMAL_DRAFT', name: 'Normal Draft', gameMode: 'CLASSIC', custom: false, analyticsEligible: true },
  { id: 420, key: 'RANKED_SOLO_5x5', name: 'Ranked Solo/Duo', gameMode: 'CLASSIC', custom: false, analyticsEligible: true },
  { id: 430, key: 'NORMAL_BLIND', name: 'Normal Blind', gameMode: 'CLASSIC', custom: false, analyticsEligible: true },
  { id: 440, key: 'RANKED_FLEX_SR', name: 'Ranked Flex', gameMode: 'CLASSIC', custom: false, analyticsEligible: true },
  { id: 450, key: 'ARAM_5x5', name: 'ARAM', gameMode: 'ARAM', custom: false, analyticsEligible: false },
  { id: 490, key: 'QUICKPLAY', name: 'Quickplay', gameMode: 'CLASSIC', custom: false, analyticsEligible: true },
  { id: 700, key: 'CLASH', name: 'Clash', gameMode: 'CLASSIC', custom: false, analyticsEligible: true },
  { id: 830, key: 'COOP_VS_AI_INTRO', name: 'Co-op vs. AI: Intro', gameMode: 'CLASSIC', custom: false, analyticsEligible: false },
  { id: 840, key: 'COOP_VS_AI_BEGINNER', name: 'Co-op vs. AI: Beginner', gameMode: 'CLASSIC', custom: false, analyticsEligible: false },
  { id: 850, key: 'COOP_VS_AI_INTERMEDIATE', name: 'Co-op vs. AI: Intermediate', gameMode: 'CLASSIC', custom: false, analyticsEligible: false },
  { id: 900, key: 'URF', name: 'URF', gameMode: 'URF', custom: false, analyticsEligible: false },
  { id: 1020, key: 'ONE_FOR_ALL', name: 'One for All', gameMode: 'CLASSIC', custom: false, analyticsEligible: false },
  { id: 1300, key: 'NEXUS_BLITZ', name: 'Nexus Blitz', gameMode: 'CLASSIC', custom: false, analyticsEligible: false },
  { id: 1400, key: 'ULTIMATE_SPELLBOOK', name: 'Ultimate Spellbook', gameMode: 'CLASSIC', custom: false, analyticsEligible: false },
  { id: 1700, key: 'ARENA', name: 'Arena', gameMode: 'CHERRY', custom: false, analyticsEligible: false },
  { id: 1900, key: 'PICK_URF', name: 'Pick URF', gameMode: 'URF', custom: false, analyticsEligible: false },
  { id: 2000, key: 'TUTORIAL_1', name: 'Tutorial', gameMode: 'TUTORIAL', custom: false, analyticsEligible: false },
  { id: 2010, key: 'TUTORIAL_2', name: 'Tutorial', gameMode: 'TUTORIAL', custom: false, analyticsEligible: false },
  { id: 2020, key: 'TUTORIAL_3', name: 'Tutorial', gameMode: 'TUTORIAL', custom: false, analyticsEligible: false },
];

export const queueById = new Map(QUEUES.map((queue) => [queue.id, queue]));
