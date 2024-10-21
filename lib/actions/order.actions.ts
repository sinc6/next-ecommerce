'use server'
import { auth } from '@/auth'
import { getMyCart } from './cart.actions'
import { getUserById } from './user.actions'
import { redirect } from 'next/navigation'
import { carts, orderItems, orders, products } from '@/db/schema'
import { count, desc, eq, sql } from 'drizzle-orm'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { formatError } from '../utils'
import { insertOrderSchema } from '../validator'
import db from '@/db/drizzle'
import { PAGE_SIZE } from '../constants'

// GET
export async function getOrderById(orderId: string) {
  return await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      orderItems: true,
      user: { columns: { name: true, email: true } },
    },
  })
}

export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number
  page: number
}) {
  const session = await auth()
  if (!session) throw new Error('User is not authenticated')
  const data = await db.query.orders.findMany({
    where: eq(orders.userId, session.user.id!),
    orderBy: [desc(products.createdAt)],
    limit,
    offset: (page - 1) * limit,
  })
  const dataCount = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.userId, session.user.id!))
  return {
    data,
    totalPages: Math.ceil(dataCount[0].count / limit),
  }
}

// CREATE
export const createOrder = async () => {
  try {
    const session = await auth()
    if (!session) throw new Error('User is not authenticated')
    const cart = await getMyCart()
    const user = await getUserById(session?.user.id!)
    if (!cart || cart.items.length === 0) redirect('/cart')
    if (!user.address) redirect('/shipping-address')
    if (!user.paymentMethod) redirect('/payment-method')
    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    })
    const insertedOrderId = await db.transaction(async (tx) => {
      const insertedOrder = await tx.insert(orders).values(order).returning()
      for (const item of cart.items) {
        await tx.insert(orderItems).values({
          ...item,
          price: item.price.toFixed(2),
          orderId: insertedOrder[0].id,
        })
      }
      await db
        .update(carts)
        .set({
          items: [],
          totalPrice: '0',
          shippingPrice: '0',
          taxPrice: '0',
          itemsPrice: '0',
        })
        .where(eq(carts.id, cart.id))
      return insertedOrder[0].id
    })
    if (!insertedOrderId) throw new Error('Order not created')
    redirect(`/order/${insertedOrderId}`)
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    return { success: false, message: formatError(error) }
  }
}
