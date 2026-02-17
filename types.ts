
export interface RawIdea {
  "IDEA BANK ID": string;
  "PROJECT TITLE": string;
  "SUBSYSTEM": string;
  "REGION": string;
  "PLATFORM": string;
  "PLANT": string;
  "FINAL STATUS": string;
  "SUBMIT DATE": string;
  "REQUESTER EMAIL": string;
  "SCOPING LEADER": string;
  "TOTAL SAVINGS": string;
  "LINK": string;
}

export interface Idea {
  id: string;
  title: string;
  subsystem: string;
  region: string;
  platform: string;
  plant: string;
  status: string;
  date: Date;
  submitter: string;
  scopingLeader: string;
  savings: number;
  link: string;
}
