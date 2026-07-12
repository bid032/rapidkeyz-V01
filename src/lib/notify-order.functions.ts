import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const inputSchema = z.object({
  orderId: z.string().uuid(),
})

export const notifyNewOrder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendTemplateEmail } = await import('./email-templates/send-email')

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', data.orderId)
      .single()
    if (error || !order) throw new Error(error?.message || 'Order not found')

    const origin = process.env.SITE_URL || 'https://rapidkeyz.com'
    let proofUrl: string | null = null
    if ((order as any).payment_proof_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from('payment-proofs')
        .createSignedUrl((order as any).payment_proof_url, 60 * 60 * 24 * 7)
      proofUrl = signed?.signedUrl ?? null
    }

    await sendTemplateEmail('new-order', 'bidotito1@gmail.com', {
      idempotencyKey: `new-order-${order.id}`,
      templateData: {
        orderNumber: order.order_number,
        total: order.total,
        currency: order.currency || 'EGP',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        paymentGateway: order.payment_gateway,
        paymentSenderPhone: (order as any).payment_sender_phone,
        paymentProofUrl: proofUrl,
        items: (order.order_items ?? []).map((it: any) => ({
          product_name: it.product_name,
          plan_label: it.plan_label,
          quantity: it.quantity,
          unit_price: it.unit_price,
          delivery_type: it.delivery_type,
          subscription_email: it.subscription_email,
        })),
        adminUrl: `${origin}/admin/orders`,
      },
    })

    return { ok: true }
  })
