export interface Site {
  id: string;
  title: string;
  url: string;
  description: string | null;
  thumbnail: string | null;
  added_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  site_id: string;
  page_url: string;
  x_pos: number;
  y_pos: number;
  scroll_x: number;
  scroll_y: number;
  text: string;
  image_url: string | null;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface PinnitMessage {
  type: "pinnit-scroll";
  scrollY: number;
}
