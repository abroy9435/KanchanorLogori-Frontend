// src/shared/apitypes.ts

// ---------- SEARCH ----------
export interface SearchQuery {
    search_parameter: string;
  }
  
  export interface UserProfileOnSearchResponse {
    name: string;
    id: number;
    uid: string;
    programme_code: string;
    department_name: string;
    avataar: string;
  }
  
  export interface ProfileQuery {
    user_uid: string;
  }
  
  // ---------- METADATA ----------
  export interface Department {
    id: number;
    department_name: string;
    department_code: string;
  }
  
  export interface School {
    id: number;
    school_name: string;
    school_code: string;
  }
  
  export interface Programme {
    id: number;
    programme_name: string;
    programme_code: string;
  }
  
  // ---------- RELATIONS ----------
  export interface SetLikes {
    likes: string[];
  }
  
  export interface SetBlock {
    blocks: string[];
  }
  
  export interface SetUnblock {
    unblocks: string[];
  }
  