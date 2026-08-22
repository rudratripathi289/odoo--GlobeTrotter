import * as communityService from '../services/community.service.js';

export const getCommunityTrips = async (req, res, next) => {
  try {
    const result = await communityService.getCommunityTrips(req.query);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const getCommunityTripById = async (req, res, next) => {
  try {
    const trip = await communityService.getCommunityTripById(req.params.tripId);
    res.status(200).json(trip);
  } catch (error) { next(error); }
};

export const copyTrip = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    const result = await communityService.copyTrip(req.params.tripId, req.user?.id, req.body, idempotencyKey);
    res.status(201).json(result);
  } catch (error) { next(error); }
};
