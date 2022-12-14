// ---- General ----

interface EnumData {
  rawValue: string;
}

interface Display {
  name: string;
  description: string;
  thumbnail?: string;
}

// ---- Service Data ----

type UnlockConditionTypes =
  | "CompletedAmount"
  | "MinimumLevel"
  | "TimeLimited"
  | "AchievementRequired"
  | "ChallengeIndex";

interface UnlockCondition {
  type: UnlockConditionTypes;
  display: Display;
}

interface CompletedAmountUnlockCondition extends UnlockCondition {
  limit: number;
}

interface MinimumLevelUnlockCondition extends UnlockCondition {
  level: number;
  points: number;
}

interface AchievementRequiredCondition extends UnlockCondition {
  achievementId: number;
  achievementUrl: string;
}

interface ChallengeIndexCondition extends UnlockCondition {
  challengeKey: string;
  index: number;
}

interface TimeLimitedUnlockCondition extends UnlockCondition {
  endDate: number;
}

type UnlockConditions =
  | TimeLimitedUnlockCondition
  | CompletedAmountUnlockCondition
  | MinimumLevelUnlockCondition
  | AchievementRequiredCondition
  | ChallengeIndexCondition;

type QuestRewardType = "Points" | "FLOAT" | "None";

interface RewardInfo {
  rewardType: QuestRewardType;
}

interface PointRewardInfo extends RewardInfo {
  rewardPoints: number;
  referalPoints: number;
}

interface FLOATRewardInfo extends RewardInfo {
  eventHost: string;
  eventId: string;
}

type BountyType = "quest" | "challenge";
type RewardInfos = PointRewardInfo | FLOATRewardInfo;

/**
 * Bounty basis data
 */
interface BountyEntity extends BountyIdentifier {
  category: BountyType;
  key: string;
  communityId: string;
  display: Display;
}

interface QuestDetail {
  steps: number;
  stepsCfg: string;
  guideMD: string;
}

interface QuestConfig extends BountyEntity, QuestDetail {}

interface QuizOptionConfig {
  key: string;
  description: string;
}

interface QuizSchema {
  type: "radio";
  question: string;
  options: QuizOptionConfig[];
  answer: string;
}

interface QuestStepBasic {
  title: string;
  description: string;
}

interface QuestStepQuiz extends QuestStepBasic {
  type: "quiz";
  quiz: QuizSchema[];
}

interface QuestStepTest {
  network: "testnet" | "mainnet";
  expect: "return" | "error";
  result: any;
}

interface QuestSchema {
  key: string;
  type: string;
  label?: string;
}

interface QuestStepOnChain extends QuestStepBasic {
  type: "onchain";
  code: string;
  schema: QuestSchema[];
  test: QuestStepTest; // All tests should be OK, then quest passed
}

type QuestStepsConfig = QuestStepQuiz | QuestStepOnChain;

interface ChallengeDetail {
  quests: BountyIdentifier[];
  achievement?: {
    host: string;
    eventId: string;
  };
}

interface ChallengeConfig extends BountyEntity, ChallengeDetail {}

interface FLOATEvent {
  claimable: boolean;
  description: string;
  eventId: string;
  host: string;
  image: string;
  name: string;
  totalSupply: number;
  url: string;
}

type BountyEntities = QuestConfig | ChallengeConfig;

interface CommuntiyBountyBasics {
  category: BountyType;
  key: string;
  createdAt: number;
}

interface CommunityDisplay {
  name: string;
  description: string;
  imageUrl?: string;
  bannerUrl?: string;
  socials: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
}

interface CommunityBasics {
  owner: string;
  communityId: string;
  display: CommunityDisplay;
}

interface Community extends CommunityBasics {
  quests: { [key: string]: QuestConfig };
  challenges: { [key: string]: ChallengeConfig };
  bounties: CommuntiyBountyBasics[];
}

/**
 * Season related data
 */
interface BountyIdentifier {
  category: BountyType;
  communityId: string;
  key: string;
}

interface ParticipantRecord {
  datetime: number;
  [key: string]: any;
}

interface BountyInfo {
  id: string;
  config: BountyEntities; // load dynamic by identifier
  preconditions: UnlockConditions[];
  participants: { [key: string]: ParticipantRecord };
  participantAmt: number;
  rewardType: QuestRewardType;
  pointReward?: PointRewardInfo;
  floatReward?: FLOATRewardInfo;
}

interface CompetitionSeason {
  seasonId: string;
  endDate: number;
  referralThreshold: number;
  bounties: { [uid: string]: BountyInfo };
}

// ---- Profile ----

interface QuestStatus {
  steps: boolean[];
  completed: boolean;
}

interface SeasonRecord {
  seasonId: string;
  referredFromAddress?: string;
  referralCode?: string;
  points: number;
  questScores: { [key: string]: QuestStatus };
  bountiesCompleted: { [uid: string]: string };
}

interface ProfileData {
  address: string;
  activeRecord?: SeasonRecord;
  linkedIdentities: { [key: string]: ProfileIdentity };
}

interface GithubToken {
  tokenType: string;
  scope: string;
  accessToken: string;
}

interface GithubProfileData {
  id: number;
  userName: string;
  displayName: string;
  avatarUrl: string;
  email: string;
  bio: string;
  location: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: Date;
  updated_at: Date;
}

interface GithubProfile {
  auth?: GithubToken;
  data?: GithubProfileData;
}

interface ProfileIdentity {
  platform: string;
  uid: string;
  display: Display;
}

interface AccountProfileIdentity {
  account: string;
  identity: ProfileIdentity;
}

// ---- Ranking ----

interface RankingStatus {
  account?: RankingScore
  tops: RankingScore[]
}

interface RankingScore {
  account: string;
  rank: number;
  score: number;
  identity?: ProfileIdentity;
}
