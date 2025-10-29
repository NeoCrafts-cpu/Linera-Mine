
export enum JobStatus {
  Posted = 'Posted',
  InProgress = 'InProgress',
  Completed = 'Completed'
}

export type Owner = `0x${string}`;

export interface AgentProfile {
  owner: Owner;
  name: string;
  serviceDescription: string;
  jobsCompleted: number;
  rating: number; // Avg rating out of 5
  totalRatingPoints: number;
}

export interface Bid {
  agent: AgentProfile;
  bidId: number;
}

export interface Job {
  id: number;
  client: Owner;
  agent?: Owner;
  description: string;
  payment: number; // Using number for simplicity, would be 'Amount' in production
  status: JobStatus;
  bids: Bid[];
}
