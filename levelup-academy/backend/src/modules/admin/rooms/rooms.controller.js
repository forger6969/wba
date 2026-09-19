import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './rooms.service.js';

const branchId = (req) => req.scope.branchId;

export const listRooms = asyncHandler(async (req, res) => {
  res.json({ rooms: await service.listRooms(branchId(req)) });
});

export const createRoom = asyncHandler(async (req, res) => {
  res.status(201).json({ room: await service.createRoom(branchId(req), req.body) });
});

export const updateRoom = asyncHandler(async (req, res) => {
  res.json({ room: await service.updateRoom(branchId(req), req.params.id, req.body) });
});

export const deleteRoom = asyncHandler(async (req, res) => {
  await service.deleteRoom(branchId(req), req.params.id);
  res.status(204).end();
});
