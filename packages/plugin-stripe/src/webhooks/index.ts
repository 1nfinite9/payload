import { StripeWebhookHandler } from '../types';
import { handleCreatedOrUpdated } from './handleCreatedOrUpdated';
import { handleDeleted } from './handleDeleted';

export const handleWebhooks: StripeWebhookHandler = async (args) => {
  const {
    payload,
    event,
    stripeConfig
  } = args;

  payload.logger.info(`Processing Stripe '${event.type}' webhook event with ID: '${event.id}'.`);

  // could also traverse into event.data.object.object to get the type, but that seems unreliable
  // use cli: `stripe resources` to see all available resources
  const resourceType = event.type.split('.')[0];

  const syncConfig = stripeConfig?.sync?.find((sync) => sync.resourceSingular === resourceType);

  if (syncConfig) {
    switch (event.type) {
      case `${resourceType}.created`: {
        await handleCreatedOrUpdated({
          ...args,
          syncConfig,
        });
        break;
      }
      case `${resourceType}.updated`: {
        await handleCreatedOrUpdated({
          ...args,
          syncConfig
        });
        break;
      }
      case `${resourceType}.deleted`: {
        await handleDeleted({
          ...args,
          syncConfig
        });
        break;
      }
      default: {
        break;
      }
    }
  }
};