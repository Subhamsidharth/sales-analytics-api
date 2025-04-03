import { mergeResolvers } from '@graphql-tools/merge';
import customerResolvers from './customerResolvers.js';
import productResolvers from './productResolvers.js';
import orderResolvers from './orderResolvers.js';
import analyticsResolvers from './analyticsResolvers.js';

// Merge all resolvers
const resolvers = mergeResolvers([
  customerResolvers,
  productResolvers,
  orderResolvers,
  analyticsResolvers
]);

export default resolvers;