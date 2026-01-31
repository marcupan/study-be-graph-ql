import {ApolloClient, InMemoryCache, HttpLink, split} from '@apollo/client';
import {setContext} from '@apollo/client/link/context';
import {GraphQLWsLink} from '@apollo/client/link/subscriptions';
import {getMainDefinition} from '@apollo/client/utilities';
import {createClient} from 'graphql-ws';

const authLink = setContext((_, { headers }) => {
    // Get the authentication token from local storage if it exists
    const token = localStorage.getItem('eventflow_token');
    // Return the headers to the context so httpLink can read them
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        }
    }
});

// Create an HTTP link for queries and mutations
const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL || 'http://localhost:4000/graphql',
});

// Create a WebSocket link for subscriptions
const wsLink = typeof window !== 'undefined'
    ? new GraphQLWsLink(
        createClient({
            url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql',
            connectionParams: () => {
                // Get the authentication token from local storage if it exists
                const token = localStorage.getItem('eventflow_token');
                return {
                    authorization: token ? `Bearer ${token}` : '',
                };
            },
        })
    )
    : null;

// Use split to route queries/mutations to httpLink and subscriptions to wsLink
const splitLink = typeof window !== 'undefined' && wsLink != null
    ? split(
        ({query}) => {
            const definition = getMainDefinition(query);
            return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
            );
        },
        wsLink,
        authLink.concat(httpLink)
    )
    : authLink.concat(httpLink);

// Create the Apollo Client instance
const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
        },
    },
});

export default client;
