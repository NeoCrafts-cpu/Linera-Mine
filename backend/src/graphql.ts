import { Request, Response, NextFunction } from 'express';
import { LineraClient } from './linera-client';

export function createGraphQLHandler(lineraClient: LineraClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Forward the GraphQL request to the Linera service
      const result = await lineraClient.queryGraphQL(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('GraphQL error:', error);
      res.status(500).json({
        errors: [{ message: error.message }]
      });
    }
  };
}
