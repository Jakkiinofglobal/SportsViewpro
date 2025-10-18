export async function createSubscriptionStub({ plan }){
  return {
    subscriptionId: 'SUBSCRIPTION_STUB_' + Math.random().toString(36).slice(2),
    approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=STUB'
  };
}
export async function cancelSubscriptionStub(subscriptionId){
  return { ok: true };
}
export async function verifyWebhookStub(headers, rawBody){
  return true;
}
