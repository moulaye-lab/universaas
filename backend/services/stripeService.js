/**
 * services/stripeService.js - Service Stripe pour gestion abonnements
 */

const Stripe = require('stripe');
const { getDatabase } = require('firebase-admin/database');

const db = getDatabase();

// Initialiser Stripe avec clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia'
});

/**
 * Créer un client Stripe
 */
async function createCustomer(email, name, metadata = {}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Créer une session de paiement Stripe Checkout
 */
async function createCheckoutSession(priceId, customerId, universityId, successUrl, cancelUrl) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        universityId
      }
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Annuler un abonnement
 */
async function cancelSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Récupérer les détails d'un abonnement
 */
async function getSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Mettre à jour un abonnement (upgrade/downgrade)
 */
async function updateSubscription(subscriptionId, newPriceId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId
        }
      ],
      proration_behavior: 'always_invoice'
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Créer un portail client Stripe (pour gérer abonnement)
 */
async function createCustomerPortalSession(customerId, returnUrl) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

/**
 * Gérer les webhooks Stripe
 */
async function handleWebhook(event) {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const universityId = session.metadata.universityId;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Mettre à jour l'université dans Firebase
        await db.ref(`universities/${universityId}`).update({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: 'active',
          subscriptionStartedAt: Date.now()
        });

        console.log(`✅ Subscription activated for university: ${universityId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Trouver l'université par customerId
        const universitiesRef = db.ref('universities');
        const snapshot = await universitiesRef.orderByChild('stripeCustomerId').equalTo(customerId).once('value');
        const universities = snapshot.val();

        if (universities) {
          const universityId = Object.keys(universities)[0];

          await db.ref(`universities/${universityId}`).update({
            subscriptionStatus: subscription.status,
            currentPeriodEnd: subscription.current_period_end * 1000
          });

          console.log(`✅ Subscription updated for university: ${universityId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Trouver l'université par customerId
        const universitiesRef = db.ref('universities');
        const snapshot = await universitiesRef.orderByChild('stripeCustomerId').equalTo(customerId).once('value');
        const universities = snapshot.val();

        if (universities) {
          const universityId = Object.keys(universities)[0];

          await db.ref(`universities/${universityId}`).update({
            subscriptionStatus: 'canceled',
            subscriptionEndedAt: Date.now()
          });

          console.log(`❌ Subscription canceled for university: ${universityId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Trouver l'université par customerId
        const universitiesRef = db.ref('universities');
        const snapshot = await universitiesRef.orderByChild('stripeCustomerId').equalTo(customerId).once('value');
        const universities = snapshot.val();

        if (universities) {
          const universityId = Object.keys(universities)[0];

          await db.ref(`universities/${universityId}`).update({
            subscriptionStatus: 'past_due',
            lastPaymentFailed: Date.now()
          });

          console.log(`⚠️ Payment failed for university: ${universityId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}

module.exports = {
  stripe,
  createCustomer,
  createCheckoutSession,
  cancelSubscription,
  getSubscription,
  updateSubscription,
  createCustomerPortalSession,
  handleWebhook
};
