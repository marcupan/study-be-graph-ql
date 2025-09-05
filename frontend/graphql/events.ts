import { gql } from '@apollo/client';

// Fragment for event fields to reuse across queries
export const EVENT_FIELDS = gql`
  fragment EventFields on Event {
    id
    title
    description
    date
    time
    location
    imageUrl
    createdAt
    updatedAt
    creator {
      id
      name
    }
    attendees {
      id
      name
    }
  }
`;

// Queries
export const GET_EVENTS = gql`
  query GetEvents($pagination: PaginationInput) {
    events(pagination: $pagination) {
      edges {
        ...EventFields
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
      totalCount
    }
  }
  ${EVENT_FIELDS}
`;

export const GET_EVENT = gql`
  query GetEvent($id: ID!) {
    event(id: $id) {
      ...EventFields
    }
  }
  ${EVENT_FIELDS}
`;

export const GET_MY_EVENTS = gql`
  query GetMyEvents($pagination: PaginationInput) {
    myEvents(pagination: $pagination) {
      edges {
        ...EventFields
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
      totalCount
    }
  }
  ${EVENT_FIELDS}
`;

export const GET_MY_ATTENDING_EVENTS = gql`
  query GetMyAttendingEvents($pagination: PaginationInput) {
    myAttendingEvents(pagination: $pagination) {
      edges {
        ...EventFields
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
      totalCount
    }
  }
  ${EVENT_FIELDS}
`;

// Mutations
export const CREATE_EVENT = gql`
  mutation CreateEvent($eventInput: EventInput!) {
    createEvent(eventInput: $eventInput) {
      ...EventFields
    }
  }
  ${EVENT_FIELDS}
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $eventInput: EventInput!) {
    updateEvent(id: $id, eventInput: $eventInput) {
      ...EventFields
    }
  }
  ${EVENT_FIELDS}
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;

export const ATTEND_EVENT = gql`
  mutation AttendEvent($eventId: ID!) {
    attendEvent(eventId: $eventId) {
      ...EventFields
    }
  }
  ${EVENT_FIELDS}
`;

export const CANCEL_ATTENDANCE = gql`
  mutation CancelAttendance($eventId: ID!) {
    cancelAttendance(eventId: $eventId) {
      ...EventFields
    }
  }
  ${EVENT_FIELDS}
`;

// Subscriptions
export const EVENT_CREATED_SUBSCRIPTION = gql`
  subscription OnEventCreated {
    eventCreated {
      ...EventFields
    }
  }
  ${EVENT_FIELDS}
`;

export const EVENT_UPDATED_SUBSCRIPTION = gql`
  subscription OnEventUpdated($eventId: ID) {
    eventUpdated(eventId: $eventId) {
      ...EventFields
    }
  }
  ${EVENT_FIELDS}
`;

export const EVENT_DELETED_SUBSCRIPTION = gql`
  subscription OnEventDeleted {
    eventDeleted
  }
`;
