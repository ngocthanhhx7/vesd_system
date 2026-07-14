import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminRevenueSummary } from '../services/revenueService.js';

test('admin revenue summary reports gross project revenue and platform profit separately', async () => {
  let receivedPipeline;
  const aggregate = async (pipeline) => {
    receivedPipeline = pipeline;
    return [{ revenue: 8000000, platformProfit: 400000 }];
  };

  const summary = await getAdminRevenueSummary(aggregate);

  assert.deepEqual(receivedPipeline, [
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
  assert.deepEqual(summary, { revenue: 8000000, platformProfit: 400000 });
});

test('admin revenue summary returns zero totals when there are no releases', async () => {
  const summary = await getAdminRevenueSummary(async () => []);

  assert.deepEqual(summary, { revenue: 0, platformProfit: 0 });
});
