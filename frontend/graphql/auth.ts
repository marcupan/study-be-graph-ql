import { gql } from '@apollo/client';

export const REGISTER_USER = gql`
  mutation RegisterUser($userInput: UserInput!) {
    createUser(userInput: $userInput) {
      userId
      token
      tokenExpiration
    }
  }
`;

export const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      userId
      token
      tokenExpiration
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      name
      email
      createdAt
      updatedAt
    }
  }
`;
