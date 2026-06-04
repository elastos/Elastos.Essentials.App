import { PollStatus } from './poll-status.enum';
import { Vote } from './vote.model';

export interface PollDetails {
  id: string; // uint256 - hex string
  status: PollStatus; // Status of poll
  description: string; // Description of poll
  startTime: number; // int64 - Unix timestamp
  endTime: number; // int64 - Unix timestamp
  choices: string[]; // Choices of poll
  url?: string; // Optional URL with more information
  votes: Vote[]; // Votes of poll
}
