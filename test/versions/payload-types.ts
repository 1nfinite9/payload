/* tslint:disable */
/**
 * This file was automatically generated by Payload CMS.
 * DO NOT MODIFY IT BY HAND. Instead, modify your source Payload config,
 * and re-run `payload generate:types` to regenerate this file.
 */

export interface Config {
  collections: {
    'autosave-posts': AutosavePost;
    'draft-posts': DraftPost;
    'version-posts': VersionPost;
    users: User;
  };
  globals: {
    'autosave-global': AutosaveGlobal;
    'draft-global': DraftGlobal;
  };
}
export interface AutosavePost {
  id: string;
  title: string;
  description: string;
  _status?: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}
export interface DraftPost {
  id: string;
  title: string;
  description: string;
  radio?: 'test';
  select?: ('test1' | 'test2')[];
  _status?: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}
export interface VersionPost {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
export interface User {
  id: string;
  email?: string;
  resetPasswordToken?: string;
  resetPasswordExpiration?: string;
  loginAttempts?: number;
  lockUntil?: string;
  createdAt: string;
  updatedAt: string;
  password?: string;
}
export interface AutosaveGlobal {
  id: string;
  title: string;
  _status?: 'draft' | 'published';
}
export interface DraftGlobal {
  id: string;
  title: string;
  _status?: 'draft' | 'published';
}
