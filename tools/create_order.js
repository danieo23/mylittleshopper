import { createClient } from '@supabase/supabase-js';
import { updateStyleDna } from './update_style_dna.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Processes a confirmed purchase.
 * Verifies wallet, creates order, deducts balance, schedules follow-up.
 */
export async function createOrder({ userId, items, totalPrice, occasion, outfitContext }) {
  // 1. Check wallet balance
  const { data: wallet, error: walletError } = await supabase
    .from('wallet')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (walletError || !wallet) {
    return { success: false, reason: 'wallet_not_found', message: "I couldn't find your wallet. Try refreshing the page." };
  }

  if (wallet.balance < totalPrice) {
    const shortfall = (totalPrice - wallet.balance).toFixed(2);
    return {
      success: false,
      reason:  'insufficient_funds',
      message: `Your wallet has $${wallet.balance.toFixed(2)} but this order is $${totalPrice.toFixed(2)}. You're $${shortfall} short — add funds to continue.`,
      currentBalance: wallet.balance,
      shortfall:      parseFloat(shortfall),
    };
  }

  // 2. Create order record
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id:           userId,
      items_json:        items,
      total_price:       totalPrice,
      occasion:          occasion ?? null,
      status:            'placed',
      followup_sent_at:  null,
      followup_response: null,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // 3. Deduct from wallet
  await supabase
    .from('wallet')
    .update({ balance: wallet.balance - totalPrice, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  // 4. Log transaction
  await supabase.from('transactions').insert({
    user_id:     userId,
    type:        'debit',
    amount:      totalPrice,
    description: `Order #${order.id} — ${occasion ?? 'shopping session'}`,
  });

  // 5. Write approval signals to Style DNA for each item
  for (const item of items) {
    await updateStyleDna(userId, 'approval', item, null, 'order_confirmed');
  }

  return {
    success:   true,
    orderId:   order.id,
    totalPrice,
    newBalance: wallet.balance - totalPrice,
    estimatedDelivery: deliveryDate.toISOString().split('T')[0],
  };
}
