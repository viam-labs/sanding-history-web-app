export interface Step {
  name: string;
  start: Date;
  end: Date;
  pass_id: string;
}

export interface Pass {
  start: Date;
  end: Date;
  steps: Step[];
  success: boolean;
  pass_id: string;
  err_string?: string | null;
  build_info?: {
    version?: string;
    git_revision?: string;
    date_compiled?: string;
  };
}

export interface PassNote {
  pass_id: string;
  note_text: string;
  created_at: string;
  created_by: string;
}

export interface RobotConfigMetadata {
  partId: string;
  robotId: string;
  configTimestamp: Date;
  editedBy?: { email: string };
  hasOldConfig: boolean;
}