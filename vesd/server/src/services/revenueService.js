import { Transaction } from '../models/index.js';

export async function getAdminRevenueSummary(aggregate = Transaction.aggregate.bind(Transaction)) {
  const totals = await aggregate([
    { $match: { type: 'release', status: 'success' } },
    {
      $group: {
        _id: null,
        revenue: {
          $sum: {
            $ifNull: [
              '$metadata.grossAmount',
              {
                $add: [
                  { $ifNull: ['$amount', 0] },
                  { $ifNull: ['$platformFee', 0] }
                ]
              }
            ]
          }
        },
        platformProfit: { $sum: { $ifNull: ['$platformFee', 0] } }
      }
    }
  ]);

  return {
    revenue: totals[0]?.revenue || 0,
    platformProfit: totals[0]?.platformProfit || 0
  };
}
