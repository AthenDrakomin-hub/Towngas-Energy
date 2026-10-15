/**
 * 大厅共享类型定义
 */

export type Round = {
  id: number;
  code: string;
  periodType: string;
  phase: string;
  status: string;
  secondsToLock: number;
  secondsToSettle: number;
  upPool: number;
  downPool: number;
  totalPool: number;
  rakeRate: number;
  rakeAmount: number;
  payoutUp: number;
  payoutDown: number;
  upShare: number;
  downShare: number;
  participants: number;
  result: string | null;
  resultSource: string | null;
  settleCar: number[] | null;
  minBet: number;
  maxBetPerRound: number;
  lockTime: string;
  settleTime: string;
  myBets: { id: number; side: string; amount: number; payout: number; status: string }[];
};

export type Car = {
  onlinetime: string;
  car: number[];
  onlineCount: number | null;
  hashValue: string | null;
};

export type LogRow = {
  id: number;
  ts: string;
  level: string;
  module: string;
  message: string;
};

export type Settled = {
  code: string;
  result: string;
  settleCar: number[] | null;
  rakeAmount: number;
};

export type LbRow = {
  rank: number;
  nickname: string;
  profit: number;
  volume: number;
  winRate: number;
};
