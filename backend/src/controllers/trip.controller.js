import * as tripService from '../services/trip.service.js';

// --- TRIPS ---
export const createTrip = async (req, res, next) => {
  try {
    const trip = await tripService.createTrip(req.user?.id, req.body);
    res.status(201).json(trip);
  } catch (error) { next(error); }
};

export const getMyTrips = async (req, res, next) => {
  try {
    const result = await tripService.getMyTrips(req.user?.id, req.query);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const getSharedWithMeTrips = async (req, res, next) => {
  try {
    const result = await tripService.getSharedWithMeTrips(req.user?.id, req.query);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const getTripById = async (req, res, next) => {
  try {
    const trip = await tripService.getTripById(req.params.tripId, req.user?.id);
    res.status(200).json(trip);
  } catch (error) { next(error); }
};

export const updateTrip = async (req, res, next) => {
  try {
    const updated = await tripService.updateTrip(req.params.tripId, req.user?.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteTrip = async (req, res, next) => {
  try {
    await tripService.deleteTrip(req.params.tripId, req.user?.id);
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) { next(error); }
};

// --- VIEWS ---
export const getItinerary = async (req, res, next) => {
  try {
    const itinerary = await tripService.getItinerary(req.params.tripId, req.user?.id);
    res.status(200).json(itinerary);
  } catch (error) { next(error); }
};

export const getBudget = async (req, res, next) => {
  try {
    const budget = await tripService.getBudget(req.params.tripId, req.user?.id);
    res.status(200).json(budget);
  } catch (error) { next(error); }
};

export const getCalendar = async (req, res, next) => {
  try {
    const calendar = await tripService.getCalendar(req.params.tripId, req.user?.id);
    res.status(200).json(calendar);
  } catch (error) { next(error); }
};

// --- STOPS ---
export const createStop = async (req, res, next) => {
  try {
    const stop = await tripService.createStop(req.params.tripId, req.user?.id, req.body);
    res.status(201).json(stop);
  } catch (error) { next(error); }
};

export const getStops = async (req, res, next) => {
  try {
    const stops = await tripService.getStops(req.params.tripId, req.user?.id);
    res.status(200).json(stops);
  } catch (error) { next(error); }
};

export const reorderStops = async (req, res, next) => {
  try {
    const result = await tripService.reorderStops(req.params.tripId, req.user?.id, req.body.stopIds);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const getStopById = async (req, res, next) => {
  try {
    const stop = await tripService.getStopById(req.params.tripId, req.params.stopId, req.user?.id);
    res.status(200).json(stop);
  } catch (error) { next(error); }
};

export const updateStop = async (req, res, next) => {
  try {
    const updated = await tripService.updateStop(req.params.tripId, req.params.stopId, req.user?.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteStop = async (req, res, next) => {
  try {
    await tripService.deleteStop(req.params.tripId, req.params.stopId, req.user?.id);
    res.status(200).json({ message: 'Stop deleted successfully' });
  } catch (error) { next(error); }
};

// --- ACTIVITIES ---
export const getActivities = async (req, res, next) => {
  try {
    const activities = await tripService.getActivities(req.params.tripId, req.params.stopId, req.user?.id);
    res.status(200).json(activities);
  } catch (error) { next(error); }
};

export const createActivity = async (req, res, next) => {
  try {
    const activity = await tripService.createActivity(req.params.tripId, req.params.stopId, req.user?.id, req.body);
    res.status(201).json(activity);
  } catch (error) { next(error); }
};

export const reorderActivities = async (req, res, next) => {
  try {
    const result = await tripService.reorderActivities(req.params.tripId, req.params.stopId, req.user?.id, req.body);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const updateActivity = async (req, res, next) => {
  try {
    const updated = await tripService.updateActivity(req.params.tripId, req.params.stopId, req.params.tripActivityId, req.user?.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteActivity = async (req, res, next) => {
  try {
    await tripService.deleteActivity(req.params.tripId, req.params.stopId, req.params.tripActivityId, req.user?.id);
    res.status(200).json({ message: 'Trip activity deleted successfully' });
  } catch (error) { next(error); }
};

// --- EXPENSES ---
export const getExpenses = async (req, res, next) => {
  try {
    const result = await tripService.getExpenses(req.params.tripId, req.user?.id, req.query);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const createExpense = async (req, res, next) => {
  try {
    const expense = await tripService.createExpense(req.params.tripId, req.user?.id, req.body);
    res.status(201).json(expense);
  } catch (error) { next(error); }
};

export const updateExpense = async (req, res, next) => {
  try {
    const updated = await tripService.updateExpense(req.params.tripId, req.params.expenseId, req.user?.id, req.body);
    res.status(200).json(updated);
  } catch (error) { next(error); }
};

export const deleteExpense = async (req, res, next) => {
  try {
    await tripService.deleteExpense(req.params.tripId, req.params.expenseId, req.user?.id);
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) { next(error); }
};

// --- SHARING ---
export const getShares = async (req, res, next) => {
  try {
    const shares = await tripService.getShares(req.params.tripId, req.user?.id);
    res.status(200).json(shares);
  } catch (error) { next(error); }
};

export const addShare = async (req, res, next) => {
  try {
    const share = await tripService.addShare(req.params.tripId, req.user?.id, req.body);
    res.status(201).json(share);
  } catch (error) { next(error); }
};

export const removeShare = async (req, res, next) => {
  try {
    await tripService.removeShare(req.params.tripId, req.params.userId, req.user?.id);
    res.status(200).json({ message: 'Share permission revoked' });
  } catch (error) { next(error); }
};
