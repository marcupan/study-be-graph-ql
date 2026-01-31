import path from 'path';

import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    transpilePackages: ['graphql', '@apollo/client', 'graphql-ws'],
    webpack: (config, {isServer}) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            graphql: path.resolve('./node_modules/graphql'),
        };
        return config;
    },
    turbopack: {
        root: __dirname,
    },
};

export default nextConfig;
