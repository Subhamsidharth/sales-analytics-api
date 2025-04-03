import { gql } from 'apollo-server';
import customerTypes from './customerTypes';
import productTypes from './productTypes';
import orderTypes from './orderTypes';
import analyticsTypes from './analyticsTypes';

const baseTypeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

const typeDefs = [
  baseTypeDefs,
  customerTypes,
  productTypes,
  orderTypes,
  analyticsTypes
];

export default typeDefs;