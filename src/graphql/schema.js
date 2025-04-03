// Import type definitions
import customerTypeDefs from './typeDefs/customerTypes.js';
import productTypeDefs from './typeDefs/productTypes.js';
import orderTypeDefs from './typeDefs/orderTypes.js';
import analyticsTypeDefs from './typeDefs/analyticsTypes.js';

// Import resolvers
import customerResolvers from './resolvers/customerResolvers.js';
import productResolvers from './resolvers/productResolvers.js';
import orderResolvers from './resolvers/orderResolvers.js';
import analyticsResolvers from './resolvers/analyticsResolvers.js';

const baseTypeDefs = `#graphql
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

// Merge all type definitions, starting with the base types
const typeDefs = [
  baseTypeDefs,
  customerTypeDefs,
  productTypeDefs,
  orderTypeDefs,
  analyticsTypeDefs,
];

// Merge all resolvers
const resolvers = {
  Query: {
    _empty: () => '', // Placeholder resolver for base type
    ...(customerResolvers.Query || {}),
    ...(productResolvers.Query || {}),
    ...(orderResolvers.Query || {}),
    ...(analyticsResolvers.Query || {}),
  },
  Mutation: {
    _empty: () => '', // Placeholder resolver for base type
    ...(customerResolvers.Mutation || {}),
    ...(productResolvers.Mutation || {}),
    ...(orderResolvers.Mutation || {}),
    ...(analyticsResolvers.Mutation || {}),
  },
  // Include any custom scalar resolvers or type resolvers here
};

export default { typeDefs, resolvers };
