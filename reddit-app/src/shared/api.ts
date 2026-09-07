export type Question = {
  day: string;
  question: string;
  option_a: string;
  option_b: string;
  state: 'open' | 'closed';
};

export type Answer = { answered: boolean; prediction?: number; vote?: 'A' | 'B' };
export type Summary = {
  state: string;
  question?: string;
  option_a?: string;
  option_b?: string;
  responses?: number;
  option_a_pct?: number;
  mean_prediction_a?: number | null;
  user?: { prediction: number; vote: 'A' | 'B'; error: number; beat_pct: number | null } | null;
};

export type GameResponse = {
  ok: boolean;
  authenticated: boolean;
  identity?: string;
  question?: Question;
  answer?: Answer;
  yesterday?: Summary | null;
  streak?: number;
  message?: string;
};

export type SubmitRequest = { prediction: number; vote: 'A' | 'B' };
export type SubmitResponse = GameResponse & { duplicate?: boolean };
