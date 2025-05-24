export interface Credit {
  trans_no: string;
  created_at: string;
  user_uuid: string;
  trans_type: string;
  credits: number;
  order_no?: string;
  expired_at?: string;
  description?: string;
  video_resolution?: string;
  video_url?: string;
}
