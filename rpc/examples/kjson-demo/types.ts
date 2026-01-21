/**
 * Type definitions for KJSON demo
 */

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  address?: Address;
  hobbies: string[];
  active: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface BlogPost {
  id: number;
  title: string;
  content: string;
  author: User;
  tags: string[];
  published: boolean;
  createdAt: Date;
}
