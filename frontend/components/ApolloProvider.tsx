'use client';

import {ApolloProvider as BaseApolloProvider} from '@apollo/client/react';
import {ReactNode} from 'react';

import client from '../lib/apollo-client';

interface ApolloProviderProps {
    children: ReactNode;
}

export default function ApolloProvider({children}: ApolloProviderProps) {
    return (
        <BaseApolloProvider client={client}>
            {children}
        </BaseApolloProvider>
    );
}
