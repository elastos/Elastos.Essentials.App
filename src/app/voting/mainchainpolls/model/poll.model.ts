import { PollStatus } from './poll-status.enum';

export interface Poll {
  id: string; // uint256 - hex string
  status: PollStatus;
  description: string;
  startTime: number;
  endTime: number;
  choices: string[];
  url?: string; // Optional URL with more information
}
