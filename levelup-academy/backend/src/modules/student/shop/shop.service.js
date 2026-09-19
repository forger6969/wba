import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import { changeCoins, emitCoinsChanged } from '../../coins/coins.service.js';
import * as shopRepo from './shop.repository.js';

export async function listItems(branchId) {
  return shopRepo.findActiveItemsByBranch(branchId);
}

/**
 * Покупка товара: FOR UPDATE строки товара → списание коинов (changeCoins в
 * той же транзакции) → заказ → декремент остатка. Недостаточно коинов —
 * changeCoins бросает 422, транзакция откатывается целиком (заказ не создаётся).
 */
export async function purchaseItem({ itemId, studentId, branchId }) {
  const { order, item } = await withTransaction(async (client) => {
    const lockedItem = await shopRepo.lockItem(itemId, client);
    if (!lockedItem || lockedItem.branch_id !== branchId) {
      throw new AppError(404, 'Item not found');
    }
    if (lockedItem.is_archived || lockedItem.stock <= 0) {
      throw new AppError(409, 'Item is unavailable');
    }

    await changeCoins(
      {
        studentId,
        actorId: studentId,
        amount: -lockedItem.coin_price,
        operation: 'purchase',
        reason: 'Shop purchase',
        refType: 'shop_order',
        refId: itemId,
      },
      client,
    );

    const newOrder = await shopRepo.insertOrder(
      { branchId: lockedItem.branch_id, itemId, studentId, coinPrice: lockedItem.coin_price },
      client,
    );
    await shopRepo.decrementStock(itemId, client);

    return { order: newOrder, item: lockedItem };
  });

  await emitCoinsChanged({
    studentId,
    branchId: item.branch_id,
    amount: -item.coin_price,
    reason: 'Shop purchase',
  });

  return order;
}

export async function listOrders(studentId) {
  return shopRepo.findOrdersByStudent(studentId);
}

export async function createItem(branchId, input) {
  return shopRepo.createItem({ branchId, ...input });
}

/** Товар чужого филиала неотличим от несуществующего — 404 без утечки. */
export async function updateItem(itemId, branchId, patch) {
  const item = await shopRepo.updateItem(itemId, branchId, patch);
  if (!item) throw new AppError(404, 'Item not found');
  return item;
}
